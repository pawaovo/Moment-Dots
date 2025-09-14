/**
 * MutationObserver基础类 - 统一的DOM监控解决方案
 * 消除小红书和抖音平台适配器中的重复代码
 * 
 * 核心功能：
 * 1. 统一的MutationObserver创建和管理
 * 2. 智能元素等待机制
 * 3. 页面就绪检测
 * 4. 性能监控集成
 * 5. 自动清理和内存管理
 */

class MutationObserverBase {
  constructor(platform = 'unknown') {
    this.platform = platform;
    this.activeObservers = new Map(); // 跟踪活跃的Observer
    this.performanceLog = [];
  }

  /**
   * 统一的性能监控方法
   * @param {string} operation - 操作名称
   * @param {Function} fn - 要执行的函数
   * @returns {Promise<any>} - 函数执行结果
   */
  async measurePerformance(operation, fn) {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.performanceLog.push({
        operation,
        duration,
        success: true,
        timestamp: new Date().toISOString(),
        platform: this.platform
      });
      
      this.log(`⚡ 性能监控 - ${operation}: ${duration}ms`);
      
      // 性能警告
      if (duration > 2000) {
        this.log(`⚠️ 性能警告: ${operation} 耗时 ${duration}ms，可能需要进一步优化`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.performanceLog.push({
        operation,
        duration,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        platform: this.platform
      });
      
      this.log(`❌ 性能监控 - ${operation} 失败: ${duration}ms - ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建标准化的MutationObserver
   * @param {Function} callback - 回调函数
   * @param {Object} options - 观察选项
   * @param {string} observerId - Observer标识符
   * @returns {MutationObserver} - 创建的Observer
   */
  createObserver(callback, options = {}, observerId = null) {
    const defaultOptions = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'disabled', 'placeholder', 'contenteditable']
    };

    const finalOptions = { ...defaultOptions, ...options };
    const observer = new MutationObserver(callback);
    
    // 如果提供了ID，跟踪这个Observer
    if (observerId) {
      this.activeObservers.set(observerId, observer);
    }
    
    return observer;
  }

  /**
   * 智能元素等待方法 - 统一实现
   * @param {string} selector - CSS选择器
   * @param {number} timeout - 超时时间（毫秒）
   * @param {boolean} checkVisible - 是否检查元素可见性
   * @param {string} description - 操作描述
   * @returns {Promise<HTMLElement|null>} - 找到的元素
   */
  async waitForElementSmart(selector, timeout = 3000, checkVisible = true, description = '') {
    const operationName = description || `等待元素: ${selector}`;
    this.log(`🔍 开始智能${operationName}`);

    return new Promise((resolve) => {
      let resolved = false;
      const observerId = `element-wait-${Date.now()}`;

      const checkElement = () => {
        if (resolved) return false;

        const element = document.querySelector(selector);
        if (element) {
          // 检查元素可见性（如果需要）
          if (!checkVisible || this.isElementVisible(element)) {
            resolved = true;
            this.log(`✅ 智能找到元素: ${selector}`);
            this.cleanupObserver(observerId);
            resolve(element);
            return true;
          }
        }
        return false;
      };

      // 立即检查一次
      if (checkElement()) return;

      // 创建MutationObserver
      const observer = this.createObserver(() => {
        if (!resolved) {
          checkElement();
        }
      }, {}, observerId);

      // 开始监控DOM变化
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'disabled', 'hidden']
      });

      // 设置超时
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.cleanupObserver(observerId);
          this.log(`⚠️ 智能等待元素超时: ${selector}`);
          resolve(null);
        }
      }, timeout);
    });
  }

  /**
   * 智能页面就绪检测 - 统一实现
   * @param {string} pageType - 页面类型
   * @param {Function} readyChecker - 页面就绪检查函数
   * @param {number} maxWaitTime - 最大等待时间
   * @returns {Promise<boolean>} - 页面是否就绪
   */
  async waitForPageReady(pageType, readyChecker, maxWaitTime = 5000) {
    this.log(`🔍 开始智能页面就绪检测 (${pageType})`);
    
    return new Promise((resolve) => {
      let resolved = false;
      const observerId = `page-ready-${pageType}-${Date.now()}`;
      
      const checkReady = () => {
        if (resolved) return false;
        
        try {
          if (readyChecker()) {
            resolved = true;
            this.log(`✅ 页面就绪检测成功 (${pageType})`);
            this.cleanupObserver(observerId);
            resolve(true);
            return true;
          }
        } catch (error) {
          this.log('页面就绪检测出错:', error.message);
        }
        return false;
      };
      
      // 立即检查一次
      if (checkReady()) return;
      
      // 创建MutationObserver
      const observer = this.createObserver(() => {
        if (!resolved) {
          checkReady();
        }
      }, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'placeholder', 'contenteditable']
      }, observerId);
      
      // 开始监控DOM变化
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'placeholder', 'contenteditable']
      });
      
      // 设置超时
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.cleanupObserver(observerId);
          this.log(`⚠️ 页面就绪检测超时 (${pageType})`);
          resolve(false);
        }
      }, maxWaitTime);
    });
  }

  /**
   * 智能按钮查找 - 统一实现
   * @param {Function} buttonFinder - 按钮查找函数
   * @param {number} maxWaitTime - 最大等待时间
   * @param {string} description - 操作描述
   * @returns {Promise<HTMLElement|null>} - 找到的按钮元素
   */
  async findButtonOptimized(buttonFinder, maxWaitTime = 3000, description = '按钮') {
    this.log(`🔍 开始MutationObserver优化查找${description}...`);
    
    // 策略1: 直接查找（最快）
    let button = buttonFinder();
    if (button) {
      this.log(`✅ 直接找到${description}`);
      return button;
    }

    // 策略2: 使用MutationObserver实时监控
    return new Promise((resolve) => {
      let resolved = false;
      const observerId = `button-find-${Date.now()}`;

      const checkButton = () => {
        if (resolved) return;

        const button = buttonFinder();
        if (button) {
          resolved = true;
          this.log(`✅ MutationObserver找到${description}`);
          this.cleanupObserver(observerId);
          resolve(button);
          return;
        }
      };

      // 创建MutationObserver
      const observer = this.createObserver(() => {
        if (!resolved) {
          checkButton();
        }
      }, {}, observerId);

      // 开始监控DOM变化
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'disabled', 'href']
      });

      // 每100ms检查一次（高频检查）
      const intervalId = setInterval(() => {
        if (!resolved) {
          checkButton();
        }
      }, 100);

      // 设置超时
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          clearInterval(intervalId);
          this.cleanupObserver(observerId);
          this.log(`⚠️ MutationObserver查找${description}超时`);
          resolve(null);
        }
      }, maxWaitTime);
    });
  }

  /**
   * 检查元素是否可见
   * @param {HTMLElement} element - 要检查的元素
   * @returns {boolean} - 元素是否可见
   */
  isElementVisible(element) {
    return element.offsetParent !== null && 
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  /**
   * 清理指定的Observer
   * @param {string} observerId - Observer标识符
   */
  cleanupObserver(observerId) {
    const observer = this.activeObservers.get(observerId);
    if (observer) {
      observer.disconnect();
      this.activeObservers.delete(observerId);
    }
  }

  /**
   * 清理所有活跃的Observer
   */
  cleanupAllObservers() {
    this.activeObservers.forEach((observer, id) => {
      observer.disconnect();
    });
    this.activeObservers.clear();
    this.log('🧹 已清理所有MutationObserver');
  }

  /**
   * 获取性能报告
   * @returns {Object} - 性能统计信息
   */
  getPerformanceReport() {
    const totalTime = this.performanceLog.reduce((sum, entry) => sum + entry.duration, 0);
    const successCount = this.performanceLog.filter(entry => entry.success).length;
    const successRate = this.performanceLog.length > 0 ? 
                       (successCount / this.performanceLog.length * 100).toFixed(1) : 0;

    return {
      platform: this.platform,
      totalTime,
      successRate,
      operationCount: this.performanceLog.length,
      averageTime: this.performanceLog.length > 0 ? 
                   (totalTime / this.performanceLog.length).toFixed(1) : 0,
      log: this.performanceLog
    };
  }

  /**
   * 日志方法 - 需要在子类中实现
   * @param {...any} args - 日志参数
   */
  log(...args) {
    console.log(`[${this.platform.toUpperCase()}]`, ...args);
  }
}

// 导出基础类
if (typeof window !== 'undefined') {
  window.MutationObserverBase = MutationObserverBase;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MutationObserverBase;
}
