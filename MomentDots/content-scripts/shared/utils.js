// 内容脚本共享工具函数
console.log('Content script utils loaded');

/**
 * 平台工具类
 * 提供平台相关的通用工具函数
 */
class PlatformUtils {
  /**
   * 检测当前页面的平台类型
   * @returns {string|null} 平台ID
   */
  static detectPlatform() {
    const url = window.location.href;
    const hostname = window.location.hostname;
    
    if (hostname.includes('weibo.com')) return 'weibo';
    if (hostname.includes('xiaohongshu.com')) return 'xiaohongshu';
    if (hostname.includes('okjike.com')) return 'jike';
    if (hostname.includes('douyin.com')) return 'douyin';
    
    return null;
  }

  /**
   * 获取平台特定的发布页面URL
   * @param {string} platformId 平台ID
   * @returns {string} 发布页面URL
   */
  static getPublishUrl(platformId) {
    const urls = {
      weibo: 'https://weibo.com/',
      xiaohongshu: 'https://creator.xiaohongshu.com/new/home',
      jike: 'https://web.okjike.com',
      douyin: 'https://creator.douyin.com/creator-micro/home'
    };

    return urls[platformId] || null;
  }

  /**
   * 检查页面是否为发布页面
   * @param {string} platformId 平台ID
   * @returns {boolean}
   */
  static isPublishPage(platformId) {
    const url = window.location.href;
    
    switch (platformId) {
      case 'weibo':
        return url.includes('weibo.com') && (url.includes('compose') || url.includes('publish'));
      case 'xiaohongshu':
        return url.includes('creator.xiaohongshu.com') && url.includes('publish');
      case 'jike':
        return url.includes('web.okjike.com');
      case 'douyin':
        return url.includes('creator.douyin.com') && url.includes('upload');
      default:
        return false;
    }
  }
}

/**
 * DOM操作工具类
 */
class DOMUtils {
  /**
   * 安全获取元素文本内容
   * @param {Element} element 
   * @returns {string}
   */
  static getElementText(element) {
    if (!element) return '';
    return element.textContent || element.innerText || '';
  }

  /**
   * 检查元素是否可见
   * @param {Element} element 
   * @returns {boolean}
   */
  static isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  /**
   * 获取元素的计算样式
   * @param {Element} element 
   * @param {string} property 
   * @returns {string}
   */
  static getComputedStyle(element, property) {
    if (!element) return '';
    return window.getComputedStyle(element).getPropertyValue(property);
  }

  /**
   * 滚动到元素位置
   * @param {Element} element 
   * @param {Object} options 
   */
  static scrollToElement(element, options = {}) {
    if (!element) return;
    
    const defaultOptions = {
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    };
    
    element.scrollIntoView({ ...defaultOptions, ...options });
  }

  /**
   * 等待元素属性变化
   * @param {Element} element 
   * @param {string} attribute 
   * @param {string} expectedValue 
   * @param {number} timeout 
   * @returns {Promise<boolean>}
   */
  static waitForAttributeChange(element, attribute, expectedValue, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (element.getAttribute(attribute) === expectedValue) {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Attribute ${attribute} did not change to ${expectedValue} within ${timeout}ms`));
          return;
        }
        
        setTimeout(check, 100);
      };
      
      check();
    });
  }
}

/**
 * 事件工具类
 */
class EventUtils {
  /**
   * 创建并触发自定义事件
   * @param {Element} element 
   * @param {string} eventType 
   * @param {Object} detail 
   */
  static triggerCustomEvent(element, eventType, detail = {}) {
    const event = new CustomEvent(eventType, {
      bubbles: true,
      cancelable: true,
      detail
    });
    
    element.dispatchEvent(event);
  }

  /**
   * 模拟键盘输入事件
   * @param {Element} element 
   * @param {string} key 
   */
  static simulateKeyPress(element, key) {
    const keydownEvent = new KeyboardEvent('keydown', { key, bubbles: true });
    const keypressEvent = new KeyboardEvent('keypress', { key, bubbles: true });
    const keyupEvent = new KeyboardEvent('keyup', { key, bubbles: true });
    
    element.dispatchEvent(keydownEvent);
    element.dispatchEvent(keypressEvent);
    element.dispatchEvent(keyupEvent);
  }

  /**
   * 模拟鼠标点击事件
   * @param {Element} element 
   * @param {Object} options 
   */
  static simulateClick(element, options = {}) {
    const defaultOptions = {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0
    };
    
    const mouseEvent = new MouseEvent('click', { ...defaultOptions, ...options });
    element.dispatchEvent(mouseEvent);
  }

  /**
   * 模拟拖拽事件
   * @param {Element} source 
   * @param {Element} target 
   */
  static simulateDragDrop(source, target) {
    const dragStartEvent = new DragEvent('dragstart', { bubbles: true });
    const dragOverEvent = new DragEvent('dragover', { bubbles: true });
    const dropEvent = new DragEvent('drop', { bubbles: true });
    
    source.dispatchEvent(dragStartEvent);
    target.dispatchEvent(dragOverEvent);
    target.dispatchEvent(dropEvent);
  }
}

/**
 * 文件处理工具类
 */
class FileUtils {
  /**
   * 验证文件类型
   * @param {File} file 
   * @param {string[]} allowedTypes 
   * @returns {boolean}
   */
  static validateFileType(file, allowedTypes) {
    return allowedTypes.includes(file.type);
  }

  /**
   * 验证文件大小
   * @param {File} file 
   * @param {number} maxSize 
   * @returns {boolean}
   */
  static validateFileSize(file, maxSize) {
    return file.size <= maxSize;
  }

  /**
   * 读取文件为Base64
   * @param {File} file 
   * @returns {Promise<string>}
   */
  static readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * 压缩图片
   * @param {File} file 
   * @param {number} maxWidth 
   * @param {number} maxHeight 
   * @param {number} quality 
   * @returns {Promise<Blob>}
   */
  static compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 计算新尺寸
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // 设置画布尺寸
        canvas.width = width;
        canvas.height = height;
        
        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为Blob
        canvas.toBlob(resolve, file.type, quality);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
}

/**
 * 错误处理工具类
 */
class ErrorUtils {
  /**
   * 创建标准化错误对象
   * @param {string} message 
   * @param {string} code 
   * @param {Object} details 
   * @returns {Error}
   */
  static createError(message, code = 'UNKNOWN_ERROR', details = {}) {
    const error = new Error(message);
    error.code = code;
    error.details = details;
    error.timestamp = new Date().toISOString();
    return error;
  }

  /**
   * 解析平台特定错误
   * @param {Error} error 
   * @param {string} platform 
   * @returns {Object}
   */
  static parseError(error, platform) {
    const errorMap = {
      weibo: {
        '登录': 'LOGIN_REQUIRED',
        '字数': 'CONTENT_TOO_LONG',
        '图片': 'IMAGE_UPLOAD_FAILED',
        '网络': 'NETWORK_ERROR'
      },
      xiaohongshu: {
        '登录': 'LOGIN_REQUIRED',
        '标题': 'TITLE_REQUIRED',
        '内容': 'CONTENT_INVALID',
        '图片': 'IMAGE_REQUIRED'
      },
      jike: {
        '登录': 'LOGIN_REQUIRED',
        '内容': 'CONTENT_REQUIRED',
        '圈子': 'CIRCLE_REQUIRED'
      },
      douyin: {
        '登录': 'LOGIN_REQUIRED',
        '视频': 'VIDEO_REQUIRED',
        '标题': 'TITLE_REQUIRED'
      }
    };
    
    const platformErrors = errorMap[platform] || {};
    const message = error.message || '';
    
    for (const [keyword, code] of Object.entries(platformErrors)) {
      if (message.includes(keyword)) {
        return {
          code,
          message: error.message,
          platform,
          suggestion: this.getErrorSuggestion(code)
        };
      }
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      platform,
      suggestion: '请检查网络连接和页面状态'
    };
  }

  /**
   * 获取错误建议
   * @param {string} errorCode 
   * @returns {string}
   */
  static getErrorSuggestion(errorCode) {
    const suggestions = {
      LOGIN_REQUIRED: '请先登录对应平台',
      CONTENT_TOO_LONG: '请缩短内容长度',
      CONTENT_REQUIRED: '请输入发布内容',
      TITLE_REQUIRED: '请输入标题',
      IMAGE_REQUIRED: '请上传图片',
      IMAGE_UPLOAD_FAILED: '请检查图片格式和大小',
      NETWORK_ERROR: '请检查网络连接',
      CIRCLE_REQUIRED: '请选择发布圈子'
    };
    
    return suggestions[errorCode] || '请重试或联系技术支持';
  }
}

/**
 * 调试工具类
 */
class DebugUtils {
  /**
   * 记录调试信息
   * @param {string} platform 
   * @param {string} action 
   * @param {Object} data 
   */
  static log(platform, action, data = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      platform,
      action,
      url: window.location.href,
      ...data
    };
    
    console.log(`[${platform.toUpperCase()}] ${action}:`, logData);
  }

  /**
   * 记录性能指标
   * @param {string} operation 
   * @param {number} startTime 
   */
  static logPerformance(operation, startTime) {
    const duration = Date.now() - startTime;
    console.log(`[PERFORMANCE] ${operation}: ${duration}ms`);
  }

  /**
   * 截图调试
   * @param {string} filename 
   */
  static takeScreenshot(filename = 'debug') {
    // 注意：这个功能需要在扩展环境中实现
    console.log(`Screenshot requested: ${filename}`);
  }
}

// 导出工具类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PlatformUtils,
    DOMUtils,
    EventUtils,
    FileUtils,
    ErrorUtils,
    DebugUtils
  };
} else {
  window.PlatformUtils = PlatformUtils;
  window.DOMUtils = DOMUtils;
  window.EventUtils = EventUtils;
  window.FileUtils = FileUtils;
  window.ErrorUtils = ErrorUtils;
  window.DebugUtils = DebugUtils;
}

console.log('内容脚本工具函数加载完成');
