/**
 * 平台Logo缓存管理器
 * 负责缓存平台logo图标，确保离线状态下也能正常显示
 */

class LogoCacheManager {
  constructor(options = {}) {
    this.cacheKey = 'platform_logos_cache';
    this.cacheVersion = '2.0.0';
    this.maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7天
    this.concurrencyLimit = options.concurrencyLimit || 8; // 提升并发限制以支持更多平台
    this.enableLogging = options.enableLogging !== false; // 默认启用日志
    this.isExtensionEnvironment = this.detectExtensionEnvironment();

    // 内存缓存层
    this.memoryCache = new Map();
    this.memoryCacheTimeout = 5 * 60 * 1000; // 5分钟内存缓存

    if (this.enableLogging) {
      console.log(`LogoCacheManager initialized in ${this.isExtensionEnvironment ? 'extension' : 'standalone'} mode`);
    }
  }

  /**
   * 检测是否在Chrome扩展环境中
   * @returns {boolean} 是否在扩展环境中
   */
  detectExtensionEnvironment() {
    return typeof chrome !== 'undefined' &&
           chrome.runtime &&
           chrome.runtime.id &&
           typeof chrome.storage !== 'undefined';
  }

  /**
   * 受控的日志输出
   * @param {string} level - 日志级别 (log, warn, error)
   * @param {...any} args - 日志参数
   */
  log(level, ...args) {
    if (this.enableLogging && console[level]) {
      console[level](...args);
    }
  }

  /**
   * 获取内存缓存
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值
   */
  getMemoryCache(key) {
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.memoryCacheTimeout) {
      return cached.data;
    }
    this.memoryCache.delete(key);
    return null;
  }

  /**
   * 设置内存缓存
   * @param {string} key - 缓存键
   * @param {any} data - 缓存数据
   */
  setMemoryCache(key, data) {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 初始化logo缓存
   * @param {Array} platforms - 平台配置数组
   */
  async initializeCache(platforms) {
    this.log('log', 'Initializing platform logo cache...');

    try {
      // 检查内存缓存
      const memoryCached = this.getMemoryCache('logos');
      if (memoryCached) {
        this.log('log', 'Using memory cached logos');
        return;
      }

      const cachedLogos = await this.getCachedLogos();
      const needsUpdate = this.shouldUpdateCache(cachedLogos);

      if (needsUpdate) {
        await this.updateLogoCache(platforms);
      } else {
        // 将有效缓存存入内存
        this.setMemoryCache('logos', cachedLogos);
      }

      // 预加载所有logo图片（静默执行，不阻塞初始化）
      this.preloadLogos(platforms).catch(error =>
        this.log('warn', 'Logo preload failed:', error)
      );

      this.log('log', 'Platform logo cache initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize logo cache:', error);
    }
  }

  /**
   * 检查是否需要更新缓存
   * @param {Object} cachedLogos - 缓存的logo数据
   * @returns {boolean} 是否需要更新
   */
  shouldUpdateCache(cachedLogos) {
    if (!cachedLogos || !cachedLogos.timestamp) {
      return true;
    }
    
    const now = Date.now();
    const cacheAge = now - cachedLogos.timestamp;
    
    return cacheAge > this.maxCacheAge || cachedLogos.version !== this.cacheVersion;
  }

  /**
   * 更新logo缓存
   * @param {Array} platforms - 平台配置数组
   */
  async updateLogoCache(platforms) {
    this.log('log', 'Updating platform logo cache...');

    const logoCache = {
      version: this.cacheVersion,
      timestamp: Date.now(),
      logos: {}
    };

    // 使用配置的并发限制
    const results = await this.processPlatformsWithConcurrencyLimit(platforms, this.concurrencyLimit);

    // 整理结果
    results.forEach((result, index) => {
      const platform = platforms[index];
      if (result.success) {
        logoCache.logos[platform.id] = result.data;
      } else {
        this.log('warn', `Failed to cache logo for ${platform.name}:`, result.error);
        // 使用备用方案
        logoCache.logos[platform.id] = {
          url: platform.logoUrl,
          fallbackColor: platform.color,
          cached: false,
          error: result.error.message,
          timestamp: Date.now()
        };
      }
    });

    // 保存到本地存储和内存缓存
    await this.saveCacheToStorage(logoCache);
    this.setMemoryCache('logos', logoCache);

    const successCount = results.filter(r => r.success).length;
    this.log('log', `Platform logo cache updated successfully: ${successCount}/${platforms.length} logos cached`);
  }

  /**
   * 限制并发数量处理平台logo
   * @param {Array} platforms - 平台配置数组
   * @param {number} limit - 并发限制
   * @returns {Promise<Array>} 处理结果数组
   */
  async processPlatformsWithConcurrencyLimit(platforms, limit) {
    const results = [];

    for (let i = 0; i < platforms.length; i += limit) {
      const batch = platforms.slice(i, i + limit);
      const batchPromises = batch.map(async (platform) => {
        try {
          const logoData = await this.fetchAndCacheLogoWithRetry(platform);
          return { success: true, data: logoData };
        } catch (error) {
          return { success: false, error };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 带重试机制的logo获取
   * @param {Object} platform - 平台配置
   * @param {number} maxRetries - 最大重试次数
   * @returns {Object} logo数据
   */
  async fetchAndCacheLogoWithRetry(platform, maxRetries = 2) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.log('log', `Retrying logo fetch for ${platform.name} (attempt ${attempt + 1}/${maxRetries + 1})`);
          // 重试前等待一段时间，使用指数退避
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 1), 5000)));
        }

        return await this.fetchAndCacheLogo(platform);
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries) {
          this.log('warn', `All attempts failed for ${platform.name}:`, error.message);
        }
      }
    }

    throw lastError;
  }

  /**
   * 获取并缓存单个logo
   * @param {Object} platform - 平台配置
   * @returns {Object} logo数据
   */
  async fetchAndCacheLogo(platform) {
    if (this.isExtensionEnvironment) {
      return this.fetchLogoWithExtensionAPI(platform);
    } else {
      return this.fetchLogoWithImageAPI(platform);
    }
  }

  /**
   * 使用Chrome扩展API获取logo（绕过CORS限制）
   * @param {Object} platform - 平台配置
   * @returns {Object} logo数据
   */
  async fetchLogoWithExtensionAPI(platform) {
    try {
      // 使用fetch API获取图片数据
      const response = await fetch(platform.logoUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 获取图片blob
      const blob = await response.blob();

      // 将blob转换为base64
      const base64Data = await this.blobToBase64(blob);

      return {
        url: platform.logoUrl,
        base64: base64Data,
        fallbackColor: platform.color,
        cached: true,
        timestamp: Date.now()
      };
    } catch (error) {
      this.log('warn', `Failed to fetch logo for ${platform.name} with extension API:`, error);
      throw error;
    }
  }

  /**
   * 使用传统Image API获取logo（用于非扩展环境）
   * @param {Object} platform - 平台配置
   * @returns {Object} logo数据
   */
  async fetchLogoWithImageAPI(platform) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        reject(new Error('Logo fetch timeout'));
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);

        try {
          // 将图片转换为base64
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const base64Data = canvas.toDataURL('image/png');

          resolve({
            url: platform.logoUrl,
            base64: base64Data,
            fallbackColor: platform.color,
            cached: true,
            timestamp: Date.now()
          });
        } catch (canvasError) {
          this.log('warn', `Canvas operation failed for ${platform.name}:`, canvasError);
          // 降级到仅URL缓存
          resolve({
            url: platform.logoUrl,
            fallbackColor: platform.color,
            cached: false,
            timestamp: Date.now()
          });
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load logo'));
      };

      // 在非扩展环境下不设置crossOrigin，避免CORS问题
      img.src = platform.logoUrl;
    });
  }

  /**
   * 将Blob转换为Base64
   * @param {Blob} blob - 图片blob
   * @returns {Promise<string>} base64字符串
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 预加载所有logo图片
   * @param {Array} platforms - 平台配置数组
   */
  async preloadLogos(platforms) {
    const preloadPromises = platforms.map(platform => {
      return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
          resolve(); // 超时也继续
        }, 3000);

        img.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(); // 即使失败也继续
        };
        img.src = platform.logoUrl;
      });
    });

    await Promise.all(preloadPromises);
    this.log('log', 'All platform logos preloaded');
  }

  /**
   * 获取缓存的logo数据
   * @returns {Object|null} 缓存的logo数据
   */
  async getCachedLogos() {
    try {
      // 优先检查内存缓存
      const memoryCached = this.getMemoryCache('logos');
      if (memoryCached) {
        return memoryCached;
      }

      // 检查是否在扩展环境中
      let cached = null;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(this.cacheKey);
        cached = result[this.cacheKey] || null;
      } else {
        // 降级到localStorage
        const cachedStr = localStorage.getItem(this.cacheKey);
        cached = cachedStr ? JSON.parse(cachedStr) : null;
      }

      // 将有效缓存存入内存
      if (cached) {
        this.setMemoryCache('logos', cached);
      }

      return cached;
    } catch (error) {
      this.log('error', 'Failed to get cached logos:', error);
      return null;
    }
  }

  /**
   * 保存缓存到存储
   * @param {Object} cacheData - 要保存的缓存数据
   */
  async saveCacheToStorage(cacheData) {
    try {
      // 检查是否在扩展环境中
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({
          [this.cacheKey]: cacheData
        });
      } else {
        // 降级到localStorage
        localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error('Failed to save logo cache:', error);
    }
  }

  /**
   * 获取平台logo的最佳显示方案
   * @param {string} platformId - 平台ID
   * @returns {Object} logo显示配置
   */
  async getLogoDisplayConfig(platformId) {
    const cachedLogos = await this.getCachedLogos();
    
    if (cachedLogos && cachedLogos.logos && cachedLogos.logos[platformId]) {
      const logoData = cachedLogos.logos[platformId];
      
      if (logoData.cached && logoData.base64) {
        return {
          type: 'base64',
          src: logoData.base64,
          fallback: logoData.fallbackColor
        };
      }
    }

    // 降级到远程URL
    const platform = SUPPORTED_PLATFORMS.find(p => p.id === platformId);
    return {
      type: 'url',
      src: platform ? platform.logoUrl : '',
      fallback: platform ? platform.color : 'bg-gray-500'
    };
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpiredCache() {
    const cachedLogos = await this.getCachedLogos();

    if (this.shouldUpdateCache(cachedLogos)) {
      try {
        // 清理内存缓存
        this.memoryCache.clear();

        // 检查是否在扩展环境中
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.remove(this.cacheKey);
        } else {
          // 降级到localStorage
          localStorage.removeItem(this.cacheKey);
        }
        this.log('log', 'Expired logo cache cleaned up');
      } catch (error) {
        this.log('error', 'Failed to cleanup expired cache:', error);
      }
    }
  }
}

// 创建全局实例
window.LogoCacheManager = LogoCacheManager;

// 导出到全局作用域
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LogoCacheManager;
}

// LogoCacheManager loaded successfully
