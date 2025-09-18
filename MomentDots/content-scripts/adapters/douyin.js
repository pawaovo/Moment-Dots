/**
 * 抖音平台适配器
 * 基于统一的MutationObserver和配置管理基类
 *
 * 特殊流程：首页 → 点击"发布图文" → 上传图片 → 跳转编辑页 → 注入内容
 * 技术方案：统一基类 + 平台特定实现 + 性能优化
 */

console.log('抖音适配器加载中...');

(function() {
  'use strict';



/**
 * 抖音平台配置管理器
 * 继承BaseConfigManager，只定义平台特定的配置
 */
class DouyinConfigManager extends BaseConfigManager {
  constructor() {
    super('douyin');
  }

  /**
   * 加载抖音特定配置
   * @returns {Object} 配置对象
   */
  loadConfig() {
    const baseConfig = super.loadConfig();

    // 抖音特定的配置覆盖
    const douyinConfig = {
      // 延迟时间配置
      delays: {
        FAST_CHECK: 200,         // 抖音响应较快，可以更短
        NORMAL_WAIT: 500,
        UPLOAD_WAIT: 1500,
        ELEMENT_WAIT: 2000
      },

      // 抖音平台限制
      limits: {
        maxTitleLength: 55,
        maxContentLength: 2200,
        maxMediaFiles: 35,       // 抖音最多35个媒体文件（图片+视频）
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/webm']
      },

      // 抖音性能配置
      performance: {
        cacheTimeout: 3000,              // 抖音页面变化较快，适中的缓存时间
        elementWaitTimeout: 1500,
        mutationObserverTimeout: 3000,
        highFrequencyCheck: 50,          // 抖音需要高频检查
        enablePerformanceMonitoring: true,
        enableMutationObserver: true
      }
    };

    return this.mergeConfig(baseConfig, douyinConfig);
  }

  /**
   * 获取选择器配置
   * @returns {Object} 选择器对象
   */
  getSelectors() {
    return {
      // 标题输入框（去重后的统一选择器）
      titleInput: [
        'input[placeholder*="标题"]',
        'input[placeholder*="好标题"]',
        'input[placeholder="添加作品标题"]'
      ],

      // 内容编辑器（去重后的统一选择器）
      contentEditor: [
        '.zone-container[contenteditable="true"]',
        'div[contenteditable="true"]',
        '.editor-content',
        '[data-slate-editor="true"]'
      ],

      // 文件上传（去重后的统一选择器）
      fileInput: [
        'input[type="file"][accept*="image"]',
        'input[type="file"]'
      ],

      // 首页"发布图文"按钮
      publishImageButton: [
        'div:contains("发布图文")',
        '[data-testid="publish-image"]',
        '.publish-image-button'
      ],

      // 上传页面"上传图文"按钮
      uploadButton: [
        'button:contains("上传图文")',
        '.upload-button',
        'button[type="button"]'
      ],

      // 发布按钮
      publishButton: [
        'button:contains("发布")',
        'button[type="submit"]',
        '.publish-btn'
      ],

      // 登录状态检测
      loginIndicators: [
        'input[placeholder*="标题"]',
        'textarea[placeholder*="内容"]',
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
      '未找到抖音标题输入框': '页面未完全加载，请刷新页面后重试',
      '未找到抖音内容编辑器': '内容编辑器未加载，请检查页面状态',
      '标题注入失败': '标题输入异常，请手动清空标题框后重试',
      '内容注入失败': '内容编辑器状态异常，请手动清空编辑器后重试',
      '标题验证失败': '标题可能未完全加载，请检查标题框内容',
      '内容验证失败': '内容可能未完全加载，请检查编辑器内容',
      '文件上传失败': '图片上传异常，请检查图片格式和大小',
      '未找到抖音发布按钮': '发布按钮未找到，请检查页面状态',
      '抖音发布按钮不可用': '发布按钮不可用，请检查内容是否符合要求',
      '请先登录抖音平台': '请先登录抖音创作者账号'
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
class DouyinDependencyManager {
  /**
   * 检查所有必需的依赖项
   * @throws {Error} 如果依赖项缺失
   */
  static validateDependencies() {
    const dependencies = [
      {
        name: 'BasePlatformAdapter',
        check: () => window.MomentDots?.BasePlatformAdapter || window.BasePlatformAdapter,
        error: 'BasePlatformAdapter not found. Please ensure PlatformAdapter.js is loaded first.'
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
   * 获取基础适配器类
   * @returns {Function} 基础适配器类
   */
  static getBasePlatformAdapter() {
    return window.MomentDots?.BasePlatformAdapter || window.BasePlatformAdapter;
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
 * 抖音平台适配器类
 * 继承MutationObserverBase，消除重复代码，提升性能
 */
class DouyinAdapter extends DouyinDependencyManager.getBasePlatformAdapter() {
  constructor() {
    // 使用依赖管理器验证依赖
    DouyinDependencyManager.validateDependencies();

    super('douyin');

    // 确保platform属性正确设置
    this.platform = 'douyin';

    // 初始化MutationObserver基类功能
    this.mutationObserverBase = new MutationObserverBase('douyin');

    // 使用配置管理器
    this.configManager = new DouyinConfigManager();
    this.config = this.configManager.config;
    this.selectors = this.configManager.getSelectors();
    this.errorMessages = this.configManager.getErrorMessages();
    this.errorCategories = this.configManager.getErrorCategories();

    // 获取依赖项
    this.injector = DouyinDependencyManager.getUniversalInjector();

    this.currentState = null;

    // 性能优化：DOM元素缓存
    this.elementCache = new Map();
    this.cacheTimeout = this.config.performance.cacheTimeout;

    this.log('抖音适配器初始化完成 - 使用统一配置和依赖管理，性能缓存已启用');
  }

  /**
   * 清理资源 - 重写基类方法
   */
  cleanup() {
    // 清理MutationObserver基类的资源
    if (this.mutationObserverBase) {
      this.mutationObserverBase.cleanupAllObservers();
    }

    // 清理DOM元素缓存
    if (this.elementCache) {
      this.elementCache.clear();
    }

    this.log('🧹 抖音适配器资源清理完成');
  }

  /**
   * 获取性能报告 - 整合基类数据
   */
  getPerformanceReport() {
    const baseReport = this.mutationObserverBase ?
                      this.mutationObserverBase.getPerformanceReport() :
                      { platform: 'douyin', totalTime: 0, successRate: 0, operationCount: 0 };

    return {
      ...baseReport,
      adapterVersion: '2.0.0-refactored',
      optimizations: [
        'MutationObserver基类集成',
        '重复代码消除',
        '统一配置管理',
        '性能监控优化'
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
   * 智能页面就绪检测 - 使用基类实现
   * @param {string} pageType - 页面类型 ('homepage', 'upload', 'edit')
   * @param {number} maxWaitTime - 最大等待时间（毫秒）
   * @returns {Promise<boolean>} - 页面是否就绪
   */
  async waitForPageReady(pageType, maxWaitTime = 3000) {
    const readyChecker = () => {
      switch (pageType) {
        case 'homepage':
          // 检查首页关键元素
          const publishButton = this.findPublishImageButton();
          if (publishButton) {
            this.log('✅ 首页就绪 - 发布按钮可用');
            return true;
          }
          break;

        case 'upload':
          // 检查上传页面关键元素
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput && !fileInput.disabled) {
            this.log('✅ 上传页面就绪 - 文件输入可用');
            return true;
          }
          break;

        case 'edit':
          // 检查编辑页面关键元素
          const titleInput = document.querySelector('input[placeholder*="标题"]');
          const contentEditor = document.querySelector('div[contenteditable="true"], textarea');
          if (titleInput && contentEditor) {
            this.log('✅ 编辑页面就绪 - 编辑元素可用');
            return true;
          }
          break;
      }
      return false;
    };

    return await this.mutationObserverBase.waitForPageReady(
      pageType,
      readyChecker,
      maxWaitTime
    );
  }

  /**
   * 发布内容到抖音平台 - 智能流程处理
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>} - 发布结果
   */
  async publishContent(data) {
    const { title, content, files, contentType } = data;

    try {
      this.log('开始抖音专用发布流程', {
        titleLength: title?.length,
        contentLength: content?.length,
        filesCount: files?.length,
        contentType: contentType || '动态'
      });

      // 1. 检查登录状态
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        throw new Error('请先登录抖音平台');
      }

      // 1.5. 检测初始页面状态（基于成功测试经验）
      const initialState = await this.detectPageState();
      this.log('初始页面状态:', initialState, '当前URL:', window.location.href);

      // 记录开始时间
      const publishStartTime = Date.now();

      // 2. 根据内容类型选择发布流程
      if (contentType === '短视频') {
        this.log('🎬 开始短视频发布流程');
        await this.handleShortVideoPublish(data);
      } else {
        this.log('📝 开始动态发布流程');
        // 使用性能监控的智能页面状态检测和导航
        await this.mutationObserverBase.measurePerformance('页面导航处理', async () => {
          await this.handlePageNavigation(data);
        });

        // 使用性能监控的内容注入
        await this.mutationObserverBase.measurePerformance('内容注入', async () => {
          await this.injectContentInEditPage(data);
        });
      }

      // 总体性能报告
      const totalTime = Date.now() - publishStartTime;
      this.log('🚀 抖音发布流程性能报告:', {
        总耗时: totalTime + 'ms',
        初始状态: initialState,
        内容类型: contentType || '动态',
        版本: '2.1.0-video-support'
      });

      // 4. 验证发布状态
      const isReady = await this.validatePublishReady();

      // 获取最终状态信息
      const finalState = await this.detectPageState();

      const result = {
        success: true,
        action: 'prefilled',
        message: contentType === '短视频' ?
          '短视频内容已预填充到抖音编辑器，请手动确认并发布' :
          '内容已预填充到抖音编辑器，请手动确认并发布',
        platform: this.platform,
        contentType: contentType || '动态',
        validated: isReady,
        finalState: finalState,
        finalUrl: window.location.href,
        timestamp: Date.now()
      };

      this.log('抖音专用发布流程完成', result);
      this.sendPublishResult(result);

      return result;

    } catch (error) {
      // 使用增强的错误处理
      const debugInfo = {
        currentUrl: window.location.href,
        currentState: await this.detectPageState().catch(() => 'unknown'),
        pageTitle: document.title,
        contentType: contentType || '动态',
        hasPublishButton: !!Array.from(document.querySelectorAll('*')).find(el =>
          el.textContent && (el.textContent.includes('发布图文') || el.textContent.includes('发布'))
        ),
        hasUploadElements: document.querySelectorAll('[class*="upload"], input[type="file"]').length > 0,
        timestamp: Date.now()
      };

      // 使用增强的错误日志记录
      this.logError('抖音发布流程', error, debugInfo);

      // 分析错误并生成结果
      const errorAnalysis = this.analyzeError(error);
      const errorResult = {
        success: false,
        platform: this.platform,
        contentType: contentType || '动态',
        error: errorAnalysis.userMessage,
        message: error.message,
        errorCategory: errorAnalysis.category,
        severity: errorAnalysis.severity,
        retryable: errorAnalysis.retryable,
        debugInfo: debugInfo
      };

      this.log('抖音发布错误详情:', errorResult);
      this.sendPublishResult(errorResult);
      return errorResult;
    }
  }

  /**
   * 处理短视频发布流程
   * @param {Object} data - 发布数据
   */
  async handleShortVideoPublish(data) {
    const { title, content, files } = data;

    try {
      this.log('🎬 开始短视频发布流程处理');

      // 检测当前页面状态
      const currentState = await this.detectPageState();
      this.log('短视频发布 - 当前页面状态:', currentState);

      // 根据页面状态进行相应处理
      switch (currentState) {
        case this.config.pageStates.HOMEPAGE:
          this.log('从首页开始，需要导航到短视频上传页面');
          // 这里应该有导航到短视频上传页面的逻辑
          // 但由于扩展程序会直接打开正确的URL，这种情况应该很少见
          throw new Error('请确保从正确的短视频上传页面开始发布');

        case this.config.pageStates.VIDEO_UPLOAD_PAGE:
          this.log('在短视频上传页面，开始上传视频文件');
          await this.handleVideoUploadAndTransition(data);
          break;

        case this.config.pageStates.VIDEO_EDIT_PAGE:
          this.log('已在短视频编辑页面，直接注入内容');
          await this.injectVideoContentInEditPage(data);
          break;

        default:
          throw new Error(`不支持的短视频页面状态: ${currentState}`);
      }

      this.log('✅ 短视频发布流程处理完成');

    } catch (error) {
      this.logError('短视频发布流程失败', error);
      throw error;
    }
  }

  /**
   * 处理视频上传和页面跳转
   * @param {Object} data - 发布数据
   */
  async handleVideoUploadAndTransition(data) {
    const { files, fileIds } = data;

    try {
      this.log('开始处理视频文件上传');

      // 获取实际文件数据（支持新的fileIds系统和传统files数组）
      let filesToProcess = [];

      if (fileIds && fileIds.length > 0) {
        // 新方案：从Background Script获取文件
        this.log('🎬 使用新的Background Script文件管理系统获取短视频文件...');
        try {
          for (const fileId of fileIds) {
            this.log(`🎬 请求文件: ${fileId}`);
            const file = await this.getFileWithChunking(fileId);
            if (file && file instanceof File) {
              filesToProcess.push(file);
              this.log(`🎬 成功获取文件: ${file.name} (${file.size} bytes)`);
            } else {
              this.log(`⚠️ 警告: 文件ID ${fileId} 对应的文件未找到`);
            }
          }
        } catch (error) {
          this.logError('从Background Script获取文件失败:', error);
          // 降级到传统方案
          filesToProcess = files || [];
        }
      } else {
        // 传统方案：使用传统的文件数据
        this.log('🎬 使用传统文件管理系统...');
        filesToProcess = files || [];
      }

      // 分离视频文件和封面图片
      const videoFiles = filesToProcess.filter(file =>
        file.type?.startsWith('video/') ||
        (file.name && /\.(mp4|mov|avi|webm)$/i.test(file.name))
      );

      const coverImages = filesToProcess.filter(file =>
        file.type?.startsWith('image/') ||
        (file.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name))
      );

      this.log('🎬 文件分类结果:', {
        totalFiles: filesToProcess.length,
        videoFiles: videoFiles.length,
        coverImages: coverImages.length,
        fileIds: fileIds?.length || 0,
        legacyFiles: files?.length || 0
      });

      // 上传视频文件
      if (videoFiles.length > 0) {
        await this.uploadVideoFile(videoFiles[0]); // 只取第一个视频文件

        // 等待页面跳转到编辑页面
        await this.waitForVideoEditPageTransition();

        // 🎯 优先注入文字内容（标题和描述）
        this.log('📝 开始注入文字内容（标题和描述）');
        await this.injectVideoContentInEditPage(data);

        // 封面图片处理（暂时跳过，抖音短视频通常使用视频帧作为封面）
        if (coverImages.length > 0) {
          this.log('🖼️ 检测到封面图片，抖音短视频通常使用视频帧作为封面，跳过上传');
        }

        this.log('✅ 短视频编辑页面所有内容处理完成');
      } else {
        throw new Error('未找到视频文件，短视频发布需要至少一个视频文件');
      }

    } catch (error) {
      this.logError('视频上传和页面跳转失败', error);
      throw error;
    }
  }

  /**
   * 上传视频文件（使用统一文件上传方法）
   * @param {File} videoFile - 视频文件
   */
  async uploadVideoFile(videoFile) {
    return await this.uploadFilesUnified([videoFile], 'video', [
      '上传视频', '选择视频', '添加视频', '点击上传', '上传'
    ], '视频文件上传');
  }

  /**
   * 等待页面跳转到视频编辑页面
   */
  async waitForVideoEditPageTransition() {
    try {
      this.log('等待页面跳转到视频编辑页面...');

      // 等待URL变化到编辑页面
      const maxWaitTime = 30000; // 30秒超时
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const currentState = await this.detectPageState();

        if (currentState === this.config.pageStates.VIDEO_EDIT_PAGE) {
          this.log('✅ 成功跳转到视频编辑页面');

          // 清理文件输入控件缓存（页面已跳转）
          this.clearFileInputCache();

          // 等待编辑页面关键元素加载
          await this.waitForElementSmart('input[placeholder*="标题"]', 10000);
          return true;
        }

        await this.delay(1000); // 每秒检查一次
      }

      throw new Error('等待跳转到视频编辑页面超时');

    } catch (error) {
      this.logError('等待视频编辑页面跳转失败', error);
      throw error;
    }
  }



  /**
   * 统一的标题输入框查找方法（合并所有查找策略）
   * @returns {Promise<HTMLElement|null>} - 找到的标题输入框
   */
  async findTitleInputUnified() {
    // 策略1: 使用现有的findTitleInput方法
    try {
      const titleInput = await this.findTitleInput();
      if (titleInput) {
        this.log('策略1成功：使用findTitleInput方法');
        return titleInput;
      }
    } catch (error) {
      this.log('策略1失败，尝试其他方法:', error.message);
    }

    // 策略2: 直接查找包含"标题"的输入框
    const inputs = document.querySelectorAll('input[type="text"], input:not([type]), textbox');
    for (const input of inputs) {
      if (input.placeholder &&
          (input.placeholder.includes('标题') ||
           input.placeholder.includes('填写作品标题'))) {
        this.log('策略2找到标题输入框:', input.placeholder);
        return input;
      }
    }

    // 策略3: 查找任何可见的文本输入框
    for (const input of inputs) {
      if (input.offsetParent !== null && !input.value) {
        this.log('策略3找到可见的空输入框');
        return input;
      }
    }

    this.log('所有策略都未找到标题输入框');
    return null;
  }

  /**
   * 统一的内容编辑器查找方法（合并所有查找策略）
   * @returns {Promise<HTMLElement|null>} - 找到的内容编辑器
   */
  async findContentEditorUnified() {
    // 策略1: 使用现有的findContentEditor方法
    try {
      const contentEditor = await this.findContentEditor();
      if (contentEditor) {
        this.log('策略1成功：使用findContentEditor方法');
        return contentEditor;
      }
    } catch (error) {
      this.log('策略1失败，尝试其他方法:', error.message);
    }

    // 策略2: 直接查找contenteditable元素
    const editables = document.querySelectorAll('[contenteditable="true"]');
    for (const editable of editables) {
      if (editable.offsetParent !== null && !editable.textContent.trim()) {
        this.log('策略2找到contenteditable元素');
        return editable;
      }
    }

    // 策略3: 查找textarea
    const textareas = document.querySelectorAll('textarea');
    for (const textarea of textareas) {
      if (textarea.offsetParent !== null &&
          (textarea.placeholder?.includes('简介') ||
           textarea.placeholder?.includes('描述') ||
           !textarea.value)) {
        this.log('策略3找到textarea元素');
        return textarea;
      }
    }

    // 策略4: 查找任何可见的可编辑区域
    const allEditables = document.querySelectorAll('[contenteditable="true"], textarea, [role="textbox"]');
    for (const editable of allEditables) {
      if (editable.offsetParent !== null) {
        this.log('策略4找到可编辑区域');
        return editable;
      }
    }

    this.log('所有策略都未找到内容编辑器');
    return null;
  }

  /**
   * 统一的内容注入方法（合并所有注入策略）
   * @param {HTMLElement} element - 目标元素
   * @param {string} content - 要注入的内容
   * @param {string} type - 内容类型 ('title' 或 'content')
   * @returns {Promise<boolean>} - 注入是否成功
   */
  async injectContentUnified(element, content, type = 'content') {
    this.log(`开始统一注入${type}内容`);

    // 方法1: 直接设置内容
    try {
      element.focus();

      if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        element.value = '';
        element.value = content;
      } else {
        element.textContent = '';
        element.textContent = content;
      }

      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      await this.delay(500);

      // 验证注入结果
      const currentContent = element.value || element.textContent;
      if (type === 'title' ? currentContent === content : currentContent.includes(content.substring(0, 10))) {
        this.log('方法1成功：直接设置内容');
        return true;
      }
    } catch (error) {
      this.log('方法1失败:', error.message);
    }

    // 方法2: 使用injector或injectContentToEditor
    try {
      let success = false;
      if (type === 'title') {
        success = await this.injector.injectContent(element, content);
      } else {
        success = await this.injectContentToEditor(element, content);
      }

      if (success) {
        this.log('方法2成功：使用专用注入方法');
        return true;
      }
    } catch (error) {
      this.log('方法2失败:', error.message);
    }

    this.log('所有注入方法都失败了');
    return false;
  }

  /**
   * 统一的文件上传方法（合并视频和图片上传逻辑）
   * @param {File[]} files - 要上传的文件数组
   * @param {string} fileType - 文件类型 ('image', 'video', 'any')
   * @param {Array<string>} triggerTexts - 触发按钮的文本关键词
   * @param {string} operationName - 操作名称（用于日志）
   * @param {boolean} waitForTransition - 是否等待页面跳转
   * @returns {Promise<Object>} - 上传结果
   */
  async uploadFilesUnified(files, fileType = 'any', triggerTexts = [], operationName = '文件上传', waitForTransition = false) {
    return await this.executeWithRetry(async () => {
      this.log(`开始${operationName}:`, files.map(f => f.name));

      // 使用统一的文件输入控件查找器
      const fileInput = await this.findFileInputUnified(fileType, triggerTexts);

      if (!fileInput) {
        throw new Error(`未找到${fileType}文件上传输入框`);
      }

      this.log(`找到${fileType}文件输入控件，准备注入文件`);

      // 使用文件注入方法
      await this.injectFilesToInput(fileInput, files);

      this.log(`✅ ${operationName}成功`);

      // 如果需要等待页面跳转
      if (waitForTransition) {
        this.log('开始监控页面跳转...');
        const uploadResult = await this.monitorPageTransition('edit', 3000);

        this.log(`页面跳转完成`, {
          fileCount: files.length,
          method: 'pageTransition',
          alreadyInEditPage: uploadResult.alreadyInEditPage || true
        });

        return { ...uploadResult, alreadyInEditPage: true };
      }

      return { success: true };
    }, operationName, 3, 1500);
  }

  /**
   * 通用文件输入控件查找器（统一所有文件上传场景）
   * @param {string} fileType - 文件类型 ('image', 'video', 'any')
   * @param {Array<string>} triggerTexts - 触发按钮的文本关键词
   */
  async findFileInputUnified(fileType = 'any', triggerTexts = []) {
    // 缓存查询结果，避免重复DOM查询
    const cacheKey = `fileInput_${fileType}_${triggerTexts.join('_')}`;
    if (this._fileInputCache && this._fileInputCache[cacheKey]) {
      const cached = this._fileInputCache[cacheKey];
      // 验证缓存的元素是否仍然有效
      if (cached.element && document.contains(cached.element)) {
        this.log(`使用缓存的文件输入控件: ${fileType}`);
        return cached.element;
      }
    }

    // 初始化缓存
    if (!this._fileInputCache) {
      this._fileInputCache = {};
    }

    // 统一的查找策略
    const strategies = [
      // 策略1: 查找可见且匹配类型的文件输入
      () => {
        const inputs = document.querySelectorAll('input[type="file"]');
        for (const input of inputs) {
          if (input.offsetParent !== null) { // 可见性检查
            if (fileType === 'any') return input;
            if (fileType === 'image' && input.accept && input.accept.includes('image')) return input;
            if (fileType === 'video' && input.accept && input.accept.includes('video')) return input;
            if (!input.accept) return input; // 无限制的输入框
          }
        }
        return null;
      },

      // 策略2: 通过触发按钮查找
      () => {
        if (triggerTexts.length === 0) return null;

        const buttons = document.querySelectorAll('button, div, span, [class*="upload"], [class*="Upload"]');
        for (const btn of buttons) {
          if (btn.textContent && triggerTexts.some(text => btn.textContent.includes(text))) {
            this.log(`找到触发按钮，点击触发文件选择器: ${btn.textContent.trim()}`);
            btn.click();
            // 等待DOM更新
            setTimeout(() => {}, 800);
            return document.querySelector('input[type="file"]');
          }
        }
        return null;
      },

      // 策略3: 查找任何文件输入框（兜底策略）
      () => {
        return document.querySelector('input[type="file"]');
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      const fileInput = strategies[i]();
      if (fileInput) {
        this.log(`策略${i+1}找到${fileType}文件输入控件`);

        // 缓存结果
        this._fileInputCache[cacheKey] = {
          element: fileInput,
          timestamp: Date.now()
        };

        return fileInput;
      }

      // 策略间智能等待
      if (i < strategies.length - 1) {
        await this.delay(300);
      }
    }

    return null;
  }



  /**
   * 统一的重试执行器（用于关键操作的重试机制）
   * @param {Function} operation - 要执行的操作
   * @param {string} operationName - 操作名称（用于日志）
   * @param {number} maxRetries - 最大重试次数
   * @param {number} retryDelay - 重试间隔（毫秒）
   */
  async executeWithRetry(operation, operationName, maxRetries = 3, retryDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log(`${operationName} - 尝试 ${attempt}/${maxRetries}`);
        const result = await operation();
        this.log(`✅ ${operationName} - 第${attempt}次尝试成功`);
        return result;
      } catch (error) {
        this.log(`❌ ${operationName} - 第${attempt}次尝试失败:`, error.message);

        if (attempt === maxRetries) {
          this.logError(`${operationName} - 所有重试都失败`, error);
          throw error;
        }

        // 等待后重试
        await this.delay(retryDelay);
      }
    }
  }

  /**
   * 统一的错误处理器（标准化错误处理流程）
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   * @param {boolean} shouldThrow - 是否抛出错误
   */
  handleUnifiedError(error, context, shouldThrow = false) {
    const errorMessage = `${context}失败: ${error.message}`;
    this.logError(errorMessage, error);

    if (shouldThrow) {
      throw new Error(errorMessage);
    } else {
      this.log(`${context}失败，但继续执行其他步骤`);
    }
  }

  /**
   * 清理文件输入控件缓存（在页面跳转或操作完成后调用）
   */
  clearFileInputCache() {
    if (this._fileInputCache) {
      this.log('清理文件输入控件缓存');
      this._fileInputCache = {};
    }
  }







  /**
   * 在视频编辑页面注入内容
   * @param {Object} data - 发布数据
   */
  async injectVideoContentInEditPage(data) {
    const { title, content } = data;

    try {
      this.log('开始在视频编辑页面注入内容');

      // 注入标题
      if (title) {
        await this.injectVideoTitle(title);
      }

      // 注入描述内容
      if (content) {
        await this.injectVideoDescription(content);
      }

      this.log('✅ 视频编辑页面内容注入完成');

    } catch (error) {
      this.logError('视频编辑页面内容注入失败', error);
      throw error;
    }
  }

  /**
   * 注入视频标题
   * @param {string} title - 标题内容
   */
  async injectVideoTitle(title) {
    try {
      this.log('开始注入视频标题');

      // 使用统一的标题输入框查找方法
      const titleInput = await this.findTitleInputUnified();
      if (!titleInput) {
        throw new Error('未找到视频标题输入框');
      }

      // 使用统一的内容注入方法
      const success = await this.injectContentUnified(titleInput, title, 'title');
      if (!success) {
        throw new Error('标题注入失败');
      }

      this.log('✅ 视频标题注入成功');

    } catch (error) {
      this.logError('视频标题注入失败', error);
      // 不抛出错误，允许继续执行
      this.log('标题注入失败，但继续执行其他步骤');
    }
  }

  /**
   * 注入视频描述
   * @param {string} content - 描述内容
   */
  async injectVideoDescription(content) {
    try {
      this.log('开始注入视频描述');

      // 使用统一的内容编辑器查找方法
      const contentEditor = await this.findContentEditorUnified();
      if (!contentEditor) {
        throw new Error('未找到视频描述编辑区域');
      }

      // 使用统一的内容注入方法
      const success = await this.injectContentUnified(contentEditor, content, 'content');
      if (!success) {
        throw new Error('描述注入失败');
      }

      this.log('✅ 视频描述注入成功');

    } catch (error) {
      this.logError('视频描述注入失败', error);
      // 不抛出错误，允许继续执行
      this.log('描述注入失败，但继续执行其他步骤');
    }
  }

  /**
   * 检查登录状态
   * @returns {Promise<boolean>} - 是否已登录
   */
  async checkLoginStatus() {
    try {
      // 检查是否有登录相关的元素
      const loginIndicators = [
        // 检查是否有用户头像或用户名
        '[class*="avatar"]',
        '[class*="user"]',
        '[data-testid*="user"]',
        // 检查是否有登录按钮（如果有说明未登录）
        'button:contains("登录")',
        'a:contains("登录")'
      ];

      let hasUserInfo = false;
      let hasLoginButton = false;

      for (const selector of loginIndicators) {
        try {
          if (selector.includes(':contains')) {
            // 处理包含文本的选择器
            const text = selector.match(/contains\("(.+)"\)/)[1];
            const elements = document.querySelectorAll('button, a');
            for (const el of elements) {
              if (el.textContent && el.textContent.includes(text)) {
                hasLoginButton = true;
                break;
              }
            }
          } else {
            const element = document.querySelector(selector);
            if (element) {
              hasUserInfo = true;
            }
          }
        } catch (error) {
          // 某些选择器可能不支持，继续尝试下一个
          continue;
        }
      }

      // 如果有用户信息且没有登录按钮，认为已登录
      const isLoggedIn = hasUserInfo && !hasLoginButton;

      this.log('登录状态检查:', {
        hasUserInfo,
        hasLoginButton,
        isLoggedIn,
        currentUrl: window.location.href
      });

      return isLoggedIn;

    } catch (error) {
      this.log('登录状态检查失败:', error);
      // 如果检查失败，假设已登录，让后续流程继续
      return true;
    }
  }

  /**
   * 检测当前页面状态（支持动态和短视频）
   * @returns {Promise<string>} - 页面状态
   */
  async detectPageState() {
    // 检查URL模式
    const url = window.location.href;

    if (url.includes('/creator-micro/home')) {
      this.log('检测到抖音创作者中心首页');
      return this.config.pageStates.HOMEPAGE;
    }

    // 短视频上传页面检测（基于测试验证）
    if (url.includes('/content/upload') && !url.includes('default-tab=3')) {
      this.log('检测到抖音短视频上传页面 (URL匹配)');
      return this.config.pageStates.VIDEO_UPLOAD_PAGE;
    }

    // 短视频编辑页面检测（基于测试验证）
    if (url.includes('/content/post/video')) {
      this.log('检测到抖音短视频编辑页面 (URL匹配)');
      return this.config.pageStates.VIDEO_EDIT_PAGE;
    }

    // 改进的图文上传页面检测（基于成功测试经验）
    if (url.includes('/upload?default-tab=3') ||
        url.includes('default-tab=3')) {
      this.log('检测到抖音图文上传页面 (URL匹配)');
      return this.config.pageStates.UPLOAD_PAGE;
    }

    // 通过DOM元素检测上传页面
    const uploadIndicators = [
      'input[type="file"]',
      '[class*="upload"]',
      '[class*="Upload"]',
      '[data-testid*="upload"]',
      'div:contains("上传图片")',
      'div:contains("选择图片")'
    ];

    for (const indicator of uploadIndicators) {
      try {
        if (indicator.includes(':contains')) {
          // 处理包含文本的选择器
          const elements = document.querySelectorAll('div, span');
          for (const el of elements) {
            if (el.textContent && el.textContent.includes(indicator.match(/contains\("(.+)"\)/)[1])) {
              this.log('检测到抖音图文上传页面 (DOM匹配):', indicator);
              return this.pageStates.UPLOAD_PAGE;
            }
          }
        } else {
          const element = document.querySelector(indicator);
          if (element) {
            this.log('检测到抖音图文上传页面 (DOM匹配):', indicator);
            return this.config.pageStates.UPLOAD_PAGE;
          }
        }
      } catch (error) {
        // 某些选择器可能不支持，继续尝试下一个
        continue;
      }
    }

    // 检查DOM元素特征 - 编辑页面
    // 使用精确选择器提高检测速度和准确性
    if (document.querySelector('input[placeholder="添加作品标题"]') ||
        document.querySelector('.zone-container[contenteditable="true"]') ||
        (document.querySelector('input[placeholder*="标题"]') && document.querySelector('[contenteditable="true"]'))) {
      this.log('检测到抖音编辑页面（精确匹配）');
      return this.config.pageStates.EDIT_PAGE;
    }

    this.log('未识别的抖音页面状态', { url });
    return this.config.pageStates.UNKNOWN;
  }

  /**
   * 处理页面导航逻辑
   * @param {Object} data - 发布数据
   */
  async handlePageNavigation(data) {
    const pageState = await this.detectPageState();
    this.currentState = pageState;

    // 性能优化：页面状态变化时清除缓存
    this.clearElementCache();

    switch(pageState) {
      case this.config.pageStates.HOMEPAGE:
        this.log('从首页开始，导航到图文上传');
        await this.navigateToImageUpload();
        await this.handleUploadAndTransition(data);
        break;

      case this.config.pageStates.UPLOAD_PAGE:
        this.log('已在图文上传页面，直接上传图片');
        await this.handleUploadAndTransition(data);
        break;

      case this.config.pageStates.EDIT_PAGE:
        this.log('已在图文编辑页面，直接注入内容');
        // 无需导航，直接进入内容注入
        break;

      case this.config.pageStates.VIDEO_UPLOAD_PAGE:
        this.log('已在短视频上传页面，但这应该由短视频流程处理');
        throw new Error('短视频上传页面应该使用短视频发布流程');

      case this.config.pageStates.VIDEO_EDIT_PAGE:
        this.log('已在短视频编辑页面，但这应该由短视频流程处理');
        throw new Error('短视频编辑页面应该使用短视频发布流程');

      default:
        throw new Error(`未识别的抖音页面状态: ${pageState}`);
    }
  }

  /**
   * 查找发布图文按钮
   * @returns {HTMLElement|null} - 找到的按钮元素
   */
  findPublishImageButton() {
    // 策略1: 精确文本匹配
    const exactMatch = Array.from(document.querySelectorAll('div, button, a, span'))
      .find(el => el.textContent && el.textContent.trim() === '发布图文');

    if (exactMatch) {
      this.log('精确匹配找到发布图文按钮');
      return exactMatch;
    }

    // 策略2: 包含文本匹配
    const containsMatch = Array.from(document.querySelectorAll('div, button, a, span'))
      .find(el => el.textContent && el.textContent.includes('发布图文'));

    if (containsMatch) {
      this.log('包含匹配找到发布图文按钮');
      return containsMatch;
    }

    // 策略3: 查找可点击的父元素
    const textElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent && el.textContent.includes('发布图文'));

    for (const textEl of textElements) {
      let current = textEl;
      while (current && current !== document.body) {
        if (current.tagName === 'BUTTON' ||
            current.tagName === 'A' ||
            current.onclick ||
            current.style.cursor === 'pointer' ||
            current.classList.contains('clickable')) {
          this.log('父元素匹配找到发布图文按钮');
          return current;
        }
        current = current.parentElement;
      }
    }

    return null;
  }

  /**
   * 优化的发布图文按钮查找 - 使用基类实现
   * @param {number} maxWaitTime - 最大等待时间（毫秒）
   * @returns {Promise<HTMLElement|null>} - 找到的按钮元素
   */
  async findPublishImageButtonOptimized(maxWaitTime = 3000) {
    return await this.mutationObserverBase.findButtonOptimized(
      () => this.findPublishImageButton(),
      maxWaitTime,
      '抖音发布图文按钮'
    );
  }

  /**
   * 处理图片上传和页面跳转的统一逻辑
   * @param {Object} data - 发布数据
   */
  async handleUploadAndTransition(data) {
    await this.handleImageUpload(data);

    // 优化：由于我们已经在监控中确认了页面跳转，直接进入下一步
    this.log('图片上传和页面跳转完成，准备注入内容');
  }

  /**
   * 导航到图文上传页面
   */
  async navigateToImageUpload() {
    return await this.executeWithRetry(async () => {
      // 使用性能监控的MutationObserver优化按钮查找
      const publishButton = await this.mutationObserverBase.measurePerformance('查找发布按钮', async () => {
        return await this.findPublishImageButtonOptimized();
      });

      if (!publishButton) {
        throw new Error('未找到发布图文按钮');
      }

      this.log('找到"发布图文"按钮，准备点击');

      // 使用改进的点击逻辑（基于成功测试经验）
      try {
        // 方法1: 触发多种事件
        const events = ['mousedown', 'mouseup', 'click'];
        events.forEach(eventType => {
          const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
          });
          publishButton.dispatchEvent(event);
        });

        // 方法2: 如果是链接，尝试直接导航
        if (publishButton.tagName === 'A' && publishButton.href) {
          window.location.href = publishButton.href;
        }

        // 方法3: 如果有onclick属性，尝试执行
        if (publishButton.onclick) {
          publishButton.onclick();
        }

        this.log('多种点击方法已执行');
      } catch (clickError) {
        this.log('点击执行失败:', clickError.message);
        throw new Error('点击执行失败: ' + clickError.message);
      }

      this.log('已点击发布图文按钮，开始智能监控页面跳转...');

      // 使用性能监控的智能页面跳转监控（增强错误处理）
      let navigationSuccess = false;
      try {
        navigationSuccess = await this.mutationObserverBase.measurePerformance('页面跳转监控', async () => {
          return await this.monitorPageTransition('upload', 2000);
        });
      } catch (error) {
        this.log('⚠️ 页面跳转监控异常，但不影响其他平台:', error.message);
        navigationSuccess = false;
      }

      if (!navigationSuccess) {
        // 不抛出错误，而是记录警告，避免影响其他平台
        this.log('⚠️ 页面跳转监控失败，但继续执行以避免影响其他平台');
      }

      // 验证是否成功跳转到上传页面
      const newState = await this.detectPageState();
      if (newState !== this.config.pageStates.UPLOAD_PAGE) {
        this.log('页面状态检测结果:', newState, '当前URL:', window.location.href);
        // 不抛出错误，因为可能是SPA路由，URL检测可能不准确
        this.log('警告: 页面状态检测不匹配，但继续执行');
      }

      this.log('成功导航到图文上传页面');
      return true;
    }, '导航到图文上传页面', 3, 1000);
  }



  /**
   * 智能元素等待方法 - 使用基类实现
   * @param {string} selector - CSS选择器
   * @param {number} timeout - 超时时间（毫秒）
   * @param {boolean} checkVisible - 是否检查元素可见性
   * @returns {Promise<HTMLElement|null>} - 找到的元素
   */
  async waitForElementSmart(selector, timeout = 2000, checkVisible = true) {
    return await this.mutationObserverBase.waitForElementSmart(
      selector,
      timeout,
      checkVisible,
      `抖音元素: ${selector}`
    );
  }

  /**
   * 处理图片上传（使用标准文件处理流程）
   * @param {Object} data - 包含fileIds或files的数据对象
   */
  async handleImageUpload(data) {
    try {
      this.log('开始抖音图片上传流程...', {
        hasData: !!data,
        hasFiles: !!(data && data.files),
        hasFileIds: !!(data && data.fileIds),
        platform: this.platform
      });

      // 检查processFileData方法是否存在
      if (typeof this.processFileData !== 'function') {
        throw new Error('processFileData方法不存在，请检查继承关系');
      }

      // 使用标准文件处理方法获取File对象
      const filesToUpload = await this.processFileData(data);

      if (!filesToUpload || filesToUpload.length === 0) {
        this.log('没有图片需要上传，跳过上传步骤');
        return true;
      }

      // 验证文件格式和数量
      const validFiles = this.validateFiles(filesToUpload);

      if (validFiles.length === 0) {
        this.log('没有通过验证的文件可以上传');
        return true;
      }

      this.log(`准备上传 ${validFiles.length} 个图片文件`);

      // 使用统一的文件上传方法，包含页面跳转监控
      return await this.uploadFilesUnified(
        validFiles,
        'image',
        ['上传图片', '选择图片', '添加图片'],
        '图片上传和页面跳转',
        true  // 等待页面跳转
      );

    } catch (error) {
      this.log('图片上传失败:', error);
      throw error;
    }
  }

  /**
   * 监控页面跳转到编辑页面（MutationObserver极速检测）
   * 参考小红书平台优化经验
   */
  async monitorPageTransition() {
    return new Promise((resolve) => {
      const timeout = 3000; // 进一步减少到3秒超时
      let resolved = false;
      const startTime = Date.now();

      const checkEditPage = () => {
        if (resolved) return;

        // 检查URL变化（抖音跳转很快）
        if (this.isEditPageUrl()) {
          resolved = true;
          const elapsed = Date.now() - startTime;
          this.log(`页面监控检测到编辑页面URL，立即返回 (${elapsed}ms)`);
          resolve({ completed: true, alreadyInEditPage: true, method: 'pageMonitor' });
          return;
        }

        // 快速检查编辑页面元素
        if (this.isInEditPage()) {
          resolved = true;
          const elapsed = Date.now() - startTime;
          this.log(`页面监控检测到编辑页面元素，立即返回 (${elapsed}ms)`);
          resolve({ completed: true, alreadyInEditPage: true, method: 'pageMonitor' });
        }
      };

      // 立即检查一次
      checkEditPage();
      if (resolved) return;

      // 使用MutationObserver监控DOM变化（参考小红书技术）
      const observer = new MutationObserver(() => {
        if (!resolved) {
          checkEditPage();
        }
      });

      // 开始监控DOM变化
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'contenteditable', 'placeholder']
      });

      // 设置高频率检查（每50ms检查一次，更快响应）
      const interval = setInterval(() => {
        if (!resolved) {
          checkEditPage();
        }
      }, 50);

      // 超时处理
      setTimeout(() => {
        if (!resolved) {
          observer.disconnect();
          clearInterval(interval);
          resolved = true;
          this.log('⚠️ 页面跳转监控超时（已优化到3秒）');
          resolve({ completed: false, alreadyInEditPage: false, method: 'pageMonitor', timeout: true });
        }
      }, timeout);

      // 清理函数
      const cleanup = () => {
        observer.disconnect();
        clearInterval(interval);
      };

      // 如果已经resolved，立即清理
      if (resolved) {
        cleanup();
      }
    });
  }



  /**
   * 将文件注入到输入控件（改进版本）
   */
  async injectFilesToInput(fileInput, files) {
    try {
      // 方法1: 使用DataTransfer API
      const dataTransfer = new DataTransfer();
      files.forEach(file => {
        dataTransfer.items.add(file);
      });

      fileInput.files = dataTransfer.files;

      // 触发多种事件确保平台检测到文件变化
      const events = ['input', 'change'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        fileInput.dispatchEvent(event);
      });

      this.log('文件已注入到输入控件，触发了change和input事件');

    } catch (error) {
      this.log('文件注入失败:', error);
      throw new Error('文件注入失败: ' + error.message);
    }
  }

  /**
   * 快速检查是否在编辑页面
   * @returns {boolean} - 是否在编辑页面
   */
  isInEditPage() {
    return !!(document.querySelector(this.selectors.titleInput[0]) ||
              document.querySelector(this.selectors.contentEditor[0]));
  }

  /**
   * 检查URL是否表明在编辑页面
   * @returns {boolean} - URL是否表明在编辑页面
   */
  isEditPageUrl() {
    const currentUrl = window.location.href;
    return currentUrl.includes('/post/image') ||
           currentUrl.includes('media_type=image') ||
           currentUrl.includes('type=new');
  }







  /**
   * 确保编辑页面完全准备就绪（智能检测版本）
   */
  async ensureEditPageReady() {
    this.log('快速验证编辑页面准备状态...');

    // 快速检查关键元素（跳过复杂的Observer）
    const maxRetries = 2; // 大幅减少重试次数
    const retryDelay = 100; // 减少到100ms间隔

    for (let i = 0; i < maxRetries; i++) {
      // 检查关键元素是否都已加载
      const titleInput = document.querySelector(this.selectors.titleInput[0]);
      const contentEditor = document.querySelector(this.selectors.contentEditor[0]);

      if (titleInput && contentEditor) {
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
   * 在编辑页面注入内容
   * @param {Object} data - 发布数据
   */
  async injectContentInEditPage(data) {
    const { title, content } = data;

    this.log('开始编辑页面内容注入', { hasTitle: !!title, hasContent: !!content });

    // 快速验证页面准备状态
    await this.ensureEditPageReady();

    // 并行准备标题和内容注入器（提高效率）
    const injectionTasks = [];

    // 注入标题
    if (title) {
      injectionTasks.push(
        this.injectTitle(title).then(success => {
          if (!success) {
            throw new Error('标题注入失败');
          }
          this.log('标题注入完成');
          return { type: 'title', success };
        })
      );
    }

    // 注入内容
    if (content) {
      injectionTasks.push(
        this.injectContent(content).then(success => {
          if (!success) {
            throw new Error('内容注入失败');
          }
          this.log('内容注入完成');
          return { type: 'content', success };
        })
      );
    }

    // 等待所有注入任务完成
    if (injectionTasks.length > 0) {
      try {
        const results = await Promise.all(injectionTasks);
        this.log('所有内容注入任务完成', results);
      } catch (error) {
        this.logError('内容注入过程中出现错误', error);
        throw error;
      }
    }

    this.log('编辑页面内容注入完成');
  }

  /**
   * 查找标题输入框
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
      const titleInput = this.injector.findElement('douyin', 'title');
      if (titleInput) {
        this.log('UniversalContentInjector找到标题输入框');
        return titleInput;
      }

      // 策略3: 使用MutationObserver智能等待（参考小红书优化）
      this.log('智能等待标题输入框加载...');
      const element = await this.waitForElementSmart(this.selectors.titleInput[0], 1500); // 减少到1.5秒

      return element;
    });
  }

  /**
   * 查找内容编辑器
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
      const contentEditor = this.injector.findElement('douyin', 'content');
      if (contentEditor) {
        this.log('UniversalContentInjector找到内容编辑器');
        return contentEditor;
      }

      // 策略3: 使用MutationObserver智能等待（参考小红书优化）
      this.log('智能等待内容编辑器加载...');
      const element = await this.waitForElementSmart(this.selectors.contentEditor[0], 1500); // 减少到1.5秒

      return element;
    });
  }

  /**
   * 注入标题到抖音标题输入框
   * @param {string} title - 要注入的标题
   * @returns {Promise<boolean>} - 注入是否成功
   */
  async injectTitle(title) {
    this.log('开始注入标题到抖音编辑器', { titleLength: title.length });

    try {
      // 使用统一的标题输入框查找方法
      const titleInput = await this.findTitleInputUnified();
      if (!titleInput) {
        throw new Error('未找到抖音标题输入框');
      }

      // 使用统一的内容注入方法
      const success = await this.injectContentUnified(titleInput, title, 'title');
      if (!success) {
        throw new Error('标题注入失败');
      }

      this.log('抖音标题注入成功');
      return true;

    } catch (error) {
      this.logError('抖音标题注入失败', error);
      return false;
    }
  }

  /**
   * 注入内容到抖音内容编辑器
   * @param {string} content - 要注入的内容
   * @returns {Promise<boolean>} - 注入是否成功
   */
  async injectContent(content) {
    this.log('开始注入内容到抖音编辑器', { contentLength: content.length });

    try {
      // 使用统一的内容编辑器查找方法
      const contentEditor = await this.findContentEditorUnified();
      if (!contentEditor) {
        throw new Error('未找到抖音内容编辑器');
      }

      // 使用统一的内容注入方法
      const success = await this.injectContentUnified(contentEditor, content, 'content');
      if (!success) {
        throw new Error('内容注入失败');
      }

      this.log('抖音内容注入成功');
      return true;

    } catch (error) {
      this.logError('抖音内容注入失败', error);
      return false;
    }
  }

  /**
   * 优化的内容注入方法（基于Playwright分析）
   * @param {HTMLElement} contentEditor - 内容编辑器元素
   * @param {string} content - 要注入的内容
   * @returns {Promise<boolean>} - 注入是否成功
   */
  async injectContentToEditor(contentEditor, content) {
    try {
      // 方法1: 直接设置innerHTML（抖音平台推荐方式）
      contentEditor.innerHTML = content;

      // 触发必要的事件
      const inputEvent = new Event('input', { bubbles: true });
      contentEditor.dispatchEvent(inputEvent);

      const changeEvent = new Event('change', { bubbles: true });
      contentEditor.dispatchEvent(changeEvent);

      // 设置焦点确保内容被识别
      contentEditor.focus();

      this.log('内容注入成功 - 直接方法');

      // 快速验证
      await this.delay(this.config.delays.FAST_CHECK);
      const currentContent = contentEditor.textContent || contentEditor.innerText;

      if (currentContent.includes(content.substring(0, 10))) {
        this.log('抖音内容注入验证成功');
        return true;
      } else {
        throw new Error('直接注入验证失败');
      }

    } catch (directError) {
      this.log('直接注入失败，尝试UniversalContentInjector:', directError);

      // 方法2: 降级到UniversalContentInjector
      const success = await this.injector.injectContent(contentEditor, content);

      if (!success) {
        throw new Error('内容注入失败 - 所有方法都失败了');
      }

      // 验证注入结果
      await this.delay(this.config.delays.NORMAL_WAIT);
      const currentContent = contentEditor.textContent || contentEditor.innerText;

      if (!currentContent.includes(content.substring(0, 20))) {
        throw new Error('内容验证失败');
      }

      this.log('抖音内容注入成功 - UniversalContentInjector方法');
      return true;
    }
  }

  /**
   * 查找发布按钮
   * @returns {HTMLElement|null} - 找到的发布按钮
   */
  findPublishButton() {
    // 策略1: 通过文本内容查找可用的发布按钮
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.includes('发布') && !btn.disabled) {
        this.log('通过文本内容找到发布按钮');
        return btn;
      }
    }

    // 策略2: 使用选择器查找
    if (this.selectors.publishButton) {
      for (const selector of this.selectors.publishButton) {
        const publishButton = document.querySelector(selector);
        if (publishButton && !publishButton.disabled) {
          this.log('通过选择器找到发布按钮:', selector);
          return publishButton;
        }
      }
    }

    return null;
  }

  /**
   * 点击发布按钮
   * @returns {Promise<boolean>} - 发布是否成功
   */
  async clickPublishButton() {
    this.log('开始查找抖音发布按钮');

    return await this.executeWithRetry(async () => {
      // 查找发布按钮
      const publishButton = this.findPublishButton();

      if (!publishButton) {
        throw new Error('未找到抖音发布按钮');
      }

      if (publishButton.disabled) {
        throw new Error('抖音发布按钮不可用');
      }

      this.log('找到抖音发布按钮，准备点击');

      // 点击发布按钮
      publishButton.click();

      // 等待发布完成
      await this.delay(5000);

      // 验证发布结果
      const isPublished = await this.verifyPublishResult();

      this.log('抖音发布按钮点击完成', { success: isPublished });
      return isPublished;
    }, '点击发布按钮', 3, 2000);
  }

  /**
   * 验证发布结果
   * @returns {Promise<boolean>} - 是否发布成功
   */
  async verifyPublishResult() {
    try {
      // 等待页面响应
      await this.delay(3000);
      
      // 检查是否有成功提示
      const successIndicators = [
        '.success-message',
        '.toast-success',
        '.notification-success'
      ];
      
      for (const selector of successIndicators) {
        const element = document.querySelector(selector);
        if (element && (element.textContent.includes('成功') || element.textContent.includes('发布'))) {
          this.log('检测到抖音发布成功提示');
          return true;
        }
      }
      
      // 检查URL是否发生变化（跳转到作品管理页面）
      if (window.location.href.includes('/content/manage') || 
          window.location.href.includes('/creator-micro/content')) {
        this.log('检测到页面跳转，抖音发布可能成功');
        return true;
      }
      
      // 检查输入框是否被清空
      const titleInput = document.querySelector('input[placeholder*="标题"]');
      const contentEditor = document.querySelector('div[contenteditable="true"]');
      
      if ((titleInput && titleInput.value.trim() === '') || 
          (contentEditor && contentEditor.textContent.trim() === '')) {
        this.log('检测到输入框清空，抖音发布可能成功');
        return true;
      }
      
      this.log('未检测到明确的发布成功标志');
      return false;
      
    } catch (error) {
      this.logError('验证抖音发布结果时出错', error);
      return false;
    }
  }

  /**
   * 获取登录状态指示器
   * @returns {string[]} - 选择器数组
   */
  getLoginIndicators() {
    return this.selectors.loginIndicators;
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
   * 获取抖音平台特定的错误信息（使用配置管理器）
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
   * 支持分块传输的文件获取方法（代理到FileProcessorBase）
   * @param {string} fileId - 文件ID
   * @returns {Promise<File>} - 文件对象
   */
  async getFileWithChunking(fileId) {
    try {
      // 创建FileProcessorBase实例来处理分块传输
      if (!this.fileProcessor) {
        this.fileProcessor = new FileProcessorBase('douyin', {});
      }

      return await this.fileProcessor.getFileWithChunking(fileId);
    } catch (error) {
      this.logError('🎬 分块文件获取失败，降级到原有方法', error);
      // 降级到原有方法
      return await this.getFileFromExtension(fileId);
    }
  }

  // 移除重复的分块传输实现方法 - 现在通过FileProcessorBase代理处理

  /**
   * 从扩展获取文件 - 支持新的Background Script文件管理系统
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

        if (response?.success && response.arrayData) {
          const uint8Array = new Uint8Array(response.arrayData);
          const blob = new Blob([uint8Array], { type: response.metadata.type });
          const file = new File([blob], response.metadata.name, {
            type: response.metadata.type,
            lastModified: response.metadata.lastModified
          });
          resolve(file);
        } else {
          reject(new Error(response?.error || 'Failed to get file'));
        }
      });
    });
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

      // 也可以触发自定义事件供其他组件监听
      const event = new CustomEvent('douyinPublishResult', {
        detail: result
      });
      document.dispatchEvent(event);

    } catch (error) {
      this.log('发送发布结果时出错:', error);
    }
  }

  /**
   * 验证发布准备状态
   * @returns {Promise<boolean>} - 是否准备好发布
   */
  async validatePublishReady() {
    try {
      // 检查是否在编辑页面（支持图文和短视频）
      const currentState = await this.detectPageState();
      const isEditPage = currentState === this.config.pageStates.EDIT_PAGE ||
                        currentState === this.config.pageStates.VIDEO_EDIT_PAGE;

      if (!isEditPage) {
        this.log('不在编辑页面，无法验证发布状态');
        return false;
      }

      // 检查标题输入框是否有内容
      const titleInput = document.querySelector('input[placeholder*="标题"]');
      const hasTitle = titleInput && titleInput.value.trim().length > 0;

      // 检查内容编辑器是否有内容
      const contentEditor = document.querySelector('div[contenteditable="true"]');
      const hasContent = contentEditor && contentEditor.textContent.trim().length > 0;

      // 检查是否有媒体文件（图片或视频）
      const hasImages = document.querySelectorAll('img[src*="blob:"], img[src*="data:"]').length > 0;
      const hasVideo = document.querySelectorAll('video').length > 0;

      this.log('发布状态验证', {
        hasTitle,
        hasContent,
        hasImages,
        hasVideo,
        currentState,
        isVideoEdit: currentState === this.config.pageStates.VIDEO_EDIT_PAGE
      });

      // 对于短视频，至少需要有视频文件
      if (currentState === this.config.pageStates.VIDEO_EDIT_PAGE) {
        return hasVideo && (hasTitle || hasContent);
      }

      // 对于图文，至少需要有标题、内容或图片
      return hasTitle || hasContent || hasImages;
    } catch (error) {
      this.logError('验证发布状态失败', error);
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
}

  // 适配器初始化逻辑
  async function initializeDouyinAdapter() {
    try {
      console.log('初始化DouyinAdapter...');

      // 等待公共基类加载完成
      await BaseClassLoader.checkBaseClasses('抖音');

      // 使用依赖管理器检查依赖
      DouyinDependencyManager.validateDependencies();

      // 创建适配器实例
      const adapter = new DouyinAdapter();

      // 注册到全局命名空间
      window.MomentDots = window.MomentDots || {};
      window.MomentDots.douyinAdapter = adapter;
      window.DouyinAdapter = DouyinAdapter; // 暴露类到全局，供工厂使用
      window.DouyinSpecialAdapter = DouyinAdapter; // 向后兼容

      console.log('✅ DouyinAdapter初始化成功，platform:', adapter.platform);
      return true;
    } catch (error) {
      console.error('❌ DouyinAdapter初始化失败:', error);
      return false;
    }
  }

  // 智能初始化：异步版本
  initializeDouyinAdapter().catch(error => {
    console.error('抖音适配器异步初始化失败:', error);
    // 延迟重试
    setTimeout(() => {
      initializeDouyinAdapter().catch(retryError => {
        console.error('抖音适配器重试初始化失败:', retryError);
      });
    }, 500);
  });

  // 监听来自background script的消息
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === 'ping') {
        // 响应ping消息，表示content script已准备就绪
        sendResponse({ success: true, platform: 'douyin' });
        return true;
      }

      if (message.action === 'publish') {
        // 检查适配器是否已创建
        if (!window.MomentDots?.douyinAdapter) {
          sendResponse({
            success: false,
            error: 'DouyinAdapter not initialized',
            platform: 'douyin'
          });
          return true;
        }

        window.MomentDots.douyinAdapter.publishContent(message.data)
          .then(result => sendResponse(result))
          .catch(error => sendResponse({
            success: false,
            error: error.message,
            platform: 'douyin'
          }));
        return true; // 保持消息通道开放
      }
    });
  }

})();

console.log('抖音适配器加载完成');
