/**
 * 基础配置管理器 - 统一的配置管理解决方案
 * 消除小红书和抖音平台适配器中的重复配置管理代码
 * 
 * 核心功能：
 * 1. 统一的配置结构和加载机制
 * 2. 平台特定配置的继承和覆盖
 * 3. 选择器、错误消息、错误分类的统一管理
 * 4. 配置验证和默认值处理
 */

class BaseConfigManager {
  constructor(platform) {
    this.platform = platform;
    this.config = this.loadConfig();
  }

  /**
   * 加载基础配置信息
   * 子类应该覆盖此方法来提供平台特定的配置
   * @returns {Object} 配置对象
   */
  loadConfig() {
    return {
      // 页面状态定义（通用）
      pageStates: {
        HOMEPAGE: 'homepage',
        UPLOAD_PAGE: 'upload_page',
        EDIT_PAGE: 'edit_page',
        VIDEO_UPLOAD_PAGE: 'video_upload_page',
        VIDEO_EDIT_PAGE: 'video_edit_page',
        UNKNOWN: 'unknown'
      },

      // 延迟时间配置（毫秒）- MutationObserver优化版本
      delays: {
        FAST_CHECK: 200,         // 快速检查
        NORMAL_WAIT: 500,        // 普通等待
        UPLOAD_WAIT: 1500,       // 上传等待
        ELEMENT_WAIT: 2000,      // 元素等待
        PAGE_LOAD_WAIT: 1000,    // 页面加载等待
        NAVIGATION_WAIT: 1500    // 导航等待
      },

      // 重试配置
      retries: {
        DEFAULT: 2,              // 默认重试次数
        UPLOAD: 3,               // 上传重试次数
        NAVIGATION: 2,           // 导航重试次数
        ELEMENT_FIND: 3          // 元素查找重试次数
      },

      // 平台限制（通用默认值）
      limits: {
        maxTitleLength: 100,
        maxContentLength: 2000,
        maxImages: 32,
        maxImageSize: 10485760,  // 10MB
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      },

      // 性能配置 - MutationObserver优化版本
      performance: {
        cacheTimeout: 3000,              // DOM缓存超时时间
        elementWaitTimeout: 1500,        // 元素等待超时时间
        mutationObserverTimeout: 3000,   // MutationObserver超时时间
        highFrequencyCheck: 50,          // 高频检查间隔（毫秒）
        enablePerformanceMonitoring: true,
        enableMutationObserver: true     // 启用MutationObserver优化
      }
    };
  }

  /**
   * 获取基础选择器配置
   * 子类应该覆盖此方法来提供平台特定的选择器
   * @returns {Object} 选择器对象
   */
  getSelectors() {
    return {
      // 通用选择器
      titleInput: [
        'input[placeholder*="标题"]',
        'input[placeholder*="title"]'
      ],
      
      contentEditor: [
        'div[contenteditable="true"]',
        'textarea[placeholder*="内容"]'
      ],
      
      imageUpload: [
        'input[type="file"]',
        '[class*="upload"]'
      ],
      
      publishButton: [
        'button[type="submit"]',
        '.publish-btn',
        '.publish-button'
      ],
      
      loginIndicators: [
        '.user-info',
        '.avatar',
        '.user-avatar'
      ]
    };
  }

  /**
   * 获取基础错误消息映射
   * 子类应该覆盖此方法来提供平台特定的错误消息
   * @returns {Object} 错误消息映射
   */
  getErrorMessages() {
    return {
      '未找到标题输入框': '页面未完全加载，请刷新页面后重试',
      '未找到内容编辑器': '内容编辑器未加载，请检查页面状态',
      '标题注入失败': '标题输入异常，请手动清空标题框后重试',
      '内容注入失败': '内容编辑器状态异常，请手动清空编辑器后重试',
      '标题验证失败': '标题可能未完全加载，请检查标题框内容',
      '内容验证失败': '内容可能未完全加载，请检查编辑器内容',
      '文件上传失败': '图片上传异常，请检查图片格式和大小',
      '未找到发布按钮': '发布按钮未找到，请检查页面状态',
      '发布按钮不可用': '发布按钮不可用，请检查内容是否符合要求',
      '请先登录平台': '请先登录对应平台账号'
    };
  }

  /**
   * 获取基础错误分类配置
   * 子类应该覆盖此方法来提供平台特定的错误分类
   * @returns {Object} 错误分类配置
   */
  getErrorCategories() {
    return {
      'NETWORK_ERROR': {
        keywords: ['网络', 'network', 'timeout', '超时', '连接'],
        severity: 'high',
        retryable: true,
        userMessage: '网络连接异常，请检查网络后重试'
      },
      'ELEMENT_NOT_FOUND': {
        keywords: ['未找到', 'not found', '元素', 'element'],
        severity: 'medium',
        retryable: true,
        userMessage: '页面元素未找到，请刷新页面后重试'
      },
      'PERMISSION_DENIED': {
        keywords: ['权限', 'permission', '登录', 'login', '认证'],
        severity: 'high',
        retryable: false,
        userMessage: '权限不足，请检查登录状态'
      },
      'VALIDATION_ERROR': {
        keywords: ['验证', 'validation', '格式', 'format', '长度'],
        severity: 'medium',
        retryable: false,
        userMessage: '内容格式不符合要求，请检查后重试'
      },
      'UPLOAD_ERROR': {
        keywords: ['上传', 'upload', '文件', 'file', '图片'],
        severity: 'medium',
        retryable: true,
        userMessage: '文件上传失败，请检查文件格式和大小'
      }
    };
  }

  /**
   * 合并配置 - 允许子类扩展或覆盖配置
   * @param {Object} baseConfig - 基础配置
   * @param {Object} platformConfig - 平台特定配置
   * @returns {Object} 合并后的配置
   */
  mergeConfig(baseConfig, platformConfig) {
    const merged = { ...baseConfig };
    
    for (const [key, value] of Object.entries(platformConfig)) {
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        merged[key] = { ...merged[key], ...value };
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  /**
   * 验证配置完整性
   * @param {Object} config - 要验证的配置
   * @returns {boolean} 配置是否有效
   */
  validateConfig(config) {
    const requiredKeys = ['pageStates', 'delays', 'retries', 'limits', 'performance'];
    
    for (const key of requiredKeys) {
      if (!config[key]) {
        console.warn(`配置缺少必需的键: ${key}`);
        return false;
      }
    }
    
    // 验证页面状态
    const requiredStates = ['HOMEPAGE', 'UPLOAD_PAGE', 'EDIT_PAGE', 'VIDEO_UPLOAD_PAGE', 'VIDEO_EDIT_PAGE', 'UNKNOWN'];
    for (const state of requiredStates) {
      if (!config.pageStates[state]) {
        console.warn(`页面状态配置缺少: ${state}`);
        return false;
      }
    }
    
    // 验证延迟配置
    const requiredDelays = ['FAST_CHECK', 'NORMAL_WAIT', 'UPLOAD_WAIT', 'ELEMENT_WAIT'];
    for (const delay of requiredDelays) {
      if (typeof config.delays[delay] !== 'number' || config.delays[delay] < 0) {
        console.warn(`延迟配置无效: ${delay}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * 获取平台特定的配置值
   * @param {string} path - 配置路径，如 'delays.FAST_CHECK'
   * @param {any} defaultValue - 默认值
   * @returns {any} 配置值
   */
  getConfigValue(path, defaultValue = null) {
    const keys = path.split('.');
    let current = this.config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  /**
   * 设置配置值
   * @param {string} path - 配置路径
   * @param {any} value - 要设置的值
   */
  setConfigValue(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * 获取性能优化配置
   * @returns {Object} 性能配置
   */
  getPerformanceConfig() {
    return {
      ...this.config.performance,
      platform: this.platform
    };
  }

  /**
   * 获取平台信息
   * @returns {Object} 平台信息
   */
  getPlatformInfo() {
    return {
      platform: this.platform,
      limits: this.config.limits,
      performance: this.config.performance,
      configVersion: '2.0.0'
    };
  }

  /**
   * 导出配置为JSON
   * @returns {string} JSON格式的配置
   */
  exportConfig() {
    return JSON.stringify({
      platform: this.platform,
      config: this.config,
      selectors: this.getSelectors(),
      errorMessages: this.getErrorMessages(),
      errorCategories: this.getErrorCategories(),
      exportTime: new Date().toISOString()
    }, null, 2);
  }
}

// 导出基础类
if (typeof window !== 'undefined') {
  window.BaseConfigManager = BaseConfigManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BaseConfigManager;
}
