/**
 * FileStorageService - IndexedDB文件存储服务
 * 
 * 功能：
 * - 大文件存储和检索
 * - 自动清理过期文件
 * - 存储使用情况监控
 * - 错误处理和恢复
 * 
 * @author MomentDots Team
 * @version 1.0.0
 */

class FileStorageService {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {string} options.dbName - 数据库名称
   * @param {number} options.version - 数据库版本
   * @param {string} options.storeName - 存储名称
   */
  constructor(options = {}) {
    this.dbName = options.dbName || 'MomentDotsFiles';
    this.version = options.version || 1;
    this.storeName = options.storeName || 'files';
    this.db = null;
    
    // 配置选项
    this.maxFileSize = options.maxFileSize || 2 * 1024 * 1024 * 1024; // 2GB
    this.maxStorageSize = options.maxStorageSize || 10 * 1024 * 1024 * 1024; // 10GB
    this.defaultMaxAge = options.defaultMaxAge || 24 * 60 * 60 * 1000; // 24小时
  }

  /**
   * 初始化数据库
   * @returns {Promise<IDBDatabase>} 数据库实例
   */
  async init() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(new Error('DB_INIT_FAILED'));
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建文件存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // 创建索引
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
      };
    });
  }

  /**
   * 存储文件
   * @param {File} file - 要存储的文件
   * @param {Object} metadata - 可选的元数据
   * @returns {Promise<string>} 文件ID
   */
  async storeFile(file, metadata = {}) {
    if (!this.validateFile(file)) {
      throw new Error('INVALID_FILE');
    }

    await this.init();
    
    const fileId = this.generateFileId();
    const fileData = {
      id: fileId,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      timestamp: Date.now(),
      metadata: metadata
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(fileData);
      
      request.onsuccess = () => {
        console.log(`File stored successfully: ${fileId}`);
        resolve(fileId);
      };
      
      request.onerror = () => {
        console.error('Failed to store file:', request.error);
        if (request.error.name === 'QuotaExceededError') {
          reject(new Error('STORAGE_QUOTA_EXCEEDED'));
        } else {
          reject(new Error('STORE_FAILED'));
        }
      };
    });
  }

  /**
   * 获取文件
   * @param {string} fileId - 文件ID
   * @returns {Promise<File|null>} 文件对象或null
   */
  async getFile(fileId) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(fileId);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result.file);
        } else {
          console.warn(`File not found: ${fileId}`);
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('Failed to get file:', request.error);
        reject(new Error('GET_FAILED'));
      };
    });
  }

  /**
   * 删除文件
   * @param {string} fileId - 文件ID
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteFile(fileId) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(fileId);
      
      request.onsuccess = () => {
        console.log(`File deleted: ${fileId}`);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Failed to delete file:', request.error);
        resolve(false);
      };
    });
  }

  /**
   * 获取所有文件信息
   * @returns {Promise<Array>} 文件信息数组
   */
  async getAllFiles() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const files = request.result.map(item => ({
          id: item.id,
          name: item.name,
          size: item.size,
          type: item.type,
          timestamp: item.timestamp,
          metadata: item.metadata
        }));
        resolve(files);
      };
      
      request.onerror = () => {
        console.error('Failed to get all files:', request.error);
        reject(new Error('GET_ALL_FAILED'));
      };
    });
  }

  /**
   * 清理过期文件
   * @param {number} maxAge - 最大保存时间（毫秒）
   * @returns {Promise<number>} 清理的文件数量
   */
  async clearOldFiles(maxAge = this.defaultMaxAge) {
    await this.init();
    
    const cutoff = Date.now() - maxAge;
    let deletedCount = 0;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`Cleaned ${deletedCount} old files`);
          resolve(deletedCount);
        }
      };
      
      request.onerror = () => {
        console.error('Failed to clear old files:', request.error);
        reject(new Error('CLEANUP_FAILED'));
      };
    });
  }

  /**
   * 获取存储使用情况
   * @returns {Promise<Object>} 存储信息
   */
  async getStorageInfo() {
    const files = await this.getAllFiles();
    
    if (files.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
        averageSize: 0
      };
    }
    
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const timestamps = files.map(file => file.timestamp);
    
    return {
      totalFiles: files.length,
      totalSize: totalSize,
      oldestFile: Math.min(...timestamps),
      newestFile: Math.max(...timestamps),
      averageSize: Math.round(totalSize / files.length)
    };
  }

  /**
   * 生成唯一文件ID
   * @returns {string} 文件ID
   */
  generateFileId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `file_${timestamp}_${random}`;
  }

  /**
   * 验证文件
   * @param {File} file - 要验证的文件
   * @returns {boolean} 文件是否有效
   */
  validateFile(file) {
    if (!file || !(file instanceof File)) {
      console.error('Invalid file object');
      return false;
    }
    
    if (file.size === 0) {
      console.error('Empty file');
      return false;
    }
    

    
    return true;
  }

  /**
   * 检查存储配额
   * @returns {Promise<Object>} 配额信息
   */
  async checkQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        available: estimate.quota - estimate.usage,
        usagePercentage: Math.round((estimate.usage / estimate.quota) * 100)
      };
    }
    return null;
  }

  /**
   * 清理所有文件
   * @returns {Promise<boolean>} 清理是否成功
   */
  async clearAllFiles() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('All files cleared');
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Failed to clear all files:', request.error);
        resolve(false);
      };
    });
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// 导出服务
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileStorageService;
} else if (typeof window !== 'undefined') {
  window.FileStorageService = FileStorageService;
}
