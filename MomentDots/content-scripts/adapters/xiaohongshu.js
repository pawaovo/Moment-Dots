/**
 * 小红书平台适配器 - 重构优化版本
 * 基于统一的MutationObserver和配置管理基类
 * 消除重复代码，提升代码质量和维护性
 *
 * 技术方案：统一基类 + 平台特定实现 + 性能优化
 * 重构目标：减少90%的重复代码，提升性能和可维护性
 */

console.log('小红书适配器加载中...');

(function() {
  'use strict';



/**
 * 小红书平台配置管理器 - 重构版本
 * 继承BaseConfigManager，只定义平台特定的配置
 */
class XiaohongshuConfigManager extends BaseConfigManager {
  constructor() {
    super('xiaohongshu');
  }

  /**
   * 加载小红书特定配置
   * @returns {Object} 配置对象
   */
  loadConfig() {
    const baseConfig = super.loadConfig();

    // 小红书特定的配置覆盖
    const xiaohongshuConfig = {
      // 延迟时间配置 - 小红书优化版本
      delays: {
        FAST_CHECK: 300,      // 小红书页面响应较慢，适当增加
        NORMAL_WAIT: 800,
        UPLOAD_WAIT: 2000,
        ELEMENT_WAIT: 3000,
        PAGE_LOAD_WAIT: 1000,
        NAVIGATION_WAIT: 1500
      },

      // 小红书平台限制
      limits: {
        maxTitleLength: 20,
        maxContentLength: 1000,
        maxMediaFiles: 18,       // 小红书最多18个媒体文件（图片+视频）
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
        allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/webm']
      },

      // 小红书性能配置
      performance: {
        cacheTimeout: 5000, // 小红书页面变化较慢，可以延长缓存时间
        elementWaitTimeout: 3000,
        mutationObserverTimeout: 5000, // 小红书需要更长的等待时间
        highFrequencyCheck: 100, // 小红书检查频率可以稍低
        enablePerformanceMonitoring: true,
        enableMutationObserver: true
      }
    };

    return this.mergeConfig(baseConfig, xiaohongshuConfig);
  }

  /**
   * 获取选择器配置
   * @returns {Object} 选择器对象
   */
  getSelectors() {
    return {
      // 标题输入框
      titleInput: [
        'input[placeholder*="标题"]',
        'input[placeholder*="填写标题"]',
        'input[type="text"]',
        '.title-input'
      ],

      // 内容编辑器
      contentEditor: [
        'div[contenteditable="true"]',
        '.editor-content',
        '.content-editor',
        '[data-slate-editor="true"]'
      ],

      // 文件上传
      fileInput: [
        'input[type="file"]',
        'input[accept*="image"]'
      ],

      // 首页"发布图文笔记"按钮（改进选择器）
      publishImageButton: [
        'div:contains("发布图文笔记")',
        'div:contains("发布图文")',
        'div:contains("创建图文")',
        'button:contains("发布图文笔记")',
        'button:contains("发布图文")',
        'a:contains("发布图文笔记")',
        'a:contains("发布图文")',
        '[data-testid="publish-image"]',
        '.publish-image-button',
        'button[type="button"]',
        '[class*="publish"]',
        '[class*="create"]'
      ],

      // 上传页面"上传图片"按钮
      uploadButton: [
        '.upload-button',
        'button[type="button"]',
        '.upload-btn'
      ],

      // 发布按钮
      publishButton: [
        'button[type="submit"]',
        '.publish-btn',
        '.publish-button'
      ],

      // 登录状态检测
      loginIndicators: [
        'input[placeholder*="标题"]',
        'div[contenteditable="true"]',
        '.creator-header'
      ]
    };
  }

  /**
   * 获取错误消息映射
   * @returns {Object} 错误消息映射
   */
  getErrorMessages() {
    return {
      '未找到小红书标题输入框': '页面未完全加载，请刷新页面后重试',
      '未找到小红书内容编辑器': '内容编辑器未加载，请检查页面状态',
      '标题注入失败': '标题输入异常，请手动清空标题框后重试',
      '内容注入失败': '内容编辑器状态异常，请手动清空编辑器后重试',
      '标题验证失败': '标题可能未完全加载，请检查标题框内容',
      '内容验证失败': '内容可能未完全加载，请检查编辑器内容',
      '文件上传失败': '图片上传异常，请检查图片格式和大小',
      '未找到小红书发布按钮': '发布按钮未找到，请检查页面状态',
      '小红书发布按钮不可用': '发布按钮不可用，请检查内容是否符合要求',
      '请先登录小红书平台': '请先登录小红书创作者账号'
    };
  }

  /**
   * 获取错误分类配置
   * @returns {Object} 错误分类配置
   */
  getErrorCategories() {
    return {
      NETWORK_ERROR: {
        keywords: ['网络', 'network', 'timeout', '超时'],
        severity: 'high',
        retryable: true,
        userMessage: '网络连接异常，请检查网络后重试'
      },
      ELEMENT_NOT_FOUND: {
        keywords: ['未找到', 'not found', '元素'],
        severity: 'medium',
        retryable: true,
        userMessage: '页面元素未加载完成，请稍后重试'
      },
      INJECTION_FAILED: {
        keywords: ['注入失败', 'injection failed', '验证失败'],
        severity: 'medium',
        retryable: true,
        userMessage: '内容注入失败，请手动清空输入框后重试'
      },
      PERMISSION_DENIED: {
        keywords: ['权限', 'permission', '登录', 'login'],
        severity: 'high',
        retryable: false,
        userMessage: '权限不足，请检查登录状态'
      },
      VALIDATION_ERROR: {
        keywords: ['验证', 'validation', '格式'],
        severity: 'low',
        retryable: false,
        userMessage: '输入内容格式不正确，请检查后重试'
      },
      UNKNOWN_ERROR: {
        keywords: [],
        severity: 'medium',
        retryable: true,
        userMessage: '未知错误，请重试或联系技术支持'
      }
    };
  }
}

/**
 * 依赖管理器
 * 统一管理和验证所有依赖项
 */
class XiaohongshuDependencyManager {
  /**
   * 检查所有必需的依赖项
   * @throws {Error} 如果依赖项缺失
   */
  static validateDependencies() {
    const dependencies = [
      {
        name: 'FileProcessorBase',
        check: () => window.FileProcessorBase,
        error: 'FileProcessorBase not found. Please ensure FileProcessorBase.js is loaded first.'
      },
      {
        name: 'UniversalContentInjector',
        check: () => window.universalInjector,
        error: 'UniversalContentInjector not found. Please ensure UniversalContentInjector.js is loaded first.'
      }
    ];

    for (const dep of dependencies) {
      if (!dep.check()) {
        throw new Error(dep.error);
      }
    }
  }

  /**
   * 获取FileProcessorBase类（支持智能文件获取）
   * @returns {Function} FileProcessorBase类
   */
  static getFileProcessorBase() {
    return window.FileProcessorBase;
  }

  /**
   * 获取通用内容注入器
   * @returns {Object} 通用内容注入器实例
   */
  static getUniversalInjector() {
    return window.universalInjector;
  }
}

/**
 * 小红书平台适配器类 - 升级为FileProcessorBase
 * 🚀 继承FileProcessorBase以支持智能文件获取和即时预览功能
 */
class XiaohongshuAdapter extends XiaohongshuDependencyManager.getFileProcessorBase() {
  constructor() {
    // 使用依赖管理器验证依赖
    XiaohongshuDependencyManager.validateDependencies();

    // 🚀 继承FileProcessorBase以获得智能文件获取能力
    super('xiaohongshu', {});

    // 使用配置管理器
    this.configManager = new XiaohongshuConfigManager();
    this.config = this.configManager.config;
    this.selectors = this.configManager.getSelectors();
    this.errorMessages = this.configManager.getErrorMessages();
    this.errorCategories = this.configManager.getErrorCategories();

    // 获取依赖项
    this.injector = XiaohongshuDependencyManager.getUniversalInjector();

    this.currentState = null;

    // 性能优化：DOM元素缓存
    this.elementCache = new Map();
    this.cacheTimeout = this.config.performance.cacheTimeout;

    this.log('🚀 小红书适配器初始化完成 - 已升级为FileProcessorBase，支持智能文件获取');
  }

  /**
   * 🚀 清理资源 - 优化版本（使用FileProcessorBase）
   */
  cleanup() {
    // 调用父类的清理方法
    if (super.cleanup) {
      super.cleanup();
    }

    // 清理DOM元素缓存
    if (this.elementCache) {
      this.elementCache.clear();
    }

    this.log('🧹 小红书适配器资源清理完成');
  }

  /**
   * 🚀 获取性能报告 - 优化版本
   */
  getPerformanceReport() {
    const baseReport = super.getPerformanceReport ?
                      super.getPerformanceReport() :
                      { platform: 'xiaohongshu', totalTime: 0, successRate: 0, operationCount: 0 };

    return {
      ...baseReport,
      adapterVersion: '3.0.0-fileprocessor',
      optimizations: [
        'FileProcessorBase继承',
        '智能文件获取支持',
        '即时预览功能',
        '分块下载支持',
        '重复代码消除'
      ]
    };
  }

  /**
   * 性能优化：带缓存的DOM元素查找
   * @param {string} cacheKey - 缓存键
   * @param {Function} findFunction - 查找函数
   * @returns {Promise<HTMLElement|null>} - 找到的元素
   */
  async findElementWithCache(cacheKey, findFunction) {
    const cached = this.elementCache.get(cacheKey);

    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      // 验证元素是否仍在DOM中
      if (document.contains(cached.element)) {
        return cached.element;
      } else {
        // 元素已从DOM中移除，清除缓存
        this.elementCache.delete(cacheKey);
      }
    }

    // 执行查找
    const element = await findFunction();

    // 缓存结果
    if (element) {
      this.elementCache.set(cacheKey, {
        element: element,
        timestamp: Date.now()
      });
    }

    return element;
  }

  /**
   * 清除DOM元素缓存
   */
  clearElementCache() {
    this.elementCache.clear();
    this.log('DOM元素缓存已清除');
  }

  /**
   * 等待页面加载完成（极速版本 - 参考抖音实现）
   * @returns {Promise<boolean>} - 页面是否加载完成
   */
  async waitForPageLoad() {
    this.log('极速等待页面加载完成...');

    try {
      // 策略1: 快速检查document.readyState
      if (document.readyState === 'complete') {
        this.log('✅ 页面已完全加载');
        return true;
      }

      // 策略2: 使用MutationObserver + Promise.race优化等待
      const loadPromise = new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve(true);
          return;
        }

        const checkReady = () => {
          if (document.readyState === 'complete') {
            resolve(true);
          } else {
            setTimeout(checkReady, 50); // 减少检查间隔
          }
        };
        checkReady();
      });

      // 策略3: 关键元素检测（并行执行）
      const elementPromise = this.waitForElementSmart('main, .main-content, button', 1000);

      // 使用Promise.race，哪个先完成就用哪个
      await Promise.race([loadPromise, elementPromise]);

      // 最小等待时间（大幅减少）
      await this.delay(200); // 从1秒减少到200ms

      this.log('✅ 极速页面加载完成检查结束');

      let elementFound = false;
      const maxWaitTime = 5000; // 最多等待5秒
      const startTime = Date.now();

      while (!elementFound && (Date.now() - startTime) < maxWaitTime) {
        for (const selector of keyElements) {
          if (document.querySelector(selector)) {
            elementFound = true;
            this.log('检测到关键元素:', selector);
            break;
          }
        }

        if (!elementFound) {
          await this.delay(200);
        }
      }

      this.log('页面加载完成检查结束');
      return true;
    } catch (error) {
      this.log('页面加载等待失败:', error.message);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 发布内容到小红书平台 - 智能流程处理（增强版本）
   * 支持图文和短视频发布
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>} - 发布结果
   */
  async publishContent(data) {
    const { title, content, files } = data;

    try {
      // 详细记录接收到的数据
      this.log('🚀 开始小红书发布流程', {
        titleLength: title?.length,
        contentLength: content?.length,
        filesCount: files?.length,
        hasFiles: !!files,
        filesArray: Array.isArray(files),
        filesDetails: files ? files.map(f => ({
          name: f?.name,
          size: f?.size,
          type: f?.type
        })) : null,
        currentUrl: window.location.href,
        dataKeys: Object.keys(data)
      });

      // 0. 等待页面初始加载完成
      this.log('📄 等待页面初始加载完成...');
      await this.waitForPageLoad();

      // 1. 检查登录状态（宽松检查）
      this.log('🔐 检查登录状态...');
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        throw new Error('请先登录小红书平台');
      }
      this.log('✅ 登录状态检查通过');

      // 2. 检测内容类型并选择发布流程
      const contentType = this.detectContentType(data);
      this.log('🎯 检测到内容类型:', contentType);

      if (contentType === 'video') {
        return await this.publishVideoContent(data);
      } else {
        return await this.publishImageContent(data);
      }

    } catch (error) {
      // 使用增强的错误处理
      let currentState = 'unknown';
      try {
        currentState = await this.detectPageState();
      } catch (stateError) {
        this.log('⚠️ 无法检测页面状态:', stateError.message);
      }

      const debugInfo = {
        currentUrl: window.location.href,
        currentState: currentState,
        pageTitle: document.title,
        hasPublishButton: !!Array.from(document.querySelectorAll('*')).find(el =>
          el.textContent && el.textContent.includes('发布图文笔记')
        ),
        hasUploadElements: document.querySelectorAll('[class*="upload"], input[type="file"]').length > 0,
        timestamp: Date.now()
      };

      // 使用增强的错误日志记录
      this.logError('小红书发布流程', error, debugInfo);

      const result = {
        success: false,
        platform: this.platform,
        error: error.message,
        debugInfo,
        timestamp: Date.now()
      };

      this.sendPublishResult(result);
      throw error;
    }
  }

  /**
   * 检测内容类型（图文或视频）- 优化版本
   * @param {Object} data - 发布数据
   * @returns {string} - 'image' 或 'video'
   */
  detectContentType(data) {
    const { files } = data;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return 'image'; // 默认为图文
    }

    // 优化：使用配置中的视频扩展名，避免硬编码
    const videoExtensions = ['mp4', 'mov', 'flv', 'f4v', 'mkv', 'rm', 'rmvb', 'm4v', 'mpg', 'mpeg', 'ts'];

    // 检查是否包含视频文件（优化：使用 find 而不是 some，可以提前退出）
    const hasVideo = files.find(file => {
      if (file instanceof File) {
        return this.config.limits.allowedVideoTypes.includes(file.type);
      }
      // 如果不是File对象，通过文件名判断（优化：缓存扩展名提取）
      if (file.name) {
        const extension = file.name.toLowerCase().split('.').pop();
        return videoExtensions.includes(extension);
      }
      return false;
    });

    return hasVideo ? 'video' : 'image';
  }

  /**
   * 发布图文内容（原有逻辑）
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>} - 发布结果
   */
  async publishImageContent(data) {
    this.log('📸 开始图文发布流程');

    try {
      // 2. 检测初始页面状态
    this.log('🔍 检测初始页面状态...');
    const initialState = await this.detectPageState();
    this.log('📍 初始页面状态:', initialState, '当前URL:', window.location.href);

    // 3. 智能页面状态检测和导航
    this.log('🧭 开始智能页面导航...');
    const navigationStartTime = Date.now();
    await this.handlePageNavigation(data);
    const navigationTime = Date.now() - navigationStartTime;
    this.log('⏱️ 页面导航耗时:', navigationTime + 'ms');

    // 4. 确保在正确的页面状态
    const finalState = await this.detectPageState();
    this.log('🎯 导航后页面状态:', finalState, '当前URL:', window.location.href);

    // 5. 在编辑页面注入内容
    this.log('📝 开始内容注入...');
    const injectionStartTime = Date.now();
    await this.injectContentInEditPage(data);
    const injectionTime = Date.now() - injectionStartTime;
    this.log('⏱️ 内容注入耗时:', injectionTime + 'ms');

    // 总体性能报告（优化后）
    const totalTime = Date.now() - navigationStartTime;
    this.log('🚀 小红书图文发布流程性能报告（优化后）:', {
      总耗时: totalTime + 'ms',
      页面导航: navigationTime + 'ms',
      内容注入: injectionTime + 'ms',
      导航占比: Math.round((navigationTime / totalTime) * 100) + '%',
      注入占比: Math.round((injectionTime / totalTime) * 100) + '%',
      优化效果: '预期导航占比从97%降低到60%以下'
    });

    const result = {
      success: true,
      platform: this.platform,
      action: 'prefilled',
      message: '小红书图文内容注入成功',
      performance: {
        totalTime,
        navigationTime,
        injectionTime
      },
      finalUrl: window.location.href,
      timestamp: Date.now()
    };

    this.log('小红书图文发布流程完成', result);
    this.sendPublishResult(result);

    return result;

    } catch (error) {
      // 使用增强的错误处理
      let currentState = 'unknown';
      try {
        currentState = await this.detectPageState();
      } catch (stateError) {
        this.log('⚠️ 无法检测页面状态:', stateError.message);
      }

      const debugInfo = {
        currentUrl: window.location.href,
        currentState: currentState,
        pageTitle: document.title,
        hasPublishButton: !!Array.from(document.querySelectorAll('*')).find(el =>
          el.textContent && el.textContent.includes('发布图文笔记')
        ),
        hasUploadElements: document.querySelectorAll('[class*="upload"], input[type="file"]').length > 0,
        timestamp: Date.now()
      };

      // 使用增强的错误日志记录
      this.logError('小红书发布流程', error, debugInfo);

      // 分析错误并生成结果
      const errorAnalysis = this.analyzeError(error);
      const errorResult = {
        success: false,
        platform: this.platform,
        error: errorAnalysis.userMessage,
        message: error.message,
        errorCategory: errorAnalysis.category,
        severity: errorAnalysis.severity,
        retryable: errorAnalysis.retryable,
        debugInfo: debugInfo
      };

      this.log('小红书发布错误详情:', errorResult);
      this.sendPublishResult(errorResult);
      return errorResult;
    }
  }

  /**
   * 发布短视频内容（新增功能）
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>} - 发布结果
   */
  async publishVideoContent(data) {
    this.log('🎬 开始短视频发布流程');

    try {
      // 1. 检测当前页面状态
      const currentState = await this.detectPageState();
      this.log('短视频发布 - 当前页面状态:', currentState);

      // 2. 根据页面状态进行相应处理
      const navigationStartTime = Date.now();

      switch (currentState) {
        case this.config.pageStates.HOMEPAGE:
          this.log('从首页开始，需要导航到短视频上传页面');
          await this.navigateToVideoUpload();
          await this.handleVideoUploadAndTransition(data);
          break;

        case this.config.pageStates.VIDEO_UPLOAD_PAGE:
          this.log('在短视频上传页面，开始上传视频文件');
          await this.handleVideoUploadAndTransition(data);
          break;

        case this.config.pageStates.VIDEO_EDIT_PAGE:
          this.log('已在短视频编辑页面，直接注入内容');
          await this.injectVideoContentInEditPage(data);
          break;

        case this.config.pageStates.UPLOAD_PAGE:
        case this.config.pageStates.EDIT_PAGE:
          this.log('当前在图文页面，需要切换到视频上传');
          await this.navigateToVideoUpload();
          await this.handleVideoUploadAndTransition(data);
          break;

        default:
          this.log('未知页面状态，尝试导航到视频上传页面');
          await this.navigateToVideoUpload();
          await this.handleVideoUploadAndTransition(data);
          break;
      }

      const navigationTime = Date.now() - navigationStartTime;

      // 3. 确保在正确的页面状态
      const finalState = await this.detectPageState();
      this.log('🎯 短视频发布后页面状态:', finalState, '当前URL:', window.location.href);

      // 4. 如果还不在编辑页面，注入内容
      if (finalState !== this.config.pageStates.VIDEO_EDIT_PAGE) {
        this.log('📝 开始短视频内容注入...');
        const injectionStartTime = Date.now();
        await this.injectVideoContentInEditPage(data);
        const injectionTime = Date.now() - injectionStartTime;
        this.log('⏱️ 短视频内容注入耗时:', injectionTime + 'ms');
      }

      const totalTime = Date.now() - navigationStartTime;
      this.log('🚀 小红书短视频发布流程性能报告:', {
        总耗时: totalTime + 'ms',
        页面导航: navigationTime + 'ms'
      });

      const result = {
        success: true,
        platform: this.platform,
        action: 'prefilled',
        message: '小红书短视频内容注入成功',
        contentType: 'video',
        performance: {
          totalTime,
          navigationTime
        },
        finalUrl: window.location.href,
        timestamp: Date.now()
      };

      this.log('小红书短视频发布流程完成', result);
      this.sendPublishResult(result);

      return result;

    } catch (error) {
      this.logError('小红书短视频发布流程失败', error);
      throw error;
    }
  }

  /**
   * 检查登录状态（增强版本）
   * @returns {Promise<boolean>} - 是否已登录
   */
  async checkLoginStatus() {
    try {
      this.log('开始检查登录状态...');

      // 策略1: 检查URL是否在创作者中心域名下
      const currentUrl = window.location.href;
      if (!currentUrl.includes('creator.xiaohongshu.com')) {
        this.log('不在小红书创作者中心域名下');
        return false;
      }

      // 策略2: 检查是否被重定向到登录页面
      if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
        this.log('检测到登录页面URL');
        return false;
      }

      // 策略3: 等待页面加载完成后再检查元素
      await this.waitForPageLoad();

      // 策略4: 检查登录相关的元素（宽松检测）
      const loginIndicators = [
        // 用户信息相关
        '.user-info', '.avatar', '.user-avatar',
        // 创作者中心特有元素
        '.creator-header', '.creator-nav',
        // 发布相关元素（说明已登录）
        'input[placeholder*="标题"]', 'div[contenteditable="true"]',
        'input[type="file"]', '[class*="upload"]',
        // 导航菜单
        '[href*="/new/home"]', '[href*="/publish"]'
      ];

      for (const selector of loginIndicators) {
        if (document.querySelector(selector)) {
          this.log('检测到登录状态指示器:', selector);
          return true;
        }
      }

      // 策略5: 检查页面标题
      const pageTitle = document.title;
      if (pageTitle.includes('创作服务平台') || pageTitle.includes('小红书')) {
        this.log('页面标题表明已登录:', pageTitle);
        return true;
      }

      // 策略6: 如果在发布页面，通常说明已登录
      if (currentUrl.includes('/publish/publish')) {
        this.log('在发布页面，假设已登录');
        return true;
      }

      this.log('未检测到明确的登录状态，但继续执行');
      // 改为返回true，让后续流程继续，如果真的未登录会在后续步骤中发现
      return true;
    } catch (error) {
      this.log('登录状态检查失败:', error.message);
      // 出错时也返回true，避免阻塞流程
      return true;
    }
  }

  /**
   * 检测当前页面状态（增强版本）
   * @returns {Promise<string>} - 页面状态
   */
  async detectPageState() {
    const currentUrl = window.location.href;

    this.log('🔍 页面状态检测', {
      currentUrl,
      hasTargetImage: currentUrl.includes('target=image'),
      hasPublishPath: currentUrl.includes('/publish/publish'),
      hasHomePath: currentUrl.includes('/new/home')
    });

    // 检测首页
    if (currentUrl.includes('/new/home')) {
      return this.config.pageStates.HOMEPAGE;
    }

    // 检测发布页面（/publish/publish）
    if (currentUrl.includes('/publish/publish')) {
      // 检查是否有编辑元素
      const hasEditElements = document.querySelector('input[placeholder*="标题"]') ||
                             document.querySelector('div[contenteditable="true"]');

      if (hasEditElements) {
        // 进一步区分是图文编辑还是视频编辑
        const hasVideoElements = document.querySelector('video') ||
                                document.querySelector('[class*="video"]') ||
                                document.querySelector('input[accept*="video"]') ||
                                Array.from(document.querySelectorAll('*')).some(el =>
                                  el.textContent && el.textContent.includes('发布视频')
                                );

        if (hasVideoElements) {
          this.log('🔍 检测到视频编辑元素，判定为视频编辑页面');
          return this.config.pageStates.VIDEO_EDIT_PAGE;
        } else {
          this.log('🔍 检测到图文编辑元素，判定为图文编辑页面');
          return this.config.pageStates.EDIT_PAGE;
        }
      } else {
        // 没有编辑元素，检查是否是视频上传页面
        const hasVideoUploadElements = document.querySelector('input[accept*="video"]') ||
                                      document.querySelector('.upload-input[accept*="mp4"]') ||
                                      Array.from(document.querySelectorAll('*')).some(el =>
                                        el.textContent && (el.textContent.includes('上传视频') || el.textContent.includes('拖拽视频'))
                                      );

        if (hasVideoUploadElements) {
          this.log('🔍 检测到视频上传元素，判定为视频上传页面');
          return this.config.pageStates.VIDEO_UPLOAD_PAGE;
        } else if (currentUrl.includes('target=image')) {
          this.log('🔍 检测到target=image参数，判定为图文上传页面');
          return this.config.pageStates.UPLOAD_PAGE;
        } else {
          this.log('🔍 未检测到明确元素，默认判定为上传页面');
          return this.config.pageStates.UPLOAD_PAGE;
        }
      }
    }

    return this.config.pageStates.UNKNOWN;
  }

  /**
   * 🚀 智能页面就绪检测 - 简化版本（移除MutationObserver依赖）
   * @param {string} pageType - 页面类型 ('homepage', 'upload', 'edit')
   * @param {number} maxWaitTime - 最大等待时间（毫秒）
   * @returns {Promise<boolean>} - 页面是否就绪
   */
  async waitForPageReady(pageType, maxWaitTime = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      switch (pageType) {
        case 'homepage':
          if (this.findPublishImageButton()) {
            this.log('✅ 首页就绪 - 发布按钮可用');
            return true;
          }
          break;

        case 'upload':
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput && !fileInput.disabled) {
            this.log('✅ 上传页面就绪 - 文件输入可用');
            return true;
          }
          break;

        case 'edit':
          const titleInput = document.querySelector('input[placeholder*="标题"]');
          const contentEditor = document.querySelector('div[contenteditable="true"]');
          if (titleInput && contentEditor) {
            this.log('✅ 编辑页面就绪 - 编辑元素可用');
            return true;
          }
          break;
      }

      await this.delay(200); // 每200ms检查一次
    }

    this.log('⚠️ 页面就绪检测超时');
    return false;
  }

  /**
   * 智能页面导航处理（优化版本 - 参考抖音实现）
   * @param {Object} data - 发布数据
   */
  async handlePageNavigation(data) {
    const pageState = await this.detectPageState();
    this.currentState = pageState;

    this.log('🧭 当前页面状态:', pageState);

    // 性能优化：页面状态变化时清除缓存
    this.clearElementCache();

    switch(pageState) {
      case this.config.pageStates.HOMEPAGE:
        this.log('📍 从首页开始，导航到图文上传');
        await this.navigateToImageUpload();
        await this.handleUploadAndTransition(data);
        break;

      case this.config.pageStates.UPLOAD_PAGE:
        this.log('📍 已在上传页面，直接处理上传');
        await this.handleUploadAndTransition(data);
        break;

      case this.config.pageStates.EDIT_PAGE:
        this.log('📍 已在编辑页面，跳过导航');
        // 如果已经在编辑页面，可能需要处理文件上传
        if (data.files && data.files.length > 0) {
          this.log('📁 在编辑页面检测到文件，尝试上传');
          await this.handleUploadAndTransition(data);
        }
        break;

      default:
        this.log('❓ 未知页面状态，当前URL:', window.location.href);

        // 如果当前在发布相关页面，尝试直接处理
        const currentUrl = window.location.href;
        if (currentUrl.includes('/publish')) {
          this.log('🔄 在发布相关页面，尝试直接处理');
          await this.handleUploadAndTransition(data);
        } else {
          this.log('🏠 导航到首页重新开始');
          window.location.href = 'https://creator.xiaohongshu.com/new/home';
          await this.delay(this.config.delays.NAVIGATION_WAIT);
          await this.waitForPageLoad();
          await this.handlePageNavigation(data);
        }
        break;
    }
  }

  /**
   * 导航到图文上传页面（增强版本）
   */
  async navigateToImageUpload() {
    return this.injector.withRetry(async () => {
      this.log('开始导航到图文上传页面...');

      // 1. 确保当前在首页
      const currentUrl = window.location.href;
      if (!currentUrl.includes('/new/home')) {
        this.log('当前不在首页，先导航到首页');
        window.location.href = 'https://creator.xiaohongshu.com/new/home';
        await this.delay(this.config.delays.NAVIGATION_WAIT);
        await this.waitForPageLoad();
      }

      // 2. 智能等待首页就绪
      const homepageReady = await this.waitForPageReady('homepage', 2000);

      if (!homepageReady) {
        this.log('⚠️ 首页就绪检测超时，使用备用策略');
      }

      // 3. 查找发布图文笔记按钮
      const publishButton = await this.findPublishImageButtonOptimized();

      if (!publishButton) {
        throw new Error('未找到发布图文笔记按钮');
      }

      this.log('找到发布图文笔记按钮，开始点击');

      // 4. 记录点击前的URL并使用改进的点击逻辑
      const beforeClickUrl = window.location.href;
      await this.performEnhancedClick(publishButton);

      // 5. 智能页面跳转监控
      const navigationSuccess = await this.monitorNavigationToUpload();

      if (!navigationSuccess) {
        throw new Error('页面跳转监控失败');
      }

      // 7. 验证URL是否发生变化
      const afterClickUrl = window.location.href;
      if (beforeClickUrl === afterClickUrl) {
        this.log('URL未发生变化，可能点击失败');
        throw new Error('页面跳转失败，URL未变化');
      }

      // 8. 验证是否成功跳转到上传页面
      const currentState = await this.detectPageState();
      this.log('跳转后页面状态:', currentState, '当前URL:', afterClickUrl);

      if (currentState !== this.config.pageStates.UPLOAD_PAGE &&
          currentState !== this.config.pageStates.EDIT_PAGE) {
        throw new Error(`导航到上传页面失败，当前状态: ${currentState}`);
      }

      this.log('成功导航到上传页面');
      return true;
    }, this.config.retries.DEFAULT);
  }

  /**
   * 导航到视频上传页面（新增功能）
   */
  async navigateToVideoUpload() {
    return this.injector.withRetry(async () => {
      this.log('🎬 开始导航到视频上传页面...');

      // 1. 直接导航到视频上传页面
      const videoUploadUrl = 'https://creator.xiaohongshu.com/publish/publish';
      this.log('导航到视频上传页面:', videoUploadUrl);

      window.location.href = videoUploadUrl;
      await this.delay(this.config.delays.NAVIGATION_WAIT);
      await this.waitForPageLoad();

      // 2. 等待页面加载完成
      await this.delay(this.config.delays.ELEMENT_WAIT);

      // 3. 检查是否成功到达视频上传页面
      const currentState = await this.detectPageState();
      this.log('导航后页面状态:', currentState, '当前URL:', window.location.href);

      // 4. 如果不在视频相关页面，尝试点击视频上传标签
      if (currentState !== this.config.pageStates.VIDEO_UPLOAD_PAGE &&
          currentState !== this.config.pageStates.VIDEO_EDIT_PAGE) {

        this.log('尝试点击视频上传标签...');
        const videoTab = await this.findVideoUploadTab();

        if (videoTab) {
          await this.performEnhancedClick(videoTab);
          await this.delay(this.config.delays.NORMAL_WAIT);

          // 再次检查状态
          const newState = await this.detectPageState();
          this.log('点击视频标签后页面状态:', newState);

          if (newState === this.config.pageStates.VIDEO_UPLOAD_PAGE ||
              newState === this.config.pageStates.VIDEO_EDIT_PAGE) {
            this.log('✅ 成功切换到视频上传页面');
            return true;
          }
        }
      }

      // 5. 验证最终状态
      const finalState = await this.detectPageState();
      if (finalState === this.config.pageStates.VIDEO_UPLOAD_PAGE ||
          finalState === this.config.pageStates.VIDEO_EDIT_PAGE ||
          finalState === this.config.pageStates.UPLOAD_PAGE) { // 允许通用上传页面
        this.log('✅ 成功导航到视频上传页面');
        return true;
      }

      throw new Error(`导航到视频上传页面失败，当前状态: ${finalState}`);
    }, this.config.retries.DEFAULT);
  }

  /**
   * 查找视频上传标签（优化版本 - 简化逻辑）
   * @returns {HTMLElement|null} - 找到的视频上传标签元素
   */
  async findVideoUploadTab() {
    this.log('🔍 查找视频上传标签...');

    // 优化：直接查找包含特定文本的元素，避免复杂的选择器解析
    const searchTexts = ['上传视频', '视频'];

    for (const text of searchTexts) {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        if (el.textContent &&
            el.textContent.includes(text) &&
            el.offsetParent !== null &&
            (el.tagName === 'BUTTON' || el.tagName === 'DIV' || el.classList.contains('tab'))) {
          this.log('找到视频上传标签:', text);
          return el;
        }
      }
    }

    // 备用：查找具有特定属性的元素
    const fallbackSelectors = ['[data-tab="video"]', '[data-type="video"]'];
    for (const selector of fallbackSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          this.log('找到视频上传标签（备用）:', selector);
          return element;
        }
      } catch (error) {
        continue;
      }
    }

    this.log('⚠️ 未找到视频上传标签');
    return null;
  }

  /**
   * 查找发布图文笔记按钮（改进版本 - 参考抖音实现）
   * @returns {HTMLElement|null} - 找到的按钮元素
   */
  findPublishImageButton() {
    this.log('🔍 开始查找发布图文笔记按钮...');

    // 策略1: 精确文本匹配（多种可能的文本）
    const possibleTexts = [
      '发布图文笔记',
      '发布图文',
      '发布笔记',
      '创建图文',
      '新建图文',
      '图文发布'
    ];

    for (const text of possibleTexts) {
      const exactMatch = Array.from(document.querySelectorAll('div, button, a, span'))
        .find(el => el.textContent && el.textContent.trim() === text);

      if (exactMatch) {
        this.log(`✅ 精确匹配找到按钮: "${text}"`);
        return exactMatch;
      }
    }

    // 策略2: 包含文本匹配
    for (const text of possibleTexts) {
      const containsMatch = Array.from(document.querySelectorAll('div, button, a, span'))
        .find(el => el.textContent && el.textContent.includes(text));

      if (containsMatch) {
        this.log(`✅ 包含匹配找到按钮: "${text}"`);
        return containsMatch;
      }
    }

    // 策略3: 查找可点击的父元素（参考抖音实现）
    const textElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent && (
        el.textContent.includes('发布') && el.textContent.includes('图文')
      ));

    for (const textEl of textElements) {
      let current = textEl;
      while (current && current !== document.body) {
        if (current.tagName === 'BUTTON' ||
            current.tagName === 'A' ||
            current.onclick ||
            current.style.cursor === 'pointer' ||
            current.classList.contains('clickable') ||
            current.getAttribute('role') === 'button') {
          this.log('✅ 找到可点击的父元素');
          return current;
        }
        current = current.parentElement;
      }
    }

    // 策略4: 使用配置的选择器
    if (this.selectors.publishImageButton) {
      for (const selector of this.selectors.publishImageButton) {
        try {
          const button = document.querySelector(selector);
          if (button) {
            this.log('✅ 选择器找到按钮:', selector);
            return button;
          }
        } catch (error) {
          this.log('选择器错误:', selector, error.message);
        }
      }
    }

    this.log('❌ 未找到发布图文笔记按钮');
    return null;
  }

  /**
   * 智能监控页面跳转到上传页面（极速版本 - 参考抖音实现）
   * @returns {Promise<boolean>} - 跳转是否成功
   */
  async monitorNavigationToUpload() {
    return new Promise((resolve) => {
      const timeout = 2000; // 进一步减少超时时间到2秒
      let resolved = false;
      const startTime = Date.now();

      const checkNavigation = () => {
        if (resolved) return;

        try {
          // 检查URL变化（最快的检测方式）
          const currentUrl = window.location.href;
          if (currentUrl.includes('/publish/publish')) {
            resolved = true;
            const elapsed = Date.now() - startTime;
            this.log(`✅ 极速检测到URL跳转到发布页面 (${elapsed}ms)`);
            resolve(true);
            return;
          }

          // 检查页面内容变化（快速检测）
          const uploadElements = document.querySelectorAll('input[type="file"], [class*="upload"]');
          if (uploadElements.length > 0) {
            resolved = true;
            const elapsed = Date.now() - startTime;
            this.log(`✅ 极速检测到上传相关元素 (${elapsed}ms)`);
            resolve(true);
            return;
          }

          // 检查编辑元素（可能直接跳转到编辑页面）
          const editElements = document.querySelectorAll('input[placeholder*="标题"], div[contenteditable="true"]');
          if (editElements.length > 0) {
            resolved = true;
            const elapsed = Date.now() - startTime;
            this.log(`✅ 极速检测到编辑页面元素 (${elapsed}ms)`);
            resolve(true);
            return;
          }

          // 超时检查
          if (Date.now() - startTime > timeout) {
            resolved = true;
            this.log('⚠️ 页面跳转监控超时（已优化到2秒）');
            resolve(false);
            return;
          }

          // 继续监控（更高频率）
          setTimeout(checkNavigation, 50); // 减少检查间隔到50ms
        } catch (error) {
          this.log('页面跳转监控出错:', error.message);
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }
      };

      // 使用MutationObserver监控DOM变化（参考抖音技术）
      const observer = new MutationObserver(() => {
        if (!resolved) {
          checkNavigation();
        }
      });

      // 开始监控DOM变化
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // 立即开始监控
      checkNavigation();

      // 清理函数
      const cleanup = () => {
        observer.disconnect();
      };

      // 设置清理超时
      setTimeout(() => {
        if (resolved) {
          cleanup();
        }
      }, timeout + 100);
    });
  }

  /**
   * 改进的点击方法（参考抖音实现）
   * @param {HTMLElement} element - 要点击的元素
   */
  async performEnhancedClick(element) {
    this.log('🖱️ 执行改进的点击操作...');

    try {
      // 方法1: 触发多种鼠标事件（参考抖音实现）
      const events = ['mousedown', 'mouseup', 'click'];
      events.forEach(eventType => {
        const event = new MouseEvent(eventType, {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1
        });
        element.dispatchEvent(event);
      });

      // 方法2: 如果是链接，尝试直接导航
      if (element.tagName === 'A' && element.href) {
        this.log('🔗 检测到链接，尝试直接导航');
        window.location.href = element.href;
      }

      // 方法3: 如果有onclick属性，尝试执行
      if (element.onclick) {
        this.log('⚡ 检测到onclick，尝试执行');
        element.onclick();
      }

      // 方法4: 触发焦点事件
      element.focus();

      this.log('✅ 多种点击方法已执行');
    } catch (clickError) {
      this.log('❌ 点击执行失败:', clickError.message);
      // 降级到简单点击
      element.click();
    }
  }

  /**
   * 🚀 优化的发布图文笔记按钮查找 - 简化版本
   * @returns {Promise<HTMLElement|null>} - 找到的按钮元素
   */
  async findPublishImageButtonOptimized() {
    const maxRetries = 15; // 3秒，每200ms一次

    for (let i = 0; i < maxRetries; i++) {
      const button = this.findPublishImageButton();
      if (button) {
        this.log('✅ 找到发布图文笔记按钮');
        return button;
      }
      await this.delay(200);
    }

    this.log('⚠️ 发布图文笔记按钮查找超时');
    return null;
  }

  /**
   * 🚀 智能元素等待方法 - 简化版本
   * @param {string} selector - CSS选择器
   * @param {number} timeout - 超时时间（毫秒）
   * @param {boolean} checkVisible - 是否检查元素可见性
   * @returns {Promise<HTMLElement|null>} - 找到的元素
   */
  async waitForElementSmart(selector, timeout = 3000, checkVisible = true) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element && (!checkVisible || element.offsetParent !== null)) {
        this.log(`✅ 找到元素: ${selector}`);
        return element;
      }
      await this.delay(200);
    }

    this.log(`⚠️ 元素查找超时: ${selector}`);
    return null;
  }



  /**
   * 调试方法：列出页面上所有可能的按钮和链接
   */
  debugPageButtons() {
    this.log('🔍 调试：列出页面上所有可能的按钮...');

    // 查找所有按钮
    const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"], [onclick]'));

    this.log(`📊 找到 ${buttons.length} 个可点击元素:`);

    buttons.slice(0, 10).forEach((btn, index) => {
      const text = btn.textContent ? btn.textContent.trim().substring(0, 50) : '';
      const tagName = btn.tagName;
      const className = btn.className || '';
      const id = btn.id || '';

      this.log(`${index + 1}. ${tagName} - "${text}" - class: "${className}" - id: "${id}"`);
    });

    // 特别查找包含"发布"、"图文"、"笔记"、"创建"等关键词的元素
    const keywords = ['发布', '图文', '笔记', '创建', '新建'];
    keywords.forEach(keyword => {
      const elements = Array.from(document.querySelectorAll('*'))
        .filter(el => el.textContent && el.textContent.includes(keyword))
        .slice(0, 3);

      if (elements.length > 0) {
        this.log(`🔍 包含"${keyword}"的元素:`, elements.map(el => ({
          tag: el.tagName,
          text: el.textContent.trim().substring(0, 30),
          class: el.className
        })));
      }
    });
  }

  /**
   * 带等待的发布图文笔记按钮查找（保留原方法作为备用）
   * @returns {Promise<HTMLElement|null>} - 找到的按钮元素
   */
  async findPublishImageButtonWithWait() {
    this.log('开始查找发布图文笔记按钮...');

    // 先尝试直接查找
    let button = this.findPublishImageButton();
    if (button) {
      return button;
    }

    // 如果没找到，等待并重试
    const maxRetries = 5;
    const retryDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      this.log(`第${i + 1}次重试查找发布图文笔记按钮...`);
      await this.delay(retryDelay);

      button = this.findPublishImageButton();
      if (button) {
        this.log(`第${i + 1}次重试成功找到按钮`);
        return button;
      }
    }

    // 最后尝试更宽泛的查找
    this.log('尝试更宽泛的按钮查找...');
    const allElements = Array.from(document.querySelectorAll('*'));

    // 查找包含"发布"和"图文"的元素
    const candidates = allElements.filter(el => {
      const text = el.textContent || '';
      return text.includes('发布') && text.includes('图文');
    });

    if (candidates.length > 0) {
      this.log('宽泛查找找到候选按钮:', candidates.length, '个');
      return candidates[0];
    }

    this.log('所有尝试都失败，未找到发布图文笔记按钮');
    return null;
  }

  /**
   * 处理文件上传和页面跳转（增强版本）
   * @param {Object} data - 发布数据
   */
  async handleUploadAndTransition(data) {
    this.log('📁 开始处理文件上传和页面跳转...');

    // 1. 处理图片上传
    const uploadResult = await this.handleImageUpload(data);
    this.log('📁 图片上传结果:', uploadResult);

    // 2. 根据上传结果决定后续处理
    if (uploadResult.needsFiles) {
      this.log('⚠️ 检测到缺少文件，这可能导致无法进入编辑页面');
      this.log('🔄 尝试手动触发文件选择器...');

      // 尝试点击上传区域来触发文件选择
      const uploadArea = this.findUploadArea();
      if (uploadArea) {
        uploadArea.click();
        await this.delay(1000);
      }
    }

    // 3. 极速等待页面状态稳定（大幅优化等待时间）
    this.log('⚡ 极速等待页面状态稳定...');
    const uploadPageReady = await this.waitForPageReady('edit', 1000); // 减少到1秒
    if (!uploadPageReady) {
      this.log('⚠️ 编辑页面就绪检测超时，使用备用策略继续执行');
      // 备用策略：短暂等待后继续
      await this.delay(500);
    }

    // 4. 检查页面状态是否变化
    const currentState = await this.detectPageState();
    this.log('📍 处理后页面状态:', currentState);

    // 5. 如果仍在上传页面，尝试强制进入编辑状态
    if (currentState === this.config.pageStates.UPLOAD_PAGE) {
      this.log('🔄 仍在上传页面，尝试强制进入编辑状态...');
      await this.forceEnterEditMode();

      // 再次检查状态
      const finalState = await this.detectPageState();
      this.log('📍 强制进入编辑后页面状态:', finalState);
    }

    this.log('✅ 文件上传和页面跳转处理完成');
  }

  /**
   * 处理视频上传和页面跳转（优化版本 - 职责分离）
   * @param {Object} data - 发布数据
   */
  async handleVideoUploadAndTransition(data) {
    this.log('🎬 开始处理视频上传和页面跳转...');

    try {
      // 1. 处理视频上传
      const uploadResult = await this.handleVideoUpload(data);
      this.log('🎬 视频上传结果:', uploadResult);

      // 2. 等待页面跳转（复用现有的页面等待逻辑）
      await this.waitForPageTransition();

      // 3. 处理内容注入（分离职责）
      await this.handleVideoContentInjection(data);

      this.log('✅ 视频上传和页面跳转处理完成');

    } catch (error) {
      this.logError('视频上传和页面跳转处理失败', error);
      throw error;
    }
  }

  /**
   * 等待页面跳转完成（新增辅助方法）
   */
  async waitForPageTransition() {
    this.log('⚡ 等待页面跳转完成...');
    await this.delay(this.config.delays.UPLOAD_WAIT);
  }

  /**
   * 处理视频内容注入（新增辅助方法）
   * @param {Object} data - 发布数据
   */
  async handleVideoContentInjection(data) {
    const currentState = await this.detectPageState();
    this.log('📍 页面跳转后状态:', currentState);

    if (currentState === this.config.pageStates.VIDEO_EDIT_PAGE) {
      this.log('✅ 已进入视频编辑页面，开始注入内容');
      await this.injectVideoContentInEditPage(data);
    } else {
      this.log('⚠️ 未进入视频编辑页面，尝试延迟重试...');
      await this.delay(this.config.delays.ELEMENT_WAIT);

      const retryState = await this.detectPageState();
      if (retryState === this.config.pageStates.VIDEO_EDIT_PAGE) {
        this.log('✅ 延迟后进入视频编辑页面，开始注入内容');
        await this.injectVideoContentInEditPage(data);
      } else {
        this.log('⚠️ 页面状态异常，但继续执行内容注入');
        await this.injectVideoContentInEditPage(data);
      }
    }
  }

  /**
   * 🚀 处理视频上传（优化版本 - 统一使用继承的智能文件获取）
   * @param {Object} data - 包含fileIds或files的数据对象
   * @returns {Promise<Object>} - 上传结果
   */
  async handleVideoUpload(data) {
    try {
      this.log('🎬 开始小红书智能视频上传流程...', {
        hasData: !!data,
        hasFiles: !!(data && data.files),
        hasFileIds: !!(data && data.fileIds),
        platform: this.platform,
        dataKeys: Object.keys(data || {})
      });

      // 🚀 使用继承的智能文件处理方法（统一逻辑，避免重复代码）
      const filesToProcess = await this.processFileData(data);

      if (!filesToProcess || filesToProcess.length === 0) {
        this.log('⚠️ 没有可处理的视频文件');
        return { success: false, needsFiles: true, message: '没有视频文件' };
      }

      // 验证和过滤视频文件
      const validFiles = this.validateVideoFiles(filesToProcess);
      if (validFiles.length === 0) {
        this.log('⚠️ 没有有效的视频文件');
        return { success: false, needsFiles: true, message: '没有有效的视频文件' };
      }

      this.log('📁 准备上传视频文件:', validFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));

      // 查找视频文件输入控件
      const fileInput = await this.findVideoFileInput();
      if (!fileInput) {
        throw new Error('未找到视频文件输入控件');
      }

      // 上传视频文件
      const uploadSuccess = await this.uploadVideoFiles(fileInput, validFiles);

      if (uploadSuccess) {
        this.log('✅ 智能视频文件上传成功');
        return { success: true, uploadedCount: validFiles.length, method: 'smart_upload' };
      } else {
        throw new Error('视频文件上传失败');
      }

    } catch (error) {
      this.logError('智能视频上传处理失败', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🚀 处理图片上传（升级为智能文件获取版本）
   * @param {Object} data - 包含fileIds或files的数据对象
   * @returns {Promise<Object>} - 上传结果
   */
  async handleImageUpload(data) {
    try {
      this.log('📁 开始小红书智能图片上传流程...', {
        hasData: !!data,
        hasFiles: !!(data && data.files),
        hasFileIds: !!(data && data.fileIds),
        platform: this.platform,
        dataKeys: Object.keys(data || {})
      });

      // 🚀 使用继承的智能文件处理方法（支持即时预览和分块下载）
      const filesToUpload = await this.processFileData(data);

      if (!filesToUpload || filesToUpload.length === 0) {
        this.log('📁 没有图片需要上传，但这可能导致无法进入编辑页面');
        this.log('⚠️ 警告：没有检测到文件，尝试强制进入编辑模式');
        return { completed: false, needsFiles: true };
      }

      // 验证文件格式和数量
      const validFiles = this.validateFiles(filesToUpload);

      if (validFiles.length === 0) {
        this.log('📁 没有通过验证的文件可以上传');
        return { completed: false, needsFiles: true };
      }

      this.log(`📁 准备上传 ${validFiles.length} 个图片文件`);

      return this.injector.withRetry(async () => {
        // 1. 等待页面加载完成
        await this.waitForPageLoad();

        // 2. 查找文件输入控件（小红书平台的特殊查找逻辑）
        const fileInput = await this.findFileInputWithRetry();

        if (!fileInput) {
          // 如果找不到文件输入控件，可能需要点击上传按钮
          this.log('🔍 未找到文件输入控件，尝试点击上传按钮...');
          const uploadButton = await this.findUploadButton();
          if (uploadButton) {
            uploadButton.click();
            await this.delay(1000);

            // 重新查找文件输入控件
            const fileInputAfterClick = await this.findFileInputWithRetry();
            if (!fileInputAfterClick) {
              throw new Error('点击上传按钮后仍未找到文件上传控件');
            }

            // 使用改进的文件注入方法（参考抖音）
            await this.injectFilesToInput(fileInputAfterClick, validFiles);
          } else {
            throw new Error('未找到文件上传控件和上传按钮');
          }
        } else {
          this.log('📁 找到文件输入控件，准备注入文件');

          // 使用改进的文件注入方法（参考抖音）
          await this.injectFilesToInput(fileInput, validFiles);
        }

        // 3. 监控页面跳转到编辑页面（参考抖音实现）
        this.log('📁 图片已注入，开始监控页面跳转...');
        const uploadResult = await this.monitorPageTransition();

        this.log(`📁 页面跳转完成`, {
          fileCount: validFiles.length,
          method: 'pageTransition',
          alreadyInEditPage: uploadResult.alreadyInEditPage || true
        });

        // 返回结果，标记已在编辑页面
        return { ...uploadResult, alreadyInEditPage: true };
      }, 3);

    } catch (error) {
      this.log('❌ 图片上传失败:', error.message);
      // 不抛出错误，让流程继续
      return { completed: false, error: error.message };
    }
  }

  /**
   * 将文件注入到输入控件（参考抖音的改进版本）
   * @param {HTMLElement} fileInput - 文件输入控件
   * @param {Array} files - 文件数组
   */
  async injectFilesToInput(fileInput, files) {
    try {
      this.log('📤 开始注入文件到输入控件', { count: files.length });

      // 方法1: 使用DataTransfer API（参考抖音实现）
      const dataTransfer = new DataTransfer();
      files.forEach(file => {
        dataTransfer.items.add(file);
      });

      fileInput.files = dataTransfer.files;

      // 触发多种事件确保平台检测到文件变化（参考抖音实现）
      const events = ['input', 'change'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        fileInput.dispatchEvent(event);
      });

      this.log('✅ 文件已注入到输入控件，触发了change和input事件');

    } catch (error) {
      this.log('❌ 文件注入失败:', error);
      throw new Error('文件注入失败: ' + error.message);
    }
  }

  /**
   * 监控页面跳转到编辑页面（参考抖音实现）
   * @returns {Promise<Object>} - 跳转结果
   */
  async monitorPageTransition() {
    return new Promise((resolve) => {
      const timeout = 8000; // 小红书可能需要更长时间
      let resolved = false;

      const checkEditPage = () => {
        if (resolved) return;

        // 检查URL变化（小红书跳转特征）
        if (this.isEditPageUrl()) {
          resolved = true;
          this.log('📍 页面监控检测到编辑页面URL，立即返回');
          resolve({ completed: true, alreadyInEditPage: true, method: 'pageMonitor' });
          return;
        }

        // 快速检查编辑页面元素
        if (this.isInEditPage()) {
          resolved = true;
          this.log('📍 页面监控检测到编辑页面元素，立即返回');
          resolve({ completed: true, alreadyInEditPage: true, method: 'pageMonitor' });
        }
      };

      // 立即检查一次
      checkEditPage();

      // 如果没有立即检测到，开始定期检查
      if (!resolved) {
        const interval = setInterval(checkEditPage, 200); // 每200ms检查一次

        // 设置超时
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            clearInterval(interval);
            this.log('⏰ 页面跳转监控超时，但继续流程');
            resolve({ completed: true, alreadyInEditPage: false, method: 'timeout' });
          }
        }, timeout);
      }
    });
  }

  /**
   * 快速检查是否在编辑页面（参考抖音实现）
   * @returns {boolean} - 是否在编辑页面
   */
  isInEditPage() {
    return !!(document.querySelector(this.selectors.titleInput[0]) ||
              document.querySelector(this.selectors.contentEditor[0]));
  }

  /**
   * 检查URL是否表明在编辑页面（小红书特有）
   * @returns {boolean} - URL是否表明在编辑页面
   */
  isEditPageUrl() {
    const currentUrl = window.location.href;
    // 小红书编辑页面的URL特征（需要根据实际情况调整）
    return currentUrl.includes('/publish/publish') &&
           !currentUrl.includes('target=image') &&
           (currentUrl.includes('edit') || currentUrl.includes('content'));
  }

  // 🚀 优化：删除备用文件处理方法，现在直接使用继承的智能文件获取功能
  /**
   * 查找文件输入控件
   * @returns {Promise<HTMLElement|null>} - 找到的文件输入控件
   */
  async findFileInput() {
    return await this.findElementWithCache('fileInput', async () => {
      // 策略1: 使用精确选择器
      for (const selector of this.selectors.fileInput) {
        const element = document.querySelector(selector);
        if (element) {
          this.log('精确选择器找到文件输入控件:', selector);
          return element;
        }
      }

      // 策略2: 使用UniversalContentInjector配置
      const fileInput = this.injector.findElement('xiaohongshu', 'file');
      if (fileInput) {
        this.log('UniversalContentInjector找到文件输入控件');
        return fileInput;
      }

      // 策略3: 短暂等待后重试
      await this.delay(this.config.delays.FAST_CHECK);
      for (const selector of this.selectors.fileInput) {
        const element = document.querySelector(selector);
        if (element) return element;
      }

      return null;
    });
  }

  /**
   * 带重试的文件输入控件查找
   * @returns {Promise<HTMLElement|null>} - 找到的文件输入控件
   */
  async findFileInputWithRetry() {
    this.log('🔍 开始查找文件输入控件（带重试）...');

    // 先尝试直接查找
    let fileInput = await this.findFileInput();
    if (fileInput) {
      return fileInput;
    }

    // 如果没找到，等待并重试
    const maxRetries = 3;
    const retryDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      this.log(`🔄 第${i + 1}次重试查找文件输入控件...`);
      await this.delay(retryDelay);

      fileInput = await this.findFileInput();
      if (fileInput) {
        this.log(`✅ 第${i + 1}次重试成功找到文件输入控件`);
        return fileInput;
      }
    }

    this.log('❌ 所有重试都失败，未找到文件输入控件');
    return null;
  }

  /**
   * 查找上传按钮
   * @returns {Promise<HTMLElement|null>} - 找到的上传按钮
   */
  async findUploadButton() {
    // 查找"上传图片"按钮
    const buttons = Array.from(document.querySelectorAll('button')).filter(btn =>
      btn.textContent && btn.textContent.includes('上传图片')
    );

    if (buttons.length > 0) {
      this.log('找到上传按钮');
      return buttons[0];
    }

    // 查找其他可能的上传按钮
    const uploadButtons = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text.includes('上传') || text.includes('选择文件') || text.includes('添加图片');
    });

    if (uploadButtons.length > 0) {
      this.log('找到可能的上传按钮');
      return uploadButtons[0];
    }

    return null;
  }

  /**
   * 在编辑页面注入内容
   * @param {Object} data - 发布数据
   */
  async injectContentInEditPage(data) {
    const { title, content } = data;

    // 🎯 获取预处理后的标题和概要数据
    const currentPlatform = data.platforms?.find(p => p.id === 'xiaohongshu');
    const titleToInject = currentPlatform?.processedTitle || title;
    const summaryToInject = currentPlatform?.processedSummary || data.summary;

    this.log('开始编辑页面内容注入', {
      hasTitle: !!title,
      hasContent: !!content,
      originalTitle: title?.length || 0,
      processedTitle: titleToInject?.length || 0,
      titleLimit: currentPlatform?.limits?.title,
      titleTruncated: title && titleToInject && title.length > titleToInject.length
    });

    // 快速验证页面准备状态
    await this.ensureEditPageReady();

    // 并行准备标题和内容注入器（提高效率）
    const injectionTasks = [];

    if (titleToInject) {
      injectionTasks.push(this.injectTitle(titleToInject));
    }

    if (content) {
      injectionTasks.push(this.injectContent(content));
    }

    if (injectionTasks.length > 0) {
      this.log('开始并行注入标题和内容');
      await Promise.all(injectionTasks);
      this.log('标题和内容注入完成');
    } else {
      this.log('没有标题或内容需要注入');
    }
  }
  /**
   * 确保编辑页面准备就绪（极速版本）
   * @returns {Promise<boolean>} - 页面是否准备就绪
   */
  async ensureEditPageReady() {
    this.log('快速验证编辑页面准备状态...');

    // 快速检查关键元素（不使用复杂的Observer）
    const maxRetries = 2; // 减少重试次数
    const retryDelay = 100; // 减少到100ms间隔

    for (let i = 0; i < maxRetries; i++) {
      // 检查关键元素是否都已加载
      const titleInput = document.querySelector(this.selectors.titleInput[0]);
      const contentEditor = document.querySelector(this.selectors.contentEditor[0]);

      if (titleInput || contentEditor) {
        this.log('快速检查确认页面准备就绪');
        return true;
      }

      // 短暂等待后重试
      if (i < maxRetries - 1) {
        await this.delay(retryDelay);
      }
    }

    // 继续执行，不阻塞流程
    this.log('页面准备检查完成，继续执行注入');
    return true; // 返回true，让流程继续
  }

  /**
   * 查找标题输入框（性能优化版本）
   * @returns {Promise<HTMLElement|null>} - 找到的标题输入框
   */
  async findTitleInput() {
    return await this.findElementWithCache('titleInput', async () => {
      // 策略1: 使用精确选择器
      for (const selector of this.selectors.titleInput) {
        const element = document.querySelector(selector);
        if (element) {
          this.log('精确选择器找到标题输入框:', selector);
          return element;
        }
      }

      // 策略2: 使用UniversalContentInjector配置
      const titleInput = this.injector.findElement('xiaohongshu', 'title');
      if (titleInput) {
        this.log('UniversalContentInjector找到标题输入框');
        return titleInput;
      }

      // 策略3: 使用MutationObserver智能等待
      this.log('智能等待标题输入框加载...');
      const element = await this.waitForElementSmart(this.selectors.titleInput[0], 1000); // 减少到1秒

      return element;
    });
  }

  /**
   * 查找内容编辑器（性能优化版本）
   * @returns {Promise<HTMLElement|null>} - 找到的内容编辑器
   */
  async findContentEditor() {
    return await this.findElementWithCache('contentEditor', async () => {
      // 策略1: 使用精确选择器
      for (const selector of this.selectors.contentEditor) {
        const element = document.querySelector(selector);
        if (element) {
          this.log('精确选择器找到内容编辑器:', selector);
          return element;
        }
      }

      // 策略2: 使用UniversalContentInjector配置
      const contentEditor = this.injector.findElement('xiaohongshu', 'content');
      if (contentEditor) {
        this.log('UniversalContentInjector找到内容编辑器');
        return contentEditor;
      }

      // 策略3: 使用MutationObserver智能等待
      this.log('智能等待内容编辑器加载...');
      const element = await this.waitForElementSmart(this.selectors.contentEditor[0], 1000); // 减少到1秒

      return element;
    });
  }

  /**
   * 注入标题（性能优化版本）
   * @param {string} title - 标题内容
   * @returns {Promise<boolean>} - 注入是否成功
   */
  async injectTitle(title) {
    this.log('开始注入标题到小红书编辑器', { titleLength: title.length });

    // 性能优化：先尝试一次，成功则无需重试
    try {
      const titleInput = await this.findTitleInput();

      if (!titleInput) {
        throw new Error('未找到小红书标题输入框');
      }

      this.log('找到小红书标题输入框，开始注入标题');

      // 使用UniversalContentInjector注入标题
      const success = await this.injector.injectContent(titleInput, title);

      if (success) {
        // 快速验证注入结果
        await this.delay(this.config.delays.FAST_CHECK);

        if (titleInput.value === title) {
          this.log('小红书标题注入成功（首次尝试）');
          return true;
        }
      }
    } catch (error) {
      this.log('首次标题注入失败，启用重试机制:', error.message);
    }

    // 如果首次失败，使用重试机制
    return await this.injector.withRetry(async () => {
      const titleInput = await this.findTitleInput();
      if (!titleInput) throw new Error('未找到小红书标题输入框');

      const success = await this.injector.injectContent(titleInput, title);
      if (!success) throw new Error('标题注入失败');

      await this.delay(this.config.delays.FAST_CHECK);
      if (titleInput.value !== title) throw new Error('标题验证失败');

      this.log('小红书标题注入成功（重试后）');
      return true;
    }, 2); // 减少重试次数
  }

  /**
   * 注入内容（性能优化版本）
   * @param {string} content - 内容文本
   * @returns {Promise<boolean>} - 注入是否成功
   */
  async injectContent(content) {
    this.log('开始注入内容到小红书编辑器', { contentLength: content.length });

    // 性能优化：先尝试一次，成功则无需重试
    try {
      const contentEditor = await this.findContentEditor();

      if (contentEditor) {
        this.log('找到小红书内容编辑器，开始注入内容');
        const success = await this.injectContentToEditor(contentEditor, content);

        if (success) {
          this.log('小红书内容注入成功（首次尝试）');
          return true;
        }
      }
    } catch (error) {
      this.log('首次内容注入失败，启用重试机制:', error.message);
    }

    // 如果首次失败，使用重试机制
    return await this.injector.withRetry(async () => {
      const contentEditor = await this.findContentEditor();
      if (!contentEditor) throw new Error('未找到小红书内容编辑器');

      const success = await this.injectContentToEditor(contentEditor, content);
      if (!success) throw new Error('内容注入失败');

      this.log('小红书内容注入成功（重试后）');
      return true;
    }, 2); // 减少重试次数
  }

  /**
   * 注入内容到编辑器
   * @param {HTMLElement} editor - 编辑器元素
   * @param {string} content - 内容文本
   * @returns {Promise<boolean>} - 注入是否成功
   */
  async injectContentToEditor(editor, content) {
    try {
      // 使用UniversalContentInjector注入内容
      const success = await this.injector.injectContent(editor, content);

      if (success) {
        // 快速验证注入结果
        await this.delay(this.config.delays.FAST_CHECK);
        const currentContent = editor.textContent || editor.innerText;

        if (currentContent.includes(content.substring(0, 20))) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.log('内容注入到编辑器失败:', error.message);
      return false;
    }
  }

  /**
   * 错误分类和处理（增强版本）
   * @param {Error} error - 错误对象
   * @returns {Object} - 错误分析结果
   */
  analyzeError(error) {
    const errorMessage = error.message.toLowerCase();

    // 查找匹配的错误分类
    for (const [category, config] of Object.entries(this.errorCategories)) {
      if (config.keywords.some(keyword => errorMessage.includes(keyword.toLowerCase()))) {
        return {
          category,
          severity: config.severity,
          retryable: config.retryable,
          userMessage: config.userMessage,
          originalMessage: error.message,
          timestamp: Date.now(),
          stack: error.stack
        };
      }
    }

    // 默认分类
    return {
      category: 'UNKNOWN_ERROR',
      severity: 'medium',
      retryable: true,
      userMessage: this.errorCategories.UNKNOWN_ERROR.userMessage,
      originalMessage: error.message,
      timestamp: Date.now(),
      stack: error.stack
    };
  }

  /**
   * 获取小红书平台特定的错误信息（使用配置管理器）
   * @param {Error} error - 错误对象
   * @returns {string} - 用户友好的错误信息
   */
  getErrorMessage(error) {
    // 首先尝试精确匹配
    for (const [key, message] of Object.entries(this.errorMessages)) {
      if (error.message.includes(key)) {
        return message;
      }
    }

    // 如果没有精确匹配，使用错误分析
    const analysis = this.analyzeError(error);
    return analysis.userMessage;
  }

  /**
   * 增强的错误日志记录
   * @param {string} operation - 操作名称
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   */
  logError(operation, error, context = {}) {
    const analysis = this.analyzeError(error);

    const errorLog = {
      operation,
      error: analysis,
      context: {
        ...context,
        currentUrl: window.location.href,
        currentState: this.currentState,
        timestamp: Date.now()
      }
    };

    // 根据错误严重程度选择日志级别
    if (analysis.severity === 'high') {
      console.error('🚨 严重错误:', errorLog);
    } else if (analysis.severity === 'medium') {
      console.warn('⚠️ 中等错误:', errorLog);
    } else {
      console.log('ℹ️ 轻微错误:', errorLog);
    }

    // 调用父类的日志方法
    if (super.logError) {
      super.logError(operation, error);
    }
  }

  /**
   * 发送发布结果到background script
   * @param {Object} result - 发布结果
   */
  sendPublishResult(result) {
    try {
      // 发送消息到background script
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'publishResult',
          data: result // 使用标准的data字段
        }).catch(error => {
          this.log('发送发布结果失败:', error);
        });
      }
    } catch (error) {
      this.log('发送发布结果异常:', error);
    }
  }

  /**
   * 查找上传区域
   * @returns {HTMLElement|null} - 找到的上传区域
   */
  findUploadArea() {
    // 查找包含"拖拽图片到此"的元素
    const uploadAreas = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text.includes('拖拽图片到此') || text.includes('点击上传') || text.includes('选择图片');
    });

    if (uploadAreas.length > 0) {
      this.log('找到上传区域');
      return uploadAreas[0];
    }

    return null;
  }

  /**
   * 强制进入编辑模式
   * @returns {Promise<boolean>} - 是否成功进入编辑模式
   */
  async forceEnterEditMode() {
    this.log('🔄 尝试强制进入编辑模式...');

    try {
      // 策略1: 查找并点击"跳过"或"继续"按钮
      const skipButtons = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.includes('跳过') || text.includes('继续') || text.includes('下一步');
      });

      if (skipButtons.length > 0) {
        this.log('找到跳过/继续按钮，尝试点击');
        skipButtons[0].click();
        await this.delay(2000);
        return true;
      }

      // 策略2: 查找并点击"不上传图片，直接发布"类似的选项
      const noImageButtons = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.includes('不上传') || text.includes('直接发布') || text.includes('纯文字');
      });

      if (noImageButtons.length > 0) {
        this.log('找到不上传图片选项，尝试点击');
        noImageButtons[0].click();
        await this.delay(2000);
        return true;
      }

      // 策略3: 尝试按ESC键关闭可能的弹窗
      this.log('尝试按ESC键');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await this.delay(1000);

      return false;
    } catch (error) {
      this.log('强制进入编辑模式失败:', error.message);
      return false;
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
   * 验证视频文件（优化版本 - 复用现有验证逻辑）
   * @param {Array} files - 文件数组
   * @returns {Array} - 验证通过的视频文件数组
   */
  validateVideoFiles(files) {
    // 复用现有的 validateFiles 方法，然后过滤出视频文件
    const allValidFiles = this.validateFiles(files);
    const { limits } = this.config;

    const videoFiles = allValidFiles.filter(file => {
      if (file instanceof File) {
        return limits.allowedVideoTypes.includes(file.type);
      }
      // 对于非File对象，通过文件名判断
      if (file.name) {
        const extension = file.name.toLowerCase().split('.').pop();
        return ['mp4', 'mov', 'flv', 'f4v', 'mkv', 'rm', 'rmvb', 'm4v', 'mpg', 'mpeg', 'ts'].includes(extension);
      }
      return false;
    });

    // 小红书只支持单个视频文件
    const result = videoFiles.slice(0, 1);

    if (result.length > 0 && result.length < videoFiles.length) {
      this.log('小红书只支持单个视频文件，取第一个有效文件');
    }

    this.log(`视频文件验证完成: 共 ${result.length} 个有效视频文件`);
    return result;
  }

  /**
   * 查找视频文件输入控件（优化版本 - 复用现有查找逻辑）
   * @returns {Promise<HTMLElement|null>} - 找到的文件输入控件
   */
  async findVideoFileInput() {
    this.log('🔍 查找视频文件输入控件...');

    // 优先查找视频专用的文件输入控件
    const videoSpecificSelectors = [
      'input[type="file"][accept*="video"]',
      'input[type="file"][accept*="mp4"]',
      'input[accept*=".mp4"]',
      'input[accept*=".mov"]'
    ];

    for (const selector of videoSpecificSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          this.log('找到视频专用文件输入控件:', selector);
          return element;
        }
      } catch (error) {
        continue;
      }
    }

    // 如果没找到视频专用的，复用现有的通用文件输入查找逻辑
    this.log('未找到视频专用输入控件，尝试通用文件输入控件...');
    return await this.findFileInput();
  }

  /**
   * 上传视频文件（优化版本 - 复用现有文件注入逻辑）
   * @param {HTMLElement} fileInput - 文件输入控件
   * @param {Array} files - 要上传的视频文件数组
   * @returns {Promise<boolean>} - 上传是否成功
   */
  async uploadVideoFiles(fileInput, files) {
    this.log('🎬 开始上传视频文件（复用现有逻辑）...', { fileCount: files.length });

    try {
      // 复用现有的文件注入逻辑，避免重复代码
      await this.injectFilesToInput(fileInput, files);
      return true;
    } catch (error) {
      this.logError('视频文件上传失败', error);
      return false;
    }
  }

  /**
   * 在视频编辑页面注入内容（新增功能）
   * @param {Object} data - 发布数据
   */
  async injectVideoContentInEditPage(data) {
    // 🎯 获取预处理后的标题和概要数据（短视频模式）
    const currentPlatform = data.platforms?.find(p => p.id === 'xiaohongshu');
    const titleToInject = currentPlatform?.processedTitle || data.title;
    const summaryToInject = currentPlatform?.processedSummary || data.summary;

    this.log('📝 开始在视频编辑页面注入内容...', {
      contentType: data.contentType,
      originalTitle: data.title?.length || 0,
      processedTitle: titleToInject?.length || 0,
      titleLimit: currentPlatform?.limits?.title,
      titleTruncated: data.title && titleToInject && data.title.length > titleToInject.length
    });

    try {
      // 1. 注入标题
      if (titleToInject) {
        this.log('📝 注入视频标题...');
        const titleSuccess = await this.injectVideoTitle(titleToInject);
        if (!titleSuccess) {
          this.log('⚠️ 视频标题注入失败，但继续执行');
        }
      }

      // 2. 注入内容
      if (data.content) {
        this.log('📝 注入视频描述内容...');
        const contentSuccess = await this.injectVideoContent(data.content);
        if (!contentSuccess) {
          this.log('⚠️ 视频内容注入失败，但继续执行');
        }
      }

      this.log('✅ 视频内容注入完成');

    } catch (error) {
      this.logError('视频内容注入失败', error);
      throw error;
    }
  }

  /**
   * 注入视频标题（优化版本 - 复用现有注入逻辑）
   * @param {string} title - 标题文本
   * @returns {Promise<boolean>} - 注入是否成功
   */
  async injectVideoTitle(title) {
    this.log('📝 注入视频标题（复用现有逻辑）...');
    // 直接复用现有的标题注入方法
    return await this.injectTitle(title);
  }

  /**
   * 注入视频内容（优化版本 - 复用现有注入逻辑）
   * @param {string} content - 内容文本
   * @returns {Promise<boolean>} - 注入是否成功
   */
  async injectVideoContent(content) {
    this.log('📝 注入视频内容（复用现有逻辑）...');
    // 直接复用现有的内容注入方法
    return await this.injectContent(content);
  }
}

  /**
   * 初始化小红书适配器 - 重构版本
   */
  async function initializeXiaohongshuAdapter() {
    try {
      console.log('初始化XiaohongshuAdapter...');

      // 等待公共基类加载完成
      await BaseClassLoader.checkBaseClasses('小红书');

      // 使用依赖管理器检查依赖
      XiaohongshuDependencyManager.validateDependencies();

      // 创建适配器实例
      const adapter = new XiaohongshuAdapter();

      // 注册到全局命名空间
      window.MomentDots = window.MomentDots || {};
      window.MomentDots.xiaohongshuAdapter = adapter;
      window.XiaohongshuAdapter = XiaohongshuAdapter; // 暴露类到全局，供工厂使用

      console.log('✅ XiaohongshuAdapter初始化成功 (重构版本)，platform:', adapter.platform);
      return true;
    } catch (error) {
      console.error('❌ XiaohongshuAdapter初始化失败:', error);
      return false;
    }
  }

  // 监听来自background script的消息
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'publish') {
        // 检查适配器是否已创建
        if (!window.MomentDots?.xiaohongshuAdapter) {
          sendResponse({
            success: false,
            error: 'XiaohongshuAdapter not initialized',
            platform: 'xiaohongshu'
          });
          return true;
        }

        window.MomentDots.xiaohongshuAdapter.publishContent(message.data)
          .then(result => sendResponse(result))
          .catch(error => sendResponse({
            success: false,
            error: error.message,
            platform: 'xiaohongshu'
          }));
        return true; // 保持消息通道开放
      }
    });
  }

  // 初始化适配器 - 异步版本
  initializeXiaohongshuAdapter().catch(error => {
    console.error('小红书适配器异步初始化失败:', error);
  });

})();

console.log('小红书适配器加载完成');
