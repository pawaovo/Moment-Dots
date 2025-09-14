/**
 * 跨平台通用内容注入器
 * 基于Playwright MCP验证的技术方案实现
 * 支持即刻(Lexical)、微博(textarea)、抖音(混合编辑器)等平台
 */

export class UniversalContentInjector {
  constructor() {
    this.elementCache = new Map();
    this.injectionHistory = [];
    this.setupEventListeners();
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
   * 获取平台特定的选择器
   * @param {string} platform - 平台名称
   * @param {string} type - 元素类型
   * @returns {string[]} - 选择器数组
   */
  getSelectors(platform, type) {
    const selectorMap = {
      jike: {
        content: [
          'div[contenteditable="true"]',
          '.editor-content',
          '[data-lexical-editor="true"]'
        ],
        file: [
          'input[type="file"]',
          'input[accept*="image"]'
        ]
      },
      // weibo: 已移至 MomentDots/content-scripts/adapters/weibo.js，使用重构后的配置管理器
      douyin: {
        title: [
          'input[placeholder*="标题"]',
          'input[placeholder*="title"]',
          'input[type="text"]'
        ],
        content: [
          'div[contenteditable="true"]',
          '.editor-content',
          '[class*="editor"]'
        ],
        file: [
          'input[type="file"][accept*="image"]',
          'input[accept*="image"]'
        ]
      },
      xiaohongshu: {
        title: [
          'input[placeholder*="标题"]',
          'textbox[placeholder*="标题"]'
        ],
        content: [
          'div[contenteditable="true"]',
          'textbox[placeholder*="正文"]',
          'textbox[placeholder*="描述"]'
        ],
        file: [
          'input[type="file"][accept*="image"]'
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
   * 等待元素出现并注入内容
   * @param {string} selector - 元素选择器
   * @param {string} content - 内容
   * @param {number} timeout - 超时时间(ms)
   */
  async waitAndInject(selector, content, timeout = 10000) {
    const element = await this.waitForElement(selector, timeout);
    if (!element) {
      throw new Error(`元素 ${selector} 在 ${timeout}ms 内未出现`);
    }
    
    return this.injectContent(element, content);
  }

  /**
   * 验证和清理内容
   * @param {string} content - 原始内容
   * @param {string} platform - 平台名称
   * @returns {string} - 清理后的内容
   */
  validateAndCleanContent(content, platform) {
    // 平台特定的内容限制
    const limits = {
      jike: { maxLength: 500, allowHTML: false },
      // weibo: 已移至 MomentDots/content-scripts/adapters/weibo.js，使用重构后的配置管理器
      douyin: { maxLength: 1000, allowHTML: false },
      xiaohongshu: { maxLength: 1000, allowHTML: false }
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
   * 记录注入历史
   */
  recordInjection(element, content, success, method, error = null) {
    this.injectionHistory.push({
      timestamp: Date.now(),
      element: element.tagName,
      content: content.substring(0, 50),
      success,
      method,
      error
    });
    
    // 保持历史记录在合理范围内
    if (this.injectionHistory.length > 100) {
      this.injectionHistory = this.injectionHistory.slice(-50);
    }
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
  }

  /**
   * 创建测试图片文件
   * @param {string} text - 图片上的文字
   * @returns {Promise<File>} - 生成的图片文件
   */
  async createTestImage(text = '测试图片') {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      // 绘制背景
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 0, 800, 600);
      
      // 绘制文字
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(text, 400, 300);
      
      canvas.toBlob(blob => {
        const file = new File([blob], 'test-image.jpg', { 
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        resolve(file);
      }, 'image/jpeg', 0.8);
    });
  }
}

// 创建全局实例
export const universalInjector = new UniversalContentInjector();

// 便捷方法
export const injectContent = (element, content) => universalInjector.injectContent(element, content);
export const uploadFiles = (fileInput, files) => universalInjector.uploadFiles(fileInput, files);
export const findElement = (platform, type) => universalInjector.findElement(platform, type);
