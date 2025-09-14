/**
 * 统一错误处理工具
 * 
 * 功能：
 * - 标准化错误类型
 * - 错误恢复策略
 * - 用户友好的错误消息
 * 
 * @author MomentDots Team
 * @version 1.0.0
 */

// 错误类型定义
const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  BACKGROUND_SCRIPT_ERROR: 'BACKGROUND_SCRIPT_ERROR',
  PLATFORM_ERROR: 'PLATFORM_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// 用户友好的错误消息
const ErrorMessages = {
  [ErrorTypes.NETWORK_ERROR]: '网络连接失败，请检查网络后重试',
  [ErrorTypes.FILE_TOO_LARGE]: '文件过大，请选择较小的文件',
  [ErrorTypes.INVALID_FILE_TYPE]: '不支持的文件类型，请选择图片或视频文件',
  [ErrorTypes.STORAGE_QUOTA_EXCEEDED]: '存储空间不足，请清理后重试',
  [ErrorTypes.BACKGROUND_SCRIPT_ERROR]: '后台服务异常，请重新加载扩展程序',
  [ErrorTypes.PLATFORM_ERROR]: '平台操作失败，请稍后重试',
  [ErrorTypes.UNKNOWN_ERROR]: '未知错误，请重试或联系支持'
};

class MomentDotsError extends Error {
  constructor(type, message, originalError = null, context = {}) {
    super(message || ErrorMessages[type] || ErrorMessages[ErrorTypes.UNKNOWN_ERROR]);
    this.name = 'MomentDotsError';
    this.type = type;
    this.originalError = originalError;
    this.context = context;
    this.timestamp = Date.now();
  }

  /**
   * 获取用户友好的错误消息
   * @returns {string}
   */
  getUserMessage() {
    return ErrorMessages[this.type] || this.message;
  }

  /**
   * 获取详细的错误信息（用于日志）
   * @returns {Object}
   */
  getDetailedInfo() {
    return {
      type: this.type,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      originalError: this.originalError?.message,
      stack: this.stack
    };
  }
}

class ErrorHandler {
  constructor(logger = null) {
    this.logger = logger || (typeof window !== 'undefined' ? window.logger : null);
    this.retryStrategies = new Map();
    this.setupRetryStrategies();
  }

  /**
   * 设置重试策略
   */
  setupRetryStrategies() {
    this.retryStrategies.set(ErrorTypes.NETWORK_ERROR, {
      maxRetries: 3,
      delay: 1000,
      backoff: 2
    });

    this.retryStrategies.set(ErrorTypes.BACKGROUND_SCRIPT_ERROR, {
      maxRetries: 2,
      delay: 500,
      backoff: 1
    });
  }

  /**
   * 处理错误
   * @param {Error|MomentDotsError} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {MomentDotsError}
   */
  handle(error, context = {}) {
    let momentDotsError;

    if (error instanceof MomentDotsError) {
      momentDotsError = error;
    } else {
      // 将普通错误转换为MomentDotsError
      const errorType = this.classifyError(error);
      momentDotsError = new MomentDotsError(errorType, null, error, context);
    }

    // 记录错误日志
    if (this.logger) {
      this.logger.error('Error handled', momentDotsError.getDetailedInfo());
    }

    return momentDotsError;
  }

  /**
   * 分类错误类型
   * @param {Error} error - 原始错误
   * @returns {string} 错误类型
   */
  classifyError(error) {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorTypes.NETWORK_ERROR;
    }

    if (message.includes('quota') || message.includes('storage')) {
      return ErrorTypes.STORAGE_QUOTA_EXCEEDED;
    }

    if (message.includes('file') && message.includes('size')) {
      return ErrorTypes.FILE_TOO_LARGE;
    }

    if (message.includes('type') || message.includes('format')) {
      return ErrorTypes.INVALID_FILE_TYPE;
    }

    if (message.includes('background') || message.includes('runtime')) {
      return ErrorTypes.BACKGROUND_SCRIPT_ERROR;
    }

    return ErrorTypes.UNKNOWN_ERROR;
  }

  /**
   * 执行带重试的操作
   * @param {Function} operation - 要执行的操作
   * @param {string} errorType - 错误类型（用于确定重试策略）
   * @param {Object} context - 操作上下文
   * @returns {Promise<any>}
   */
  async executeWithRetry(operation, errorType = ErrorTypes.UNKNOWN_ERROR, context = {}) {
    const strategy = this.retryStrategies.get(errorType) || { maxRetries: 1, delay: 0, backoff: 1 };
    let lastError;

    for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = strategy.delay * Math.pow(strategy.backoff, attempt - 1);
          await this.sleep(delay);
          
          if (this.logger) {
            this.logger.debug(`Retrying operation, attempt ${attempt}/${strategy.maxRetries}`, context);
          }
        }

        return await operation();

      } catch (error) {
        lastError = error;
        
        if (attempt === strategy.maxRetries) {
          // 最后一次尝试失败
          throw this.handle(error, { ...context, attempts: attempt + 1 });
        }
      }
    }

    throw this.handle(lastError, context);
  }

  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 显示用户友好的错误通知
   * @param {MomentDotsError} error - 错误对象
   */
  showUserNotification(error) {
    const message = error.getUserMessage();
    
    // 如果有全局通知函数，使用它
    if (typeof window !== 'undefined' && typeof window.showNotification === 'function') {
      window.showNotification(message, 'error');
    } else {
      // 降级到console输出
      console.error('User Error:', message);
    }
  }
}

// 创建全局错误处理器实例
const errorHandler = new ErrorHandler();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorHandler, MomentDotsError, ErrorTypes, errorHandler };
} else if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
  window.MomentDotsError = MomentDotsError;
  window.ErrorTypes = ErrorTypes;
  window.errorHandler = errorHandler;
}
