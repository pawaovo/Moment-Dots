/**
 * Bilibili平台适配器 - 基于统一架构设计
 * 继承现有平台的成熟架构模式，针对Bilibili平台特性优化
 * 
 * 技术验证：Playwright MCP测试验证
 * 核心策略：统一基类 + Bilibili平台特定实现 + 富文本编辑器适配
 * 设计目标：与现有架构完全兼容，确保代码一致性和可维护性
 */

console.log('Bilibili平台适配器加载中...');

(function() {
  'use strict';

// 检查公共基类是否已加载
// 使用统一的BaseClassLoader
async function checkBaseClasses() {
  return await BaseClassLoader.checkBaseClasses('Bilibili平台');
}

/**
 * Bilibili平台配置管理器 - 优化版本
 * 使用统一的PlatformConfigBase，消除重复代码
 */
class BilibiliConfigManager extends PlatformConfigBase {
  constructor() {
    super('bilibili');
  }

  /**
   * 加载Bilibili平台特定配置
   */
  loadConfig() {
    const bilibiliConfig = {
      delays: this.createDelayConfig({
        FAST_CHECK: 200,         // Bilibili页面响应适中
        NORMAL_WAIT: 500,
        UPLOAD_WAIT: 2000,       // Bilibili上传需要更多时间
        ELEMENT_WAIT: 3000
      }),

      limits: this.createLimitsConfig({
        maxContentLength: 2000,   // Bilibili动态内容限制
        maxTitleLength: 20,       // Bilibili标题限制
        maxMediaFiles: 9,         // Bilibili最多9个媒体文件
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        allowedVideoTypes: ['video/mp4', 'video/avi', 'video/mov']
      }),

      performance: this.createPerformanceConfig({
        cacheTimeout: 3000,              // Bilibili页面变化较慢
        elementWaitTimeout: 2000,
        mutationObserverTimeout: 3000,
        highFrequencyCheck: 200,         // Bilibili需要适中的响应速度
        enablePerformanceMonitoring: true,
        enableMutationObserver: true
      })
    };

    return this.loadPlatformConfig(bilibiliConfig);
  }

  /**
   * 获取Bilibili平台特定选择器
   */
  getPlatformSelectors() {
    return {
      // === 图文动态页面选择器 ===
      // 标题输入框选择器
      titleInput: 'input[placeholder*="好的标题更容易获得支持"]',
      titleInputFallback: 'input[maxlength="20"]',

      // 内容编辑器选择器（基于Playwright MCP验证的精准选择器）
      editor: '.bili-rich-textarea__inner',
      editorFallback: '[contenteditable="true"]',
      editorGeneric: 'div[role="textbox"]',

      // 文件上传选择器 - 基于Playwright验证的精准选择器
      fileInput: 'input[type="file"]',
      uploadArea: '.bili-dyn-publishing__image-upload',
      uploadButton: '.bili-pics-uploader__add',

      // 发布按钮选择器
      sendButton: '.bili-dyn-publishing__submit',
      sendButtonFallback: 'button:has-text("发布")',
      sendButtonGeneric: 'button[type="submit"]',

      // === 视频投稿页面选择器（基于Playwright MCP测试验证）===
      // 视频标题输入框
      videoTitleInput: 'input[placeholder*="请输入稿件标题"]',
      videoTitleInputFallback: 'input.input-val',

      // 视频简介编辑器（Quill富文本编辑器）
      videoDescEditor: '.ql-editor',
      videoDescEditorBlank: '.ql-editor.ql-blank',
      videoDescEditorFallback: '[contenteditable="true"]',

      // 视频文件上传选择器（基于Playwright MCP深度分析优化）
      videoFileInput: 'input[name="buploader"]',
      videoFileInputFallback: 'input[type="file"][accept*=".mp4"]',
      videoUploadArea: '.bcc-upload-wrapper, .bcc-upload.upload, .upload-wrp',

      // 视频投稿按钮
      videoSubmitButton: 'button:contains("立即投稿")',
      videoSubmitButtonFallback: 'button[class*="submit"]',

      // === 专栏文章页面选择器（基于Playwright MCP测试验证）===
      // 专栏标题输入框
      articleTitleInput: 'textarea[placeholder*="请输入标题"]',
      articleTitleInputFallback: 'textarea[maxlength="40"]',

      // 专栏内容编辑器（Quill富文本编辑器）
      articleEditor: '.ql-editor',
      articleEditorBlank: '.ql-editor.ql-blank',
      articleEditorFallback: '[contenteditable="true"]',

      // 专栏图片上传选择器
      articleImageButton: 'generic[cursor="pointer"]:has(img) + generic:contains("图片")',
      articleImageInput: 'input[type="file"][accept*="image"]',

      // 专栏发布按钮
      articleSubmitButton: 'button:contains("提交文章")',
      articleDraftButton: 'button:contains("存草稿")',

      // 登录状态检测 - 基于Playwright分析结果
      loginIndicator: 'a[href*="space.bilibili.com"]', // 用户空间链接，可靠的登录指示器
      loginIndicatorFallback: '.avatar', // 备用：用户头像
      loginIndicatorGeneric: '.header-entry-mini' // 通用：用户菜单入口
    };
  }
}

/**
 * Bilibili平台适配器类 - 基于统一架构设计
 * 继承现有平台的成熟模式，针对Bilibili平台特性优化
 */

// 防止重复声明
if (typeof window.BilibiliAdapter === 'undefined') {

class BilibiliAdapter extends MutationObserverBase {
  constructor() {
    super('bilibili');
    this.platform = 'bilibili';
    this.configManager = new BilibiliConfigManager();
    this.config = this.configManager.loadConfig();
    this.selectors = this.configManager.getPlatformSelectors();

    // 初始化文件处理基类（消除重复代码）
    this.fileProcessor = new FileProcessorBase('bilibili', this.config);

    console.log('✅ Bilibili适配器初始化完成');
    console.log('📋 配置信息:', this.config);
    console.log('🎯 选择器配置:', this.selectors);
  }

  /**
   * 延迟函数 - 与其他平台适配器保持一致
   * @param {number} ms - 延迟毫秒数
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查登录状态 - Bilibili特定实现
   */
  async checkLoginStatus() {
    console.log('🔍 检查Bilibili登录状态...');
    
    try {
      // 主要检测：用户空间链接
      await this.waitForElementSmart(this.selectors.loginIndicator, 3000, true, 'Bilibili用户空间链接');
      console.log('✅ 用户已登录Bilibili (检测到用户空间链接)');
      return true;
    } catch (e) {
      console.log('⚠️ 主要登录检测失败，尝试备用方案...');
    }

    try {
      // 备用检测：用户头像
      await this.waitForElementSmart(this.selectors.loginIndicatorFallback, 2000, true, 'Bilibili用户头像');
      console.log('✅ 用户已登录Bilibili (检测到用户头像)');
      return true;
    } catch (e) {
      console.log('⚠️ 备用登录检测失败，尝试通用方案...');
    }

    try {
      // 通用检测：用户菜单入口
      await this.waitForElementSmart(this.selectors.loginIndicatorGeneric, 2000, true, 'Bilibili用户菜单');
      console.log('✅ 用户已登录Bilibili (检测到用户菜单)');
      return true;
    } catch (e) {
      console.error('❌ Bilibili登录检测失败');
      throw new Error('用户未登录Bilibili或页面加载异常');
    }
  }

  /**
   * 检测页面类型（基于Playwright MCP测试验证）
   * @returns {string} 'dynamic' | 'video' | 'article'
   */
  detectPageType() {
    const url = window.location.href;

    // 专栏文章页面：https://member.bilibili.com/read/editor/#/web
    if (url.includes('/read/editor')) {
      console.log('📝 检测到Bilibili专栏文章页面 (URL匹配)');
      return 'article';
    }

    // 视频投稿页面：https://member.bilibili.com/platform/upload/video/frame
    if (url.includes('/platform/upload/video/frame')) {
      console.log('🎬 检测到Bilibili视频投稿页面 (URL匹配)');
      return 'video';
    }

    // 图文动态页面：https://t.bilibili.com/ 及其他页面
    console.log('📷 检测到Bilibili图文动态页面 (URL匹配)');
    return 'dynamic';
  }

  /**
   * 等待页面准备就绪 - 支持图文和视频两种模式
   */
  async waitForPageReady() {
    console.log('⏳ 等待Bilibili页面准备就绪...');

    const pageType = this.detectPageType();

    try {
      if (pageType === 'video') {
        // 视频投稿页面准备检查
        await this.waitForVideoPageReady();
      } else if (pageType === 'article') {
        // 专栏文章页面准备检查
        await this.waitForArticlePageReady();
      } else {
        // 图文动态页面准备检查
        await this.waitForDynamicPageReady();
      }

      console.log('🎉 Bilibili页面完全准备就绪');
      return true;
    } catch (error) {
      console.error('❌ Bilibili页面准备失败:', error);
      throw new Error(`Bilibili页面加载超时: ${error.message}`);
    }
  }

  /**
   * 等待图文动态页面准备就绪
   */
  async waitForDynamicPageReady() {
    console.log('📷 等待Bilibili图文动态页面准备就绪...');

    // 等待发布表单容器加载
    await this.waitForElementSmart('.bili-dyn-publishing', 5000, true, 'Bilibili发布表单');
    console.log('✅ Bilibili发布表单已加载');

    // 等待内容编辑器准备就绪
    await this.waitForElementSmart(this.selectors.editor, 3000, true, 'Bilibili内容编辑器');
    console.log('✅ Bilibili内容编辑器已准备就绪');

    // 等待标题输入框准备就绪
    await this.waitForElementSmart(this.selectors.titleInput, 3000, true, 'Bilibili标题输入框');
    console.log('✅ Bilibili标题输入框已准备就绪');
  }

  /**
   * 等待视频投稿页面准备就绪（基于Playwright MCP测试验证）
   */
  async waitForVideoPageReady() {
    console.log('🎬 等待Bilibili视频投稿页面准备就绪...');

    // 等待视频上传区域加载
    await this.waitForElementSmart(this.selectors.videoUploadArea, 5000, true, 'Bilibili视频上传区域');
    console.log('✅ Bilibili视频上传区域已加载');

    // 等待视频文件输入元素准备就绪
    await this.waitForElementSmart(this.selectors.videoFileInput, 3000, true, 'Bilibili视频文件输入');
    console.log('✅ Bilibili视频文件输入已准备就绪');
  }

  /**
   * 等待专栏文章页面准备就绪（基于Playwright MCP测试验证）
   */
  async waitForArticlePageReady() {
    console.log('📝 等待Bilibili专栏文章页面准备就绪...');

    // 等待标题输入框准备就绪
    await this.waitForElementSmart(this.selectors.articleTitleInput, 5000, true, 'Bilibili专栏标题输入框');
    console.log('✅ Bilibili专栏标题输入框已准备就绪');

    // 等待内容编辑器准备就绪
    await this.waitForElementSmart(this.selectors.articleEditor, 3000, true, 'Bilibili专栏内容编辑器');
    console.log('✅ Bilibili专栏内容编辑器已准备就绪');
  }

  /**
   * 注入内容 - Bilibili特定实现
   */
  async injectContent(data) {
    // 🎯 获取预处理后的标题和概要数据
    const currentPlatform = data.platforms?.find(p => p.id === 'bilibili');
    const titleToInject = currentPlatform?.processedTitle || data.title;
    const summaryToInject = currentPlatform?.processedSummary || data.summary;

    console.log('📝 开始注入Bilibili内容...', {
      contentType: data.contentType,
      originalTitle: data.title?.length || 0,
      processedTitle: titleToInject?.length || 0,
      titleLimit: currentPlatform?.limits?.title,
      titleTruncated: data.title && titleToInject && data.title.length > titleToInject.length
    });

    try {
      // 注入标题（如果提供）
      if (titleToInject && titleToInject.trim()) {
        await this.injectTitle(titleToInject);
      }

      // 注入正文内容
      if (data.content && data.content.trim()) {
        await this.injectMainContent(data.content);
      }

      console.log('✅ Bilibili内容注入完成');
      return true;
    } catch (error) {
      console.error('❌ Bilibili内容注入失败:', error);
      throw error;
    }
  }

  /**
   * 注入标题内容
   */
  async injectTitle(title) {
    console.log('📝 注入Bilibili标题:', title);

    try {
      const titleInput = await this.waitForElementSmart(this.selectors.titleInput, 3000, true, 'Bilibili标题输入框');
      
      // 清空现有内容
      titleInput.value = '';
      titleInput.focus();
      
      // 设置标题内容
      titleInput.value = title.substring(0, 20); // 限制20字符
      
      // 触发输入事件
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('✅ Bilibili标题注入成功');
      await this.delay(this.config.delays.FAST_CHECK);
    } catch (error) {
      console.error('❌ Bilibili标题注入失败:', error);
      throw error;
    }
  }

  /**
   * 注入正文内容 - 基于X平台解决方案的优化版本
   */
  async injectMainContent(content) {
    console.log('📝 注入Bilibili正文内容:', content);

    try {
      const editor = await this.waitForElementSmart(this.selectors.editor, 3000, true, 'Bilibili内容编辑器');

      // 使用基于X平台验证的多重策略方法
      const success = await this.injectContentToEditor(editor, content);

      if (success) {
        console.log('✅ Bilibili正文内容注入成功');
        await this.delay(this.config.delays.NORMAL_WAIT);
      } else {
        throw new Error('所有Bilibili内容注入策略都失败了');
      }
    } catch (error) {
      console.error('❌ Bilibili正文内容注入失败:', error);
      throw error;
    }
  }

  /**
   * 注入内容到编辑器 - 多重策略方法
   * @param {HTMLElement} editor - 编辑器元素
   * @param {string} content - 内容
   */
  async injectContentToEditor(editor, content) {
    console.log('开始注入内容到Bilibili编辑器...', { contentLength: content.length });

    // 准备编辑器
    await this.prepareEditor(editor);

    // 尝试多种注入策略
    const strategies = [
      () => this.tryBilibiliStructureMethod(editor, content),
      () => this.tryExecCommandMethod(editor, content),
      () => this.tryDirectTextMethod(editor, content)
    ];

    for (const [index, strategy] of strategies.entries()) {
      try {
        const success = await strategy();
        if (success) {
          console.log(`✅ 策略${index + 1}成功`);
          return true;
        }
      } catch (error) {
        console.log(`⚠️ 策略${index + 1}失败:`, error.message);
      }
    }

    return false;
  }

  /**
   * 准备编辑器状态
   * @param {HTMLElement} editor - 编辑器元素
   */
  async prepareEditor(editor) {
    editor.focus();
    await this.delay(100);
  }

  /**
   * 清空编辑器内容
   * @param {HTMLElement} editor - 编辑器元素
   */
  async clearEditor(editor) {
    if (editor.textContent && editor.textContent.trim()) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('delete', false, null);
      await this.delay(50);
    }
  }

  /**
   * 触发编辑器事件
   * @param {HTMLElement} editor - 编辑器元素
   * @param {string} content - 内容
   * @param {boolean} includeBlurFocus - 是否包含blur/focus事件
   */
  async triggerEditorEvents(editor, content, includeBlurFocus = false) {
    const events = [
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: content
      }),
      new Event('change', { bubbles: true }),
      new KeyboardEvent('keyup', { bubbles: true, key: 'End' })
    ];

    if (includeBlurFocus) {
      events.push(
        new Event('blur', { bubbles: true }),
        new Event('focus', { bubbles: true })
      );
    }

    for (const event of events) {
      editor.dispatchEvent(event);
      await this.delay(50);
    }
  }

  /**
   * Bilibili结构方法 - 基于Playwright MCP验证的优化方法
   * @param {HTMLElement} editor - 编辑器元素
   * @param {string} content - 内容
   * @returns {Promise<boolean>} 是否成功
   */
  async tryBilibiliStructureMethod(editor, content) {
    try {
      // 清空现有内容
      await this.clearEditor(editor);

      // 使用execCommand插入文本
      const success = document.execCommand('insertText', false, content);
      if (!success) {
        editor.textContent = content;
      }

      // 移除 empty 类（Bilibili 特有）
      editor.classList.remove('empty');

      // 触发完整的事件序列
      await this.triggerEditorEvents(editor, content, true);

      // 验证结果
      await this.delay(300);
      const contentMatches = editor.textContent.includes(content);
      const hasEmptyClass = editor.classList.contains('empty');

      return contentMatches && !hasEmptyClass;
    } catch (error) {
      console.log('Bilibili结构方法异常:', error.message);
      return false;
    }
  }

  /**
   * ExecCommand方法 - 简化版本
   * @param {HTMLElement} editor - 编辑器元素
   * @param {string} content - 内容
   * @returns {Promise<boolean>} 是否成功
   */
  async tryExecCommandMethod(editor, content) {
    try {
      // 清空现有内容
      await this.clearEditor(editor);

      // 使用execCommand插入文本
      const success = document.execCommand('insertText', false, content);

      // 移除empty类
      editor.classList.remove('empty');

      // 触发基本事件
      await this.triggerEditorEvents(editor, content, false);

      // 验证结果
      await this.delay(200);
      return editor.textContent.includes(content);
    } catch (error) {
      console.log('ExecCommand方法异常:', error.message);
      return false;
    }
  }

  /**
   * 直接文本方法 - 最后备用方案
   * @param {HTMLElement} editor - 编辑器元素
   * @param {string} content - 内容
   * @returns {Promise<boolean>} 是否成功
   */
  async tryDirectTextMethod(editor, content) {
    try {
      editor.innerHTML = '';
      editor.textContent = content;
      editor.classList.remove('empty');

      // 触发基本change事件
      editor.dispatchEvent(new Event('change', { bubbles: true }));

      await this.delay(200);
      return editor.textContent.includes(content);
    } catch (error) {
      console.log('直接文本方法异常:', error.message);
      return false;
    }
  }

  /**
   * 上传文件 - Bilibili特定实现
   */
  async uploadFiles(files) {
    if (!files || files.length === 0) {
      console.log('📁 没有文件需要上传');
      return true;
    }

    console.log(`📁 开始上传 ${files.length} 个文件...`);

    try {
      // 验证文件
      this.validateFiles(files);

      // 尝试多种上传方式
      const uploadMethods = [
        () => this.uploadViaButton(files),
        () => this.uploadViaDrag(files)
      ];

      for (const [index, method] of uploadMethods.entries()) {
        try {
          const success = await method();
          if (success) {
            console.log(`✅ 上传成功（方式${index + 1}）`);
            return true;
          }
        } catch (error) {
          console.log(`⚠️ 上传方式${index + 1}失败:`, error.message);
        }
      }

      throw new Error('所有上传方式都失败了');
    } catch (error) {
      console.error('❌ 文件上传失败:', error);
      throw error;
    }
  }

  /**
   * 验证文件
   * @param {File[]} files - 文件数组
   */
  validateFiles(files) {
    if (files.length > 9) {
      throw new Error('Bilibili最多支持上传9个文件');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`不支持的文件类型: ${file.type}`);
      }
    }
  }

  /**
   * 通过点击按钮上传文件
   */
  async uploadViaButton(files) {
    const uploadButton = document.querySelector('.bili-dyn-publishing__tools__item.pic');
    if (!uploadButton) {
      throw new Error('未找到图片上传按钮');
    }

    // 点击按钮触发文件选择器
    uploadButton.click();
    await this.delay(500);

    // 查找动态创建的文件输入框
    const fileInput = await this.findDynamicFileInput();
    if (!fileInput) {
      throw new Error('点击按钮后未找到文件输入框');
    }

    // 设置文件并触发事件
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    await this.delay(this.config.delays.UPLOAD_WAIT);
    return true;
  }

  /**
   * 通过拖拽上传文件
   */
  async uploadViaDrag(files) {
    const dragArea = document.querySelector('.bili-dyn-publishing__image-upload') ||
                    document.querySelector('[class*="upload"]');

    if (!dragArea) {
      throw new Error('未找到拖拽上传区域');
    }

    // 创建拖拽事件数据
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));

    // 模拟完整拖拽流程
    const events = ['dragenter', 'dragover', 'drop'];
    for (const eventType of events) {
      const event = new DragEvent(eventType, {
        bubbles: true,
        dataTransfer: dataTransfer
      });
      dragArea.dispatchEvent(event);
      await this.delay(100);
    }

    await this.delay(this.config.delays.UPLOAD_WAIT);
    return true;
  }

  /**
   * 查找动态创建的文件输入框
   */
  async findDynamicFileInput() {
    // 等待文件输入框动态创建
    for (let i = 0; i < 10; i++) {
      const fileInputs = document.querySelectorAll('input[type="file"]');

      // 查找图片文件输入框
      for (const input of fileInputs) {
        const accept = input.getAttribute('accept');
        if (accept && (accept.includes('image') || accept.includes('.jpg') || accept.includes('.png'))) {
          return input;
        }
      }

      await this.delay(200);
    }

    // 返回任何文件输入框作为备用
    return document.querySelector('input[type="file"]');
  }

  /**
   * 发布内容 - 备用方法（不自动调用）
   */
  async publish() {
    console.log('⚠️ 当前配置为手动发布模式，建议用户手动点击发布按钮');

    const publishButton = await this.waitForElementSmart(this.selectors.sendButton, 3000, true, 'Bilibili发布按钮');

    if (!publishButton || publishButton.disabled) {
      throw new Error('发布按钮不可用');
    }

    publishButton.click();
    await this.delay(this.config.delays.NORMAL_WAIT);
    return true;
  }

  /**
   * 图文动态发布流程（原有逻辑）
   */
  async publishDynamicContent(data) {
    console.log('📷 开始Bilibili图文动态发布流程...');

    try {
      // 3. 注入内容
      await this.injectContent(data);

      // 4. 上传文件
      if (data.files && data.files.length > 0) {
        await this.uploadFiles(data.files);
      }

      // 5. 内容注入完成，等待用户手动发布
      console.log('✅ Bilibili图文动态内容注入完成，请用户手动点击发布按钮');

      return {
        success: true,
        platform: 'bilibili',
        message: 'Bilibili图文动态内容注入成功，请手动点击发布按钮完成发布',
        url: window.location.href,
        action: 'dynamic_prefilled',
        contentType: 'dynamic'
      };

    } catch (error) {
      console.error('❌ Bilibili图文动态发布流程失败:', error);
      throw error;
    }
  }

  /**
   * 视频投稿发布流程（新功能 - 基于Playwright MCP测试验证）
   */
  async publishVideoContent(data) {
    console.log('🎬 开始Bilibili视频投稿发布流程...');

    try {
      // 1. 验证当前确实在视频投稿页面
      if (!window.location.href.includes('/platform/upload/video/frame')) {
        throw new Error('视频投稿发布流程只能在视频投稿页面执行');
      }

      // 2. 处理视频文件上传
      const filesToUpload = await this.collectAllFiles(data);

      if (filesToUpload.length === 0) {
        throw new Error('视频投稿需要至少一个视频文件');
      }

      // 3. 上传视频文件
      let uploadSuccess = false;
      try {
        await this.handleVideoUpload(filesToUpload);
        uploadSuccess = true;
        console.log('✅ 视频文件上传成功');
      } catch (uploadError) {
        console.error('视频上传失败:', uploadError);
        throw uploadError; // 上传失败是致命错误
      }

      // 4. 等待页面进入编辑状态后，填充标题和简介
      let contentFillSuccess = false;
      try {
        await this.delay(2000); // 等待视频处理
        await this.injectVideoContent(data);
        contentFillSuccess = true;
        console.log('✅ 视频标题和简介填充成功');
      } catch (contentError) {
        console.log('⚠️ 视频内容填充失败，但不影响核心功能:', contentError.message);
        // 内容填充失败不是致命错误，继续执行
      }

      // 只要视频上传成功，就认为整个流程成功
      if (uploadSuccess) {
        console.log('✅ Bilibili视频投稿核心功能完成，等待用户手动发布');

        return {
          success: true,
          platform: 'bilibili',
          message: '视频投稿内容预填充完成，请手动确认并发布',
          url: window.location.href,
          action: 'video_prefilled',
          contentType: 'video',
          details: {
            uploadSuccess: uploadSuccess,
            contentFillSuccess: contentFillSuccess
          }
        };
      } else {
        throw new Error('视频上传失败');
      }

    } catch (error) {
      console.error('❌ Bilibili视频投稿发布流程失败:', error);
      throw error;
    }
  }

  /**
   * 专栏文章发布流程（基于Playwright MCP测试验证）
   */
  async publishArticleContent(data) {
    // 🎯 获取预处理后的标题和概要数据
    const currentPlatform = data.platforms?.find(p => p.id === 'bilibili-article');
    const titleToInject = currentPlatform?.processedTitle || data.title;
    const summaryToInject = currentPlatform?.processedSummary || data.summary;

    console.log('📝 开始Bilibili专栏文章发布流程...', {
      contentType: data.contentType,
      originalTitle: data.title?.length || 0,
      processedTitle: titleToInject?.length || 0,
      titleLimit: currentPlatform?.limits?.title,
      titleTruncated: data.title && titleToInject && data.title.length > titleToInject.length
    });

    try {
      // 1. 验证当前确实在专栏编辑页面
      if (!window.location.href.includes('/read/editor')) {
        throw new Error('专栏文章发布流程只能在专栏编辑页面执行');
      }

      // 2. 注入标题
      if (titleToInject && titleToInject.trim()) {
        await this.injectArticleTitle(titleToInject);
      }

      // 3. 处理富文本内容和图片
      if (data.content && data.content.trim()) {
        await this.injectArticleContent(data.content, data);
      }

      console.log('✅ Bilibili专栏文章内容注入完成，请用户手动点击发布按钮');

      return {
        success: true,
        platform: 'bilibili',
        message: 'Bilibili专栏文章内容注入成功，请手动点击发布按钮完成发布',
        url: window.location.href,
        action: 'article_prefilled',
        contentType: 'article'
      };

    } catch (error) {
      console.error('❌ Bilibili专栏文章发布流程失败:', error);
      throw error;
    }
  }

  /**
   * 完整的内容注入流程 - 支持图文、视频和专栏三种模式（基于Playwright MCP测试验证）
   */
  async publishContent(data) {
    console.log('🎯 开始Bilibili内容注入流程...', {
      hasContent: !!data.content,
      hasTitle: !!data.title,
      hasFiles: !!(data.files && data.files.length > 0),
      hasFileIds: !!(data.fileIds && data.fileIds.length > 0),
      currentUrl: window.location.href
    });

    try {
      // 1. 检查登录状态
      await this.checkLoginStatus();

      // 2. 等待页面准备就绪
      await this.waitForPageReady();

      // 3. 检测页面类型，选择正确的发布流程
      const pageType = this.detectPageType();

      console.log('页面类型检测:', {
        pageType: pageType,
        currentUrl: window.location.href
      });

      // 4. 根据页面类型选择发布流程
      if (pageType === 'video') {
        // 视频投稿发布流程
        console.log('🎬 执行视频投稿发布流程');
        return await this.publishVideoContent(data);
      } else if (pageType === 'article') {
        // 专栏文章发布流程
        console.log('📝 执行专栏文章发布流程');
        return await this.publishArticleContent(data);
      } else {
        // 图文动态发布流程
        console.log('📷 执行图文动态发布流程');
        return await this.publishDynamicContent(data);
      }

    } catch (error) {
      console.error('❌ Bilibili内容注入流程失败:', error);
      return {
        success: false,
        platform: 'bilibili',
        error: error.message
      };
    }
  }

  /**
   * 统一收集所有文件的方法（使用FileProcessorBase基类，消除重复代码）
   * @param {Object} data - 发布数据
   * @returns {Promise<Array>} - 文件数组
   */
  async collectAllFiles(data) {
    console.log('🎬 开始收集Bilibili视频文件...');

    // 使用基类的统一文件处理方法
    const filesToUpload = await this.fileProcessor.processFileData(data);

    console.log(`✅ 收集到 ${filesToUpload.length} 个文件用于Bilibili视频投稿`);
    return filesToUpload;
  }






  /**
   * 处理视频文件上传（基于Playwright MCP测试验证和微博实现优化）
   * 优先使用拖拽方式，文件输入方式作为降级方案
   */
  async handleVideoUpload(files) {
    console.log('🎬 开始处理视频文件上传...', { fileCount: files.length });

    if (!files || files.length === 0) {
      throw new Error('没有要上传的视频文件');
    }

    // 只处理第一个视频文件（Bilibili视频投稿通常只支持单个视频）
    const file = files[0];
    console.log('📁 准备上传视频文件:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // 方法1：优先使用拖拽方式上传（参考微博实现）
    try {
      await this.uploadVideoViaDrag(file);
      console.log('✅ 通过拖拽方式上传成功');
      return;
    } catch (error) {
      console.log('⚠️ 拖拽方式上传失败，尝试文件输入方式:', error.message);
    }

    // 方法2：降级到文件输入方式上传
    try {
      await this.uploadVideoViaFileInput(file);
      console.log('✅ 通过文件输入方式上传成功');
      return;
    } catch (error) {
      console.log('❌ 文件输入方式上传也失败:', error.message);
      throw new Error(`视频上传失败: ${error.message}`);
    }
  }

  /**
   * 通过文件输入方式上传视频（降级方案，参考微博实现优化）
   */
  async uploadVideoViaFileInput(file) {
    console.log('📁 尝试通过文件输入方式上传视频...');

    // 查找视频文件输入元素 - 使用多种策略
    let fileInput = null;

    // 策略1：使用配置的选择器
    fileInput = document.querySelector(this.selectors.videoFileInput) ||
               document.querySelector(this.selectors.videoFileInputFallback);

    // 策略2：查找所有文件输入元素，选择支持视频的
    if (!fileInput) {
      const allFileInputs = document.querySelectorAll('input[type="file"]');
      for (const input of allFileInputs) {
        const accept = input.accept || '';
        if (accept.includes('video') || accept.includes('.mp4') || accept.includes('*')) {
          fileInput = input;
          console.log('🎯 通过accept属性找到视频文件输入元素');
          break;
        }
      }
    }

    if (!fileInput) {
      throw new Error('未找到视频文件输入元素');
    }

    console.log('✅ 找到视频文件输入元素:', {
      name: fileInput.name,
      accept: fileInput.accept,
      multiple: fileInput.multiple,
      className: fileInput.className
    });

    // 使用DataTransfer注入文件（参考微博实现）
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // 设置文件
    fileInput.files = dataTransfer.files;

    // 触发完整的事件序列（参考微博实现）
    const events = [
      new Event('change', { bubbles: true, cancelable: true }),
      new Event('input', { bubbles: true, cancelable: true }),
      new Event('focus', { bubbles: true }),
      new Event('blur', { bubbles: true })
    ];

    for (const event of events) {
      console.log(`📁 触发 ${event.type} 事件`);
      fileInput.dispatchEvent(event);
      await this.delay(100);
    }

    console.log('✅ 视频文件输入事件序列已触发，等待页面处理...');
    await this.delay(this.config.delays.UPLOAD_WAIT || 2000);
  }

  /**
   * 通过拖拽方式上传视频（基于Playwright MCP实际测试验证的正确方法）
   */
  async uploadVideoViaDrag(file) {
    console.log('🖱️ 尝试通过拖拽方式上传视频...');

    // 直接使用经过验证的正确选择器：.bcc-upload-wrapper
    const uploadArea = document.querySelector('.bcc-upload-wrapper');

    if (!uploadArea) {
      throw new Error('未找到.bcc-upload-wrapper拖拽上传区域');
    }

    console.log('✅ 找到视频上传区域:', {
      className: uploadArea.className,
      tagName: uploadArea.tagName,
      boundingRect: uploadArea.getBoundingClientRect()
    });

    // 获取元素中心坐标（基于Playwright MCP测试验证）
    const rect = uploadArea.getBoundingClientRect();
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    // 创建拖拽事件数据（经过实际测试验证的方法）
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // 使用经过验证的事件参数
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer,
      clientX: centerX,
      clientY: centerY
    });

    console.log('🖱️ 触发drop事件到.bcc-upload-wrapper');
    const result = uploadArea.dispatchEvent(dropEvent);

    console.log('✅ 拖拽事件处理结果:', {
      result: result,
      defaultPrevented: dropEvent.defaultPrevented
    });

    // 等待页面处理上传（基于实际测试调整等待时间）
    console.log('⏳ 等待Bilibili处理视频上传...');
    await this.delay(3000); // 给页面足够时间处理文件
  }

  /**
   * 注入视频内容（标题和简介）- 基于Playwright MCP测试验证
   */
  async injectVideoContent(data) {
    // 🎯 获取预处理后的标题和概要数据（短视频模式）
    const currentPlatform = data.platforms?.find(p => p.id === 'bilibili');
    const titleToInject = currentPlatform?.processedTitle || data.title;
    const summaryToInject = currentPlatform?.processedSummary || data.summary;

    console.log('📝 开始注入视频内容...', {
      contentType: data.contentType,
      hasTitle: !!data.title,
      hasContent: !!data.content,
      originalTitle: data.title?.length || 0,
      processedTitle: titleToInject?.length || 0,
      titleLimit: currentPlatform?.limits?.title,
      titleTruncated: data.title && titleToInject && data.title.length > titleToInject.length
    });

    // 1. 处理视频标题
    if (titleToInject) {
      await this.injectVideoTitle(titleToInject);
    }

    // 2. 处理视频简介
    if (data.content) {
      await this.injectVideoDescription(data.content);
    }

    console.log('✅ 视频内容注入完成');
  }

  /**
   * 注入视频标题（基于Playwright MCP测试验证）
   */
  async injectVideoTitle(title) {
    console.log('📝 注入视频标题:', title);

    // 查找视频标题输入框
    const titleInput = document.querySelector(this.selectors.videoTitleInput) ||
                      document.querySelector(this.selectors.videoTitleInputFallback);

    if (!titleInput) {
      throw new Error('未找到视频标题输入框');
    }

    // 清空现有内容（可能是自动填充的文件名）
    titleInput.value = '';
    titleInput.focus();

    // 注入新标题
    titleInput.value = title;

    // 触发事件
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    titleInput.dispatchEvent(new Event('change', { bubbles: true }));

    console.log('✅ 视频标题注入成功');
    await this.delay(500);
  }

  /**
   * 注入视频简介（基于Playwright MCP测试验证）
   */
  async injectVideoDescription(content) {
    console.log('📝 注入视频简介:', content.substring(0, 100) + '...');

    // 查找视频简介编辑器（Quill富文本编辑器）
    let descEditor = document.querySelector(this.selectors.videoDescEditor) ||
                    document.querySelector(this.selectors.videoDescEditorBlank) ||
                    document.querySelector(this.selectors.videoDescEditorFallback);

    if (!descEditor) {
      throw new Error('未找到视频简介编辑器');
    }

    // 清空现有内容
    descEditor.innerHTML = '';
    descEditor.focus();

    // 处理内容格式（将换行转换为HTML格式）
    const htmlContent = content.replace(/\n/g, '<br>');

    // 注入新简介内容
    descEditor.innerHTML = '<p>' + htmlContent + '</p>';

    // 移除空白类（如果存在）
    descEditor.classList.remove('ql-blank');

    // 触发事件
    descEditor.dispatchEvent(new Event('input', { bubbles: true }));
    descEditor.dispatchEvent(new Event('change', { bubbles: true }));

    // 触发Quill特定的事件
    const textChangeEvent = new CustomEvent('text-change', {
      bubbles: true,
      detail: { delta: null, oldDelta: null, source: 'user' }
    });
    descEditor.dispatchEvent(textChangeEvent);

    console.log('✅ 视频简介注入成功');
    await this.delay(500);
  }

  /**
   * 注入专栏文章标题（基于Playwright MCP测试验证）
   */
  async injectArticleTitle(title) {
    console.log('📝 注入专栏文章标题:', title);

    try {
      // 查找专栏标题输入框
      const titleInput = document.querySelector(this.selectors.articleTitleInput) ||
                        document.querySelector(this.selectors.articleTitleInputFallback);

      if (!titleInput) {
        throw new Error('未找到专栏标题输入框');
      }

      // 清空现有内容
      titleInput.value = '';
      titleInput.focus();

      // 注入新标题（限制40字符）
      titleInput.value = title.substring(0, 40);

      // 触发事件
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));

      console.log('✅ 专栏文章标题注入成功');
      await this.delay(500);
    } catch (error) {
      console.error('❌ 专栏文章标题注入失败:', error);
      throw error;
    }
  }

  /**
   * 注入专栏文章内容（基于Playwright MCP测试验证和修复）
   * 支持富文本内容和图片处理
   */
  async injectArticleContent(content, data) {
    console.log('📝 注入专栏文章内容...', {
      contentLength: content.length,
      hasFiles: !!(data.files && data.files.length > 0),
      hasFileIds: !!(data.fileIds && data.fileIds.length > 0)
    });

    try {
      // 查找专栏内容编辑器（Quill富文本编辑器）
      const editor = document.querySelector(this.selectors.articleEditor) ||
                    document.querySelector(this.selectors.articleEditorBlank) ||
                    document.querySelector(this.selectors.articleEditorFallback);

      if (!editor) {
        throw new Error('未找到专栏内容编辑器');
      }

      // 处理和清理富文本内容
      const cleanedContent = await this.cleanAndProcessContent(content, data);

      // 使用改进的注入方法
      await this.injectContentToQuillEditor(editor, cleanedContent);

      console.log('✅ 专栏文章内容注入成功');
      await this.delay(1000);
    } catch (error) {
      console.error('❌ 专栏文章内容注入失败:', error);
      throw error;
    }
  }

  /**
   * 清理和处理富文本内容，确保与Quill编辑器兼容
   */
  async cleanAndProcessContent(content, data) {
    console.log('🧹 清理和处理富文本内容...');

    try {
      // 创建临时DOM来处理内容
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      // 移除不支持的外层容器（如 div.page, div.content 等）
      this.unwrapContainerDivs(tempDiv);

      // 处理图片
      await this.processImagesInContent(tempDiv, data);

      // 清理元素属性和规范化结构（使用统一方法）
      this.cleanElementAttributes(tempDiv);
      this.normalizeContentStructure(tempDiv);

      const cleanedContent = tempDiv.innerHTML;
      console.log('✅ 内容清理完成', {
        originalLength: content.length,
        cleanedLength: cleanedContent.length,
        hasImages: cleanedContent.includes('<img'),
        hasLinks: cleanedContent.includes('<a')
      });

      return cleanedContent;
    } catch (error) {
      console.error('内容清理失败:', error);
      return content; // 返回原始内容作为备用
    }
  }

  /**
   * 移除外层容器div，保留内部内容
   */
  unwrapContainerDivs(container) {
    const containerDivs = container.querySelectorAll('div.page, div.content, div.article, div[class*="container"]');

    containerDivs.forEach(div => {
      // 将div的内容移动到其父元素中
      while (div.firstChild) {
        div.parentNode.insertBefore(div.firstChild, div);
      }
      // 移除空的div
      div.remove();
    });
  }

  /**
   * 统一的元素属性清理方法
   * 合并了原来的 cleanUnsupportedAttributes 和 cleanElementAttributes 功能
   */
  cleanElementAttributes(container) {
    const allElements = container.querySelectorAll('*');

    allElements.forEach(element => {
      const tagName = element.tagName.toLowerCase();

      // 统一的属性白名单（合并了两个函数的配置）
      const allowedAttributes = {
        'a': ['href', 'target'],
        'img': ['src', 'alt', 'width', 'height'],
        'h1': [], 'h2': [], 'h3': [], 'h4': [], 'h5': [], 'h6': [],
        'p': [], 'strong': [], 'em': [], 'u': [], 's': [],
        'ul': [], 'ol': [], 'li': [],
        'blockquote': []
      };

      const allowed = allowedAttributes[tagName] || [];

      // 移除不允许的属性
      Array.from(element.attributes).forEach(attr => {
        if (!allowed.includes(attr.name)) {
          element.removeAttribute(attr.name);
        }
      });
    });
  }

  /**
   * 统一的内容结构规范化方法
   * 合并了原来的 normalizeContentStructure 和 normalizeStructure 功能
   */
  normalizeContentStructure(container) {
    // 使用 TreeWalker 遍历所有文本节点
    const textNodes = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim() && node.parentNode === container) {
        textNodes.push(node);
      }
    }

    // 将孤立的文本节点包装在段落中
    textNodes.forEach(textNode => {
      const p = document.createElement('p');
      textNode.parentNode.insertBefore(p, textNode);
      p.appendChild(textNode);
    });

    // 清理空元素和多余的换行
    this.cleanEmptyElements(container);
  }

  /**
   * 清理空元素的辅助方法
   */
  cleanEmptyElements(container) {
    // 移除空的段落和其他空元素
    const emptyElements = container.querySelectorAll('p:empty, div:empty, span:empty');
    emptyElements.forEach(el => el.remove());

    // 移除连续的换行符
    const brElements = container.querySelectorAll('br + br');
    brElements.forEach(br => br.remove());
  }

  /**
   * 改进的Quill编辑器内容注入方法（修复DOM范围错误）
   */
  async injectContentToQuillEditor(editor, content) {
    console.log('📝 使用修复后的方法注入内容到Quill编辑器...');

    try {
      // 使用安全的注入策略，避免Quill的DOM范围错误
      const success = await this.safeInjectContent(editor, content);

      if (!success) {
        console.log('🔄 安全注入失败，尝试备用方法...');
        await this.fallbackInjectContent(editor, content);
      }

    } catch (error) {
      console.error('Quill编辑器注入失败:', error);
      // 最后的备用方案：简化内容注入
      await this.emergencyInjectContent(editor, content);
    }
  }

  /**
   * 安全的内容注入方法（避免DOM范围错误，优化版）
   */
  async safeInjectContent(editor, content) {
    console.log('🛡️ 使用安全注入方法（优化版）...');

    try {
      // 1. 安全地清空编辑器，避免触发DOM范围错误
      await this.safelyClearEditor(editor);

      // 2. 等待编辑器稳定
      await this.delay(200);

      // 3. 预处理内容，确保Quill兼容性
      const processedContent = this.preprocessContentForQuill(content);

      // 4. 使用改进的文档片段注入
      const success = await this.injectProcessedContent(editor, processedContent);

      if (success) {
        // 5. 验证注入结果
        await this.delay(300);
        const isSuccess = this.validateContentInjection(editor, content);

        console.log('🛡️ 安全注入结果:', isSuccess);
        return isSuccess;
      }

      return false;

    } catch (error) {
      console.error('安全注入失败:', error);
      return false;
    }
  }



  /**
   * 安全地清空编辑器，避免DOM范围错误
   */
  async safelyClearEditor(editor) {
    try {
      // 移除焦点，避免选择范围问题
      if (document.activeElement === editor) {
        editor.blur();
      }

      // 等待焦点移除
      await this.delay(50);

      // 清空内容
      editor.innerHTML = '<p><br></p>';

      // 添加空白类
      editor.classList.add('ql-blank');

      // 等待DOM更新
      await this.delay(100);

    } catch (error) {
      console.error('清空编辑器失败:', error);
    }
  }

  /**
   * 创建安全的文档片段
   */
  createSafeDocumentFragment(content) {
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    // 将清理后的元素添加到片段中
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }

    return fragment;
  }

  /**
   * 注入预处理后的内容
   */
  async injectProcessedContent(editor, processedContent) {
    console.log('📝 注入预处理后的内容...');

    try {
      // 清空编辑器并准备注入
      editor.innerHTML = '';
      editor.classList.remove('ql-blank');

      // 直接设置innerHTML（因为内容已经预处理过）
      editor.innerHTML = processedContent;

      // 等待DOM更新
      await this.delay(100);

      // 触发必要的事件
      await this.triggerSafeEvents(editor);

      // 检查是否成功
      const hasContent = editor.textContent.trim().length > 0;
      const notBlank = !editor.classList.contains('ql-blank');

      console.log('📝 预处理内容注入结果:', { hasContent, notBlank });
      return hasContent && notBlank;

    } catch (error) {
      console.error('预处理内容注入失败:', error);
      return false;
    }
  }

  /**
   * 分批注入文档片段（保留作为备用）
   */
  async batchInjectFragment(editor, fragment) {
    // 清空编辑器并准备注入
    editor.innerHTML = '';
    editor.classList.remove('ql-blank');

    // 将片段内容逐个添加到编辑器
    const elements = Array.from(fragment.children);

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      // 克隆元素并添加到编辑器
      const clonedElement = element.cloneNode(true);
      editor.appendChild(clonedElement);

      // 每添加几个元素就触发一次事件
      if (i % 3 === 0 || i === elements.length - 1) {
        await this.triggerSafeEvents(editor);
        await this.delay(50);
      }
    }
  }

  /**
   * 触发安全的事件序列（避免DOM范围错误）
   */
  async triggerSafeEvents(editor) {
    try {
      // 只触发必要的事件，避免复杂的DOM操作
      const inputEvent = new Event('input', {
        bubbles: true,
        cancelable: true
      });
      editor.dispatchEvent(inputEvent);

      await this.delay(20);

    } catch (error) {
      console.warn('事件触发警告:', error.message);
    }
  }

  /**
   * 备用内容注入方法（保留富文本格式）
   */
  async fallbackInjectContent(editor, content) {
    console.log('🔄 使用备用注入方法（保留富文本格式）...');

    try {
      // 清空编辑器
      await this.safelyClearEditor(editor);

      // 使用智能HTML解析，保留富文本格式
      const richTextElements = this.parseRichTextContent(content);

      if (richTextElements.length === 0) {
        throw new Error('没有可用的富文本内容');
      }

      // 使用成功验证的逐个元素注入方法
      await this.injectElementsSequentially(editor, richTextElements);

      console.log('🔄 备用注入完成，保留了富文本格式');
      return true;

    } catch (error) {
      console.error('备用注入失败:', error);
      // 如果富文本注入失败，尝试简化的HTML注入
      return await this.simplifiedHtmlInject(editor, content);
    }
  }

  /**
   * 解析富文本内容，保留HTML格式（优化版）
   */
  parseRichTextContent(content) {
    console.log('📝 解析富文本内容，保留HTML格式（优化版）...');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    const cleanedElements = [];

    // 使用改进的递归提取方法
    this.extractAndCleanElements(tempDiv, cleanedElements);

    console.log(`📝 解析完成，找到 ${cleanedElements.length} 个清理后的元素`);
    console.log('元素类型:', cleanedElements.map(el => el.tagName.toLowerCase()));

    return cleanedElements;
  }

  /**
   * 递归提取并清理元素（基于成功的测试方案）
   */
  extractAndCleanElements(container, cleanedElements) {
    const children = Array.from(container.childNodes);

    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tagName = child.tagName.toLowerCase();

        // 直接支持的标签
        if (this.isDirectlySupportedTag(tagName)) {
          const cleanElement = child.cloneNode(true);
          this.cleanSingleElementAttributes(cleanElement);
          cleanedElements.push(cleanElement);
        }
        // 容器标签，递归处理
        else if (this.isContainerTag(tagName)) {
          this.extractAndCleanElements(child, cleanedElements);
        }
        // 其他有文本内容的元素，转换为段落
        else if (child.textContent && child.textContent.trim().length > 0) {
          const p = document.createElement('p');
          p.innerHTML = child.innerHTML;
          this.cleanSingleElementAttributes(p);
          cleanedElements.push(p);
        }
      }
      // 文本节点
      else if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
        const p = document.createElement('p');
        p.textContent = child.textContent.trim();
        cleanedElements.push(p);
      }
    }
  }

  /**
   * 检查是否为直接支持的标签
   */
  isDirectlySupportedTag(tagName) {
    return [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'strong', 'em', 'u', 's', 'a',
      'ul', 'ol', 'li', 'blockquote', 'img'
    ].includes(tagName);
  }

  /**
   * 检查是否为容器标签
   */
  isContainerTag(tagName) {
    return ['div', 'section', 'article', 'main', 'span', 'aside', 'header', 'footer'].includes(tagName);
  }

  /**
   * 清理单个元素属性（递归版本）
   */
  cleanSingleElementAttributes(element) {
    const allowedAttrs = {
      'a': ['href', 'target'],
      'img': ['src', 'alt', 'width', 'height']
    };

    const tagName = element.tagName.toLowerCase();
    const allowed = allowedAttrs[tagName] || [];

    // 移除不允许的属性
    Array.from(element.attributes).forEach(attr => {
      if (!allowed.includes(attr.name)) {
        element.removeAttribute(attr.name);
      }
    });

    // 递归清理子元素
    Array.from(element.children).forEach(child => {
      this.cleanSingleElementAttributes(child);
    });
  }

  /**
   * 简化HTML注入方法（备用的备用）
   */
  async simplifiedHtmlInject(editor, content) {
    console.log('🔧 使用简化HTML注入方法...');

    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      // 提取基本的HTML结构，保留重要格式
      const simplifiedHtml = this.createSimplifiedHtml(tempDiv);

      if (!simplifiedHtml || simplifiedHtml.trim().length === 0) {
        throw new Error('无法创建简化HTML');
      }

      // 直接注入简化的HTML
      editor.innerHTML = simplifiedHtml;
      editor.classList.remove('ql-blank');

      // 触发事件
      await this.triggerSafeEvents(editor);

      console.log('🔧 简化HTML注入完成');
      return true;

    } catch (error) {
      console.error('简化HTML注入失败:', error);
      // 最后的纯文本备用方案
      return await this.emergencyTextInject(editor, content);
    }
  }

  /**
   * 创建简化的HTML结构
   */
  createSimplifiedHtml(container) {
    const result = [];

    // 查找标题
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      result.push(`<${heading.tagName.toLowerCase()}>${heading.textContent}</${heading.tagName.toLowerCase()}>`);
    });

    // 查找段落
    const paragraphs = container.querySelectorAll('p');
    paragraphs.forEach(p => {
      if (p.textContent.trim().length > 0) {
        // 保留基本的内联格式
        let html = p.innerHTML;
        // 清理不支持的属性
        html = html.replace(/\s(class|id|style|data-\w+)="[^"]*"/g, '');
        result.push(`<p>${html}</p>`);
      }
    });

    // 如果没有找到段落，将所有文本内容包装在段落中
    if (result.length === 0) {
      const textContent = container.textContent || container.innerText || '';
      if (textContent.trim().length > 0) {
        const lines = textContent.split('\n').filter(line => line.trim().length > 0);
        lines.forEach(line => {
          result.push(`<p>${line.trim()}</p>`);
        });
      }
    }

    return result.join('\n');
  }

  /**
   * 紧急文本注入方法（最后的备用方案）
   */
  async emergencyTextInject(editor, content) {
    console.log('🚨 使用紧急文本注入方法...');

    try {
      // 提取最基本的文本内容
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';

      if (textContent.trim().length === 0) {
        console.warn('没有可用的文本内容进行紧急注入');
        return false;
      }

      // 将文本按行分割并创建段落
      const lines = textContent.split('\n').filter(line => line.trim().length > 0);
      const paragraphs = lines.map(line => `<p>${line.trim()}</p>`).join('');

      // 注入段落
      editor.innerHTML = paragraphs;
      editor.classList.remove('ql-blank');

      // 简单的事件触发
      editor.dispatchEvent(new Event('input', { bubbles: true }));

      console.log('🚨 紧急文本注入完成，内容长度:', textContent.length);
      return true;

    } catch (error) {
      console.error('紧急文本注入也失败了:', error);
      return false;
    }
  }

  /**
   * 触发Quill编辑器的事件序列（保留原方法作为备用）
   */
  async triggerQuillEvents(editor) {
    try {
      // 触发输入事件
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await this.delay(50);

      // 触发变化事件
      editor.dispatchEvent(new Event('change', { bubbles: true }));
      await this.delay(50);

      // 触发Quill特定的文本变化事件
      const textChangeEvent = new CustomEvent('text-change', {
        bubbles: true,
        detail: { delta: null, oldDelta: null, source: 'user' }
      });
      editor.dispatchEvent(textChangeEvent);
      await this.delay(50);

      // 触发键盘事件（模拟用户输入）
      editor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    } catch (error) {
      console.warn('Quill事件触发警告:', error.message);
    }
  }

  /**
   * 验证内容注入是否成功（改进版）
   */
  validateContentInjection(editor, originalContent) {
    const hasContent = editor.textContent.trim().length > 0;
    const notBlank = !editor.classList.contains('ql-blank');

    // 计算内容保留率
    const originalTextLength = this.extractTextContent(originalContent).length;
    const actualTextLength = editor.textContent.trim().length;
    const contentRetentionRate = originalTextLength > 0 ? (actualTextLength / originalTextLength) : 0;

    // 检查基本元素
    const hasBasicElements = this.checkBasicElements(editor, originalContent);

    // 更宽松的成功标准：内容保留率超过30%且有基本元素
    const isSuccess = hasContent && notBlank && contentRetentionRate > 0.3 && hasBasicElements;

    const validationResult = {
      hasContent,
      notBlank,
      hasBasicElements,
      originalTextLength,
      actualTextLength,
      contentRetentionRate: Math.round(contentRetentionRate * 100) + '%',
      htmlLength: editor.innerHTML.length,
      isSuccess
    };

    console.log('📊 内容注入验证结果:', validationResult);

    return isSuccess;
  }

  /**
   * 提取文本内容
   */
  extractTextContent(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return (tempDiv.textContent || tempDiv.innerText || '').trim();
  }

  /**
   * 检查基本元素是否存在（更宽松的检查）
   */
  checkBasicElements(editor, originalContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalContent;

    // 检查是否有任何有意义的内容元素
    const hasHeadings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;
    const hasParagraphs = tempDiv.querySelectorAll('p').length > 0;
    const hasLists = tempDiv.querySelectorAll('ul, ol, li').length > 0;
    const hasLinks = tempDiv.querySelectorAll('a').length > 0;

    const actualHeadings = editor.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    const actualParagraphs = editor.querySelectorAll('p').length;
    const actualLists = editor.querySelectorAll('ul, ol, li').length;
    const actualLinks = editor.querySelectorAll('a').length;

    // 如果原内容有特定元素，检查是否至少保留了一些
    let basicElementsPreserved = true;

    if (hasHeadings && actualHeadings === 0) basicElementsPreserved = false;
    if (hasParagraphs && actualParagraphs === 0) basicElementsPreserved = false;

    // 对于列表和链接，要求不那么严格
    return basicElementsPreserved;
  }



  /**
   * 逐个元素注入方法（基于成功的测试验证）
   */
  async injectElementsSequentially(editor, elements) {
    console.log(`📝 逐个注入 ${elements.length} 个元素...`);

    try {
      // 清空编辑器
      editor.innerHTML = '';
      editor.classList.remove('ql-blank');

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const clonedElement = element.cloneNode(true);

        // 添加元素到编辑器
        editor.appendChild(clonedElement);

        // 每添加一个元素就触发事件
        await this.triggerSafeEvents(editor);

        // 短暂延迟，让Quill处理
        await this.delay(30);
      }

      // 最终事件触发
      await this.delay(100);
      editor.dispatchEvent(new Event('change', { bubbles: true }));

      console.log('📝 逐个元素注入完成');

    } catch (error) {
      console.error('逐个元素注入失败:', error);
      throw error;
    }
  }

  /**
   * 处理富文本内容中的图片
   */
  async processImagesInContent(container, data) {
    console.log('🖼️ 处理富文本内容中的图片...');

    try {
      // 查找所有图片元素
      const images = container.querySelectorAll('img');

      for (const img of images) {
        // 处理Base64图片
        if (img.src.startsWith('data:image/')) {
          console.log('检测到Base64图片，开始处理...');

          try {
            // 将Base64图片转换为File对象
            const file = await this.convertBase64ToFile(img.src);

            if (file) {
              console.log('Base64图片转换成功:', file.name);
              // 这里可以实现图片上传逻辑
              // 暂时保留原始Base64
            }
          } catch (error) {
            console.warn('Base64图片处理失败:', error);
          }
        }

        // 清理图片属性，只保留src和alt
        const src = img.src;
        const alt = img.alt || '';

        img.removeAttribute('class');
        img.removeAttribute('style');
        img.removeAttribute('data-src');
        img.src = src;
        img.alt = alt;
      }

    } catch (error) {
      console.error('图片处理失败:', error);
    }
  }

  /**
   * 将Base64图片转换为File对象
   */
  async convertBase64ToFile(base64Src) {
    try {
      const [header, base64Data] = base64Src.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      const fileName = `article_image_${Date.now()}.${mimeType.split('/')[1]}`;
      return new File([blob], fileName, {
        type: mimeType,
        lastModified: Date.now()
      });
    } catch (error) {
      console.error('Base64转File失败:', error);
      return null;
    }
  }
}

// 将适配器注册到全局
window.BilibiliAdapter = BilibiliAdapter;
console.log('🎯 Bilibili适配器已注册到全局作用域');

} // 防止重复声明结束

// 使用统一的AdapterInitializer进行初始化
if (typeof AdapterInitializer !== 'undefined') {
  AdapterInitializer.initialize('bilibili', 'BilibiliAdapter', () => {
    console.log('🔄 使用传统方式初始化Bilibili适配器...');
    checkBaseClasses().then(() => {
      if (typeof window.BilibiliAdapter === 'undefined') {
        window.BilibiliAdapter = BilibiliAdapter;
      }
      console.log('✅ Bilibili适配器传统初始化完成');
    }).catch(error => {
      console.error('❌ Bilibili适配器传统初始化失败:', error);
    });
  });
} else {
  console.log('⚠️ AdapterInitializer未找到，使用直接初始化方式');
  checkBaseClasses().then(() => {
    console.log('✅ Bilibili适配器直接初始化完成');
  }).catch(error => {
    console.error('❌ Bilibili适配器直接初始化失败:', error);
  });
}

})();
