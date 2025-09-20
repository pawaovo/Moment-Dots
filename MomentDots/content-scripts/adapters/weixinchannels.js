/**
 * 微信视频号平台适配器
 * 基于统一的MutationObserver和配置管理基类
 * 支持Shadow DOM和WUJIE-APP微前端架构
 *
 * 技术特点：
 * - Shadow DOM穿透访问
 * - DataTransfer API文件上传
 * - 支持多图片上传（最多18张）
 */

console.log('微信视频号适配器加载中...');

(function() {
  'use strict';

/**
 * 微信视频号平台配置管理器
 */
class WeixinChannelsConfigManager extends PlatformConfigBase {
  constructor() {
    super('weixinchannels');
  }

  /**
   * 加载微信视频号特定配置
   */
  loadConfig() {
    const weixinChannelsConfig = {
      delays: this.createDelayConfig({
        FAST_CHECK: 200,
        NORMAL_WAIT: 500,
        UPLOAD_WAIT: 1500,
        ELEMENT_WAIT: 3000
      }),

      limits: this.createLimitsConfig({
        maxContentLength: 1000,
        maxTitleLength: 22,
        maxMediaFiles: 18,
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        allowedVideoTypes: ['video/mp4', 'video/x-m4v', 'video/quicktime', 'video/webm'],
        maxFileSize: 20 * 1024 * 1024,
        maxVideoSize: 20 * 1024 * 1024 * 1024 // 20GB
      }),

      performance: this.createPerformanceConfig({
        enableBatchProcessing: true,
        enableSmartRetry: true,
        maxRetryAttempts: 3,
        enablePerformanceMonitoring: true
      }),

      selectors: {
        shadowHost: 'wujie-app',
        // 图文动态页面选择器（原有配置）
        image: {
          titleInput: 'input[placeholder="填写标题, 22个字符内"]',
          contentArea: '.input-editor',
          fileInput: 'input[type="file"][accept="image/*"]'
        },
        // 短视频页面选择器（基于Playwright MCP验证）
        video: {
          titleInput: 'input[placeholder="概括视频主要内容，字数建议6-16个字符"]',
          contentArea: '.input-editor',
          fileInput: 'input[type="file"][accept*="video"]'
        },
        fallbackSelectors: {
          titleInput: [
            'input.weui-desktop-form__input[placeholder*="标题"]',
            'input[placeholder*="填写标题"]',
            'input[placeholder*="概括视频主要内容"]'
          ],
          contentArea: [
            '.input-editor',
            'div[contenteditable="true"]',
            '.editor-content'
          ]
        }
      },

      features: {
        supportsShadowDOM: true,
        supportsMultipleFiles: true,
        usesDataTransferAPI: true
      }
    };

    return this.loadPlatformConfig(weixinChannelsConfig);
  }
}

/**
 * 微信视频号DOM监听器
 */
class WeixinChannelsMutationObserver extends MutationObserverBase {
  constructor(adapter) {
    super('weixinchannels');
    this.adapter = adapter;
  }

  /**
   * 检查页面是否为微信视频号发布页面
   * 支持图文动态页面和短视频页面
   */
  isTargetPage() {
    // 复用适配器的页面类型检测逻辑
    const pageType = this.adapter.detectPageType();
    return pageType === 'video' || pageType === 'image';
  }

  /**
   * 检查关键元素是否存在 - 支持页面类型检测
   */
  checkElements() {
    if (!this.isTargetPage()) {
      return { ready: false, reason: '不是目标页面' };
    }

    const shadowRoot = this.adapter.getShadowRoot();
    if (!shadowRoot) {
      return { ready: false, reason: 'Shadow DOM未加载' };
    }

    // 使用适配器的getCurrentSelectors方法获取正确的选择器
    const selectors = this.adapter.getCurrentSelectors();

    const titleInput = this.adapter.findElementInShadow(
      selectors.titleInput,
      this.adapter.config.selectors.fallbackSelectors.titleInput
    );
    const fileInput = this.adapter.findElementInShadow(selectors.fileInput);

    if (!titleInput || !fileInput) {
      // 提供更详细的调试信息
      const pageType = this.adapter.detectPageType();
      return {
        ready: false,
        reason: '关键元素未找到',
        debug: {
          pageType: pageType,
          titleInputSelector: selectors.titleInput,
          fileInputSelector: selectors.fileInput,
          titleInputFound: !!titleInput,
          fileInputFound: !!fileInput,
          shadowRootFound: !!shadowRoot
        }
      };
    }

    return {
      ready: true,
      elements: { titleInput, fileInput },
      shadowRoot
    };
  }
}

/**
 * 🚀 微信视频号平台适配器主类 - 升级为FileProcessorBase
 * 继承FileProcessorBase以支持智能文件获取和即时预览功能
 */
class WeixinChannelsPlatformAdapter extends FileProcessorBase {
  constructor() {
    // 🚀 继承FileProcessorBase以获得智能文件获取能力
    super('weixinchannels', {});
    this.configManager = new WeixinChannelsConfigManager();
    this.config = this.configManager.loadConfig();
    this.mutationObserver = new WeixinChannelsMutationObserver(this);

    // 性能优化：缓存页面类型检测结果
    this._pageTypeCache = null;
    this._lastUrl = null;

    this.log('🚀 微信视频号适配器初始化完成 - 已升级为FileProcessorBase，支持智能文件获取');
  }

  /**
   * 🚀 延迟函数（添加缺失的方法）
   * @param {number} ms - 延迟毫秒数
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取Shadow DOM根节点
   */
  getShadowRoot() {
    const wujieApp = document.querySelector('wujie-app');
    return wujieApp?.shadowRoot || null;
  }

  /**
   * 检测页面类型（基于URL，参考微博平台实现）
   * 性能优化：使用缓存避免重复检测
   * @returns {string} 'video' | 'image'
   */
  detectPageType() {
    const url = window.location.href;

    // 性能优化：如果URL未变化，返回缓存结果
    if (this._lastUrl === url && this._pageTypeCache) {
      return this._pageTypeCache;
    }

    let pageType;

    // 短视频发布页面：https://channels.weixin.qq.com/platform/post/create
    if (url.includes('/platform/post/create')) {
      this.log('🎬 检测到短视频发布页面 (URL匹配)');
      pageType = 'video';
    }
    // 图文动态页面：https://channels.weixin.qq.com/platform/post/finderNewLifeCreate
    else if (url.includes('/platform/post/finderNewLifeCreate')) {
      this.log('📷 检测到图文动态页面 (URL匹配)');
      pageType = 'image';
    }
    // 默认返回图文模式
    else {
      this.log('📷 默认检测为图文动态页面');
      pageType = 'image';
    }

    // 更新缓存
    this._lastUrl = url;
    this._pageTypeCache = pageType;

    return pageType;
  }

  /**
   * 在Shadow DOM中查找元素，支持备用选择器
   */
  findElementInShadow(selector, fallbackSelectors = []) {
    const shadowRoot = this.getShadowRoot();
    if (!shadowRoot) return null;

    // 尝试主选择器
    let element = shadowRoot.querySelector(selector);
    if (element) return element;

    // 尝试备用选择器
    for (const fallbackSelector of fallbackSelectors) {
      element = shadowRoot.querySelector(fallbackSelector);
      if (element) {
        this.log(`使用备用选择器找到元素: ${fallbackSelector}`);
        return element;
      }
    }

    return null;
  }

  /**
   * 获取当前页面类型对应的选择器配置
   * @returns {Object} 选择器配置对象
   */
  getCurrentSelectors() {
    const pageType = this.detectPageType();
    const selectors = this.config.selectors[pageType];

    if (!selectors) {
      this.log(`⚠️ 未找到页面类型 ${pageType} 的选择器配置，使用图文模式默认配置`);
      // 使用图文模式作为默认配置
      return this.config.selectors.image;
    }

    this.log(`✅ 使用 ${pageType} 页面选择器配置`);
    return selectors;
  }

  /**
   * 重写标题输入框查找方法 - 支持Shadow DOM和页面类型检测
   */
  findTitleInput() {
    const selectors = this.getCurrentSelectors();
    return this.findElementInShadow(
      selectors.titleInput,
      this.config.selectors.fallbackSelectors.titleInput
    );
  }

  /**
   * 重写文件输入框查找方法 - 支持Shadow DOM和页面类型检测
   */
  findFileInput() {
    const selectors = this.getCurrentSelectors();
    return this.findElementInShadow(selectors.fileInput);
  }

  /**
   * 🚀 查找内容编辑区域 - 支持Shadow DOM和备用选择器
   */
  findContentArea() {
    const selectors = this.getCurrentSelectors();
    return this.findElementInShadow(
      selectors.contentArea,
      this.config.selectors.fallbackSelectors?.contentArea || []
    );
  }

  /**
   * 重写激活编辑区域方法 - 使用点击激活
   * 修复：使用有效的CSS选择器和DOM查询方法
   */
  async activateEditingArea() {
    this.log('激活内容编辑区域...');

    const shadowRoot = this.getShadowRoot();
    if (!shadowRoot) {
      throw new Error('Shadow DOM未找到');
    }

    // 查找包含"描述"文本的可编辑元素
    const allElements = shadowRoot.querySelectorAll('[class*="desc"], [class*="placeholder"], div[class*="input"], .input-editor, div[contenteditable="true"]');
    const triggerElement = Array.from(allElements).find(el => {
      const text = el.textContent || el.innerText || '';
      return text.includes('添加描述') || text.includes('描述') || el.placeholder?.includes('描述');
    });

    if (triggerElement) {
      try {
        triggerElement.click();
        await this.delay(this.config.delays.NORMAL_WAIT);
        this.log('✅ 内容区域已激活');
        return true;
      } catch (clickError) {
        this.log('⚠️ 点击激活失败，但继续执行:', clickError.message);
        return true;
      }
    } else {
      this.log('⚠️ 未找到激活触发器，尝试直接查找内容区域');
      return true;
    }
  }

  /**
   * 等待Shadow DOM和关键元素加载
   */
  async waitForElements() {
    this.log('等待Shadow DOM和关键元素加载...');

    const maxAttempts = 30;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      const checkResult = this.mutationObserver.checkElements();

      if (checkResult.ready) {
        this.log('✅ 所有关键元素已就绪');
        return checkResult;
      }

      this.log(`⏳ 等待元素加载... (${attempts + 1}/${maxAttempts}) - ${checkResult.reason}`);
      await this.delay(this.config.delays.ELEMENT_WAIT / 10);
    }

    throw new Error('等待元素超时：关键元素未能在预期时间内加载');
  }

  /**
   * 🚀 标题注入方法 - 优化版本（支持预处理数据）
   */
  async injectTitle(title, isPreProcessed = false) {
    if (!title?.trim()) {
      this.log('标题为空，跳过注入');
      return true;
    }

    // 🎯 如果已经是预处理的数据，直接使用；否则使用本地截断逻辑作为备用
    const finalTitle = isPreProcessed ?
      title :
      this._truncateContent(title, this.config.limits.maxTitleLength, '标题');

    this.log(`📝 标题处理: ${isPreProcessed ? '使用预处理数据' : '使用本地截断'}`, {
      originalLength: title.length,
      finalLength: finalTitle.length,
      isPreProcessed
    });

    const titleInput = this.findTitleInput();
    if (!titleInput) {
      throw new Error('标题输入框未找到');
    }

    // 使用统一的内容注入方法
    this._injectToElement(titleInput, finalTitle);
    this.log(`✅ 标题注入成功: ${finalTitle}`);
    return true;
  }

  /**
   * 🚀 内容注入方法 - 优化版本
   */
  async injectContent(content) {
    if (!content?.trim()) {
      this.log('内容为空，跳过注入');
      return true;
    }

    // 使用统一的内容截断方法
    const truncatedContent = this._truncateContent(content, this.config.limits.maxContentLength, '内容');

    // 激活编辑区域
    await this.activateEditingArea();

    const contentArea = this.findContentArea();
    if (!contentArea) {
      throw new Error('内容编辑区域未找到');
    }

    // 使用统一的内容注入方法
    this._injectToElement(contentArea, truncatedContent);
    this.log(`✅ 内容注入成功: ${truncatedContent.substring(0, 50)}...`);
    return true;
  }

  /**
   * 🚀 统一的内容截断方法 - 避免重复代码
   * 注意：此方法仅作为备用，优先使用主应用层的预处理数据
   * @param {string} content - 原始内容
   * @param {number} maxLength - 最大长度
   * @param {string} type - 内容类型（用于日志）
   * @returns {string} 截断后的内容
   */
  _truncateContent(content, maxLength, type) {
    if (!content || !maxLength || content.length <= maxLength) {
      return content;
    }

    const truncated = content.substring(0, maxLength);
    this.log(`${type}过长，已截断: ${content.length} -> ${truncated.length} 字符`);
    return truncated;
  }

  /**
   * 🚀 统一的元素内容注入方法 - 避免重复代码
   * @param {HTMLElement} element - 目标元素
   * @param {string} content - 要注入的内容
   */
  _injectToElement(element, content) {
    // 清空并注入内容
    if (element.contentEditable === 'true') {
      // 可编辑div
      element.innerHTML = '';
      element.textContent = content;
    } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      // 输入框
      element.value = '';
      element.value = content;
    }

    // 🚀 使用统一的事件触发方法
    this._triggerEvents(element, ['input', 'change', 'blur']);
  }

  /**
   * 🚀 统一的事件触发方法 - 避免重复代码
   * @param {HTMLElement} element - 目标元素
   * @param {Array<string>} eventTypes - 事件类型数组
   */
  _triggerEvents(element, eventTypes) {
    eventTypes.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });
  }

  // 🚀 优化：删除冗余的getFileFromExtension方法，现在由FileProcessorBase统一处理

  /**
   * 重写文件数据处理方法 - 添加文件验证和数量限制
   */
  async processFileData(data) {
    // 使用基类的文件处理方法
    let filesToUpload = await super.processFileData(data);

    // 优化：使用单次过滤和验证
    const { allowedImageTypes, maxFileSize, maxMediaFiles } = this.config.limits;

    return filesToUpload
      .filter(file => this._validateFile(file, allowedImageTypes, maxFileSize))
      .slice(0, maxMediaFiles);
  }

  /**
   * 文件验证方法（内部方法）- 支持页面类型检测
   * 性能优化：缓存页面类型，避免重复检测
   */
  _validateFile(file, allowedTypes, maxSize) {
    // 性能优化：使用缓存的页面类型
    const pageType = this._pageTypeCache || this.detectPageType();

    // 根据页面类型调整验证逻辑
    if (pageType === 'video') {
      return this._validateVideoFile(file);
    } else {
      return this._validateImageFile(file, allowedTypes, maxSize);
    }
  }

  /**
   * 验证视频文件（内部方法）
   */
  _validateVideoFile(file) {
    const { allowedVideoTypes, maxVideoSize } = this.config.limits;

    if (!allowedVideoTypes.includes(file.type) && !file.type.startsWith('video/')) {
      this.log(`短视频页面不支持此文件格式: ${file.name} (${file.type})`);
      return false;
    }

    if (file.size > maxVideoSize) {
      this.log(`视频文件过大: ${file.name} (${(file.size / 1024 / 1024 / 1024).toFixed(1)}GB > 20GB)`);
      return false;
    }

    this.log(`✅ 视频文件验证通过: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    return true;
  }

  /**
   * 验证图片文件（内部方法）
   */
  _validateImageFile(file, allowedTypes, maxSize) {
    if (!allowedTypes.includes(file.type)) {
      this.log(`图文页面不支持此文件格式: ${file.name} (${file.type})`);
      return false;
    }

    if (file.size > maxSize) {
      this.log(`图片文件过大: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return false;
    }

    this.log(`✅ 图片文件验证通过: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    return true;
  }

  /**
   * 主要的内容发布方法 - 支持模式分离（参考微博平台实现）
   */
  async publishContent(data) {
    try {
      this.log('🚀 开始微信视频号内容发布流程...', {
        hasContent: !!data.content,
        hasTitle: !!data.title,
        hasFiles: !!(data.files && data.files.length > 0),
        hasFileIds: !!(data.fileIds && data.fileIds.length > 0),
        currentUrl: window.location.href
      });

      // 等待页面和Shadow DOM加载完成
      await this.waitForElements();

      // 检测页面类型，选择正确的发布流程
      const pageType = this.detectPageType();

      this.log('页面类型检测:', {
        pageType: pageType,
        currentUrl: window.location.href
      });

      // 根据页面类型选择发布流程（不再基于内容类型）
      if (pageType === 'video') {
        // 短视频发布流程：只有在短视频页面时才执行
        this.log('🎬 执行短视频发布流程');
        return await this.publishVideoContent(data);
      } else {
        // 图文发布流程：默认流程，支持图片内容
        this.log('📷 执行图文发布流程');
        return await this.publishImageContent(data);
      }

    } catch (error) {
      this.logError('❌ 微信视频号内容发布失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 短视频发布流程（新功能）
   * 注意：此方法只应在短视频发布页面被调用
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>} - 发布结果
   */
  async publishVideoContent(data) {
    this.log('🎬 开始微信视频号短视频发布流程...');

    try {
      // 1. 验证当前确实在短视频发布页面
      if (!window.location.href.includes('/platform/post/create')) {
        throw new Error('短视频发布流程只能在短视频发布页面执行');
      }

      // 2. 处理视频文件上传
      let uploadSuccess = false;
      if (data.fileIds?.length || data.files?.length) {
        try {
          await this.uploadFiles(data);
          uploadSuccess = true;
          this.log('✅ 视频文件上传成功');
        } catch (uploadError) {
          this.logError('视频上传失败:', uploadError);
          throw uploadError; // 上传失败是致命错误
        }
      }

      // 3. 等待视频处理完成后，填充文本内容
      let contentFillSuccess = false;
      if (data.content) {
        try {
          await this.delay(2000); // 等待视频处理
          await this.activateEditingArea();
          await this.injectContent(data.content);
          contentFillSuccess = true;
          this.log('✅ 视频内容填充成功');
        } catch (contentError) {
          this.log('⚠️ 视频内容填充失败，但不影响核心功能:', contentError.message);
          // 内容填充失败不是致命错误，继续执行
        }
      }

      // 4. 填充短标题
      let titleFillSuccess = false;
      if (data.title) {
        try {
          await this.injectTitle(data.title);
          titleFillSuccess = true;
          this.log('✅ 短标题填充成功');
        } catch (titleError) {
          this.log('⚠️ 短标题填充失败，但不影响核心功能:', titleError.message);
          // 标题填充失败不是致命错误
        }
      }

      this.log('✅ 短视频内容预填充完成');

      return {
        success: true,
        message: '短视频内容预填充完成，请手动确认并发布',
        url: window.location.href,
        action: 'video_prefilled',
        contentType: 'video',
        details: {
          uploadSuccess: uploadSuccess,
          contentFillSuccess: contentFillSuccess,
          titleFillSuccess: titleFillSuccess
        }
      };

    } catch (error) {
      this.logError('短视频发布流程失败:', error);
      throw error;
    }
  }

  /**
   * 图文发布流程（原有逻辑）
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>} - 发布结果
   */
  async publishImageContent(data) {
    this.log('📷 开始微信视频号图文发布流程...');

    try {
      // 验证当前确实在图文发布页面
      if (!window.location.href.includes('/platform/post/finderNewLifeCreate')) {
        throw new Error('图文发布流程只能在图文发布页面执行');
      }

      // 🎯 获取预处理后的标题和概要数据
      const currentPlatform = data.platforms?.find(p => p.id === 'weixinchannels');
      const titleToInject = currentPlatform?.processedTitle || data.title;
      const summaryToInject = currentPlatform?.processedSummary || data.summary;

      this.log('📝 微信视频号图文内容处理', {
        contentType: data.contentType,
        originalTitle: data.title?.length || 0,
        processedTitle: titleToInject?.length || 0,
        titleLimit: currentPlatform?.limits?.title,
        titleTruncated: data.title && titleToInject && data.title.length > titleToInject.length
      });

      // 使用原有的发布流程，增强错误处理
      const publishSteps = [
        { condition: titleToInject, action: () => this.injectTitle(titleToInject, !!currentPlatform?.processedTitle), name: '标题注入' },
        { condition: data.fileIds?.length || data.files?.length, action: () => this.uploadFiles(data), name: '文件上传' },
        { condition: data.content, action: () => this.injectContent(data.content), name: '内容注入' }
      ];

      for (const step of publishSteps) {
        if (step.condition) {
          await step.action();
        }
      }

      this.log('✅ 图文内容发布流程完成');

      return {
        success: true,
        message: '图文内容预填充完成，请手动确认并发布',
        url: window.location.href,
        action: 'image_prefilled',
        contentType: 'image'
      };

    } catch (error) {
      this.logError('图文发布流程失败:', error);
      throw error;
    }
  }

  /**
   * 🚀 智能文件上传方法 - 使用FileProcessorBase的智能文件获取
   * @param {Object} data - 包含fileIds或files的数据对象
   */
  async uploadFiles(data) {
    try {
      this.log('🚀 开始微信视频号智能文件上传流程...', {
        hasData: !!data,
        hasFiles: !!(data && data.files),
        hasFileIds: !!(data && data.fileIds),
        platform: this.platform
      });

      // 🚀 使用继承的智能文件处理方法（支持即时预览和分块下载）
      const filesToUpload = await this.processFileData(data);

      if (!filesToUpload || filesToUpload.length === 0) {
        this.log('⚠️ 没有可上传的文件');
        return;
      }

      this.log('📁 准备上传文件:', filesToUpload.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      })));

      // 查找文件输入控件
      const fileInput = await this.findFileInput();
      if (!fileInput) {
        throw new Error('未找到文件输入控件');
      }

      // 使用DataTransfer API上传文件
      await this.injectFilesToInput(fileInput, filesToUpload);

      this.log('✅ 智能文件上传成功');

    } catch (error) {
      this.logError('智能文件上传失败', error);
      throw error;
    }
  }

  /**
   * 🚀 将文件注入到输入控件（优化版本）
   * @param {HTMLElement} fileInput - 文件输入控件
   * @param {Array} files - 文件数组
   */
  async injectFilesToInput(fileInput, files) {
    try {
      this.log('📤 开始注入文件到输入控件', { count: files.length });

      // 使用DataTransfer API
      const dataTransfer = new DataTransfer();
      files.forEach(file => {
        dataTransfer.items.add(file);
      });

      fileInput.files = dataTransfer.files;

      // 🚀 使用统一的事件触发方法
      this._triggerEvents(fileInput, ['input', 'change']);

      this.log('✅ 文件已注入到输入控件');

    } catch (error) {
      this.log('❌ 文件注入失败:', error);
      throw new Error('文件注入失败: ' + error.message);
    }
  }

  // 🚀 优化：删除旧的createFileFromBase64方法，现在由FileProcessorBase统一处理
}

/**
 * 🚀 检查FileProcessorBase依赖
 */
async function checkBaseClasses() {
  // 检查FileProcessorBase是否可用
  if (!window.FileProcessorBase) {
    console.error('微信视频号适配器：FileProcessorBase未加载');
    return false;
  }

  console.log('✅ 微信视频号适配器：FileProcessorBase依赖检查通过');
  return true;
}

/**
 * 旧版本初始化函数（作为备用）
 */
async function legacyInitializeWeixinChannelsAdapter() {
  try {
    const baseClassesReady = await checkBaseClasses();
    if (!baseClassesReady) {
      console.error('微信视频号适配器：基类未就绪');
      return;
    }

    const adapter = new WeixinChannelsPlatformAdapter();

    // 注册到全局
    window.MomentDots = window.MomentDots || {};
    window.MomentDots.WeixinChannelsAdapter = adapter;

    // 启动监听器
    adapter.mutationObserver.startObserving();

    console.log('✅ 微信视频号适配器初始化成功');
  } catch (error) {
    console.error('❌ 微信视频号适配器初始化失败:', error);
  }
}

/**
 * 统一适配器初始化
 */
function initializeWeixinChannelsAdapter() {
  const useUnifiedInitializer = () => {
    if (window.AdapterInitializer) {
      window.AdapterInitializer.initialize(
        'weixinchannels',
        'WeixinChannelsPlatformAdapter',
        legacyInitializeWeixinChannelsAdapter
      );
    } else {
      console.log('AdapterInitializer未加载，使用旧版本初始化');
      legacyInitializeWeixinChannelsAdapter();
    }
  };

  if (WeixinChannelsPlatformAdapter) {
    window.WeixinChannelsPlatformAdapter = WeixinChannelsPlatformAdapter;
    useUnifiedInitializer();
  } else {
    console.error('WeixinChannelsPlatformAdapter类未定义');
  }
}

// 启动适配器
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWeixinChannelsAdapter);
} else {
  initializeWeixinChannelsAdapter();
}

})();
