/**
 * 基类加载器 - 统一的基类加载检查工具
 * 消除各平台适配器中重复的基类检查代码
 */

class BaseClassLoader {
  /**
   * 检查公共基类是否已加载
   * @param {string} platform - 平台名称（用于日志）
   * @param {number} maxRetries - 最大重试次数
   * @param {number} checkInterval - 检查间隔（毫秒）
   * @returns {Promise<boolean>} - 是否加载成功
   */
  static async checkBaseClasses(platform = 'unknown', maxRetries = 10, checkInterval = 100) {
    let retries = 0;

    return new Promise((resolve, reject) => {
      const checkIntervalId = setInterval(() => {
        // 检查所有必需的基类
        const requiredClasses = [
          'MutationObserverBase',
          'BaseConfigManager',
          'PlatformAdapter',
          'PlatformConfigBase',
          'FileProcessorBase'
        ];

        const missingClasses = requiredClasses.filter(className =>
          typeof window[className] === 'undefined'
        );

        if (missingClasses.length === 0) {
          clearInterval(checkIntervalId);
          console.log(`✅ ${platform}平台公共基类加载成功`);
          resolve(true);
        } else if (retries >= maxRetries) {
          clearInterval(checkIntervalId);
          console.error(`❌ ${platform}平台公共基类加载失败，缺少: ${missingClasses.join(', ')}`);
          reject(new Error(`${platform}平台公共基类加载超时，缺少: ${missingClasses.join(', ')}`));
        } else {
          retries++;
          console.log(`⏳ ${platform}平台等待公共基类加载... (${retries}/${maxRetries})，缺少: ${missingClasses.join(', ')}`);
        }
      }, checkInterval);
    });
  }

  /**
   * 检查单个基类是否已加载
   * @param {string} className - 基类名称
   * @returns {boolean} - 是否已加载
   */
  static isBaseClassLoaded(className) {
    return typeof window[className] !== 'undefined';
  }

  /**
   * 获取基类加载状态报告
   * @returns {Object} - 加载状态报告
   */
  static getLoadingStatus() {
    return {
      MutationObserverBase: this.isBaseClassLoaded('MutationObserverBase'),
      BaseConfigManager: this.isBaseClassLoaded('BaseConfigManager'),
      PlatformAdapter: this.isBaseClassLoaded('PlatformAdapter'),
      PlatformConfigBase: this.isBaseClassLoaded('PlatformConfigBase'),
      FileProcessorBase: this.isBaseClassLoaded('FileProcessorBase'),
      timestamp: new Date().toISOString()
    };
  }
}

// 全局暴露
window.BaseClassLoader = BaseClassLoader;

console.log('BaseClassLoader 加载完成');
