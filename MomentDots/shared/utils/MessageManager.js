/**
 * 消息管理器 - 统一处理Chrome扩展的消息传递
 * 提供重试机制、错误处理和日志记录
 */

class MessageManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 2;
    this.retryDelay = options.retryDelay || 1000;
    this.enableLogging = options.enableLogging !== false;
  }

  /**
   * 发送消息到后台脚本
   * @param {Object} message - 消息对象
   * @param {Object} options - 发送选项
   * @returns {Promise} 发送结果
   */
  async sendMessage(message, options = {}) {
    const { 
      retries = this.maxRetries, 
      silent = false,
      timeout = 5000 
    } = options;

    if (this.enableLogging && !silent) {
      console.log('📤 发送消息:', message);
    }

    try {
      // 添加超时控制
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('消息发送超时')), timeout);
      });

      const sendPromise = chrome.runtime.sendMessage(message);
      const response = await Promise.race([sendPromise, timeoutPromise]);

      if (this.enableLogging && !silent) {
        console.log('✅ 消息发送成功:', response);
      }

      return { success: true, data: response };

    } catch (error) {
      if (retries > 0) {
        if (this.enableLogging && !silent) {
          console.log(`⚠️ 消息发送失败，${this.retryDelay}ms后重试 (剩余${retries}次):`, error.message);
        }

        // 延迟后重试
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.sendMessage(message, { ...options, retries: retries - 1 });
      }

      if (this.enableLogging && !silent) {
        console.error('❌ 消息发送最终失败:', error);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * 发送状态更新消息
   * @param {string} platformId - 平台ID
   * @param {string} status - 状态
   * @param {string} message - 状态消息
   * @returns {Promise} 发送结果
   */
  async sendStatusUpdate(platformId, status, message) {
    return this.sendMessage({
      action: 'updatePlatformOptimizationStatus',
      platformId,
      status,
      message,
      timestamp: Date.now()
    }, { silent: true }); // 状态更新消息不需要详细日志
  }

  /**
   * 批量发送消息
   * @param {Array} messages - 消息数组
   * @param {Object} options - 发送选项
   * @returns {Promise<Array>} 发送结果数组
   */
  async sendBatchMessages(messages, options = {}) {
    const { concurrent = false } = options;

    if (concurrent) {
      // 并发发送
      const promises = messages.map(msg => this.sendMessage(msg, options));
      return Promise.allSettled(promises);
    } else {
      // 顺序发送
      const results = [];
      for (const message of messages) {
        const result = await this.sendMessage(message, options);
        results.push(result);
        
        // 如果不是静默模式且发送失败，可以选择中断
        if (!result.success && !options.continueOnError) {
          break;
        }
      }
      return results;
    }
  }

  /**
   * 设置消息监听器
   * @param {Function} handler - 消息处理函数
   * @param {Object} options - 监听选项
   */
  setupMessageListener(handler, options = {}) {
    const { enableLogging = this.enableLogging } = options;

    const wrappedHandler = (message, sender, sendResponse) => {
      if (enableLogging) {
        console.log('📨 收到消息:', message);
      }

      try {
        const result = handler(message, sender, sendResponse);
        
        // 如果处理函数返回Promise，等待其完成
        if (result && typeof result.then === 'function') {
          result
            .then(response => {
              if (enableLogging) {
                console.log('✅ 消息处理完成:', response);
              }
              sendResponse(response);
            })
            .catch(error => {
              if (enableLogging) {
                console.error('❌ 消息处理失败:', error);
              }
              sendResponse({ success: false, error: error.message });
            });
          return true; // 保持消息通道开放
        }

        return result;
      } catch (error) {
        if (enableLogging) {
          console.error('❌ 消息处理异常:', error);
        }
        sendResponse({ success: false, error: error.message });
        return false;
      }
    };

    chrome.runtime.onMessage.addListener(wrappedHandler);
    
    if (enableLogging) {
      console.log('📡 消息监听器已设置');
    }
  }
}

// 创建默认实例
const defaultMessageManager = new MessageManager();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MessageManager, defaultMessageManager };
} else if (typeof window !== 'undefined') {
  window.MessageManager = MessageManager;
  window.messageManager = defaultMessageManager;
}
