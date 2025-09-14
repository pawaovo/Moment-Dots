/**
 * 统一日志管理工具
 * 
 * 功能：
 * - 统一的日志格式
 * - 可配置的日志级别
 * - 生产环境日志控制
 * 
 * @author MomentDots Team
 * @version 1.0.0
 */

class Logger {
  constructor(context = 'MomentDots') {
    this.context = context;
    this.isDevelopment = this.checkDevelopmentMode();
    this.logLevel = this.isDevelopment ? 'debug' : 'info';
  }

  /**
   * 检查是否为开发模式
   * @returns {boolean}
   */
  checkDevelopmentMode() {
    // 在Chrome扩展程序中，可以通过manifest检查
    try {
      return chrome.runtime.getManifest().version.includes('dev') || 
             chrome.runtime.getManifest().version_name?.includes('dev') ||
             false; // 默认为生产模式
    } catch {
      return false;
    }
  }

  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {string} message - 消息
   * @param {any} data - 附加数据
   * @returns {Array} 格式化后的参数
   */
  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.context}] [${level.toUpperCase()}]`;
    
    if (data !== undefined) {
      return [prefix, message, data];
    }
    return [prefix, message];
  }

  /**
   * 调试日志
   * @param {string} message 
   * @param {any} data 
   */
  debug(message, data) {
    if (this.isDevelopment) {
      console.debug(...this.formatMessage('debug', message, data));
    }
  }

  /**
   * 信息日志
   * @param {string} message 
   * @param {any} data 
   */
  info(message, data) {
    console.info(...this.formatMessage('info', message, data));
  }

  /**
   * 警告日志
   * @param {string} message 
   * @param {any} data 
   */
  warn(message, data) {
    console.warn(...this.formatMessage('warn', message, data));
  }

  /**
   * 错误日志
   * @param {string} message 
   * @param {any} data 
   */
  error(message, data) {
    console.error(...this.formatMessage('error', message, data));
  }

  /**
   * 成功日志（开发模式）
   * @param {string} message 
   * @param {any} data 
   */
  success(message, data) {
    if (this.isDevelopment) {
      console.log(...this.formatMessage('success', `✅ ${message}`, data));
    }
  }

  /**
   * 性能日志
   * @param {string} operation - 操作名称
   * @param {number} startTime - 开始时间
   * @param {any} data - 附加数据
   */
  performance(operation, startTime, data) {
    if (this.isDevelopment) {
      const duration = performance.now() - startTime;
      this.debug(`Performance: ${operation} took ${duration.toFixed(2)}ms`, data);
    }
  }

  /**
   * 创建子日志器
   * @param {string} subContext - 子上下文
   * @returns {Logger}
   */
  createChild(subContext) {
    return new Logger(`${this.context}:${subContext}`);
  }
}

// 创建全局日志器实例
const logger = new Logger();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Logger, logger };
} else if (typeof window !== 'undefined') {
  window.Logger = Logger;
  window.logger = logger;
}
