/**
 * 统一平台配置基类 - 消除即刻和微博配置管理器中的重复代码
 * 提供通用的配置加载、合并和管理功能
 */

class PlatformConfigBase extends BaseConfigManager {
  constructor(platform) {
    super(platform);
    this.platform = platform;
  }

  /**
   * 统一的配置加载模式
   * @param {Object} platformSpecificConfig - 平台特定配置
   * @returns {Object} 合并后的配置对象
   */
  loadPlatformConfig(platformSpecificConfig) {
    const baseConfig = super.loadConfig();
    return this.mergeConfig(baseConfig, platformSpecificConfig);
  }

  /**
   * 创建标准的延迟配置
   * @param {Object} overrides - 覆盖的延迟配置
   * @returns {Object} 延迟配置对象
   */
  createDelayConfig(overrides = {}) {
    const defaultDelays = {
      FAST_CHECK: 100,
      NORMAL_WAIT: 300,
      UPLOAD_WAIT: 1000,
      ELEMENT_WAIT: 2000
    };
    return { ...defaultDelays, ...overrides };
  }

  /**
   * 创建标准的限制配置
   * @param {Object} overrides - 覆盖的限制配置
   * @returns {Object} 限制配置对象
   */
  createLimitsConfig(overrides = {}) {
    const defaultLimits = {
      maxContentLength: 1000,
      maxMediaFiles: 9, // 媒体文件总数限制（图片+视频）
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/webm']
    };
    return { ...defaultLimits, ...overrides };
  }

  /**
   * 创建标准的性能配置
   * @param {Object} overrides - 覆盖的性能配置
   * @returns {Object} 性能配置对象
   */
  createPerformanceConfig(overrides = {}) {
    const defaultPerformance = {
      cacheTimeout: 3000,
      elementWaitTimeout: 2000,
      mutationObserverTimeout: 3000,
      highFrequencyCheck: 100,
      enablePerformanceMonitoring: true,
      enableMutationObserver: true
    };
    return { ...defaultPerformance, ...overrides };
  }

  /**
   * 创建标准的选择器配置
   * @param {Object} selectors - 平台特定选择器
   * @returns {Object} 选择器配置对象
   */
  createSelectorsConfig(selectors) {
    // 提供默认的备用选择器
    const defaultSelectors = {
      editorFallback: '[contenteditable="true"]',
      fileInputFallback: 'input[type="file"]',
      sendButtonFallback: 'button[type="submit"]'
    };
    return { ...defaultSelectors, ...selectors };
  }

  /**
   * 获取平台特定的选择器配置
   * 子类必须实现此方法
   */
  getPlatformSelectors() {
    throw new Error('子类必须实现 getPlatformSelectors 方法');
  }

  /**
   * 统一的选择器获取方法
   */
  getSelectors() {
    const platformSelectors = this.getPlatformSelectors();
    return this.createSelectorsConfig(platformSelectors);
  }
}

// 导出到全局
window.PlatformConfigBase = PlatformConfigBase;
console.log('PlatformConfigBase loaded successfully');
