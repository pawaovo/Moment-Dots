/**
 * 统一文件处理基类 - 消除即刻和微博适配器中的重复代码
 * 提供通用的文件获取、转换、验证和上传功能
 */

class FileProcessorBase {
  constructor(platform, config) {
    this.platform = platform;
    this.config = config;
    
    // 文件处理并发保护机制（统一实现）
    this.fileProcessingQueue = new Map();
    this.fileProcessingLock = new Set();
    
    // 支持的文件格式（可被子类覆盖）
    this.SUPPORTED_FORMATS = {
      images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
      videos: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.mp4', '.mov', '.avi']
    };
  }

  /**
   * 统一的文件数据处理方法
   * @param {Object} data - 包含files和fileIds的数据对象
   * @returns {Array} 处理后的File对象数组
   */
  async processFileData(data) {
    const { files, fileIds } = data;
    const filesToUpload = [];

    try {
      // 处理新的fileIds（从Background Script获取）
      if (fileIds && fileIds.length > 0) {
        this.log('处理Background Script文件...');
        for (const fileId of fileIds) {
          try {
            // 🚀 使用智能文件获取方法（支持分块下载）
            const file = await this.getFileWithInstantPreview(fileId);
            if (file && file instanceof File) {
              filesToUpload.push(file);
              this.log(`获取文件成功: ${file.name} (${file.size} bytes)`);
            }
          } catch (error) {
            this.log(`智能文件获取失败，尝试原有方法: ${fileId}`, error.message);
            // 降级到原有方法
            try {
              const file = await this.getFileFromExtension(fileId);
              if (file && file instanceof File) {
                filesToUpload.push(file);
                this.log(`降级获取文件成功: ${file.name} (${file.size} bytes)`);
              }
            } catch (fallbackError) {
              this.log(`文件获取完全失败: ${fileId}`, fallbackError.message);
            }
          }
        }
      }

      // 处理传统的files数据
      if (files && files.length > 0) {
        this.log('处理传统文件数据...');
        for (const fileData of files) {
          if (fileData instanceof File) {
            filesToUpload.push(fileData);
          } else if (fileData.dataUrl || fileData.data) {
            const file = this.createFileFromBase64(fileData);
            if (file) {
              filesToUpload.push(file);
            }
          }
        }
      }

      this.log(`文件处理完成，共 ${filesToUpload.length} 个文件`);
      return filesToUpload;

    } catch (error) {
      this.logError('文件数据处理失败', error);
      return [];
    }
  }

  /**
   * 统一的从扩展程序获取文件方法
   * @param {string} fileId - 文件ID
   * @returns {Promise<File>} File对象
   */
  async getFileFromExtension(fileId) {
    try {
      // 简化的并发保护
      if (this.fileProcessingQueue.has(fileId)) {
        return this.fileProcessingQueue.get(fileId);
      }

      if (this.fileProcessingLock.has(fileId)) {
        throw new Error(`文件 ${fileId} 正在处理中，请稍后重试`);
      }

      this.fileProcessingLock.add(fileId);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.fileProcessingLock.delete(fileId);
          reject(new Error('获取文件数据超时'));
        }, 10000);

        chrome.runtime.sendMessage({
          action: 'getFile',
          fileId: fileId
        }, (response) => {
          clearTimeout(timeout);

          if (chrome.runtime.lastError) {
            this.fileProcessingLock.delete(fileId);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response && response.success && response.arrayData) {
            try {
              const uint8Array = new Uint8Array(response.arrayData);
              const blob = new Blob([uint8Array], { type: response.metadata.type });
              const file = new File([blob], response.metadata.name, {
                type: response.metadata.type,
                lastModified: response.metadata.lastModified
              });

              // 文件完整性验证
              if (file.size !== response.metadata.size) {
                throw new Error(`文件大小不匹配: 期望 ${response.metadata.size}, 实际 ${file.size}`);
              }

              if (file.size === 0) {
                throw new Error('文件大小为0，可能数据损坏');
              }

              // 缓存结果
              this.fileProcessingQueue.set(fileId, file);
              this.fileProcessingLock.delete(fileId);

              this.log(`成功获取文件: ${file.name} (${file.size} bytes)`);
              resolve(file);

            } catch (conversionError) {
              this.fileProcessingLock.delete(fileId);
              reject(conversionError);
            }
          } else {
            this.fileProcessingLock.delete(fileId);
            reject(new Error('获取文件数据失败'));
          }
        });
      });

    } catch (error) {
      this.fileProcessingLock.delete(fileId);
      throw error;
    }
  }

  /**
   * 统一的Base64转File方法
   * @param {Object} fileData - 包含dataUrl的文件数据
   * @returns {File|null} File对象或null
   */
  createFileFromBase64(fileData) {
    try {
      const dataUrl = fileData.dataUrl || fileData.data;
      if (!dataUrl || !dataUrl.startsWith('data:')) {
        return null;
      }

      const [header, base64Data] = dataUrl.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      const fileName = fileData.name || `file_${Date.now()}.${this.getExtensionFromMime(mimeType)}`;
      return new File([blob], fileName, {
        type: mimeType,
        lastModified: fileData.lastModified || Date.now()
      });

    } catch (error) {
      this.logError('Base64转File失败', error);
      return null;
    }
  }

  /**
   * 统一的文件验证方法 - 支持平台特定限制
   * @param {File[]} files - 文件数组
   * @param {Object} limits - 平台限制配置（可选）
   * @returns {Object} 包含validFiles和统计信息的对象
   */
  validateFiles(files, limits = null) {
    // 如果提供了平台限制，使用平台特定的验证逻辑
    if (limits && limits.maxMediaFiles) {
      return this.validateFilesWithLimits(files, limits);
    }

    // 否则使用基础验证逻辑
    return {
      validFiles: files.filter(file => {
        if (!(file instanceof File)) {
          this.log(`跳过非File对象: ${typeof file}`);
          return false;
        }

        if (file.size === 0) {
          this.log(`跳过空文件: ${file.name}`);
          return false;
        }

        const isValidType = this.SUPPORTED_FORMATS.images.includes(file.type) ||
                           this.SUPPORTED_FORMATS.videos.includes(file.type);

        if (!isValidType) {
          this.log(`跳过不支持的文件类型: ${file.name} (${file.type})`);
          return false;
        }

        return true;
      }),
      imageCount: 0,
      videoCount: 0,
      truncatedCount: 0
    };
  }

  /**
   * 平台特定的文件验证逻辑 - 支持截断处理
   * @param {File[]} files - 文件数组
   * @param {Object} limits - 平台限制配置
   * @returns {Object} 包含validFiles和统计信息的对象
   */
  validateFilesWithLimits(files, limits) {
    const validFiles = [];
    let imageCount = 0;
    let videoCount = 0;

    for (const file of files) {
      // 检查文件类型
      const isValidImage = limits.allowedImageTypes?.includes(file.type) || false;
      const isValidVideo = limits.allowedVideoTypes?.includes(file.type) || false;

      if (!isValidImage && !isValidVideo) {
        this.log(`文件 ${file.name} 格式不支持，跳过`);
        continue;
      }

      // 检查媒体文件总数限制，采用截断处理
      if (validFiles.length >= limits.maxMediaFiles) {
        this.log(`媒体文件数量已达到限制 (${limits.maxMediaFiles})，截断文件: ${file.name}`);
        continue;
      }

      validFiles.push(file);

      // 在添加时统计，避免重复遍历
      if (isValidImage) imageCount++;
      if (isValidVideo) videoCount++;
    }

    const truncatedCount = files.length - validFiles.length;
    this.log(`文件验证完成: ${imageCount} 张图片, ${videoCount} 个视频, 共 ${validFiles.length} 个有效文件`);
    if (truncatedCount > 0) {
      this.log(`⚠️ 截断了 ${truncatedCount} 个文件（超出平台限制 ${limits.maxMediaFiles} 个媒体文件）`);
    }

    return { validFiles, imageCount, videoCount, truncatedCount };
  }

  /**
   * 统一的DataTransfer文件注入方法
   * @param {HTMLInputElement} fileInput - 文件输入控件
   * @param {File[]} files - 文件数组
   */
  async injectFilesToInput(fileInput, files) {
    if (!fileInput || fileInput.disabled) {
      throw new Error('文件输入控件不可用');
    }

    const dataTransfer = new DataTransfer();
    files.forEach(file => {
      if (file instanceof File) {
        dataTransfer.items.add(file);
      }
    });

    if (dataTransfer.files.length === 0) {
      throw new Error('没有有效的文件可以上传');
    }

    fileInput.files = dataTransfer.files;

    // 触发事件
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    fileInput.dispatchEvent(changeEvent);

    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    fileInput.dispatchEvent(inputEvent);

    this.log(`文件注入完成，共 ${dataTransfer.files.length} 个文件`);
  }

  /**
   * 工具方法：从MIME类型获取文件扩展名
   */
  getExtensionFromMime(mimeType) {
    const mimeToExt = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov'
    };
    return mimeToExt[mimeType] || 'bin';
  }

  // 🚀 第二阶段：智能文件获取方法（支持分块下载）
  async getFileWithInstantPreview(fileId) {
    try {
      this.log(`🚀 开始智能文件获取: ${fileId}`);

      // 1. 获取传输策略
      const routingInfo = await chrome.runtime.sendMessage({
        action: 'getFileWithSmartRouting',
        fileId: fileId
      });

      if (!routingInfo.success) {
        throw new Error(routingInfo.error);
      }

      // 2. 根据策略选择传输方式
      if (routingInfo.transferMode === 'chunked') {
        this.log(`📦 大文件检测，使用分布式协作下载: ${routingInfo.metadata.name}`);
        return await this.downloadFileWithDistributedCoordination(fileId, routingInfo.metadata);
      } else {
        this.log(`📄 小文件检测，使用直接传输: ${routingInfo.metadata.name}`);
        return await this.createFileFromDirectTransfer(routingInfo);
      }

    } catch (error) {
      this.logError('智能文件获取失败:', error);
      throw error;
    }
  }

  // 🚀 分布式协作下载方法
  async downloadFileWithDistributedCoordination(fileId, metadata) {
    try {
      this.log(`🚀 启动分布式协作下载: ${metadata.name} (平台: ${this.platform})`);

      // 报告开始处理
      this.reportFileProgress('DISTRIBUTED_DOWNLOAD', 'INIT', 10, '初始化分布式下载');

      // 直接启动分布式下载会话（Background Script会处理协调）
      const distributedSession = await this.initiateDistributedDownload(fileId, metadata);
      if (distributedSession.success) {
        this.log(`✅ 分布式下载会话启动成功，开始参与 (平台: ${this.platform})`);
        this.reportFileProgress('DISTRIBUTED_DOWNLOAD', 'DOWNLOADING', 20, '开始分布式下载');
        return await this.participateInDistributedDownload(distributedSession);
      } else {
        // 降级到传统分块下载
        this.log(`⚠️ 分布式下载启动失败，降级到传统方式: ${distributedSession.error} (平台: ${this.platform})`);
        this.reportFileProgress('DISTRIBUTED_DOWNLOAD', 'DOWNLOADING', 30, '降级到传统下载');
        return await this.downloadFileInChunks(fileId, metadata);
      }

    } catch (error) {
      this.logError(`分布式协作下载失败，降级到传统方式 (平台: ${this.platform}):`, error);
      this.reportFileProgress('DISTRIBUTED_DOWNLOAD', 'DOWNLOADING', 30, '降级到传统下载');
      return await this.downloadFileInChunks(fileId, metadata);
    }
  }



  // 启动分布式下载会话
  async initiateDistributedDownload(fileId, metadata) {
    try {
      // 获取当前活跃的平台列表（模拟，实际需要从Background Script获取）
      const activePlatforms = await this.getActivePlatformIds();

      if (activePlatforms.length <= 1) {
        return { success: false, error: '只有一个平台，无需分布式下载' };
      }

      this.log(`🎯 启动分布式下载，参与平台: ${activePlatforms.join(', ')}`);

      // 请求Background Script协调分布式下载
      const response = await chrome.runtime.sendMessage({
        action: 'startDistributedDownload',
        fileId: fileId,
        platformIds: activePlatforms
      });

      if (response.success) {
        this.log(`✅ 分布式下载会话创建成功: ${response.sessionId}`);
      }

      return response;

    } catch (error) {
      this.logError('启动分布式下载失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取活跃平台ID列表
  async getActivePlatformIds() {
    try {
      // 从Background Script获取真实的活跃平台列表
      const response = await chrome.runtime.sendMessage({
        action: 'getActivePlatforms'
      });

      if (response.success && response.platforms.length > 1) {
        this.log(`📊 获取到活跃平台: ${response.platforms.join(', ')}`);
        return response.platforms;
      } else {
        // 降级：如果只有一个或没有活跃平台，返回当前平台
        this.log(`⚠️ 活跃平台不足，降级到单平台模式`);
        return [this.platform];
      }

    } catch (error) {
      this.logError('获取活跃平台列表失败:', error);
      // 降级：返回当前平台
      return [this.platform];
    }
  }

  // 分块下载实现
  async downloadFileInChunks(fileId, metadata) {
    const chunks = [];
    const totalChunks = metadata.totalChunks;

    this.log(`📦 开始分块下载: ${metadata.name} (${totalChunks} 块)`);

    // 并行下载多个分块（提升性能）
    const maxConcurrent = 3; // 最大并发数

    for (let i = 0; i < totalChunks; i += maxConcurrent) {
      const batchPromises = [];

      for (let j = 0; j < maxConcurrent && (i + j) < totalChunks; j++) {
        const chunkIndex = i + j;
        batchPromises.push(this.downloadSingleChunk(fileId, chunkIndex));
      }

      const batchResults = await Promise.all(batchPromises);
      chunks.push(...batchResults);
    }

    // 按索引排序
    chunks.sort((a, b) => a.index - b.index);

    // 重组文件
    const uint8Arrays = chunks.map(chunk => new Uint8Array(chunk.data));
    const blob = new Blob(uint8Arrays, { type: metadata.type });

    this.log(`✅ 分块下载完成: ${metadata.name} (${blob.size} bytes)`);

    return new File([blob], metadata.name, {
      type: metadata.type,
      lastModified: metadata.lastModified
    });
  }

  // 下载单个分块
  async downloadSingleChunk(fileId, chunkIndex) {
    const response = await chrome.runtime.sendMessage({
      action: 'getFileChunk',
      fileId: fileId,
      chunkIndex: chunkIndex
    });

    if (!response.success) {
      throw new Error(`分块下载失败: ${response.error}`);
    }

    return {
      index: chunkIndex,
      data: response.chunkData
    };
  }

  // 参与分布式下载
  async participateInDistributedDownload(distributedSession) {
    const { sessionId, fileId, assignments, totalChunks, metadata } = distributedSession;
    const myPlatform = this.platform;
    const myAssignment = assignments[myPlatform] || [];

    // 🔧 调试日志：验证fileId是否正确传递
    this.log(`🎯 参与分布式下载，会话信息:`, {
      sessionId,
      fileId,
      platform: myPlatform,
      assignment: myAssignment
    });

    if (!fileId) {
      throw new Error(`分布式下载会话缺少fileId: ${JSON.stringify(distributedSession)}`);
    }

    try {
      // 1. 下载分配给我的分块
      const downloadPromises = myAssignment.map(chunkIndex =>
        this.downloadAndReportChunk(fileId, chunkIndex, sessionId)
      );

      await Promise.all(downloadPromises);
      this.log(`✅ 完成分配的分块下载: ${myAssignment.length}个分块`);
      this.reportFileProgress('DISTRIBUTED_DOWNLOAD', 'COMPLETE', 100, '分块下载完成');

      // 🚀 优化：检查文件是否已经完整可用，避免不必要等待
      const fileStatus = await chrome.runtime.sendMessage({
        action: 'checkFileComplete',
        fileId: fileId
      });

      if (fileStatus.success && fileStatus.complete) {
        this.log(`⚡ 文件已完整，跳过等待其他平台`);
        this.reportFileProgress('FILE_ASSEMBLY', 'COMPLETE', 100, '文件已完整');
      } else {
        // 2. 等待所有平台完成下载
        this.log(`⏳ 文件未完整，等待其他平台完成`);
        this.reportFileProgress('FILE_ASSEMBLY', 'WAITING', 20, '等待其他平台');
        await this.waitForDistributedDownloadComplete(sessionId);
        this.reportFileProgress('FILE_ASSEMBLY', 'COMPLETE', 100, '等待完成');
      }

      // 3. 获取完整文件并清理会话（统一处理）
      this.log(`🔄 分布式协作下载完成，现在获取完整文件用于 ${this.platform} 平台注入`);
      this.reportFileProgress('INJECTION', 'PREPARING', 20, '准备文件注入');

      const completeFile = await this.assembleCompleteFile(fileId, metadata);
      this.reportFileProgress('INJECTION', 'INJECTING', 80, '注入文件中');

      await this.cleanupDistributedSession(fileId, sessionId);
      this.reportFileProgress('INJECTION', 'COMPLETE', 100, '处理完成');

      return completeFile;

    } catch (error) {
      this.logError('参与分布式下载失败:', error);
      throw error;
    }
  }



  // 下载并报告单个分块
  async downloadAndReportChunk(fileId, chunkIndex, sessionId) {
    try {
      // 下载分块
      const chunkData = await this.downloadSingleChunk(fileId, chunkIndex);

      // 报告给Background Script
      await chrome.runtime.sendMessage({
        action: 'chunkDownloadComplete',
        sessionId: sessionId,
        chunkIndex: chunkIndex,
        platformId: this.platform
      });

      this.log(`📦 分块下载完成: chunk_${chunkIndex}`);
      return chunkData;

    } catch (error) {
      this.logError(`分块下载失败: chunk_${chunkIndex}`, error);
      throw error;
    }
  }

  // 等待分布式下载完成
  async waitForDistributedDownloadComplete(sessionId) {
    this.log(`⏳ 等待所有平台完成分布式下载: ${sessionId}`);

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'checkDownloadComplete',
            sessionId: sessionId
          });

          if (response.success && response.complete) {
            clearInterval(checkInterval);
            this.log(`🎉 分布式下载完成: ${sessionId}`);
            resolve(response.session);
          } else if (!response.success) {
            clearInterval(checkInterval);
            reject(new Error(response.error));
          }

        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 500); // 🚀 优化：500ms检查一次，提升响应速度

      // 超时处理
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('等待分布式下载完成超时'));
      }, 120000); // 2分钟超时
    });
  }

  // 组装完整文件 - 从Background Script获取完整文件
  async assembleCompleteFile(fileId, metadata) {
    try {
      this.log(`🔧 获取完整文件: ${metadata.name} (平台: ${this.platform})`);
      this.log(`💡 文件已在Background Script中完整存在，现在传输到平台`);

      // 由于Chrome Extension消息传递限制，大文件仍需分块传输
      const file = await this.downloadFileInChunks(fileId, metadata);

      this.log(`✅ 文件获取成功: ${file.name} (${file.size} bytes)`);
      return file;

    } catch (error) {
      this.logError('获取完整文件失败:', error);
      throw error;
    }
  }

  // 清理分布式会话
  async cleanupDistributedSession(fileId, sessionId) {
    try {
      // 通知Background Script清理会话
      await chrome.runtime.sendMessage({
        action: 'cleanupDistributedSession',
        sessionId: sessionId
      });

      this.log(`🗑️ 分布式会话清理完成: ${sessionId}`);
    } catch (error) {
      this.logError('清理分布式会话失败:', error);
    }
  }

  // 报告文件处理进度 - 优化版本
  reportFileProgress(stage, subStage, progress, message) {
    // 参数验证
    if (!stage || typeof progress !== 'number') {
      console.warn('Invalid progress parameters:', { stage, progress });
      return;
    }

    try {
      // 发送进度更新消息到Background Script，由其转发到侧边栏
      chrome.runtime.sendMessage({
        action: 'fileProgressUpdate',
        platformId: this.platform,
        stage: stage,
        subStage: subStage,
        progress: Math.min(100, Math.max(0, progress)), // 确保进度在0-100范围内
        message: message,
        timestamp: Date.now()
      }).catch(error => {
        // 忽略消息发送失败（可能是侧边栏未打开）
        if (!error.message.includes('Receiving end does not exist')) {
          console.warn('Failed to report file progress:', error);
        }
      });
    } catch (error) {
      // 静默处理错误，不影响主要功能
      console.warn('Failed to report file progress:', error);
    }
  }

  // 直接传输文件创建
  createFileFromDirectTransfer(routingInfo) {
    const uint8Array = new Uint8Array(routingInfo.arrayData);
    const blob = new Blob([uint8Array], { type: routingInfo.metadata.type });

    return new File([blob], routingInfo.metadata.name, {
      type: routingInfo.metadata.type,
      lastModified: routingInfo.metadata.lastModified
    });
  }

  // 抽象方法，由子类实现
  log(message, data = null) {
    console.log(`[${this.platform}FileProcessor]`, message, data);
  }

  logError(message, error) {
    console.error(`[${this.platform}FileProcessor]`, message, error);
  }
}

// 导出到全局
window.FileProcessorBase = FileProcessorBase;
console.log('FileProcessorBase loaded successfully');
