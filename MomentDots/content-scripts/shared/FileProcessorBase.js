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
            const file = await this.getFileFromExtension(fileId);
            if (file && file instanceof File) {
              filesToUpload.push(file);
              this.log(`获取文件成功: ${file.name} (${file.size} bytes)`);
            }
          } catch (error) {
            this.log(`文件获取失败: ${fileId}`, error.message);
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
