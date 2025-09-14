/**
 * 平台适配器初始化工具 - 消除重复代码
 * 统一处理依赖检查、初始化和消息监听逻辑
 */

(function() {
  'use strict';

  // 检查是否已经加载，避免重复定义
  if (window.AdapterInitializer) {
    console.log('AdapterInitializer already loaded');
    return;
  }

  /**
   * 适配器初始化工具类
   */
  class AdapterInitializer {
    // 防重复初始化
    static initializedPlatforms = new Set();
    static messageListeners = new Map();

    /**
     * 初始化平台适配器
     * @param {string} platform - 平台名称
     * @param {string} adapterClassName - 适配器类名
     * @param {Function} legacyInitializer - 旧版本初始化函数
     */
    static async initialize(platform, adapterClassName, legacyInitializer) {
      // 防重复初始化检查
      const initKey = `${platform}-${adapterClassName}`;
      if (this.initializedPlatforms.has(initKey)) {
        console.log(`${platform}适配器已经初始化过，跳过重复初始化`);
        return;
      }

      this.initializedPlatforms.add(initKey);
      console.log(`开始初始化${platform}适配器 [${initKey}]`);
      try {
        const dependencyType = await this.waitForDependencies(platform, adapterClassName);
        
        if (dependencyType === 'new') {
          console.log(`使用新技术方案初始化${platform}适配器`);
          this.initializeNewAdapter(platform, adapterClassName);
        } else {
          console.log(`使用旧技术方案初始化${platform}适配器`);
          if (legacyInitializer) {
            legacyInitializer();
          }
        }
        
      } catch (error) {
        console.error(`${platform}适配器初始化失败:`, error);
        // 尝试使用旧版本作为备用
        if (legacyInitializer) {
          legacyInitializer();
        }
      }
    }

    /**
     * 等待依赖加载
     * @param {string} platform - 平台名称
     * @param {string} adapterClassName - 适配器类名
     * @param {number} maxWait - 最大等待时间
     */
    static waitForDependencies(platform, adapterClassName, maxWait = 10000) {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const check = () => {
          // 检查新技术方案依赖
          if (window.universalInjector && window[adapterClassName]) {
            resolve('new');
            return;
          }
          
          // 检查旧技术方案依赖
          if (typeof window.MomentDots !== 'undefined' && 
              typeof window.MomentDots.UniversalContentInjector !== 'undefined') {
            resolve('legacy');
            return;
          }
          
          if (Date.now() - startTime > maxWait) {
            reject(new Error('依赖加载超时'));
            return;
          }
          
          setTimeout(check, 100);
        };
        
        check();
      });
    }

    /**
     * 初始化新技术方案适配器
     * @param {string} platform - 平台名称
     * @param {string} adapterClassName - 适配器类名
     */
    static initializeNewAdapter(platform, adapterClassName) {
      // 防重复消息监听器
      const listenerKey = `${platform}-${adapterClassName}`;
      if (this.messageListeners.has(listenerKey)) {
        console.log(`${platform}消息监听器已存在，跳过重复注册`);
        return;
      }

      // 创建适配器实例
      const adapter = new window[adapterClassName]();

      // 防重复执行机制
      let isPublishing = false;
      let lastPublishTime = 0;
      const PUBLISH_COOLDOWN = 2000; // 2秒冷却时间

      // 监听来自后台脚本的消息
      const messageListener = (message, sender, sendResponse) => {
        const messageId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        console.log(`${platform}内容脚本收到消息 [${messageId}]:`, message);

        if (message.action === 'ping') {
          // 响应ping消息，表示content script已准备就绪
          sendResponse({ success: true, platform: platform });
          return true;
        }

        if (message.action === 'publish') {
          const now = Date.now();

          // 防重复执行检查
          if (isPublishing) {
            console.log(`${platform}正在发布中，跳过重复请求 [${messageId}]`);
            sendResponse({
              success: false,
              platform: platform,
              error: '正在发布中，请勿重复操作'
            });
            return true;
          }

          if (now - lastPublishTime < PUBLISH_COOLDOWN) {
            console.log(`${platform}发布冷却中，跳过重复请求 [${messageId}]`);
            sendResponse({
              success: false,
              platform: platform,
              error: '操作过于频繁，请稍后再试'
            });
            return true;
          }

          // 设置发布状态
          console.log(`${platform}开始处理发布请求 [${messageId}]`);
          isPublishing = true;
          lastPublishTime = now;

          // 增加并发保护和错误隔离
          const publishPromise = adapter.publishContent(message.data);

          // 设置超时保护，避免长时间阻塞
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(`${platform}发布超时（30秒）`));
            }, 30000);
          });

          Promise.race([publishPromise, timeoutPromise])
            .then(result => {
              console.log(`${platform}发布结果:`, result);
              sendResponse({
                ...result,
                platform: platform,
                timestamp: Date.now()
              });
            })
            .catch(error => {
              console.error(`${platform}发布错误:`, error);
              sendResponse({
                success: false,
                platform: platform,
                error: error.message || '发布失败',
                timestamp: Date.now()
              });
            })
            .finally(() => {
              // 重置发布状态
              isPublishing = false;
              console.log(`${platform}发布状态已重置 [${messageId}]`);
            });

          return true; // 保持消息通道开放
        }
      };

      // 注册消息监听器
      chrome.runtime.onMessage.addListener(messageListener);
      this.messageListeners.set(listenerKey, messageListener);

      console.log(`${platform}适配器初始化完成 - 使用新技术方案`);
    }

    /**
     * 检查旧技术方案依赖
     */
    static checkLegacyDependencies() {
      if (typeof window.MomentDots === 'undefined' || 
          typeof window.MomentDots.UniversalContentInjector === 'undefined') {
        console.error('UniversalContentInjector未加载，适配器无法工作');
        return false;
      }
      return true;
    }
  }

  // 创建全局类
  window.AdapterInitializer = AdapterInitializer;

  console.log('AdapterInitializer loaded successfully');

})();
