/**
 * 平台适配器基类 - Chrome扩展版本
 * 基于验证的跨平台技术方案实现
 * 
 * 注意：此版本已适配Chrome扩展Content Script环境
 * - 移除了ES6模块语法
 * - 使用全局变量和IIFE模式
 * - 集成UniversalContentInjector
 */

(function() {
  'use strict';

  // 检查是否已经加载，避免重复定义
  if (window.BasePlatformAdapter) {
    console.log('PlatformAdapter already loaded');
    return;
  }

  /**
   * 平台适配器基类 - 继承FileProcessorBase以获得智能文件处理能力
   */
  class BasePlatformAdapter extends FileProcessorBase {
    constructor(platform) {
      // 🚀 继承FileProcessorBase以获得智能文件获取能力
      super(platform, {});

      this.platform = platform;
      this.injector = window.universalInjector;
      this.maxRetries = 3;
      this.defaultTimeout = 10000;

      if (!this.injector) {
        throw new Error('UniversalContentInjector not found. Please load it first.');
      }

      console.log(`${platform} adapter initialized with smart file processing`);
    }

    /**
     * 发布内容的通用方法 - 子类必须实现
     * @param {Object} data - 发布数据
     * @param {string} data.title - 标题
     * @param {string} data.content - 内容
     * @param {File[]} data.files - 文件数组
     * @returns {Promise<Object>} - 发布结果
     */
    async publishContent(data) {
      throw new Error('子类必须实现 publishContent 方法');
    }

    /**
     * 查找标题输入框 - 子类可以重写以支持特殊DOM结构
     * @returns {HTMLElement} 标题输入框元素
     */
    findTitleInput() {
      return document.querySelector('input[placeholder*="标题"], input[placeholder*="title"], textarea[placeholder*="标题"]');
    }

    /**
     * 查找文件输入框 - 子类可以重写以支持特殊DOM结构
     * @returns {HTMLElement} 文件输入框元素
     */
    findFileInput() {
      return document.querySelector('input[type="file"]');
    }

    /**
     * 查找内容编辑区域 - 子类可以重写以支持特殊DOM结构
     * @returns {HTMLElement} 内容编辑区域元素
     */
    findContentArea() {
      return document.querySelector('.input-editor, [contenteditable="true"], textarea[placeholder*="内容"], textarea[placeholder*="描述"]');
    }

    /**
     * 激活编辑区域 - 子类可以重写以支持特殊激活逻辑
     * @returns {Promise<boolean>} 激活是否成功
     */
    async activateEditingArea() {
      return true; // 默认不需要激活
    }

    /**
     * 统一的元素内容注入方法（内部方法）
     * @param {HTMLElement} element - 目标元素
     * @param {string} content - 要注入的内容
     * @param {string} type - 内容类型（用于日志）
     * @param {Function} validator - 自定义验证函数
     * @returns {Promise<boolean>} 注入是否成功
     */
    async _injectToElement(element, content, type, validator = null) {
      const INJECTION_DELAY = 500;

      element.focus();
      await this.delay(INJECTION_DELAY);

      // 优化：一次性设置内容
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = content;
      } else {
        element.textContent = content;
      }

      // 优化：批量触发事件
      this._triggerInputEvents(element);

      await this.delay(INJECTION_DELAY);

      // 验证注入结果
      const isValid = validator ?
        validator(element, content) :
        (element.value || element.textContent).includes(content);

      if (isValid) {
        this.log(`✅ ${type}注入成功: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
        return true;
      } else {
        throw new Error(`${type}注入失败：内容未正确设置`);
      }
    }

    /**
     * 统一的事件触发方法（内部方法）
     * @param {HTMLElement} element - 目标元素
     */
    _triggerInputEvents(element) {
      const events = ['input', 'change'];
      events.forEach(eventType => {
        element.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
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
     * 记录日志
     */
    log(message, data = {}) {
      console.log(`[${this.platform.toUpperCase()}] ${message}`, data);
    }

    /**
     * 记录错误
     */
    logError(message, error) {
      console.error(`[${this.platform.toUpperCase()}] ${message}`, error);
    }

    /**
     * 延迟函数
     */
    async delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 统一的标题注入方法
     * @param {string} title - 要注入的标题
     * @returns {Promise<boolean>} 注入是否成功
     */
    async injectTitle(title) {
      if (!title?.trim()) {
        this.log('标题为空，跳过注入');
        return true;
      }

      const titleInput = this.findTitleInput();
      if (!titleInput) {
        throw new Error('标题输入框未找到');
      }

      this.log('开始注入标题内容...');

      // 优化：合并内容设置和事件触发
      return await this._injectToElement(titleInput, title, '标题');
    }

    /**
     * 统一的内容注入方法
     * @param {string} content - 要注入的内容
     * @returns {Promise<boolean>} 注入是否成功
     */
    async injectContent(content) {
      if (!content?.trim()) {
        this.log('内容为空，跳过注入');
        return true;
      }

      this.log('开始内容注入流程...');

      // 激活编辑区域（如果需要）
      await this.activateEditingArea();

      const contentArea = this.findContentArea();
      if (!contentArea) {
        throw new Error('内容区域未找到');
      }

      this.log('开始注入内容...');

      // 优化：使用统一的注入方法，支持多种验证方式
      return await this._injectToElement(contentArea, content, '内容', (element, text) => {
        return element.textContent.includes(text) || element.innerText.includes(text);
      });
    }

    /**
     * 统一的文件上传方法
     * @param {Object} data - 包含文件数据的对象
     * @returns {Promise<boolean>} 上传是否成功
     */
    async uploadFiles(data) {
      const { fileIds, files } = data;

      if ((!fileIds?.length) && (!files?.length)) {
        this.log('没有文件需要上传');
        return true;
      }

      this.log('开始文件上传流程...');

      const fileInput = this.findFileInput();
      if (!fileInput) {
        throw new Error('文件输入元素未找到');
      }

      // 处理文件数据
      const filesToUpload = await this.processFileData(data);

      if (filesToUpload.length === 0) {
        throw new Error('没有有效的文件可以上传');
      }

      // 优化：批量处理文件，减少日志输出
      const dataTransfer = new DataTransfer();
      filesToUpload.forEach(file => dataTransfer.items.add(file));

      // 设置文件并触发事件
      fileInput.files = dataTransfer.files;
      this._triggerInputEvents(fileInput);

      this.log(`✅ 文件上传成功，共 ${dataTransfer.files.length} 个文件`);
      await this.delay(1500);

      return true;
    }

    /**
     * 通用文件处理方法 - 从fileIds或传统文件数据获取File对象
     * @param {Object} data - 包含fileIds或files的数据对象
     * @returns {Array} File对象数组
     */
    async processFileData(data) {
      const { files, fileIds } = data;
      let filesToUpload = [];

      if (fileIds && fileIds.length > 0) {
        // 🚀 新方案：使用智能文件获取（支持分布式下载）
        this.log('使用智能文件获取系统（支持分布式协作下载）...');
        try {
          for (const fileId of fileIds) {
            this.log(`智能获取文件: ${fileId}`);

            // 使用继承的智能文件获取方法
            const file = await this.getFileWithInstantPreview(fileId);

            filesToUpload.push(file);
            this.log(`✅ 智能获取文件成功: ${file.name} (${file.size} bytes)`);
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

      return filesToUpload;
    }

    /**
     * 收集传统文件数据（降级方案）
     */
    collectLegacyFiles(data) {
      const allFiles = [];

      // 从data.files收集
      if (data.files && Array.isArray(data.files)) {
        allFiles.push(...data.files);
      }

      // 从data.images收集（兼容旧版本）
      if (data.images && Array.isArray(data.images)) {
        data.images.forEach(imageData => {
          if (imageData.file) {
            allFiles.push(imageData.file);
          }
        });
      }

      this.log(`收集到 ${allFiles.length} 个传统文件`);
      return allFiles;
    }
  }

  // 即刻平台适配器已移至独立文件 jike.js 中，使用重构后的统一基类架构
  // 注意：此处保留注释以说明即刻适配器的位置
  // JikeAdapter 已移至 content-scripts/adapters/jike.js
  // 使用统一的BaseConfigManager和MutationObserverBase基类














  // 微博适配器已移至独立文件 weibo.js 中，使用精准策略实现

  /**
   * 抖音平台适配器 - 已移至独立文件 douyin.js
   * 使用更完善的DouyinSpecialAdapter实现
   * 注意：此处保留注释以说明抖音适配器的位置
   */
  // DouyinAdapter 已移至 content-scripts/adapters/douyin.js
  // 使用 DouyinSpecialAdapter 类提供完整的抖音平台支持

  /**
   * 小红书平台适配器 - 已移至独立文件 xiaohongshu.js
   * 使用更完善的XiaohongshuAdapter实现
   * 注意：此处保留注释以说明小红书适配器的位置
   */
  // XiaohongshuAdapter 已移至 content-scripts/adapters/xiaohongshu.js
  // 使用 XiaohongshuAdapter 类提供完整的小红书平台支持

  /**
   * 平台适配器工厂
   * 注意：微博、抖音和小红书适配器已移至独立文件中
   */
  class PlatformAdapterFactory {
    static create(platform) {
      // 即刻平台使用全局的JikeAdapter（来自jike.js）
      if (platform === 'jike') {
        if (window.JikeAdapter) {
          return new window.JikeAdapter();
        } else {
          throw new Error('即刻适配器未加载，请确保 jike.js 已正确加载');
        }
      }

      // 微博平台使用全局的WeiboAdapter（来自weibo.js）
      if (platform === 'weibo') {
        if (window.WeiboAdapter) {
          return new window.WeiboAdapter();
        } else {
          throw new Error('微博适配器未加载，请确保 weibo.js 已正确加载');
        }
      }

      // 抖音平台使用全局的DouyinAdapter（来自douyin.js）
      if (platform === 'douyin') {
        if (window.DouyinAdapter) {
          return new window.DouyinAdapter();
        } else {
          throw new Error('抖音适配器未加载，请确保 douyin.js 已正确加载');
        }
      }

      // 小红书平台使用全局的XiaohongshuAdapter（来自xiaohongshu.js）
      if (platform === 'xiaohongshu') {
        if (window.XiaohongshuAdapter) {
          return new window.XiaohongshuAdapter();
        } else {
          throw new Error('小红书适配器未加载，请确保 xiaohongshu.js 已正确加载');
        }
      }

      // X平台使用全局的XAdapter（来自x.js）
      if (platform === 'x') {
        if (window.XAdapter) {
          return new window.XAdapter();
        } else {
          throw new Error('X平台适配器未加载，请确保 x.js 已正确加载');
        }
      }

      // Bilibili平台使用全局的BilibiliAdapter（来自bilibili.js）
      if (platform === 'bilibili') {
        if (window.BilibiliAdapter) {
          return new window.BilibiliAdapter();
        } else {
          throw new Error('Bilibili适配器未加载，请确保 bilibili.js 已正确加载');
        }
      }

      // 微信视频号平台使用全局的WeixinChannelsPlatformAdapter（来自weixinchannels.js）
      if (platform === 'weixinchannels') {
        if (window.WeixinChannelsPlatformAdapter) {
          return new window.WeixinChannelsPlatformAdapter();
        } else {
          throw new Error('微信视频号适配器未加载，请确保 weixinchannels.js 已正确加载');
        }
      }

      // 微信公众号平台使用跨标签页机制，不需要传统适配器
      if (platform === 'weixin') {
        throw new Error('微信公众号平台使用跨标签页机制，请通过Background Script处理');
      }

      throw new Error(`不支持的平台: ${platform}`);
    }

    static getSupportedPlatforms() {
      return ['jike', 'weibo', 'douyin', 'xiaohongshu', 'x', 'bilibili', 'weixinchannels', 'weixin'];
    }
  }

  // 创建全局类（不包括WeiboAdapter，它在weibo.js中定义）
  window.BasePlatformAdapter = BasePlatformAdapter;

  // 为了兼容性，同时暴露为PlatformAdapter（微信视频号等新适配器使用）
  window.PlatformAdapter = BasePlatformAdapter;

  // 同时注册到 MomentDots 命名空间以支持新的适配器
  window.MomentDots = window.MomentDots || {};
  window.MomentDots.BasePlatformAdapter = BasePlatformAdapter;
  window.MomentDots.PlatformAdapter = BasePlatformAdapter;

  // window.JikeAdapter 在 jike.js 中定义
  // window.WeiboAdapter 在 weibo.js 中定义
  // window.DouyinAdapter 在 douyin.js 中定义
  // window.XiaohongshuAdapter 在 xiaohongshu.js 中定义
  window.PlatformAdapterFactory = PlatformAdapterFactory;

  console.log('PlatformAdapter loaded successfully, BasePlatformAdapter available at window.BasePlatformAdapter and window.PlatformAdapter');

})();
