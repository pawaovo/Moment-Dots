/**
 * 发布管理器
 * 统一管理多平台内容发布
 */

import { PlatformAdapterFactory } from '../adapters/PlatformAdapter.js';

export class PublishManager {
  constructor() {
    this.adapters = new Map();
    this.publishHistory = [];
    this.setupAdapters();
  }

  /**
   * 初始化平台适配器
   */
  setupAdapters() {
    const platforms = PlatformAdapterFactory.getSupportedPlatforms();
    platforms.forEach(platform => {
      try {
        const adapter = PlatformAdapterFactory.create(platform);
        this.adapters.set(platform, adapter);
      } catch (error) {
        console.error(`初始化 ${platform} 适配器失败:`, error);
      }
    });
  }

  /**
   * 发布到单个平台
   * @param {string} platform - 平台名称
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>} - 发布结果
   */
  async publishToSinglePlatform(platform, data) {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      return {
        success: false,
        platform,
        error: `不支持的平台: ${platform}`
      };
    }

    const startTime = Date.now();
    
    try {
      const result = await adapter.publishContent(data);
      const duration = Date.now() - startTime;
      
      this.recordPublish({
        platform,
        success: result.success,
        duration,
        error: result.error || null,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.recordPublish({
        platform,
        success: false,
        duration,
        error: error.message,
        timestamp: Date.now()
      });
      
      return {
        success: false,
        platform,
        error: error.message
      };
    }
  }

  /**
   * 发布到多个平台
   * @param {string[]} platforms - 平台列表
   * @param {Object} data - 发布数据
   * @param {Object} options - 发布选项
   * @returns {Promise<Object>} - 发布结果汇总
   */
  async publishToMultiplePlatforms(platforms, data, options = {}) {
    const { 
      concurrent = false,  // 是否并发发布
      stopOnError = false  // 遇到错误是否停止
    } = options;

    const results = {};
    const startTime = Date.now();

    if (concurrent) {
      // 并发发布
      const promises = platforms.map(platform => 
        this.publishToSinglePlatform(platform, data)
      );
      
      const platformResults = await Promise.allSettled(promises);
      
      platforms.forEach((platform, index) => {
        const result = platformResults[index];
        if (result.status === 'fulfilled') {
          results[platform] = result.value;
        } else {
          results[platform] = {
            success: false,
            platform,
            error: result.reason.message
          };
        }
      });
    } else {
      // 顺序发布
      for (const platform of platforms) {
        const result = await this.publishToSinglePlatform(platform, data);
        results[platform] = result;
        
        if (!result.success && stopOnError) {
          break;
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = Object.values(results).filter(r => r.success).length;
    
    return {
      success: successCount > 0,
      totalPlatforms: platforms.length,
      successCount,
      failureCount: platforms.length - successCount,
      duration: totalDuration,
      results
    };
  }

  /**
   * 智能发布 - 根据内容类型自动选择合适的平台
   * @param {Object} data - 发布数据
   * @param {Object} preferences - 用户偏好
   * @returns {Promise<Object>} - 发布结果
   */
  async smartPublish(data, preferences = {}) {
    const { content, files, title } = data;
    const { 
      preferredPlatforms = [],
      contentType = 'auto',
      maxPlatforms = 3
    } = preferences;

    // 根据内容特征推荐平台
    const recommendedPlatforms = this.recommendPlatforms(data, contentType);
    
    // 合并用户偏好和推荐结果
    const targetPlatforms = this.mergePlatformLists(
      preferredPlatforms,
      recommendedPlatforms,
      maxPlatforms
    );

    console.log('智能发布推荐平台:', targetPlatforms);
    
    return this.publishToMultiplePlatforms(targetPlatforms, data, {
      concurrent: true
    });
  }

  /**
   * 根据内容特征推荐平台
   * @param {Object} data - 发布数据
   * @param {string} contentType - 内容类型
   * @returns {string[]} - 推荐的平台列表
   */
  recommendPlatforms(data, contentType) {
    const { content, files, title } = data;
    const platforms = [];

    // 基于内容长度推荐
    if (content) {
      if (content.length <= 140) {
        platforms.push('weibo'); // 微博适合短内容
      }
      if (content.length <= 500) {
        platforms.push('jike'); // 即刻适合中等长度内容
      }
      if (content.length <= 1000) {
        platforms.push('douyin'); // 抖音支持较长内容
      }
    }

    // 基于文件类型推荐
    if (files && files.length > 0) {
      const hasImages = files.some(file => file.type.startsWith('image/'));
      if (hasImages) {
        platforms.push('xiaohongshu'); // 小红书适合图文内容
        platforms.push('douyin'); // 抖音支持图文
      }
    }

    // 基于标题推荐
    if (title) {
      platforms.push('douyin'); // 抖音支持标题
      platforms.push('xiaohongshu'); // 小红书支持标题
    }

    // 去重并返回
    return [...new Set(platforms)];
  }

  /**
   * 合并平台列表
   * @param {string[]} preferred - 用户偏好平台
   * @param {string[]} recommended - 推荐平台
   * @param {number} maxCount - 最大平台数量
   * @returns {string[]} - 最终平台列表
   */
  mergePlatformLists(preferred, recommended, maxCount) {
    const merged = [...new Set([...preferred, ...recommended])];
    return merged.slice(0, maxCount);
  }

  /**
   * 记录发布历史
   * @param {Object} record - 发布记录
   */
  recordPublish(record) {
    this.publishHistory.push(record);
    
    // 保持历史记录在合理范围内
    if (this.publishHistory.length > 1000) {
      this.publishHistory = this.publishHistory.slice(-500);
    }
  }

  /**
   * 获取发布统计信息
   * @param {number} days - 统计天数
   * @returns {Object} - 统计信息
   */
  getPublishStats(days = 7) {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentHistory = this.publishHistory.filter(
      record => record.timestamp > cutoffTime
    );

    const stats = {
      totalPublishes: recentHistory.length,
      successfulPublishes: recentHistory.filter(r => r.success).length,
      failedPublishes: recentHistory.filter(r => !r.success).length,
      platformStats: {},
      averageDuration: 0
    };

    // 计算成功率
    stats.successRate = stats.totalPublishes > 0 
      ? (stats.successfulPublishes / stats.totalPublishes * 100).toFixed(2) + '%'
      : '0%';

    // 计算平均耗时
    if (recentHistory.length > 0) {
      const totalDuration = recentHistory.reduce((sum, r) => sum + r.duration, 0);
      stats.averageDuration = Math.round(totalDuration / recentHistory.length);
    }

    // 按平台统计
    recentHistory.forEach(record => {
      const platform = record.platform;
      if (!stats.platformStats[platform]) {
        stats.platformStats[platform] = {
          total: 0,
          successful: 0,
          failed: 0,
          successRate: '0%'
        };
      }
      
      stats.platformStats[platform].total++;
      if (record.success) {
        stats.platformStats[platform].successful++;
      } else {
        stats.platformStats[platform].failed++;
      }
      
      const platformStat = stats.platformStats[platform];
      platformStat.successRate = platformStat.total > 0
        ? (platformStat.successful / platformStat.total * 100).toFixed(2) + '%'
        : '0%';
    });

    return stats;
  }

  /**
   * 获取支持的平台列表
   * @returns {string[]} - 平台列表
   */
  getSupportedPlatforms() {
    return Array.from(this.adapters.keys());
  }

  /**
   * 检查平台是否可用
   * @param {string} platform - 平台名称
   * @returns {boolean} - 是否可用
   */
  isPlatformAvailable(platform) {
    return this.adapters.has(platform);
  }

  /**
   * 获取平台适配器
   * @param {string} platform - 平台名称
   * @returns {Object|null} - 平台适配器
   */
  getPlatformAdapter(platform) {
    return this.adapters.get(platform) || null;
  }

  /**
   * 清理发布历史
   * @param {number} keepDays - 保留天数
   */
  cleanupHistory(keepDays = 30) {
    const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
    this.publishHistory = this.publishHistory.filter(
      record => record.timestamp > cutoffTime
    );
  }
}

// 创建全局发布管理器实例
export const publishManager = new PublishManager();

// 便捷方法
export const publishToSingle = (platform, data) => 
  publishManager.publishToSinglePlatform(platform, data);

export const publishToMultiple = (platforms, data, options) => 
  publishManager.publishToMultiplePlatforms(platforms, data, options);

export const smartPublish = (data, preferences) => 
  publishManager.smartPublish(data, preferences);

export const getPublishStats = (days) => 
  publishManager.getPublishStats(days);
