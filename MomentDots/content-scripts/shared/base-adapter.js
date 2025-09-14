// 基础平台适配器类
console.log('Base adapter loaded');

/**
 * 基础平台适配器抽象类
 * 提供所有平台适配器的通用功能和接口规范
 */
class BasePlatformAdapter {
  constructor(platform, selectors = {}) {
    this.platform = platform;
    this.selectors = selectors;
    this.imageHandler = new ImageHandler();
    this.retryCount = 0;
    this.maxRetries = 3;
    this.defaultTimeout = 10000;
  }

  /**
   * 智能等待元素出现
   * @param {string} selector - CSS选择器
   * @param {number} timeout - 超时时间（毫秒）
   * @param {boolean} visible - 是否要求元素可见
   * @returns {Promise<Element>}
   */
  async waitForElement(selector, timeout = this.defaultTimeout, visible = true) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        const element = document.querySelector(selector);
        
        if (element) {
          // 检查元素是否可见（如果需要）
          if (!visible || (element.offsetParent !== null && element.offsetWidth > 0 && element.offsetHeight > 0)) {
            resolve(element);
            return;
          }
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element "${selector}" not found or not visible within ${timeout}ms`));
          return;
        }
        
        setTimeout(check, 100);
      };
      
      check();
    });
  }

  /**
   * 等待多个选择器中的任意一个出现
   * @param {string[]} selectors - CSS选择器数组
   * @param {number} timeout - 超时时间
   * @returns {Promise<{element: Element, selector: string}>}
   */
  async waitForAnyElement(selectors, timeout = this.defaultTimeout) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.offsetParent !== null) {
            resolve({ element, selector });
            return;
          }
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`None of the selectors found within ${timeout}ms: ${selectors.join(', ')}`));
          return;
        }
        
        setTimeout(check, 100);
      };
      
      check();
    });
  }

  /**
   * 安全点击元素
   * @param {string|Element} target - 选择器或元素
   * @param {number} timeout - 等待超时
   */
  async clickElement(target, timeout = this.defaultTimeout) {
    let element;
    
    if (typeof target === 'string') {
      element = await this.waitForElement(target, timeout);
    } else {
      element = target;
    }
    
    // 滚动到元素可见区域
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 等待滚动完成
    await this.delay(500);
    
    // 检查元素是否可点击
    if (element.disabled || element.hasAttribute('disabled')) {
      throw new Error('Element is disabled and cannot be clicked');
    }
    
    // 触发点击事件
    element.click();
    
    // 也触发鼠标事件以确保兼容性
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(clickEvent);
    
    console.log(`Clicked element: ${target}`);
  }

  /**
   * 智能文本输入
   * @param {string|Element} target - 选择器或元素
   * @param {string} text - 要输入的文本
   * @param {boolean} clear - 是否先清空
   */
  async fillText(target, text, clear = true) {
    let element;
    
    if (typeof target === 'string') {
      element = await this.waitForElement(target);
    } else {
      element = target;
    }
    
    // 聚焦元素
    element.focus();
    await this.delay(200);
    
    // 清空现有内容
    if (clear) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = '';
      } else if (element.contentEditable === 'true') {
        element.innerHTML = '';
        element.textContent = '';
      }
    }
    
    // 模拟真实用户输入
    await this.typeText(element, text);
    
    // 触发输入事件
    this.triggerInputEvents(element);
    
    console.log(`Filled text: "${text}" into element`);
  }

  /**
   * 模拟逐字符输入
   * @param {Element} element - 目标元素
   * @param {string} text - 文本内容
   */
  async typeText(element, text) {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value += char;
      } else if (element.contentEditable === 'true') {
        element.textContent += char;
      }
      
      // 触发键盘事件
      const keydownEvent = new KeyboardEvent('keydown', { key: char, bubbles: true });
      const keypressEvent = new KeyboardEvent('keypress', { key: char, bubbles: true });
      const keyupEvent = new KeyboardEvent('keyup', { key: char, bubbles: true });
      
      element.dispatchEvent(keydownEvent);
      element.dispatchEvent(keypressEvent);
      element.dispatchEvent(keyupEvent);
      
      // 随机延迟模拟真实输入
      await this.delay(Math.random() * 50 + 20);
    }
  }

  /**
   * 触发输入相关事件
   * @param {Element} element - 目标元素
   */
  triggerInputEvents(element) {
    const events = ['input', 'change', 'blur'];
    
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });
  }

  /**
   * 上传图片文件
   * @param {string|Element} target - 文件输入选择器或元素
   * @param {Array} images - 图片数据数组
   */
  async uploadImages(target, images) {
    if (!images || images.length === 0) {
      console.log('No images to upload');
      return;
    }
    
    let fileInput;
    
    if (typeof target === 'string') {
      fileInput = await this.waitForElement(target);
    } else {
      fileInput = target;
    }
    
    // 转换图片数据为File对象
    const files = images.map(imageData => {
      if (imageData instanceof File) {
        return imageData;
      } else {
        return this.imageHandler.createFileFromBase64(imageData);
      }
    });
    
    // 创建FileList对象
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    
    // 设置文件
    fileInput.files = dataTransfer.files;
    
    // 触发change事件
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);
    
    console.log(`Uploaded ${files.length} images`);
    
    // 等待上传处理
    await this.delay(1000);
  }

  /**
   * 检查登录状态
   * @returns {Promise<boolean>}
   */
  async checkLoginStatus() {
    console.log(`检查${this.platform}登录状态...`);
    
    if (!this.selectors.loginIndicators) {
      throw new Error('Login indicators not defined for this platform');
    }
    
    for (const selector of this.selectors.loginIndicators) {
      try {
        await this.waitForElement(selector, 3000);
        console.log(`用户已登录${this.platform}`);
        return true;
      } catch (e) {
        continue;
      }
    }
    
    throw new Error(`用户未登录${this.platform}或页面加载异常`);
  }

  /**
   * 等待页面完全加载
   */
  async waitForPageReady() {
    console.log(`等待${this.platform}页面加载完成...`);
    
    // 等待文档加载完成
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true });
      });
    }
    
    // 等待关键元素加载
    if (this.selectors.contentInput) {
      await this.waitForElement(this.selectors.contentInput, 15000);
    }
    
    // 等待页面稳定
    await this.delay(1000);
    
    console.log(`${this.platform}页面加载完成`);
  }

  /**
   * 验证发布结果
   * @returns {Promise<Object>}
   */
  async verifyPublishResult() {
    console.log(`验证${this.platform}发布结果...`);
    
    // 等待发布完成
    await this.delay(3000);
    
    // 检查错误提示
    if (this.selectors.errorIndicators) {
      for (const selector of this.selectors.errorIndicators) {
        const errorElement = document.querySelector(selector);
        if (errorElement && errorElement.offsetParent !== null) {
          throw new Error(`发布失败: ${errorElement.textContent}`);
        }
      }
    }
    
    console.log(`${this.platform}发布验证通过`);
    
    return {
      publishTime: new Date().toISOString(),
      platform: this.platform,
      url: window.location.href
    };
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重试机制包装器
   * @param {Function} fn - 要重试的函数
   * @param {number} maxRetries - 最大重试次数
   */
  async withRetry(fn, maxRetries = this.maxRetries) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${i + 1} failed:`, error.message);
        
        if (i < maxRetries) {
          await this.delay(1000 * (i + 1)); // 递增延迟
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 抽象方法 - 子类必须实现
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>}
   */
  async publish(data) {
    throw new Error('publish method must be implemented by subclass');
  }
}

// 图片处理器类
class ImageHandler {
  // Base64转Blob
  base64ToBlob(base64Data) {
    const [header, data] = base64Data.split(',');
    const mimeType = header.match(/:(.*?);/)[1];
    const byteCharacters = atob(data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // 创建File对象
  createFileFromBase64(imageData) {
    const blob = this.base64ToBlob(imageData.data);
    return new File([blob], imageData.name, {
      type: imageData.type,
      lastModified: imageData.lastModified || Date.now()
    });
  }
}

// 导出基类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BasePlatformAdapter, ImageHandler };
} else {
  window.BasePlatformAdapter = BasePlatformAdapter;
  window.ImageHandler = ImageHandler;
}

console.log('基础适配器框架加载完成');
