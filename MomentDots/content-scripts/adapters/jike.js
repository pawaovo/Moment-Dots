/**
 * 即刻平台适配器 - 重构优化版本
 * 基于统一的MutationObserver和配置管理基类
 * 消除重复代码，提升代码质量和维护性
 *
 * 技术验证：Playwright MCP测试验证
 * 核心策略：统一基类 + 平台特定实现 + 性能优化
 * 重构目标：减少90%的重复代码，提升性能和可维护性
 */

console.log('即刻适配器加载中...');

(function() {
  'use strict';

// 检查公共基类是否已加载
// 使用统一的BaseClassLoader
async function checkBaseClasses() {
  return await BaseClassLoader.checkBaseClasses('即刻');
}

/**
 * 即刻平台配置管理器 - 优化版本
 * 使用统一的PlatformConfigBase，消除重复代码
 */
class JikeConfigManager extends PlatformConfigBase {
  constructor() {
    super('jike');
  }

  /**
   * 加载即刻特定配置
   */
  loadConfig() {
    const jikeConfig = {
      delays: this.createDelayConfig({
        FAST_CHECK: 150,     // 即刻响应中等
        NORMAL_WAIT: 500,
        UPLOAD_WAIT: 2000,
        ELEMENT_WAIT: 3000
      }),

      limits: this.createLimitsConfig({
        maxContentLength: 500,   // 即刻字符限制较短
        maxMediaFiles: 9,        // 即刻最多9个媒体文件（图片+视频）
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/webm']
      }),

      performance: this.createPerformanceConfig({
        cacheTimeout: 5000,              // 即刻页面相对稳定
        elementWaitTimeout: 2000,
        mutationObserverTimeout: 3000,
        highFrequencyCheck: 150,         // 即刻需要中等频率检查
        enablePerformanceMonitoring: true,
        enableMutationObserver: true
      })
    };

    return this.loadPlatformConfig(jikeConfig);
  }

  /**
   * 获取即刻平台特定选择器
   */
  getPlatformSelectors() {
    return {
      // 基于Playwright MCP验证的精准选择器
      editor: 'div[data-lexical-editor="true"][contenteditable="true"][role="textbox"]',

      // 文件上传选择器
      fileInput: '.jk-bjn8wh.mantine-Dropzone-root > input[type="file"]',

      // 发布按钮
      publishButton: 'button[type="submit"]',
      publishButtonFallback: 'button:contains("发布")',

      // 登录状态检测
      loginIndicator: 'div[data-lexical-editor="true"]'
    };
  }
}

/**
 * 即刻平台适配器类 - 重构优化版本
 * 继承统一基类，消除重复代码，提升性能
 */

// 防止重复声明
if (typeof window.JikeAdapter === 'undefined') {

class JikeAdapter {
  constructor() {
    this.platform = 'jike';

    // 初始化MutationObserver基类功能
    this.mutationObserverBase = new MutationObserverBase('jike');

    // 使用配置管理器
    this.configManager = new JikeConfigManager();
    this.config = this.configManager.config;
    this.selectors = this.configManager.getSelectors();

    // 缓存DOM元素，减少重复查询
    this._cachedEditor = null;
    this._lastEditorCheck = 0;
    this.CACHE_DURATION = this.config.performance.cacheTimeout;

    this.log('即刻适配器初始化完成 - 使用统一基类架构');
  }

  /**
   * 发布内容到即刻平台 - 重构版本
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>} - 发布结果
   */
  async publishContent(data) {
    const { content, files, fileIds } = data;

    try {
      this.log('开始发布到即刻平台 - 使用重构策略', {
        contentLength: content?.length,
        filesCount: files?.length,
        fileIdsCount: fileIds?.length,
        hasFileIds: !!(fileIds && fileIds.length > 0),
        dataKeys: Object.keys(data)
      });

      // 使用基类的性能监控
      return await this.mutationObserverBase.measurePerformance('即刻完整发布流程', async () => {
        // 等待页面加载
        await this.waitForPageLoad();

        // 注入内容（使用精准策略）
        if (content) {
          const success = await this.injectContentPrecise(content);
          if (!success) {
            throw new Error('内容注入失败');
          }
        }

        // 上传文件（使用验证过的方法）
        if ((fileIds && fileIds.length > 0) || (files && files.length > 0)) {
          const success = await this.uploadFilesPrecise(data);
          if (!success) {
            throw new Error('文件上传失败');
          }
        }

        this.log('即刻平台发布成功');
        return { success: true, platform: this.platform };
      });

    } catch (error) {
      this.logError('即刻平台发布失败', error);
      return { success: false, platform: this.platform, error: error.message };
    }
  }

  /**
   * 精准内容注入方法 - 使用基类实现
   */
  async injectContentPrecise(content) {
    return await this.mutationObserverBase.measurePerformance('即刻内容注入', async () => {
      const editor = await this.getEditor();

      if (!editor) {
        throw new Error('未找到即刻编辑器');
      }

      this.log('找到即刻编辑器，开始精准注入', {
        selector: editor.getAttribute('data-lexical-editor') ? 'lexical' : 'fallback',
        className: editor.className
      });

      // 使用模拟用户输入的方法（避免Lexical保护机制）
      const success = await this.simulateUserInput(editor, content);

      if (!success) {
        throw new Error('即刻内容注入失败');
      }

      // 验证注入结果
      const verified = await this.verifyContentInjection(editor, content);
      if (!verified) {
        throw new Error('内容注入验证失败');
      }

      return true;
    });
  }

  /**
   * 获取编辑器元素 - 使用基类实现
   */
  async getEditor() {
    // 检查缓存
    const now = Date.now();
    if (this._cachedEditor && (now - this._lastEditorCheck) < this.CACHE_DURATION) {
      this.log('使用缓存的即刻编辑器');
      return this._cachedEditor;
    }

    // 使用基类的智能元素等待，按优先级查找
    let editor = await this.mutationObserverBase.waitForElementSmart(
      this.selectors.editor,
      this.config.delays.NORMAL_WAIT,
      true,
      '即刻主编辑器'
    );

    if (!editor) {
      editor = await this.mutationObserverBase.waitForElementSmart(
        this.selectors.editorFallback,
        this.config.delays.NORMAL_WAIT,
        true,
        '即刻备用编辑器'
      );
    }

    if (editor) {
      // 更新缓存
      this._cachedEditor = editor;
      this._lastEditorCheck = now;
      this.log('找到即刻编辑器并缓存');
    }

    return editor;
  }

  /**
   * 模拟用户输入 - 优化的Lexical编辑器处理
   */
  async simulateUserInput(editor, content) {
    try {
      this.log('开始模拟用户输入', {
        contentLength: content.length,
        editorType: editor.getAttribute('data-lexical-editor') ? 'lexical' : 'standard'
      });

      // 聚焦编辑器
      editor.focus();
      await new Promise(resolve => setTimeout(resolve, this.config.delays.FAST_CHECK));

      // 尝试多种内容注入策略
      const strategies = [
        () => this.tryLexicalDirectInput(editor, content),
        () => this.tryClipboardMethod(editor, content),
        () => this.tryExecCommandMethod(editor, content),
        () => this.tryDirectTextMethod(editor, content)
      ];

      for (let i = 0; i < strategies.length; i++) {
        const strategyName = ['Lexical直接输入', '剪贴板方法', 'ExecCommand方法', '直接文本方法'][i];

        try {
          this.log(`尝试策略${i + 1}: ${strategyName}`);
          const success = await strategies[i]();

          if (success) {
            this.log(`✅ 策略${i + 1}成功: ${strategyName}`);
            return true;
          } else {
            this.log(`⚠️ 策略${i + 1}失败: ${strategyName}`);
          }
        } catch (error) {
          this.log(`❌ 策略${i + 1}异常: ${strategyName}`, error.message);
        }
      }

      this.log('所有输入策略都失败了');
      return false;

    } catch (error) {
      this.logError('模拟用户输入失败', error);
      return false;
    }
  }

  /**
   * Lexical编辑器直接输入方法
   */
  async tryLexicalDirectInput(editor, content) {
    try {
      // 清空现有内容
      editor.innerHTML = '';

      // 创建段落元素（Lexical编辑器通常使用p标签）
      const paragraph = document.createElement('p');
      paragraph.textContent = content;
      editor.appendChild(paragraph);

      // 触发Lexical编辑器事件
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: content
      });

      editor.dispatchEvent(inputEvent);

      // 等待处理
      await new Promise(resolve => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 剪贴板方法
   */
  async tryClipboardMethod(editor, content) {
    try {
      // 将内容写入剪贴板
      await navigator.clipboard.writeText(content);

      // 选择所有内容
      const range = document.createRange();
      range.selectNodeContents(editor);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // 模拟Ctrl+V粘贴
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
      });

      pasteEvent.clipboardData.setData('text/plain', content);
      editor.dispatchEvent(pasteEvent);

      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * ExecCommand方法
   */
  async tryExecCommandMethod(editor, content) {
    try {
      // 选择所有内容
      const range = document.createRange();
      range.selectNodeContents(editor);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // 使用execCommand插入文本
      const success = document.execCommand('insertText', false, content);

      if (success) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 直接文本方法（最后的备用方案）
   */
  async tryDirectTextMethod(editor, content) {
    try {
      // 直接设置文本内容
      editor.textContent = content;

      // 触发各种事件
      const events = ['input', 'change', 'keyup'];
      for (const eventType of events) {
        const event = new Event(eventType, { bubbles: true });
        editor.dispatchEvent(event);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证内容注入结果 - 优化的Lexical编辑器验证
   */
  async verifyContentInjection(editor, expectedContent) {
    await new Promise(resolve => setTimeout(resolve, this.config.delays.FAST_CHECK));

    // 获取实际内容，尝试多种方式
    let actualContent = '';

    // 方法1: textContent
    if (editor.textContent) {
      actualContent = editor.textContent;
    }
    // 方法2: innerText
    else if (editor.innerText) {
      actualContent = editor.innerText;
    }
    // 方法3: 查找Lexical编辑器内的段落元素
    else {
      const paragraphs = editor.querySelectorAll('p, div[data-lexical-text="true"]');
      if (paragraphs.length > 0) {
        actualContent = Array.from(paragraphs).map(p => p.textContent || '').join('\n');
      }
    }

    // 清理和标准化内容进行比较
    const cleanExpected = expectedContent.trim().replace(/\s+/g, ' ');
    const cleanActual = actualContent.trim().replace(/\s+/g, ' ');

    // 使用多种验证策略
    const exactMatch = cleanActual === cleanExpected;
    const containsMatch = cleanActual.includes(cleanExpected);
    const partialMatch = cleanExpected.length > 10 && cleanActual.includes(cleanExpected.substring(0, 20));

    // 如果内容较短，要求精确匹配；如果较长，允许包含匹配
    const isMatch = expectedContent.length <= 50 ?
                   (exactMatch || containsMatch) :
                   (exactMatch || containsMatch || partialMatch);

    this.log('内容注入验证', {
      expected: expectedContent.substring(0, 50) + '...',
      actual: actualContent.substring(0, 50) + '...',
      cleanExpected: cleanExpected.substring(0, 30) + '...',
      cleanActual: cleanActual.substring(0, 30) + '...',
      exactMatch,
      containsMatch,
      partialMatch,
      isMatch,
      strategy: expectedContent.length <= 50 ? 'strict' : 'flexible'
    });

    return isMatch;
  }

  /**
   * 上传文件 - 精准策略
   */
  async uploadFilesPrecise(data) {
    const { files, fileIds } = data;

    // 如果没有文件需要上传，直接返回成功
    if ((!files || files.length === 0) && (!fileIds || fileIds.length === 0)) {
      this.log('没有文件需要上传');
      return true;
    }

    try {
      this.log('开始即刻文件上传', {
        filesCount: files?.length || 0,
        fileIdsCount: fileIds?.length || 0
      });

      // 查找文件输入元素
      let fileInput = await this.mutationObserverBase.waitForElementSmart(
        this.selectors.fileInput,
        this.config.delays.NORMAL_WAIT,
        false,
        '即刻文件输入'
      );

      if (!fileInput) {
        fileInput = await this.mutationObserverBase.waitForElementSmart(
          this.selectors.fileInputFallback,
          this.config.delays.NORMAL_WAIT,
          false,
          '即刻备用文件输入'
        );
      }

      if (!fileInput) {
        throw new Error('未找到即刻文件上传控件');
      }

      this.log('找到文件输入控件', {
        selector: fileInput.className,
        type: fileInput.type,
        accept: fileInput.accept
      });

      // 处理文件数据
      const filesToUpload = await this.processFileData(data);

      if (filesToUpload.length === 0) {
        this.log('没有有效的文件可以上传');
        return true;
      }

      // 验证文件格式和数量
      const validFiles = this.validateFiles(filesToUpload);

      if (validFiles.length === 0) {
        this.log('没有通过验证的文件可以上传');
        return true;
      }

      // 使用DataTransfer上传文件
      const dataTransfer = new DataTransfer();

      for (const fileData of validFiles) {
        let file;

        if (fileData instanceof File) {
          file = fileData;
          this.log(`使用File对象: ${file.name} (${file.size} bytes)`);
        } else if (fileData.dataUrl || fileData.data) {
          // 从Base64创建File对象
          file = await this.createFileFromBase64(fileData);
          this.log(`从Base64创建File对象: ${file.name} (${file.size} bytes)`);
        } else {
          this.log('跳过无效的文件数据:', {
            type: typeof fileData,
            isFile: fileData instanceof File,
            hasDataUrl: !!(fileData && fileData.dataUrl),
            hasData: !!(fileData && fileData.data)
          });
          continue;
        }

        if (file) {
          dataTransfer.items.add(file);
          this.log(`✅ 添加文件到DataTransfer: ${file.name} (${file.size} bytes, ${file.type})`);
        }
      }

      if (dataTransfer.files.length === 0) {
        throw new Error('没有有效的文件可以上传');
      }

      // 设置文件到输入控件
      fileInput.files = dataTransfer.files;

      // 触发change事件
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      // 等待上传处理
      await new Promise(resolve => setTimeout(resolve, this.config.delays.UPLOAD_WAIT));

      this.log(`即刻文件上传完成，共上传 ${dataTransfer.files.length} 个文件`);
      return true;

    } catch (error) {
      this.logError('即刻文件上传失败', error);
      return false;
    }
  }

  /**
   * 处理文件数据 - 统一文件处理逻辑（修复版本）
   * 注意：此方法与FileProcessorBase中的方法功能相似，保留以确保兼容性
   */
  async processFileData(data) {
    const { files, fileIds } = data;
    const filesToUpload = [];

    this.log('开始处理文件数据', {
      hasFiles: !!(files && files.length > 0),
      filesCount: files?.length || 0,
      hasFileIds: !!(fileIds && fileIds.length > 0),
      fileIdsCount: fileIds?.length || 0,
      fileIdsType: fileIds ? typeof fileIds[0] : 'undefined',
      fileIdsSample: fileIds ? fileIds[0] : null
    });

    // 处理files数组（直接的File对象或包含dataUrl的对象）
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file instanceof File) {
          filesToUpload.push(file);
          this.log('添加File对象', { name: file.name, size: file.size });
        } else if (file && (file.dataUrl || file.data)) {
          filesToUpload.push(file);
          this.log('添加dataUrl对象', { hasDataUrl: !!file.dataUrl, hasData: !!file.data });
        }
      }
    }

    // 处理fileIds数组（扩展程序文件服务的文件ID）
    if (fileIds && Array.isArray(fileIds)) {
      for (const fileId of fileIds) {
        try {
          // 检查是否是直接的Base64数据URL
          if (typeof fileId === 'string' && fileId.startsWith('data:')) {
            filesToUpload.push({
              dataUrl: fileId,
              name: `image_${Date.now()}.png`,
              type: 'image/png'
            });
            this.log('添加Base64数据URL', { length: fileId.length });
          }
          // 检查是否是包含dataUrl的对象
          else if (fileId && (fileId.dataUrl || fileId.data)) {
            filesToUpload.push(fileId);
            this.log('添加文件对象', { hasDataUrl: !!fileId.dataUrl, hasData: !!fileId.data });
          }
          // 处理扩展程序文件服务的文件ID
          else if (typeof fileId === 'string' && fileId.startsWith('file_')) {
            this.log('检测到扩展程序文件ID，尝试获取文件数据', { fileId });

            const file = await this.getFileFromExtension(fileId);
            if (file && file instanceof File) {
              filesToUpload.push(file);
              this.log('成功获取扩展程序文件数据', {
                fileId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
              });
            } else {
              this.log('获取扩展程序文件数据失败', { fileId });
            }
          }
          else {
            this.log('跳过无效的文件ID', { fileId, type: typeof fileId });
          }
        } catch (error) {
          this.logError('处理文件ID时出错', { fileId, error: error.message });
        }
      }
    }

    this.log('文件数据处理完成', {
      originalFiles: files?.length || 0,
      originalFileIds: fileIds?.length || 0,
      processedFiles: filesToUpload.length,
      filesToUpload: filesToUpload.map(f => ({
        type: f instanceof File ? 'File' : 'Object',
        name: f.name || 'unknown',
        hasDataUrl: !!(f.dataUrl || f.data),
        size: f.size || 'unknown'
      }))
    });

    return filesToUpload;
  }

  /**
   * 从扩展程序获取文件数据 - 修复版本（参考小红书实现）
   * 注意：此方法与FileProcessorBase中的方法功能相同，保留以确保兼容性
   */
  async getFileFromExtension(fileId) {
    try {
      this.log('向扩展程序请求文件数据', { fileId });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('获取文件数据超时'));
        }, 10000);

        // 使用正确的action名称，与抖音和小红书保持一致
        chrome.runtime.sendMessage({
          action: 'getFile',  // 修复：使用正确的action名称
          fileId: fileId
        }, (response) => {
          clearTimeout(timeout);

          if (chrome.runtime.lastError) {
            this.logError('Chrome runtime错误', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          // 处理正确的响应格式（参考小红书实现）
          if (response && response.success && response.arrayData) {
            this.log('成功获取文件数据', {
              fileId,
              hasArrayData: !!response.arrayData,
              arrayDataLength: response.arrayData?.length,
              metadata: response.metadata
            });

            try {
              // 将arrayData转换为File对象（参考小红书实现）
              const uint8Array = new Uint8Array(response.arrayData);
              const blob = new Blob([uint8Array], { type: response.metadata.type });
              const file = new File([blob], response.metadata.name, {
                type: response.metadata.type,
                lastModified: response.metadata.lastModified
              });

              this.log('成功创建File对象', {
                fileId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
              });

              resolve(file);  // 直接返回File对象，不需要dataUrl
            } catch (conversionError) {
              this.logError('文件数据转换失败', { fileId, error: conversionError.message });
              reject(new Error('文件数据转换失败'));
            }
          } else {
            this.logError('获取文件数据失败', { fileId, response });
            reject(new Error('获取文件数据失败'));
          }
        });
      });
    } catch (error) {
      this.logError('获取扩展程序文件数据异常', { fileId, error: error.message });
      return null;
    }
  }

  /**
   * 从Base64数据创建File对象
   * 注意：此方法与FileProcessorBase中的方法功能相同，保留以确保兼容性
   */
  async createFileFromBase64(fileData) {
    try {
      const base64Data = fileData.dataUrl || fileData.data;
      const fileName = fileData.name || `image_${Date.now()}.png`;
      const fileType = fileData.type || this.getFileTypeFromBase64(base64Data) || 'image/png';

      if (!base64Data) {
        throw new Error('缺少Base64数据');
      }

      // 移除data URL前缀
      const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');

      // 转换为二进制数据
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 创建File对象
      const blob = new Blob([bytes], { type: fileType });
      const file = new File([blob], fileName, {
        type: fileType,
        lastModified: Date.now()
      });

      this.log(`创建File对象成功: ${fileName} (${file.size} bytes)`);
      return file;

    } catch (error) {
      this.logError('Base64转File失败', error);
      throw error;
    }
  }

  /**
   * 验证文件格式和数量 - 截断处理版本
   * @param {Array} files - 文件数组
   * @returns {Array} - 验证通过的文件数组
   */
  validateFiles(files) {
    const validFiles = [];
    const { limits } = this.config;
    let imageCount = 0;
    let videoCount = 0;

    for (const file of files) {
      // 如果是File对象，检查文件类型
      if (file instanceof File) {
        const isValidImage = limits.allowedImageTypes.includes(file.type);
        const isValidVideo = limits.allowedVideoTypes.includes(file.type);

        if (!isValidImage && !isValidVideo) {
          this.log(`文件 ${file.name} 格式不支持，跳过`);
          continue;
        }
      }

      // 检查媒体文件总数限制，采用截断处理
      if (validFiles.length >= limits.maxMediaFiles) {
        const fileName = file instanceof File ? file.name : '未知文件';
        this.log(`媒体文件数量已达到限制 (${limits.maxMediaFiles})，截断文件: ${fileName}`);
        continue;
      }

      validFiles.push(file);

      // 在添加时统计，仅对File对象
      if (file instanceof File) {
        if (limits.allowedImageTypes.includes(file.type)) imageCount++;
        if (limits.allowedVideoTypes.includes(file.type)) videoCount++;
      }
    }

    const truncatedCount = files.length - validFiles.length;
    this.log(`文件验证完成: ${imageCount} 张图片, ${videoCount} 个视频, 共 ${validFiles.length} 个有效文件`);
    if (truncatedCount > 0) {
      this.log(`⚠️ 截断了 ${truncatedCount} 个文件（超出平台限制 ${limits.maxMediaFiles} 个媒体文件）`);
    }

    return validFiles;
  }

  /**
   * 从Base64数据中获取文件类型
   */
  getFileTypeFromBase64(base64Data) {
    if (!base64Data || typeof base64Data !== 'string') {
      return 'image/png';
    }

    // 从data URL中提取MIME类型
    const match = base64Data.match(/^data:([^;]+);base64,/);
    if (match && match[1]) {
      return match[1];
    }

    return 'image/png';
  }

  /**
   * 日志记录方法
   */
  log(message, data = {}) {
    console.log(`[即刻] ${message}`, data);
  }

  /**
   * 错误日志记录方法
   */
  logError(message, error) {
    console.error(`[即刻] ${message}`, error);
  }

  /**
   * 等待页面加载完成
   */
  async waitForPageLoad(timeout = 10000) {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve(true);
        return;
      }

      const timer = setTimeout(() => resolve(false), timeout);

      document.addEventListener('DOMContentLoaded', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  /**
   * 清理资源 - 重写基类方法
   */
  cleanup() {
    // 清理MutationObserver基类的资源
    if (this.mutationObserverBase) {
      this.mutationObserverBase.cleanupAllObservers();
    }

    // 清理缓存
    this._cachedEditor = null;
    this._lastEditorCheck = 0;

    this.log('🧹 即刻适配器资源清理完成');
  }

  /**
   * 获取性能报告 - 整合基类数据
   */
  getPerformanceReport() {
    const baseReport = this.mutationObserverBase ?
                      this.mutationObserverBase.getPerformanceReport() :
                      { platform: 'jike', totalTime: 0, successRate: 0, operationCount: 0 };

    return {
      ...baseReport,
      adapterVersion: '2.0.0-refactored',
      platformType: 'direct-injection',
      optimizations: [
        'MutationObserver基类集成',
        '重复代码消除',
        '统一配置管理',
        '性能监控优化',
        'Lexical编辑器优化'
      ]
    };
  }
}

// 注册适配器到全局
window.JikeAdapter = JikeAdapter;
console.log('JikeAdapter class registered successfully');

} else {
  console.log('JikeAdapter already exists, skipping registration');
}

/**
 * 设置即刻平台消息监听器 - 重构版本
 */
function setupJikeMessageListener(adapter) {
  let isProcessing = false;

  const handleMessage = async (message, sender, sendResponse) => {
    if (message.action !== 'publish' || isProcessing) {
      return false;
    }

    isProcessing = true;
    console.log('即刻内容脚本收到消息 - 重构版本:', message);

    try {
      const result = await adapter.publishContent(message.data);
      console.log('即刻发布结果 - 重构版本:', result);
      sendResponse(result);
    } catch (error) {
      console.error('即刻发布错误 - 重构版本:', error);
      sendResponse({
        success: false,
        platform: 'jike',
        error: error.message || '发布失败',
        strategy: 'refactored'
      });
    } finally {
      // 重置处理标志
      setTimeout(() => { isProcessing = false; }, 1000);
    }

    return true;
  };

  chrome.runtime.onMessage.addListener(handleMessage);
  console.log('即刻消息监听器设置完成 - 重构版本');
}

/**
 * 即刻适配器初始化逻辑 - 重构版本
 */
async function initializeJikeAdapter() {
  try {
    console.log('初始化JikeAdapter...');

    // 等待公共基类加载完成
    await checkBaseClasses();

    // 创建适配器实例
    const adapter = new JikeAdapter();

    // 注册到全局命名空间
    window.MomentDots = window.MomentDots || {};
    window.MomentDots.jikeAdapter = adapter;

    // 设置消息监听器 - 这是关键的修复
    setupJikeMessageListener(adapter);

    console.log('✅ JikeAdapter初始化成功 (重构版本)，platform:', adapter.platform);
    return true;
  } catch (error) {
    console.error('❌ JikeAdapter初始化失败:', error);
    return false;
  }
}

// 智能初始化：异步版本
initializeJikeAdapter().catch(error => {
  console.error('即刻适配器异步初始化失败:', error);
  // 延迟重试
  setTimeout(() => {
    initializeJikeAdapter().catch(retryError => {
      console.error('即刻适配器重试初始化失败:', retryError);
    });
  }, 500);
});

})();

console.log('即刻适配器重构完成 - 使用统一基类架构');
