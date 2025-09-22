/**
 * 发布管理器 - Chrome扩展版本
 * 基于验证的跨平台技术方案实现
 * 
 * 注意：此版本已适配Chrome扩展Background Script环境
 * - 移除了ES6模块语法
 * - 使用全局变量和IIFE模式
 * - 集成Chrome Tabs API和Scripting API
 */

(function() {
  'use strict';

  // 检查是否已经加载，避免重复定义
  if (self.PublishManager) {
    console.log('PublishManager already loaded');
    return;
  }

  /**
   * 发布管理器类
   */
  class PublishManager {
    constructor() {
      this.publishHistory = [];
      this.activeJobs = new Map();
      this.maxConcurrency = 8; // 最大并发数 - 支持更多平台同时发布
      console.log('PublishManager initialized');
    }

    /**
     * 发布到单个平台
     * @param {string} platform - 平台名称
     * @param {Object} data - 发布数据
     * @returns {Promise<Object>} - 发布结果
     */
    async publishToSinglePlatform(platform, data) {
      const startTime = Date.now();
      const jobId = `${platform}-${Date.now()}`;
      
      try {
        console.log(`开始发布到 ${platform}`, data);
        
        // 记录活跃任务
        this.activeJobs.set(jobId, { platform, startTime, data });
        
        // 获取平台配置
        const platformConfig = this.getPlatformConfig(platform);
        if (!platformConfig) {
          throw new Error(`不支持的平台: ${platform}`);
        }
        
        // 创建或获取标签页
        const tab = await this.createOrGetTab(platformConfig.publishUrl);
        
        // 等待页面加载完成
        await this.waitForTabReady(tab.id);
        
        // 注入必要的脚本
        await this.injectScripts(tab.id, platform);
        
        // 发送发布消息到内容脚本
        const result = await this.sendPublishMessage(tab.id, platform, data);
        
        const duration = Date.now() - startTime;
        
        // 记录发布历史
        const historyRecord = {
          platform,
          data,
          result,
          duration,
          timestamp: Date.now(),
          tabId: tab.id
        };
        
        this.publishHistory.push(historyRecord);
        this.activeJobs.delete(jobId);
        
        console.log(`${platform} 发布完成`, { result, duration: `${duration}ms` });
        
        return {
          ...result,
          platform,
          duration,
          tabId: tab.id
        };
        
      } catch (error) {
        console.error(`${platform} 发布失败:`, error);
        this.activeJobs.delete(jobId);
        
        return {
          success: false,
          platform,
          error: error.message,
          duration: Date.now() - startTime
        };
      }
    }

    /**
     * 发布到多个平台
     * @param {string[]} platforms - 平台列表
     * @param {Object} data - 发布数据
     * @param {Object} options - 选项
     * @returns {Promise<Object>} - 发布结果
     */
    async publishToMultiplePlatforms(platforms, data, options = {}) {
      const { concurrent = false, stopOnError = false } = options;
      
      console.log('开始多平台发布', { platforms, concurrent, stopOnError });
      
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
          
          // 平台间延迟
          if (platforms.indexOf(platform) < platforms.length - 1) {
            await this.delay(1000);
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      const successCount = Object.values(results).filter(r => r.success).length;
      
      console.log('多平台发布完成', {
        successCount,
        totalPlatforms: platforms.length,
        duration: `${totalDuration}ms`
      });

      return {
        results,
        summary: {
          totalPlatforms: platforms.length,
          successCount,
          failureCount: platforms.length - successCount,
          successRate: `${(successCount / platforms.length * 100).toFixed(1)}%`,
          duration: totalDuration
        }
      };
    }

    /**
     * 创建或获取标签页
     * @param {string} url - 目标URL
     * @returns {Promise<Object>} - 标签页对象
     */
    async createOrGetTab(url) {
      try {
        // 查找现有标签页
        const tabs = await chrome.tabs.query({ url: url + '*' });
        
        if (tabs.length > 0) {
          const tab = tabs[0];
          // 激活现有标签页
          await chrome.tabs.update(tab.id, { active: true });
          return tab;
        }
        
        // 创建新标签页
        const tab = await chrome.tabs.create({ url, active: true });
        return tab;
        
      } catch (error) {
        console.error('创建标签页失败:', error);
        throw error;
      }
    }

    /**
     * 等待标签页准备就绪
     * @param {number} tabId - 标签页ID
     * @param {number} timeout - 超时时间
     */
    async waitForTabReady(tabId, timeout = 30000) {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkReady = () => {
          chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            
            if (tab.status === 'complete') {
              resolve(tab);
              return;
            }
            
            if (Date.now() - startTime > timeout) {
              reject(new Error('标签页加载超时'));
              return;
            }
            
            setTimeout(checkReady, 500);
          });
        };
        
        checkReady();
      });
    }

    /**
     * 注入必要的脚本
     * @param {number} tabId - 标签页ID
     * @param {string} platform - 平台名称
     */
    async injectScripts(tabId, platform) {
      try {
        // 注入UniversalContentInjector
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content-scripts/shared/UniversalContentInjector.js']
        });
        
        // 注入PlatformAdapter
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content-scripts/shared/PlatformAdapter.js']
        });
        
        console.log(`脚本注入完成: ${platform}`);
        
      } catch (error) {
        console.error('脚本注入失败:', error);
        throw error;
      }
    }

    /**
     * 发送发布消息到内容脚本
     * @param {number} tabId - 标签页ID
     * @param {string} platform - 平台名称
     * @param {Object} data - 发布数据
     */
    async sendPublishMessage(tabId, platform, data) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('发布消息超时'));
        }, 30000);
        
        chrome.tabs.sendMessage(tabId, {
          action: 'publish',
          platform,
          data
        }, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          resolve(response || { success: false, error: '无响应' });
        });
      });
    }

    /**
     * 获取平台配置
     * @param {string} platform - 平台名称
     */
    getPlatformConfig(platform) {
      const configs = {
        jike: {
          name: '即刻',
          publishUrl: 'https://web.okjike.com',
          color: 'bg-yellow-500'
        },
        weibo: {
          name: '微博',
          publishUrl: 'https://weibo.com/',
          color: 'bg-red-500'
        },
        douyin: {
          name: '抖音',
          publishUrl: 'https://creator.douyin.com/creator-micro/home',
          color: 'bg-black'
        },
        xiaohongshu: {
          name: '小红书',
          publishUrl: 'https://creator.xiaohongshu.com/new/home',
          color: 'bg-red-500'
        },
        'xiaohongshu-article': {
          name: '小红书长文',
          publishUrl: 'https://creator.xiaohongshu.com/publish/publish?from=tab_switch&target=article',
          color: 'bg-red-500'
        }
      };
      
      return configs[platform];
    }

    /**
     * 延迟函数
     */
    async delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取发布统计
     * @param {number} days - 统计天数
     */
    getPublishStats(days = 7) {
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      const recentHistory = this.publishHistory.filter(h => h.timestamp > cutoffTime);
      
      const total = recentHistory.length;
      const successful = recentHistory.filter(h => h.result.success).length;
      
      const platformStats = {};
      recentHistory.forEach(h => {
        if (!platformStats[h.platform]) {
          platformStats[h.platform] = { total: 0, successful: 0 };
        }
        platformStats[h.platform].total++;
        if (h.result.success) {
          platformStats[h.platform].successful++;
        }
      });
      
      return {
        total,
        successful,
        failed: total - successful,
        successRate: total > 0 ? `${(successful / total * 100).toFixed(1)}%` : '0%',
        platformStats,
        recentHistory: recentHistory.slice(-10)
      };
    }

    /**
     * 清理发布历史
     */
    clearHistory() {
      this.publishHistory = [];
      console.log('发布历史已清理');
    }
  }

  // 创建全局实例 (Service Worker环境使用self)
  self.PublishManager = PublishManager;
  self.publishManager = new PublishManager();

  console.log('PublishManager loaded successfully');

})();
