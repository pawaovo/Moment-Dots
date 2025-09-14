/**
 * FileManager - 文件管理服务
 * 
 * 功能：
 * - 文件选择和预览
 * - 文件验证和处理
 * - 内存管理和清理
 * - 与FileStorageService集成
 * 
 * @author MomentDots Team
 * @version 1.0.0
 */

class FileManager {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.fileStorage = new FileStorageService();
    this.currentFileIds = [];
    this.previewUrls = new Map();
    
    // 配置选项
    this.maxFiles = options.maxFiles || 32;
    this.allowedTypes = options.allowedTypes || [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    // 绑定清理函数到页面卸载事件
    this.bindCleanupEvents();
  }

  /**
   * 处理文件选择
   * @param {FileList|Array} files - 选择的文件
   * @returns {Promise<Array>} 文件预览信息数组
   */
  async handleFileSelection(files) {
    try {
      // 清理之前的文件
      await this.cleanup();
      
      // 验证文件
      const validFiles = this.validateFiles(files);
      if (validFiles.length === 0) {
        throw new Error('No valid files selected');
      }
      
      // 存储文件并生成预览
      const previews = [];
      this.currentFileIds = [];
      
      for (const file of validFiles) {
        try {
          // 存储到IndexedDB
          const fileId = await this.fileStorage.storeFile(file, {
            uploadTime: Date.now(),
            source: 'user_selection'
          });
          
          this.currentFileIds.push(fileId);
          
          // 生成预览
          const preview = await this.generatePreview(file, fileId);
          previews.push(preview);
          
        } catch (error) {
          console.error(`Failed to process file ${file.name}:`, error);
          // 继续处理其他文件
        }
      }
      
      // 保存文件ID到Chrome Storage
      await this.saveFileIds();
      
      console.log(`Successfully processed ${previews.length} files`);
      return previews;
      
    } catch (error) {
      console.error('File selection failed:', error);
      throw error;
    }
  }

  /**
   * 验证文件
   * @param {FileList|Array} files - 要验证的文件
   * @returns {Array} 有效的文件数组
   */
  validateFiles(files) {
    const fileArray = Array.from(files);
    const validFiles = [];
    
    for (const file of fileArray) {
      // 检查文件数量限制
      if (validFiles.length >= this.maxFiles) {
        console.warn(`Maximum ${this.maxFiles} files allowed`);
        break;
      }
      
      // 检查文件类型
      if (!this.allowedTypes.includes(file.type)) {
        console.warn(`File type not allowed: ${file.type}`);
        continue;
      }
      

      
      // 检查文件是否为空
      if (file.size === 0) {
        console.warn(`Empty file: ${file.name}`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    return validFiles;
  }

  /**
   * 生成文件预览
   * @param {File} file - 文件对象
   * @param {string} fileId - 文件ID
   * @returns {Promise<Object>} 预览信息
   */
  async generatePreview(file, fileId) {
    const preview = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      previewUrl: null,
      thumbnail: null
    };
    
    try {
      // 生成预览URL
      const previewUrl = URL.createObjectURL(file);
      preview.previewUrl = previewUrl;
      
      // 保存URL引用以便后续清理
      this.previewUrls.set(fileId, previewUrl);
      
      // 为图片生成缩略图
      if (file.type.startsWith('image/')) {
        preview.thumbnail = await this.generateThumbnail(file);
      }
      
      return preview;
      
    } catch (error) {
      console.error(`Failed to generate preview for ${file.name}:`, error);
      return preview;
    }
  }

  /**
   * 生成缩略图
   * @param {File} file - 图片文件
   * @returns {Promise<string>} 缩略图数据URL
   */
  async generateThumbnail(file) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 计算缩略图尺寸
        const maxSize = 150;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制缩略图
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为数据URL
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail);
        
        // 清理
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for thumbnail'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 获取当前文件ID列表
   * @returns {Array} 文件ID数组
   */
  getCurrentFileIds() {
    return [...this.currentFileIds];
  }

  /**
   * 获取文件对象
   * @param {string} fileId - 文件ID
   * @returns {Promise<File|null>} 文件对象
   */
  async getFile(fileId) {
    return await this.fileStorage.getFile(fileId);
  }

  /**
   * 获取所有当前文件
   * @returns {Promise<Array>} 文件对象数组
   */
  async getCurrentFiles() {
    const files = [];
    for (const fileId of this.currentFileIds) {
      const file = await this.fileStorage.getFile(fileId);
      if (file) {
        files.push(file);
      }
    }
    return files;
  }

  /**
   * 移除文件
   * @param {string} fileId - 要移除的文件ID
   * @returns {Promise<boolean>} 移除是否成功
   */
  async removeFile(fileId) {
    try {
      // 从IndexedDB删除
      await this.fileStorage.deleteFile(fileId);
      
      // 从当前列表移除
      const index = this.currentFileIds.indexOf(fileId);
      if (index > -1) {
        this.currentFileIds.splice(index, 1);
      }
      
      // 清理预览URL
      const previewUrl = this.previewUrls.get(fileId);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        this.previewUrls.delete(fileId);
      }
      
      // 更新Chrome Storage
      await this.saveFileIds();
      
      return true;
      
    } catch (error) {
      console.error(`Failed to remove file ${fileId}:`, error);
      return false;
    }
  }

  /**
   * 保存文件ID到Chrome Storage
   * @returns {Promise<void>}
   */
  async saveFileIds() {
    try {
      const existingData = await chrome.storage.local.get('publishData');
      const publishData = existingData.publishData || {};
      
      publishData.fileIds = this.currentFileIds;
      publishData.lastUpdated = Date.now();
      
      await chrome.storage.local.set({ publishData });
      
    } catch (error) {
      console.error('Failed to save file IDs:', error);
    }
  }

  /**
   * 从Chrome Storage加载文件ID
   * @returns {Promise<Array>} 文件ID数组
   */
  async loadFileIds() {
    try {
      const data = await chrome.storage.local.get('publishData');
      if (data.publishData && data.publishData.fileIds) {
        this.currentFileIds = data.publishData.fileIds;
        return this.currentFileIds;
      }
      return [];
      
    } catch (error) {
      console.error('Failed to load file IDs:', error);
      return [];
    }
  }

  /**
   * 清理资源
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      // 清理预览URL
      for (const [fileId, previewUrl] of this.previewUrls) {
        URL.revokeObjectURL(previewUrl);
      }
      this.previewUrls.clear();
      
      // 删除IndexedDB中的文件
      for (const fileId of this.currentFileIds) {
        await this.fileStorage.deleteFile(fileId);
      }
      
      this.currentFileIds = [];
      
      console.log('FileManager cleanup completed');
      
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * 获取文件统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      fileCount: this.currentFileIds.length,
      maxFiles: this.maxFiles,
      previewUrls: this.previewUrls.size
    };
  }

  /**
   * 绑定清理事件
   * @private
   */
  bindCleanupEvents() {
    // 页面卸载时清理
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
      
      // 页面隐藏时清理预览URL（但保留文件）
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          for (const [fileId, previewUrl] of this.previewUrls) {
            URL.revokeObjectURL(previewUrl);
          }
          this.previewUrls.clear();
        }
      });
    }
  }

  /**
   * 检查文件是否存在
   * @param {string} fileId - 文件ID
   * @returns {Promise<boolean>} 文件是否存在
   */
  async fileExists(fileId) {
    const file = await this.fileStorage.getFile(fileId);
    return file !== null;
  }

  /**
   * 获取文件信息
   * @param {string} fileId - 文件ID
   * @returns {Promise<Object|null>} 文件信息
   */
  async getFileInfo(fileId) {
    const files = await this.fileStorage.getAllFiles();
    return files.find(file => file.id === fileId) || null;
  }
}

// 导出服务
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileManager;
} else if (typeof window !== 'undefined') {
  window.FileManager = FileManager;
}
