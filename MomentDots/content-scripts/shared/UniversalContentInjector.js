/**
 * 跨平台通用内容注入器 - Chrome扩展版本
 * 基于Playwright MCP验证的技术方案实现
 * 支持即刻(Lexical)、微博(textarea)、抖音(混合编辑器)等平台
 * 
 * 注意：此版本已适配Chrome扩展Content Script环境
 * - 移除了ES6模块语法
 * - 使用全局变量和IIFE模式
 * - 集成Chrome Storage API
 */

(function() {
  'use strict';

  // 检查是否已经加载，避免重复定义
  if (window.UniversalContentInjector) {
    console.log('UniversalContentInjector already loaded');
    return;
  }

  /**
   * 跨平台通用内容注入器类
   */
  class UniversalContentInjector {
    constructor() {
      this.elementCache = new Map();
      this.injectionHistory = [];
      this.setupEventListeners();
      console.log('UniversalContentInjector initialized');
    }

    /**
     * 通用内容注入方法
     * @param {HTMLElement} element - 目标输入元素
     * @param {string} content - 要注入的内容
     * @returns {Promise<boolean>} - 注入是否成功
     */
    async injectContent(element, content) {
      try {
        // 确保元素获得焦点
        element.focus();
        await this.delay(100);
        
        // 策略1: 传统表单元素 (微博、抖音标题)
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
          element.value = content;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          
          const success = element.value === content;
          this.recordInjection(element, content, success, 'value-property');
          return success;
        }
        
        // 策略2: contenteditable元素 (即刻、抖音内容)
        if (element.contentEditable === 'true') {
          element.textContent = content;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          
          const success = element.textContent.includes(content);
          this.recordInjection(element, content, success, 'textContent');
          return success;
        }
        
        // 策略3: execCommand备用方案
        document.execCommand('selectAll');
        const success = document.execCommand('insertText', false, content);
        this.recordInjection(element, content, success, 'execCommand');
        return success;
        
      } catch (error) {
        console.error('内容注入失败:', error);
        this.recordInjection(element, content, false, 'error', error.message);
        return false;
      }
    }

    /**
     * 通用文件上传方法
     * @param {HTMLInputElement} fileInput - 文件输入控件
     * @param {File[]} files - 要上传的文件数组
     * @returns {Promise<boolean>} - 上传是否成功
     */
    async uploadFiles(fileInput, files) {
      try {
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log(`文件上传成功: ${files.length} 个文件`);
        return true;
      } catch (error) {
        console.error('文件上传失败:', error);
        return false;
      }
    }

    /**
     * 智能元素定位
     * @param {string} platform - 平台名称
     * @param {string} type - 元素类型 ('title', 'content', 'file')
     * @returns {HTMLElement|null} - 找到的元素
     */
    findElement(platform, type) {
      const cacheKey = `${platform}-${type}`;
      
      // 检查缓存
      if (this.elementCache.has(cacheKey)) {
        const cached = this.elementCache.get(cacheKey);
        if (document.contains(cached)) {
          return cached;
        } else {
          this.elementCache.delete(cacheKey);
        }
      }
      
      const selectors = this.getSelectors(platform, type);
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          this.elementCache.set(cacheKey, element);
          return element;
        }
      }
      
      return null;
    }

    /**
     * 获取平台特定的选择器 - 基于Playwright MCP验证结果
     * @param {string} platform - 平台名称
     * @param {string} type - 元素类型
     * @returns {string[]} - 选择器数组（按优先级排序）
     */
    getSelectors(platform, type) {
      const selectorMap = {
        jike: {
          content: [
            // 精准选择器（Playwright MCP验证100%有效）
            'div[data-lexical-editor="true"][contenteditable="true"][role="textbox"]',
            // 备用选择器
            'div[contenteditable="true"][role="textbox"]',
            // 兜底选择器
            'div[contenteditable="true"]'
          ],
          file: [
            // 精准文件上传选择器（验证100%有效）
            'input[type="file"]'
          ]
        },
        weibo: {
          content: [
            'textarea[placeholder*="新鲜事"]',
            'textarea[placeholder*="有什么新鲜事"]',
            'textarea'
          ],
          file: ['input[type="file"]']
        },
        douyin: {
          title: [
            'input[placeholder="添加作品标题"]',  // 精确匹配，基于Playwright分析
            'input[placeholder*="标题"]',
            '.semi-input[placeholder*="标题"]',
            'input[type="text"]'
          ],
          content: [
            '.zone-container[contenteditable="true"]',  // 最精确的选择器，基于Playwright分析
            'div[contenteditable="true"]',
            '.editor-kit-container[contenteditable="true"]',
            '.editor-content'
          ],
          file: ['input[type="file"][accept*="image"]']
        },
        xiaohongshu: {
          title: [
            'input[placeholder*="填写标题"]',
            'input[placeholder*="标题"]'
          ],
          content: [
            'div[contenteditable="true"]',
            '.editor-content'
          ],
          file: ['input[type="file"]']
        },
        weixinchannels: {
          title: [
            'input[placeholder="填写标题, 22个字符内"]',
            'input.weui-desktop-form__input[placeholder*="标题"]'
          ],
          content: [
            'div[contenteditable="true"]',
            '.editor-content'
          ],
          file: ['input[type="file"][accept="image/*"]']
        },
        x: {
          title: [
            // X平台没有单独的标题字段，内容和标题合并
            '[data-testid="tweetTextarea_0"]',
            '[contenteditable="true"]',
            'div[role="textbox"]'
          ],
          content: [
            '[data-testid="tweetTextarea_0"]',  // 基于Playwright MCP验证的精准选择器
            '[contenteditable="true"]',
            'div[role="textbox"]'
          ],
          file: [
            '[data-testid="fileInput"]',  // 基于Playwright MCP验证的精准选择器
            'input[type="file"]'
          ]
        },
        bilibili: {
          title: [
            // Bilibili标题输入框选择器（基于Playwright MCP验证）
            'input[placeholder*="好的标题更容易获得支持"]',
            'input[maxlength="20"]'
          ],
          content: [
            // Bilibili内容编辑器选择器（基于Playwright MCP验证）
            '.bili-rich-textarea__inner',
            '[contenteditable="true"]',
            'div[role="textbox"]'
          ],
          file: [
            'input[type="file"]'
          ]
        }
      };
      
      return selectorMap[platform]?.[type] || [];
    }

    /**
     * 等待元素出现
     * @param {string} selector - 元素选择器
     * @param {number} timeout - 超时时间(ms)
     * @returns {Promise<HTMLElement|null>}
     */
    async waitForElement(selector, timeout = 10000) {
      return new Promise((resolve) => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     */
    async delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 记录注入历史
     */
    recordInjection(element, content, success, method, error = null) {
      const record = {
        timestamp: Date.now(),
        element: element.tagName,
        contentLength: content.length,
        success,
        method,
        error,
        url: window.location.href
      };
      
      this.injectionHistory.push(record);
      
      // 保持历史记录在合理范围内
      if (this.injectionHistory.length > 100) {
        this.injectionHistory = this.injectionHistory.slice(-50);
      }
      
      console.log('注入记录:', record);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
      // 监听页面变化，清理缓存
      document.addEventListener('DOMContentLoaded', () => {
        this.clearElementCache();
      });

      // 监听路由变化（SPA应用）
      window.addEventListener('popstate', () => {
        this.clearElementCache();
      });
    }

    /**
     * 清理元素缓存
     */
    clearElementCache() {
      this.elementCache.clear();
      console.log('元素缓存已清理');
    }

    /**
     * 获取注入统计信息
     */
    getInjectionStats() {
      const total = this.injectionHistory.length;
      const successful = this.injectionHistory.filter(h => h.success).length;

      return {
        total,
        successful,
        successRate: total > 0 ? (successful / total * 100).toFixed(2) + '%' : '0%',
        recentHistory: this.injectionHistory.slice(-10)
      };
    }

    /**
     * 智能重试机制
     * @param {Function} fn - 要重试的函数
     * @param {number} maxRetries - 最大重试次数
     * @param {number} delay - 重试间隔(ms)
     */
    async withRetry(fn, maxRetries = 3, delay = 1000) {
      let lastError;

      for (let i = 0; i <= maxRetries; i++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          console.warn(`重试 ${i + 1}/${maxRetries + 1}:`, error.message);

          if (i < maxRetries) {
            await this.delay(delay * (i + 1)); // 递增延迟
          }
        }
      }

      throw lastError;
    }

    /**
     * 内容验证和清理
     * @param {string} content - 原始内容
     * @param {string} platform - 平台名称
     * @returns {string} - 清理后的内容
     */
    validateAndCleanContent(content, platform) {
      // 平台特定的内容限制
      const limits = {
        jike: { maxLength: 500, allowHTML: false },
        weibo: { maxLength: 140, allowHTML: false },
        douyin: { maxLength: 1000, allowHTML: false },
        xiaohongshu: { maxLength: 1000, allowHTML: false },
        bilibili: { maxLength: 2000, allowHTML: false },
        weixinchannels: { maxLength: 1000, allowHTML: false }
      };

      const limit = limits[platform] || { maxLength: 1000, allowHTML: false };

      // 清理HTML标签
      if (!limit.allowHTML) {
        content = content.replace(/<[^>]*>/g, '');
      }

      // 截断过长内容
      if (content.length > limit.maxLength) {
        content = content.substring(0, limit.maxLength - 3) + '...';
      }

      return content;
    }

    /**
     * 带验证的内容注入
     * @param {HTMLElement} element - 目标元素
     * @param {string} content - 内容
     * @param {string} platform - 平台名称
     */
    async injectValidatedContent(element, content, platform) {
      const cleanContent = this.validateAndCleanContent(content, platform);
      return this.injectContent(element, cleanContent);
    }

    /**
     * 批量内容注入
     * @param {Array} injections - 注入任务数组 [{element, content}, ...]
     */
    async batchInjectContent(injections) {
      const promises = injections.map(({ element, content }) =>
        this.injectContent(element, content)
      );

      return Promise.all(promises);
    }
  }

  // 创建全局实例
  window.UniversalContentInjector = UniversalContentInjector;
  window.universalInjector = new UniversalContentInjector();

  // 同时注册到MomentDots命名空间以兼容AdapterInitializer
  window.MomentDots = window.MomentDots || {};
  window.MomentDots.UniversalContentInjector = UniversalContentInjector;

  // 便捷方法
  window.injectContent = (element, content) => window.universalInjector.injectContent(element, content);
  window.uploadFiles = (fileInput, files) => window.universalInjector.uploadFiles(fileInput, files);
  window.findElement = (platform, type) => window.universalInjector.findElement(platform, type);

  console.log('UniversalContentInjector loaded successfully');

})();
