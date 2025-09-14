/**
 * X平台适配器 - 基于统一架构设计
 * 继承微博平台的成熟架构模式，针对X平台特性优化
 * 
 * 技术验证：Playwright MCP测试验证
 * 核心策略：统一基类 + X平台特定实现 + Draft.js编辑器适配
 * 设计目标：与现有架构完全兼容，确保代码一致性和可维护性
 */

console.log('X平台适配器加载中...');

(function() {
  'use strict';

// 检查公共基类是否已加载
// 使用统一的BaseClassLoader
async function checkBaseClasses() {
  return await BaseClassLoader.checkBaseClasses('X平台');
}

/**
 * X平台配置管理器 - 优化版本
 * 使用统一的PlatformConfigBase，消除重复代码
 */
class XConfigManager extends PlatformConfigBase {
  constructor() {
    super('x');
  }

  /**
   * 加载X平台特定配置
   */
  loadConfig() {
    const xConfig = {
      delays: this.createDelayConfig({
        FAST_CHECK: 100,         // X平台响应快速
        NORMAL_WAIT: 300,
        UPLOAD_WAIT: 1500,       // X平台上传稍慢于微博
        ELEMENT_WAIT: 2000
      }),

      limits: this.createLimitsConfig({
        maxContentLength: 280,   // X平台字符限制
        maxMediaFiles: 4,        // X平台最多4个媒体文件（图片+视频）
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        allowedVideoTypes: ['video/mp4', 'video/quicktime']
      }),

      performance: this.createPerformanceConfig({
        cacheTimeout: 2000,              // X平台页面变化适中
        elementWaitTimeout: 1500,
        mutationObserverTimeout: 2000,
        highFrequencyCheck: 100,         // X平台需要快速响应
        enablePerformanceMonitoring: true,
        enableMutationObserver: true
      })
    };

    return this.loadPlatformConfig(xConfig);
  }

  /**
   * 获取X平台特定选择器
   */
  getPlatformSelectors() {
    return {
      // 编辑器选择器（基于Playwright MCP验证的精准选择器）
      editor: '[data-testid="tweetTextarea_0"]',
      editorFallback: '[contenteditable="true"]',
      editorGeneric: 'div[role="textbox"]',

      // 文件上传选择器 - 基于Playwright验证的精准选择器
      fileInput: '[data-testid="fileInput"]',
      fileInputFallback: 'input[type="file"]',

      // 发布按钮选择器
      sendButton: '[data-testid="tweetButtonInline"]',
      sendButtonFallback: 'button:has-text("发帖")',

      // 登录状态检测 - 基于Playwright分析结果
      loginIndicator: '[data-testid="tweetTextarea_0"]', // 文本框存在表示已登录
      loginIndicatorFallback: '[data-testid="SideNav_AccountSwitcher_Button"]', // 备用：用户菜单
      loginIndicatorGeneric: '[data-testid="primaryColumn"]' // 通用：主列存在
    };
  }
}

/**
 * X平台适配器类 - 基于统一架构设计
 * 继承微博平台的成熟模式，针对X平台特性优化
 */

// 防止重复声明
if (typeof window.XAdapter === 'undefined') {

class XAdapter {
  constructor() {
    this.platform = 'x';

    // 初始化MutationObserver基类功能
    this.mutationObserverBase = new MutationObserverBase('x');

    // 使用配置管理器
    this.configManager = new XConfigManager();
    this.config = this.configManager.config;
    this.selectors = this.configManager.getSelectors();

    // 文件扩展名映射 - 基于Playwright验证
    this.FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov'];

    this.log('X平台适配器初始化完成');
  }

  /**
   * 统一日志方法
   */
  log(...args) {
    console.log(`[X平台适配器]`, ...args);
  }

  /**
   * 统一错误日志方法
   */
  logError(...args) {
    console.error(`[X平台适配器错误]`, ...args);
  }

  /**
   * 主要发布方法 - 统一接口
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>} - 发布结果
   */
  async publish(data) {
    const publishId = `x-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.log(`开始X平台内容预填充... [${publishId}]`);

    try {
      // 多平台并发隔离：添加随机延迟避免同时执行
      const randomDelay = Math.floor(Math.random() * 1000) + 500; // 500-1500ms随机延迟
      this.log(`多平台并发保护：延迟 ${randomDelay}ms [${publishId}]`);
      await new Promise(resolve => setTimeout(resolve, randomDelay));

      // 1. 验证登录状态（增强版本）
      if (!await this.checkLoginStatus()) {
        throw new Error('请先登录X平台');
      }

      // 2. 等待页面就绪
      await this.waitForPageReady();

      // 3. 填充文本内容
      if (data.content) {
        await this.fillTextContent(data);
      }

      // 4. 处理文件上传 - 支持新的fileIds和原有的文件数据
      let filesToUpload = [];

      if (data.fileIds && data.fileIds.length > 0) {
        // 新方案：从Background Script获取文件
        this.log('使用新的Background Script文件管理系统...');
        try {
          for (const fileId of data.fileIds) {
            this.log(`请求文件: ${fileId}`);

            // 使用Promise包装的方式获取文件，参考微博实现，避免并发问题
            const file = await this.getFileFromExtension(fileId);
            if (file && file instanceof File) {
              filesToUpload.push(file);
              this.log(`成功获取文件: ${file.name} (${file.size} bytes)`);
            } else {
              this.log(`警告: 文件ID ${fileId} 对应的文件未找到`);
            }
          }
        } catch (error) {
          this.logError('从Background Script获取文件失败:', error);
          // 降级到原有方案
          filesToUpload = this.collectLegacyFiles(data);
        }
      } else {
        // 原有方案：使用传统的文件数据
        this.log('使用传统文件管理系统...');
        filesToUpload = this.collectLegacyFiles(data);
      }

      // 上传文件
      if (filesToUpload.length > 0) {
        this.log('开始上传文件，总数量:', filesToUpload.length);
        await this.uploadFilesOptimized(filesToUpload);
      } else {
        this.log('没有检测到任何文件数据');
      }

      // 5. 验证发布按钮状态（但不点击）
      await this.waitForPublishReady();

      this.log(`X平台内容预填充完成，等待用户手动发布 [${publishId}]`);

      return {
        success: true,
        platform: 'x',
        message: '内容预填充完成，请手动确认并发布',
        url: window.location.href,
        action: 'prefilled', // 标记为预填充完成
        publishId: publishId
      };

    } catch (error) {
      this.logError(`X平台内容预填充失败 [${publishId}]:`, error);
      return {
        success: false,
        platform: 'x',
        message: error.message || '内容预填充失败',
        publishId: publishId
      };
    }
  }

  /**
   * publishContent方法 - AdapterInitializer兼容性别名
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>} - 发布结果
   */
  async publishContent(data) {
    return await this.publish(data);
  }

  /**
   * 检查登录状态 - 增强版本，支持多平台并发场景
   * @returns {Promise<boolean>} - 是否已登录
   */
  async checkLoginStatus() {
    this.log('检查X平台登录状态...');

    // 多重检测策略，增加重试机制以应对并发场景
    const maxAttempts = 3;
    const checkDelay = 500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 策略1: 检查文本输入框是否存在（最可靠的登录指示器）
        const textbox = document.querySelector(this.selectors.loginIndicator);
        if (textbox && textbox.offsetParent !== null) { // 确保元素可见
          this.log('✅ 检测到文本输入框，用户已登录');
          return true;
        }

        // 策略2: 检查用户菜单按钮
        const userMenu = document.querySelector(this.selectors.loginIndicatorFallback);
        if (userMenu && userMenu.offsetParent !== null) {
          this.log('✅ 检测到用户菜单，用户已登录');
          return true;
        }

        // 策略3: 检查主列是否存在
        const primaryColumn = document.querySelector(this.selectors.loginIndicatorGeneric);
        if (primaryColumn && primaryColumn.offsetParent !== null) {
          this.log('✅ 检测到主列，用户可能已登录');
          return true;
        }

        // 策略4: 检查URL路径（登录用户通常在/home路径）
        if (window.location.pathname === '/home' || window.location.pathname.startsWith('/home')) {
          this.log('✅ 检测到home路径，用户可能已登录');
          return true;
        }

        // 策略5: 检查是否存在登录页面特征
        const loginForm = document.querySelector('form[action*="login"]');
        const loginButton = document.querySelector('[data-testid="LoginForm_Login_Button"]');
        if (!loginForm && !loginButton) {
          this.log('✅ 未检测到登录表单，用户可能已登录');
          return true;
        }

        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxAttempts) {
          this.log(`登录状态检测第${attempt}次未成功，${checkDelay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, checkDelay));
        }

      } catch (error) {
        this.log(`登录状态检测第${attempt}次出现异常:`, error.message);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, checkDelay));
        }
      }
    }

    this.log('❌ 多次检测后仍未确认登录状态，请先登录X平台');
    return false;
  }

  /**
   * 等待页面就绪 - 增强版本，支持多平台并发场景
   */
  async waitForPageReady() {
    this.log('等待X平台页面就绪...');

    // 增加页面稳定性检查
    const maxWaitTime = 10000; // 增加到10秒
    const stabilityCheckDelay = 1000; // 稳定性检查延迟

    try {
      // 等待DOM完全加载
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', resolve, { once: true });
          }
        });
      }

      // 等待文本输入框出现
      const textbox = await this.waitForElement(this.selectors.editor, maxWaitTime);
      if (!textbox) {
        throw new Error('X平台页面未就绪，未找到文本输入框');
      }

      // 稳定性检查：确保元素在短时间内保持可用
      await new Promise(resolve => setTimeout(resolve, stabilityCheckDelay));

      const textboxStable = document.querySelector(this.selectors.editor);
      if (!textboxStable || textboxStable.offsetParent === null) {
        throw new Error('X平台页面元素不稳定，可能存在并发冲突');
      }

      // 检查页面是否处于可交互状态
      if (textboxStable.disabled || textboxStable.readOnly) {
        this.log('⚠️ 文本输入框暂时不可编辑，等待恢复...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      this.log('✅ X平台页面已就绪且稳定');
    } catch (error) {
      this.log('❌ X平台页面就绪检查失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取编辑器元素
   * @returns {Promise<HTMLElement>} - 编辑器元素
   */
  async getEditor() {
    this.log('查找X平台编辑器...');

    // 策略1: 使用主选择器
    let editor = document.querySelector(this.selectors.editor);
    if (editor) {
      this.log('✅ 使用主选择器找到编辑器');
      return editor;
    }

    // 策略2: 使用备用选择器
    editor = document.querySelector(this.selectors.editorFallback);
    if (editor) {
      this.log('✅ 使用备用选择器找到编辑器');
      return editor;
    }

    // 策略3: 使用通用选择器
    editor = document.querySelector(this.selectors.editorGeneric);
    if (editor) {
      this.log('✅ 使用通用选择器找到编辑器');
      return editor;
    }

    throw new Error('未找到X平台编辑器');
  }

  /**
   * 填充文本内容 - 基于Playwright MCP验证的精准方法
   * @param {Object} data - 发布数据
   */
  async fillTextContent(data) {
    this.log('开始填充文本内容...');

    const editor = await this.getEditor();

    // 构建完整内容 (X平台没有标题字段)
    const fullContent = data.content;

    // 使用验证过的精准注入方法
    await this.injectContentToEditor(editor, fullContent);

    this.log('文本内容填充完成:', fullContent);
  }

  /**
   * 注入内容到编辑器 - 针对X平台Draft.js编辑器优化
   * @param {HTMLElement} editor - 编辑器元素
   * @param {string} content - 内容
   */
  async injectContentToEditor(editor, content) {
    this.log('开始注入内容到X平台编辑器...', {
      contentLength: content.length,
      editorType: 'Draft.js'
    });

    // 1. 聚焦编辑器
    editor.focus();
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. 使用经过Playwright MCP验证的Draft.js结构方法
    try {
      const success = await this.tryDraftJSStructureMethod(editor, content);
      if (success) {
        this.log('✅ Draft.js结构方法成功');
        return;
      }
    } catch (error) {
      this.log('⚠️ Draft.js结构方法失败:', error.message);
    }

    // 3. 备用方法：ExecCommand
    try {
      const success = await this.tryExecCommandMethod(editor, content);
      if (success) {
        this.log('✅ ExecCommand方法成功');
        return;
      }
    } catch (error) {
      this.log('⚠️ ExecCommand方法失败:', error.message);
    }

    // 4. 最后备用：直接文本方法
    try {
      const success = await this.tryDirectTextMethod(editor, content);
      if (success) {
        this.log('✅ 直接文本方法成功');
        return;
      }
    } catch (error) {
      this.log('⚠️ 直接文本方法失败:', error.message);
    }

    throw new Error('所有X平台内容注入策略都失败了');
  }

  /**
   * 从扩展获取文件 - 参考微博实现
   * @param {string} fileId - 文件ID
   * @returns {Promise<File>} - 文件对象
   */
  async getFileFromExtension(fileId) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'getFile',
        fileId: fileId
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response.success && response.arrayData) {
          const uint8Array = new Uint8Array(response.arrayData);
          const blob = new Blob([uint8Array], { type: response.metadata.type });
          const file = new File([blob], response.metadata.name, {
            type: response.metadata.type,
            lastModified: response.metadata.lastModified
          });
          resolve(file);
        } else {
          reject(new Error(response.error || 'Failed to get file'));
        }
      });
    });
  }

  /**
   * 收集传统文件数据 - 参考微博实现
   * @param {Object} data - 发布数据
   * @returns {Array} - 文件数组
   */
  collectLegacyFiles(data) {
    const files = [];

    // 处理图片数据
    if (data.images && data.images.length > 0) {
      for (const imageData of data.images) {
        if (imageData.dataUrl) {
          const file = this.createFileFromBase64(imageData);
          if (file) {
            files.push(file);
          }
        }
      }
    }

    // 处理视频数据
    if (data.videos && data.videos.length > 0) {
      for (const videoData of data.videos) {
        if (videoData.dataUrl) {
          const file = this.createFileFromBase64(videoData);
          if (file) {
            files.push(file);
          }
        }
      }
    }

    return files;
  }

  /**
   * 从Base64创建文件对象 - 优化版本
   * @param {Object} fileData - 文件数据
   * @returns {File|null} - 文件对象
   */
  createFileFromBase64(fileData) {
    try {
      const { dataUrl, name, type } = fileData;

      // 解析Base64数据
      const base64Data = dataUrl.split(',')[1];

      // 使用更高效的方法转换Base64
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);

      // 优化：使用单次循环填充数组
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type });
      return new File([blob], name, { type });
    } catch (error) {
      this.logError('创建文件对象失败:', error);
      return null;
    }
  }

  /**
   * 获取文件输入控件
   * @returns {Promise<HTMLInputElement>} - 文件输入控件
   */
  async getFileInput() {
    this.log('查找X平台文件输入控件...');

    // 策略1: 使用主选择器
    let fileInput = document.querySelector(this.selectors.fileInput);
    if (fileInput) {
      this.log('✅ 使用主选择器找到文件输入控件');
      return fileInput;
    }

    // 策略2: 使用备用选择器
    fileInput = document.querySelector(this.selectors.fileInputFallback);
    if (fileInput) {
      this.log('✅ 使用备用选择器找到文件输入控件');
      return fileInput;
    }

    throw new Error('未找到X平台文件输入控件');
  }

  /**
   * 优化的文件上传方法 - 基于Playwright验证的DataTransfer方法
   * @param {Array} files - 文件数组
   */
  async uploadFilesOptimized(files) {
    this.log('开始优化文件上传流程...');

    try {
      // 查找文件输入元素 - 使用统一的getFileInput方法
      const fileInput = await this.getFileInput();
      if (!fileInput) {
        throw new Error('未找到文件上传输入元素');
      }

      // 处理文件数据
      const filesToUpload = [];

      for (const fileData of files) {
        if (fileData instanceof File) {
          // 新方案：直接使用File对象
          filesToUpload.push(fileData);
          this.log(`添加File对象: ${fileData.name} (${fileData.size} bytes)`);
        } else if (fileData.dataUrl) {
          // 传统方案：从Base64转换
          const file = this.createFileFromBase64(fileData);
          if (file) {
            filesToUpload.push(file);
            this.log(`从Base64创建文件: ${file.name} (${file.size} bytes)`);
          }
        } else {
          this.log('跳过无效的文件数据:', fileData);
        }
      }

      if (filesToUpload.length === 0) {
        throw new Error('没有有效的文件可以上传');
      }

      // 验证文件格式和大小
      const validFiles = this.validateFiles(filesToUpload);

      // 使用DataTransfer上传文件（X平台验证有效）
      const dataTransfer = new DataTransfer();
      validFiles.forEach(file => {
        dataTransfer.items.add(file);
      });

      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));

      this.log(`成功上传 ${validFiles.length} 个文件到X平台`);

      // 等待上传完成
      await this.waitForUploadComplete();

    } catch (error) {
      this.logError('优化文件上传失败:', error);
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
      // 检查文件类型
      const isValidImage = limits.allowedImageTypes.includes(file.type);
      const isValidVideo = limits.allowedVideoTypes.includes(file.type);

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

    return validFiles;
  }

  /**
   * 等待上传完成
   */
  async waitForUploadComplete() {
    this.log('等待X平台处理文件上传...');

    // X平台上传通常很快，等待1.5秒
    await new Promise(resolve => setTimeout(resolve, this.config.delays.UPLOAD_WAIT));

    this.log('文件上传处理完成');
  }

  /**
   * 等待发布按钮可用 - 优化版本
   */
  async waitForPublishReady() {
    this.log('等待发布按钮变为可用状态...');

    // 查找发送按钮
    const sendButton = this.findSendButton();

    if (!sendButton) {
      throw new Error('未找到发送按钮');
    }

    // 优化：使用更短的等待间隔和更合理的超时
    const maxAttempts = 20; // 10秒总超时
    const checkInterval = 500; // 500ms检查间隔

    for (let attempts = 0; attempts < maxAttempts && sendButton.disabled; attempts++) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    if (sendButton.disabled) {
      this.log('⚠️ 发布按钮仍未启用，但继续执行');
    } else {
      this.log('✅ 发布按钮已准备就绪');
    }
  }

  /**
   * 查找发送按钮 - 基于Playwright MCP验证的方法
   * @returns {HTMLButtonElement|null} - 发送按钮元素
   */
  findSendButton() {
    // 策略1: 使用主选择器
    let button = document.querySelector(this.selectors.sendButton);
    if (button) {
      this.log('✅ 使用主选择器找到发送按钮');
      return button;
    }

    // 策略2: 使用备用选择器
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.includes('发帖')) {
        this.log('✅ 使用备用选择器找到发送按钮');
        return btn;
      }
    }

    return null;
  }

  /**
   * 等待元素出现
   * @param {string} selector - 选择器
   * @param {number} timeout - 超时时间
   * @returns {Promise<HTMLElement>} - 元素
   */
  async waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
          return;
        }

        setTimeout(check, 100);
      };

      check();
    });
  }

  /**
   * Draft.js结构方法 - 基于Playwright MCP验证的改进方法
   * @param {HTMLElement} editor - 编辑器元素
   * @param {string} content - 内容
   * @returns {Promise<boolean>} 是否成功
   */
  async tryDraftJSStructureMethod(editor, content) {
    try {
      this.log('尝试Draft.js结构方法...');

      // 1. 聚焦编辑器
      editor.focus();
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. 温和地清空内容（避免破坏状态）
      if (editor.textContent) {
        // 选择所有内容并删除
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        selection.removeAllRanges();
        selection.addRange(range);

        // 使用execCommand删除
        document.execCommand('delete', false, null);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 3. 使用execCommand插入文本（更兼容的方法）
      const success = document.execCommand('insertText', false, content);

      if (!success) {
        // 备用方法：直接设置textContent
        editor.textContent = content;
      }

      // 4. 触发完整的事件序列来恢复X平台状态
      const events = [
        new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: content
        }),
        new Event('change', { bubbles: true }),
        new KeyboardEvent('keyup', { bubbles: true, key: 'End' }),
        new Event('blur', { bubbles: true }),
        new Event('focus', { bubbles: true })
      ];

      for (const event of events) {
        editor.dispatchEvent(event);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 5. 验证结果
      await new Promise(resolve => setTimeout(resolve, 300));
      const contentMatches = editor.textContent.includes(content);

      this.log('Draft.js结构方法结果:', {
        success: contentMatches,
        editorContent: editor.textContent.substring(0, 50) + '...',
        method: success ? 'execCommand' : 'textContent'
      });

      return contentMatches;

    } catch (error) {
      this.log('Draft.js结构方法异常:', error.message);
      return false;
    }
  }

  /**
   * ExecCommand方法 - 改进版本
   * @param {HTMLElement} editor - 编辑器元素
   * @param {string} content - 内容
   * @returns {Promise<boolean>} 是否成功
   */
  async tryExecCommandMethod(editor, content) {
    try {
      this.log('尝试ExecCommand方法...');

      // 1. 聚焦编辑器
      editor.focus();
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. 清空现有内容（温和方式）
      if (editor.textContent) {
        // 选择所有内容
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        selection.removeAllRanges();
        selection.addRange(range);

        // 删除选中内容
        document.execCommand('delete', false, null);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 3. 使用document.execCommand插入文本
      const success = document.execCommand('insertText', false, content);

      // 4. 触发事件来更新状态
      const events = [
        new InputEvent('input', { bubbles: true, inputType: 'insertText', data: content }),
        new Event('change', { bubbles: true }),
        new KeyboardEvent('keyup', { bubbles: true, key: 'End' })
      ];

      for (const event of events) {
        editor.dispatchEvent(event);
      }

      // 5. 验证结果
      await new Promise(resolve => setTimeout(resolve, 200));
      const contentMatches = editor.textContent.includes(content);

      this.log('ExecCommand方法结果:', {
        success: contentMatches,
        execCommandSuccess: success,
        editorContent: editor.textContent.substring(0, 50) + '...'
      });

      return contentMatches;

    } catch (error) {
      this.log('ExecCommand方法异常:', error.message);
      return false;
    }
  }

  /**
   * 直接文本方法
   * @param {HTMLElement} editor - 编辑器元素
   * @param {string} content - 内容
   * @returns {Promise<boolean>} 是否成功
   */
  async tryDirectTextMethod(editor, content) {
    try {
      editor.innerHTML = '';
      editor.textContent = content;

      // 触发change事件
      const changeEvent = new Event('change', { bubbles: true });
      editor.dispatchEvent(changeEvent);

      // 验证结果
      await new Promise(resolve => setTimeout(resolve, 200));
      return editor.textContent.includes(content);

    } catch (error) {
      this.log('直接文本方法异常:', error.message);
      return false;
    }
  }



  /**
   * 尝试激活发布按钮
   * @param {HTMLElement} editor - 编辑器元素
   * @param {string} content - 内容
   * @returns {Promise<boolean>} 是否成功激活
   */
  async tryActivatePublishButton(editor, content) {
    try {
      this.log('尝试激活发布按钮...');

      // 1. 确保编辑器聚焦
      editor.focus();

      // 2. 触发额外的事件来激活按钮
      const activationEvents = [
        // 模拟用户交互
        new Event('mousedown', { bubbles: true }),
        new Event('mouseup', { bubbles: true }),
        new Event('click', { bubbles: true }),

        // 键盘事件
        new KeyboardEvent('keydown', { bubbles: true, key: 'a' }),
        new KeyboardEvent('keyup', { bubbles: true, key: 'a' }),

        // 输入事件
        new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: content
        }),
        new InputEvent('input', { bubbles: true }),

        // 状态变化事件
        new Event('change', { bubbles: true }),
        new Event('blur', { bubbles: true }),
        new Event('focus', { bubbles: true })
      ];

      for (const event of activationEvents) {
        editor.dispatchEvent(event);
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      // 3. 检查发布按钮状态
      await new Promise(resolve => setTimeout(resolve, 500));

      const publishButton = document.querySelector('[data-testid="tweetButtonInline"]');
      const isEnabled = publishButton && !publishButton.disabled;

      this.log('发布按钮状态检查:', {
        found: !!publishButton,
        enabled: isEnabled,
        buttonText: publishButton ? publishButton.textContent : 'N/A'
      });

      return isEnabled;

    } catch (error) {
      this.log('激活发布按钮异常:', error.message);
      return false;
    }
  }
}

// 注册到全局命名空间
window.XAdapter = XAdapter;

} // 结束防重复声明检查

/**
 * 设置X平台消息监听器 - 参考微博实现
 */
function setupXMessageListener(adapter) {
  let isProcessing = false;

  const handleMessage = async (message, sender, sendResponse) => {
    if (message.action !== 'publish' || isProcessing) {
      return false;
    }

    isProcessing = true;
    console.log('X平台内容脚本收到消息:', message);

    try {
      const result = await adapter.publish(message.data);
      console.log('X平台发布结果:', result);
      sendResponse(result);
    } catch (error) {
      console.error('X平台发布错误:', error);
      sendResponse({
        success: false,
        platform: 'x',
        error: error.message || '发布失败',
        strategy: 'unified_architecture'
      });
    } finally {
      // 重置处理标志
      setTimeout(() => { isProcessing = false; }, 1000);
    }

    return true;
  };

  chrome.runtime.onMessage.addListener(handleMessage);
  console.log('X平台消息监听器设置完成');
}

/**
 * X平台适配器初始化逻辑
 */
async function initializeXAdapter() {
  try {
    console.log('初始化XAdapter...');

    // 等待公共基类加载完成
    await checkBaseClasses();

    // 创建适配器实例
    const adapter = new XAdapter();

    // 注册到全局命名空间
    window.MomentDots = window.MomentDots || {};
    window.MomentDots.xAdapter = adapter;

    // 设置消息监听器
    setupXMessageListener(adapter);

    console.log('✅ XAdapter初始化成功，platform:', adapter.platform);
    return true;
  } catch (error) {
    console.error('❌ XAdapter初始化失败:', error);
    return false;
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeXAdapter);
} else {
  initializeXAdapter();
}

})(); // 结束IIFE

console.log('X平台适配器脚本加载完成');
