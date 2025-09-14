/**
 * MemoryManager - 内存管理服务
 * 
 * 功能：
 * - 内存使用监控
 * - Blob URL生命周期管理
 * - 内存优化和清理
 * - 性能统计和报告
 * 
 * @author MomentDots Team
 * @version 1.0.0
 */

class MemoryManager {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.blobUrls = new Map();
    this.memoryStats = {
      peakUsage: 0,
      currentUsage: 0,
      blobUrlCount: 0,
      cleanupCount: 0
    };
    
    // 配置选项
    this.maxBlobUrls = options.maxBlobUrls || 100;
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 5分钟
    this.memoryThreshold = options.memoryThreshold || 0.8; // 80%
    
    // 启动定期清理
    this.startPeriodicCleanup();
    
    // 绑定事件监听器
    this.bindEventListeners();
  }

  /**
   * 创建并管理Blob URL
   * @param {Blob|File} blob - Blob或File对象
   * @param {string} id - 唯一标识符
   * @param {number} ttl - 生存时间（毫秒），默认30分钟
   * @returns {string} Blob URL
   */
  createBlobUrl(blob, id, ttl = 30 * 60 * 1000) {
    try {
      // 检查是否已存在
      if (this.blobUrls.has(id)) {
        this.revokeBlobUrl(id);
      }
      
      // 创建新的Blob URL
      const url = URL.createObjectURL(blob);
      const expiryTime = Date.now() + ttl;
      
      this.blobUrls.set(id, {
        url,
        blob,
        created: Date.now(),
        expires: expiryTime,
        size: blob.size || 0
      });
      
      // 设置自动清理
      setTimeout(() => {
        this.revokeBlobUrl(id);
      }, ttl);
      
      this.updateStats();
      
      console.log(`Created blob URL: ${id} (${blob.size} bytes)`);
      return url;
      
    } catch (error) {
      console.error(`Failed to create blob URL for ${id}:`, error);
      throw error;
    }
  }

  /**
   * 撤销Blob URL
   * @param {string} id - 标识符
   * @returns {boolean} 撤销是否成功
   */
  revokeBlobUrl(id) {
    const blobData = this.blobUrls.get(id);
    if (blobData) {
      try {
        URL.revokeObjectURL(blobData.url);
        this.blobUrls.delete(id);
        this.memoryStats.cleanupCount++;
        
        console.log(`Revoked blob URL: ${id}`);
        return true;
        
      } catch (error) {
        console.error(`Failed to revoke blob URL ${id}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * 获取Blob URL
   * @param {string} id - 标识符
   * @returns {string|null} Blob URL或null
   */
  getBlobUrl(id) {
    const blobData = this.blobUrls.get(id);
    if (blobData) {
      // 检查是否过期
      if (Date.now() > blobData.expires) {
        this.revokeBlobUrl(id);
        return null;
      }
      return blobData.url;
    }
    return null;
  }

  /**
   * 清理过期的Blob URL
   * @returns {number} 清理的URL数量
   */
  cleanupExpiredUrls() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [id, blobData] of this.blobUrls) {
      if (now > blobData.expires) {
        this.revokeBlobUrl(id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired blob URLs`);
    }
    
    return cleanedCount;
  }

  /**
   * 清理所有Blob URL
   * @returns {number} 清理的URL数量
   */
  cleanupAllUrls() {
    const count = this.blobUrls.size;
    
    for (const [id] of this.blobUrls) {
      this.revokeBlobUrl(id);
    }
    
    console.log(`Cleaned up all ${count} blob URLs`);
    return count;
  }

  /**
   * 监控内存使用情况
   * @returns {Object|null} 内存使用信息
   */
  monitorMemoryUsage() {
    if (!('memory' in performance)) {
      return null;
    }
    
    const memory = performance.memory;
    const usage = {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
    
    // 更新峰值使用量
    if (usage.used > this.memoryStats.peakUsage) {
      this.memoryStats.peakUsage = usage.used;
    }
    
    this.memoryStats.currentUsage = usage.used;
    
    // 检查是否需要清理
    if (usage.usagePercentage > this.memoryThreshold * 100) {
      console.warn(`High memory usage detected: ${usage.usagePercentage.toFixed(1)}%`);
      this.performEmergencyCleanup();
    }
    
    return usage;
  }

  /**
   * 执行紧急清理
   */
  performEmergencyCleanup() {
    console.log('Performing emergency memory cleanup...');
    
    // 清理过期的Blob URL
    const expiredCleaned = this.cleanupExpiredUrls();
    
    // 如果内存使用仍然很高，清理最老的Blob URL
    const memoryUsage = this.monitorMemoryUsage();
    if (memoryUsage && memoryUsage.usagePercentage > this.memoryThreshold * 100) {
      const oldestCleaned = this.cleanupOldestUrls(10);
      console.log(`Emergency cleanup: ${expiredCleaned + oldestCleaned} URLs cleaned`);
    }
    
    // 建议垃圾回收
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * 清理最老的Blob URL
   * @param {number} count - 要清理的数量
   * @returns {number} 实际清理的数量
   */
  cleanupOldestUrls(count = 5) {
    const sortedUrls = Array.from(this.blobUrls.entries())
      .sort((a, b) => a[1].created - b[1].created)
      .slice(0, count);
    
    let cleanedCount = 0;
    for (const [id] of sortedUrls) {
      if (this.revokeBlobUrl(id)) {
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * 获取内存统计信息
   * @returns {Object} 统计信息
   */
  getMemoryStats() {
    const currentMemory = this.monitorMemoryUsage();
    
    return {
      ...this.memoryStats,
      blobUrlCount: this.blobUrls.size,
      currentMemory,
      blobUrlsSize: this.calculateBlobUrlsSize()
    };
  }

  /**
   * 计算Blob URL占用的总大小
   * @returns {number} 总大小（字节）
   */
  calculateBlobUrlsSize() {
    let totalSize = 0;
    for (const [, blobData] of this.blobUrls) {
      totalSize += blobData.size;
    }
    return totalSize;
  }

  /**
   * 更新统计信息
   * @private
   */
  updateStats() {
    this.memoryStats.blobUrlCount = this.blobUrls.size;
    
    // 检查是否超过最大数量
    if (this.blobUrls.size > this.maxBlobUrls) {
      const excess = this.blobUrls.size - this.maxBlobUrls;
      this.cleanupOldestUrls(excess);
    }
  }

  /**
   * 启动定期清理
   * @private
   */
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupExpiredUrls();
      this.monitorMemoryUsage();
    }, this.cleanupInterval);
  }

  /**
   * 绑定事件监听器
   * @private
   */
  bindEventListeners() {
    if (typeof window !== 'undefined') {
      // 页面卸载时清理所有URL
      window.addEventListener('beforeunload', () => {
        this.cleanupAllUrls();
      });
      
      // 页面隐藏时清理过期URL
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.cleanupExpiredUrls();
        }
      });
      
      // 内存压力事件（如果支持）
      if ('memory' in performance && 'addEventListener' in performance.memory) {
        performance.memory.addEventListener('memorypressure', () => {
          this.performEmergencyCleanup();
        });
      }
    }
  }

  /**
   * 格式化字节大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化的大小
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 生成内存报告
   * @returns {string} 内存使用报告
   */
  generateMemoryReport() {
    const stats = this.getMemoryStats();
    const currentMemory = stats.currentMemory;
    
    let report = '=== Memory Usage Report ===\n';
    
    if (currentMemory) {
      report += `Current Memory Usage: ${MemoryManager.formatBytes(currentMemory.used)}\n`;
      report += `Total Memory: ${MemoryManager.formatBytes(currentMemory.total)}\n`;
      report += `Memory Limit: ${MemoryManager.formatBytes(currentMemory.limit)}\n`;
      report += `Usage Percentage: ${currentMemory.usagePercentage.toFixed(1)}%\n`;
    }
    
    report += `Peak Memory Usage: ${MemoryManager.formatBytes(stats.peakUsage)}\n`;
    report += `Active Blob URLs: ${stats.blobUrlCount}\n`;
    report += `Blob URLs Size: ${MemoryManager.formatBytes(stats.blobUrlsSize)}\n`;
    report += `Cleanup Operations: ${stats.cleanupCount}\n`;
    
    return report;
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.memoryStats = {
      peakUsage: 0,
      currentUsage: 0,
      blobUrlCount: this.blobUrls.size,
      cleanupCount: 0
    };
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.cleanupAllUrls();
    this.resetStats();
  }
}

// 创建全局实例
const memoryManager = new MemoryManager();

// 导出服务
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MemoryManager;
} else if (typeof window !== 'undefined') {
  window.MemoryManager = MemoryManager;
  window.memoryManager = memoryManager;
}
