/**
 * 平台适配器基类和具体实现
 * 基于UniversalContentInjector的跨平台发布解决方案
 */

import { UniversalContentInjector } from '../utils/UniversalContentInjector.js';

/**
 * 平台适配器基类
 */
export class BasePlatformAdapter {
  constructor(platform) {
    this.platform = platform;
    this.injector = new UniversalContentInjector();
  }

  /**
   * 发布内容的通用方法
   * @param {Object} data - 发布数据
   * @param {string} data.title - 标题
   * @param {string} data.content - 内容
   * @param {File[]} data.files - 文件数组
   * @returns {Promise<Object>} - 发布结果
   */
  async publishContent(data) {
    throw new Error('子类必须实现 publishContent 方法');
  }

  /**
   * 等待页面加载完成
   */
  async waitForPageLoad(timeout = 10000) {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve(true);
        return;
      }
      
      const timer = setTimeout(() => resolve(false), timeout);
      
      document.addEventListener('DOMContentLoaded', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  /**
   * 记录操作日志
   */
  log(message, data = {}) {
    console.log(`[${this.platform.toUpperCase()}] ${message}`, data);
  }

  /**
   * 记录错误日志
   */
  logError(message, error) {
    console.error(`[${this.platform.toUpperCase()}] ${message}`, error);
  }
}

// 即刻平台适配器已移至 MomentDots/content-scripts/adapters/jike.js
// 使用重构后的统一基类架构，不再在此文件中维护



  /**
   * 通用文件处理方法 - 从fileIds或传统文件数据获取File对象
   */
  async processFileData(data) {
    const { files, fileIds } = data;
    let filesToUpload = [];

    if (fileIds && fileIds.length > 0) {
      // 🚀 新方案：使用智能文件获取（支持分布式下载）
      this.log('使用智能文件获取系统（支持分布式协作下载）...');
      try {
        for (const fileId of fileIds) {
          this.log(`智能获取文件: ${fileId}`);

          // 注意：这个文件可能是旧版本，如果没有getFileWithInstantPreview方法，降级到旧API
          let file;
          if (typeof this.getFileWithInstantPreview === 'function') {
            file = await this.getFileWithInstantPreview(fileId);
          } else {
            // 降级到旧API
            const response = await chrome.runtime.sendMessage({
              action: 'getFile',
              fileId: fileId
            });

            if (response.success && response.arrayData) {
              const uint8Array = new Uint8Array(response.arrayData);
              const blob = new Blob([uint8Array], { type: response.metadata.type });
              file = new File([blob], response.metadata.name, {
                type: response.metadata.type,
                lastModified: response.metadata.lastModified
              });
            } else {
              this.log(`警告: 文件ID ${fileId} 对应的文件未找到: ${response.error || 'Unknown error'}`);
              continue;
            }
          }

          filesToUpload.push(file);
          this.log(`✅ 智能获取文件成功: ${file.name} (${file.size} bytes)`);
        }
      } catch (error) {
        this.logError('从Background Script获取文件失败:', error);
        filesToUpload = this.collectLegacyFiles(data);
      }
    } else {
      // 原有方案：使用传统的文件数据
      this.log('使用传统文件管理系统...');
      filesToUpload = this.collectLegacyFiles(data);
    }

    return filesToUpload;
  }

  /**
   * 查找文件输入元素
   */
  async findFileInput() {
    // 尝试使用更新的选择器
    let fileInput = document.querySelector('.jk-bjn8wh.mantine-Dropzone-root > input[type="file"]');

    if (!fileInput) {
      // 降级到通用选择器
      fileInput = document.querySelector('input[type="file"]');
    }

    if (!fileInput) {
      // 等待元素出现
      this.log('等待即刻文件输入控件加载...');
      try {
        fileInput = await this.injector.waitForElement('.jk-bjn8wh.mantine-Dropzone-root > input[type="file"]', 5000);
      } catch (error) {
        fileInput = await this.injector.waitForElement('input[type="file"]', 5000);
      }
    }

    return fileInput;
  }

  /**
   * 收集传统文件数据（降级方案）
   */
  collectLegacyFiles(data) {
    const allFiles = [];

    if (data.images && data.images.length > 0) {
      this.log('检测到images数据，数量:', data.images.length);
      allFiles.push(...data.images);
    }

    if (data.files && data.files.length > 0) {
      this.log('检测到files数据，数量:', data.files.length);
      const uniqueFiles = data.files.filter(file =>
        !allFiles.some(existing => existing.id === file.id || existing.name === file.name)
      );
      if (uniqueFiles.length > 0) {
        this.log('添加非重复files数据，数量:', uniqueFiles.length);
        allFiles.push(...uniqueFiles);
      }
    }

    if (data.videos && data.videos.length > 0) {
      this.log('检测到videos数据，数量:', data.videos.length);
      allFiles.push(...data.videos);
    }

    return allFiles;
  }

  /**
   * 通用文件上传方法 - 处理File对象到文件输入控件
   */
  async uploadFilesToInput(files, fileInput) {
    if (!files || files.length === 0) {
      this.log('没有文件需要上传');
      return;
    }

    const filesToUpload = [];

    for (const fileData of files) {
      if (fileData instanceof File) {
        filesToUpload.push(fileData);
        this.log(`添加File对象: ${fileData.name} (${fileData.size} bytes)`);
      } else if (fileData.dataUrl) {
        const file = this.createFileFromBase64(fileData);
        if (file) {
          filesToUpload.push(file);
          this.log(`从Base64创建文件: ${file.name} (${file.size} bytes)`);
        }
      } else {
        this.log('跳过无效的文件数据:', fileData);
      }
    }

    if (filesToUpload.length === 0) {
      throw new Error('没有有效的文件可以上传');
    }

    // 使用DataTransfer上传文件
    const dataTransfer = new DataTransfer();
    filesToUpload.forEach(file => {
      dataTransfer.items.add(file);
    });

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    this.log(`成功上传 ${filesToUpload.length} 个文件`);
  }

  /**
   * 从Base64数据创建File对象
   */
  createFileFromBase64(imageData) {
    const base64Data = imageData.dataUrl || imageData.data;
    const fileName = imageData.name || 'image.png';
    const fileType = this.getFileTypeFromBase64(base64Data) || imageData.type || 'image/png';

    if (!base64Data) {
      throw new Error('图片数据缺少base64内容');
    }

    try {
      const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: fileType });
      const file = new File([blob], fileName, {
        type: fileType,
        lastModified: Date.now()
      });

      this.log(`创建File对象成功: ${fileName} (${file.size} bytes, ${fileType})`);
      return file;

    } catch (error) {
      this.logError('Base64转File失败:', error);
      throw new Error(`Base64数据转换失败: ${error.message}`);
    }
  }

  /**
   * 从Base64数据中获取文件类型
   */
  getFileTypeFromBase64(base64Data) {
    if (!base64Data || typeof base64Data !== 'string') {
      return 'image/png';
    }

    const match = base64Data.match(/^data:([^;]+);base64,/);
    if (match && match[1]) {
      return match[1];
    }

    return 'image/png';
  }
}

// 微博平台适配器已移至 MomentDots/content-scripts/adapters/weibo.js
// 使用重构后的统一基类架构，不再在此文件中维护

/**
 * 抖音平台适配器
 * 特点: 混合编辑器，标题用INPUT，内容用contenteditable
 */
export class DouyinAdapter extends BasePlatformAdapter {
  constructor() {
    super('douyin');
  }

  async publishContent(data) {
    const { title, content, files } = data;
    
    try {
      this.log('开始发布到抖音平台', { 
        titleLength: title?.length, 
        contentLength: content?.length, 
        filesCount: files?.length 
      });
      
      // 等待页面加载
      await this.waitForPageLoad();
      
      // 注入标题
      if (title) {
        const success = await this.injectTitle(title);
        if (!success) {
          throw new Error('标题注入失败');
        }
      }
      
      // 注入内容
      if (content) {
        const success = await this.injectContent(content);
        if (!success) {
          throw new Error('内容注入失败');
        }
      }
      
      // 上传文件
      if (files && files.length > 0) {
        const success = await this.uploadFiles(files);
        if (!success) {
          throw new Error('文件上传失败');
        }
      }
      
      this.log('抖音平台发布成功');
      return { success: true, platform: this.platform };
      
    } catch (error) {
      this.logError('抖音平台发布失败', error);
      return { success: false, platform: this.platform, error: error.message };
    }
  }

  async injectTitle(title) {
    const titleInput = this.injector.findElement('douyin', 'title');
    
    if (!titleInput) {
      throw new Error('未找到抖音标题输入框');
    }
    
    this.log('找到抖音标题输入框，开始注入标题');
    return this.injector.injectContent(titleInput, title);
  }

  async injectContent(content) {
    const contentDiv = this.injector.findElement('douyin', 'content');
    
    if (!contentDiv) {
      throw new Error('未找到抖音内容输入区域');
    }
    
    this.log('找到抖音内容输入区域，开始注入内容');
    return this.injector.injectContent(contentDiv, content);
  }

  async uploadFiles(files) {
    const fileInput = this.injector.findElement('douyin', 'file');
    
    if (!fileInput) {
      throw new Error('未找到抖音文件上传控件');
    }
    
    this.log('开始上传文件到抖音', { count: files.length });
    return this.injector.uploadFiles(fileInput, files);
  }
}

/**
 * 小红书平台适配器
 * 特点: 需要先上传图片才能进入发布页面
 */
export class XiaohongshuAdapter extends BasePlatformAdapter {
  constructor() {
    super('xiaohongshu');
  }

  async publishContent(data) {
    const { title, content, files } = data;
    
    try {
      this.log('开始发布到小红书平台', { 
        titleLength: title?.length, 
        contentLength: content?.length, 
        filesCount: files?.length 
      });
      
      // 小红书必须先上传图片
      if (!files || files.length === 0) {
        throw new Error('小红书发布需要至少一张图片');
      }
      
      // 等待页面加载
      await this.waitForPageLoad();
      
      // 先上传文件
      const uploadSuccess = await this.uploadFiles(files);
      if (!uploadSuccess) {
        throw new Error('文件上传失败');
      }
      
      // 等待跳转到发布页面
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 注入标题
      if (title) {
        const success = await this.injectTitle(title);
        if (!success) {
          this.log('标题注入失败，但继续执行');
        }
      }
      
      // 注入内容
      if (content) {
        const success = await this.injectContent(content);
        if (!success) {
          throw new Error('内容注入失败');
        }
      }
      
      this.log('小红书平台发布成功');
      return { success: true, platform: this.platform };
      
    } catch (error) {
      this.logError('小红书平台发布失败', error);
      return { success: false, platform: this.platform, error: error.message };
    }
  }

  async injectTitle(title) {
    const titleInput = this.injector.findElement('xiaohongshu', 'title');
    
    if (!titleInput) {
      this.log('未找到小红书标题输入框');
      return false;
    }
    
    this.log('找到小红书标题输入框，开始注入标题');
    return this.injector.injectContent(titleInput, title);
  }

  async injectContent(content) {
    const contentDiv = this.injector.findElement('xiaohongshu', 'content');
    
    if (!contentDiv) {
      throw new Error('未找到小红书内容输入区域');
    }
    
    this.log('找到小红书内容输入区域，开始注入内容');
    return this.injector.injectContent(contentDiv, content);
  }

  async uploadFiles(files) {
    const fileInput = this.injector.findElement('xiaohongshu', 'file');
    
    if (!fileInput) {
      throw new Error('未找到小红书文件上传控件');
    }
    
    this.log('开始上传文件到小红书', { count: files.length });
    return this.injector.uploadFiles(fileInput, files);
  }
}

/**
 * 平台适配器工厂
 */
export class PlatformAdapterFactory {
  static create(platform) {
    const adapters = {
      // jike: 已移至 MomentDots/content-scripts/adapters/jike.js，使用重构后的统一架构
      // weibo: 已移至 MomentDots/content-scripts/adapters/weibo.js，使用重构后的统一架构
      douyin: DouyinAdapter,
      xiaohongshu: XiaohongshuAdapter
    };

    // 即刻和微博平台使用新的重构架构，不在此处创建
    if (platform === 'jike') {
      throw new Error('即刻平台已使用新的重构架构，请使用 MomentDots/content-scripts/adapters/jike.js');
    }

    if (platform === 'weibo') {
      throw new Error('微博平台已使用新的重构架构，请使用 MomentDots/content-scripts/adapters/weibo.js');
    }

    const AdapterClass = adapters[platform];
    if (!AdapterClass) {
      throw new Error(`不支持的平台: ${platform}`);
    }

    return new AdapterClass();
  }

  static getSupportedPlatforms() {
    return ['douyin', 'xiaohongshu']; // jike和weibo已移至新架构
  }
}
