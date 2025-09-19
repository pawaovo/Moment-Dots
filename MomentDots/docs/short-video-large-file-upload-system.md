# 扩展程序短视频页面大文件上传发布系统技术文档

## 1. 系统概述

### 1.1 功能简介
扩展程序的短视频页面支持大文件（视频）的上传和发布，目前已实现对5个主流平台的支持：
- 小红书 (xiaohongshu)
- 抖音 (douyin) 
- 微博 (weibo)
- bilibili
- 视频号 (weixinchannels)

### 1.2 核心特性
- **即时预览**：用户选择文件后立即显示预览，无需等待上传完成
- **分块传输**：16MB分块上传，支持大文件高效传输
- **智能降级**：新系统失败时自动降级到传统方案
- **跨页面传递**：通过Background Script实现文件数据的跨页面传递
- **统一接口**：基于FileProcessorBase的统一文件处理架构

## 2. 系统架构

### 2.1 整体架构
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   短视频页面    │    │  Background      │    │   平台页面      │
│   (main.js)     │◄──►│  Script          │◄──►│   (adapters)    │
│                 │    │                  │    │                 │
│ - 文件选择      │    │ - 文件存储       │    │ - 文件注入      │
│ - 即时预览      │    │ - 分块传输       │    │ - 内容发布      │
│ - 状态管理      │    │ - 跨页面传递     │    │ - 平台适配      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 2.2 核心组件
- **MainController**: 主控制器，管理文件上传和处理
- **FileProcessorBase**: 统一文件处理基类
- **Platform Adapters**: 各平台适配器
- **FileDataManager**: 文件数据管理器
- **LogManager**: 日志管理器

## 3. 大文件上传机制

### 3.1 即时预览系统
**位置**: `MomentDots/main/main.js` - `handleInstantVideoPreview()`

```javascript
async function handleInstantVideoPreview(file) {
  const context = '即时视频预览';
  
  // 1. 使用统一的Blob URL管理
  const blobUrl = FileDataManager.createManagedBlobUrl(file);
  
  // 2. 同步存储到Background Script
  const fileId = await storeCompleteFileToBackground(file);
  
  // 3. 创建文件数据对象
  const videoData = FileDataManager.createFileData(file, {
    prefix: 'instant_video',
    blobUrl: blobUrl,
    fileId: fileId,
    isInstantPreview: true,
    storageStatus: 'stored'
  });
  
  // 4. 立即更新UI，用户可以开始发布
  appState.shortVideoPreviews = [videoData];
  updateShortVideoPreview();
  updateShortVideoCount();
  enablePublishButton();
}
```

### 3.2 分块传输系统
**位置**: `MomentDots/main/main.js` - `uploadFileInChunks()`

```javascript
async uploadFileInChunks(file) {
  const chunkSize = 16 * 1024 * 1024; // 16MB per chunk
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  // 1. 初始化文件上传
  const initResponse = await chrome.runtime.sendMessage({
    action: 'initFileUpload',
    metadata: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      totalChunks: totalChunks
    }
  });
  
  // 2. 分块上传
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    const chunkData = await this.readChunkAsArrayBuffer(chunk);
    
    const chunkResponse = await chrome.runtime.sendMessage({
      action: 'uploadFileChunk',
      fileId: initResponse.fileId,
      chunkIndex: chunkIndex,
      chunkData: Array.from(new Uint8Array(chunkData)),
      isLastChunk: chunkIndex === totalChunks - 1
    });
  }
  
  return initResponse.fileId;
}
```

### 3.3 Background Script存储
**位置**: `MomentDots/main/main.js` - `storeCompleteFileToBackground()`

```javascript
async function storeCompleteFileToBackground(file) {
  const context = '文件存储';
  
  // 创建Blob URL并传递给Background Script
  const blobUrl = URL.createObjectURL(file);
  
  const response = await chrome.runtime.sendMessage({
    action: 'storeFileBlobUrl',
    blobUrl: blobUrl,
    metadata: FileDataManager.standardizeMetadata(file, {
      isInstantPreview: true
    })
  });
  
  if (response && response.success) {
    return response.fileId;
  } else {
    throw new Error(response?.error || '文件存储失败');
  }
}
```

## 4. 文件处理和验证系统

### 4.1 统一文件验证器
**位置**: `MomentDots/main/main.js` - `FileValidator`

```javascript
class FileValidator {
  static validateFile(file, fileType = 'image') {
    if (!file || !(file instanceof File)) {
      return { valid: false, error: '无效的文件对象' };
    }
    
    const config = fileType === 'video' ? VIDEO_CONFIG : IMAGE_CONFIG;
    
    if (!config.allowedTypes.includes(file.type)) {
      const typeLabel = fileType === 'video' ? '视频' : '图片';
      return { valid: false, error: `不支持的${typeLabel}格式: ${file.name}` };
    }
    
    // 视频文件需要检查大小限制
    if (fileType === 'video' && file.size > config.maxFileSize) {
      return { valid: false, error: `视频文件过大: ${file.name} (最大100MB)` };
    }
    
    return { valid: true };
  }
}
```

### 4.2 文件数据管理器
**位置**: `MomentDots/main/main.js` - `FileDataManager`

```javascript
class FileDataManager {
  // 统一的文件数据创建
  static createFileData(file, options = {}) {
    const id = options.id || this.generateUniqueId(options.prefix);
    const blobUrl = options.blobUrl || URL.createObjectURL(file);
    
    return {
      id: id,
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: blobUrl,
      lastModified: file.lastModified,
      timestamp: Date.now(),
      fileId: options.fileId || null,
      isInstantPreview: options.isInstantPreview || false,
      storageStatus: options.storageStatus || 'pending',
      ...options
    };
  }
  
  // Blob URL管理
  static createManagedBlobUrl(file) {
    const blobUrl = URL.createObjectURL(file);
    // 注册到内存管理器，防止内存泄漏
    if (window.memoryManager) {
      window.memoryManager.addBlobUrl(blobUrl);
    }
    return blobUrl;
  }
}
```

## 5. 跨页面文件传递机制

### 5.1 文件存储流程
1. **用户选择文件** → 短视频页面 (main.js)
2. **即时预览** → 创建Blob URL，立即显示预览
3. **后台存储** → 通过Background Script存储完整文件
4. **生成文件ID** → 用于跨页面引用
5. **用户发布** → 将文件ID传递给平台适配器
6. **文件注入** → 平台适配器从Background Script获取文件并注入

### 5.2 跨页面数据传递
**发送端** (短视频页面):
```javascript
// 发布时传递文件ID
const publishData = {
  content: contentText,
  fileIds: appState.shortVideoPreviews.map(video => video.fileId),
  files: appState.shortVideoPreviews.map(video => ({
    id: video.fileId,
    name: video.name,
    type: video.type,
    size: video.size
  }))
};

chrome.runtime.sendMessage({
  action: 'publish',
  platform: selectedPlatform,
  data: publishData
});
```

**接收端** (平台适配器):
```javascript
// 从Background Script获取文件
async processFileData(data) {
  const { files, fileIds } = data;
  const filesToUpload = [];

  // 处理fileIds - 从Background Script获取文件
  if (fileIds && fileIds.length > 0) {
    for (const fileId of fileIds) {
      const fileData = await this.getFileFromBackground(fileId);
      if (fileData) {
        const file = this.createFileFromData(fileData);
        filesToUpload.push(file);
      }
    }
  }

  return filesToUpload;
}
```

## 6. 平台适配器实现

### 6.1 统一文件处理基类
**位置**: `MomentDots/content-scripts/shared/FileProcessorBase.js`

```javascript
class FileProcessorBase {
  constructor(platform, config) {
    this.platform = platform;
    this.config = config;

    // 支持的文件格式
    this.SUPPORTED_FORMATS = {
      images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
      videos: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.mp4', '.mov', '.avi']
    };
  }

  // 统一的文件数据处理方法
  async processFileData(data) {
    const { files, fileIds } = data;
    const filesToUpload = [];

    // 处理直接传递的文件对象
    if (files && files.length > 0) {
      for (const fileData of files) {
        if (fileData instanceof File) {
          filesToUpload.push(fileData);
        } else {
          // 处理文件元数据，需要从Background Script获取实际文件
          const file = await this.getFileFromExtension(fileData);
          if (file) filesToUpload.push(file);
        }
      }
    }

    // 处理fileIds - 从Background Script获取文件
    if (fileIds && fileIds.length > 0) {
      for (const fileId of fileIds) {
        const file = await this.getFileFromExtension({ id: fileId });
        if (file) filesToUpload.push(file);
      }
    }

    return filesToUpload;
  }

  // 从Background Script获取文件
  async getFileFromExtension(fileData) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getFile',
        fileId: fileData.id || fileData.fileId
      });

      if (response && response.success) {
        return this.createFileFromResponse(response);
      }
    } catch (error) {
      this.logError('获取文件失败', error);
    }
    return null;
  }

  // 从响应数据创建File对象
  createFileFromResponse(response) {
    if (response.routingInfo) {
      // 直接传输模式
      return this.createFileFromDirectTransfer(response.routingInfo);
    } else if (response.base64Data) {
      // Base64模式
      return this.createFileFromBase64(response.base64Data, response.metadata);
    }
    return null;
  }
}
```

### 6.2 小红书适配器
**位置**: `MomentDots/content-scripts/adapters/xiaohongshu.js`

```javascript
class XiaohongshuAdapter extends FileProcessorBase {
  constructor() {
    super('xiaohongshu', {});
    this.configManager = new XiaohongshuConfigManager();
    this.config = this.configManager.config;
  }

  // 短视频发布流程
  async publishShortVideo(data) {
    try {
      // 1. 处理文件数据
      const filesToUpload = await this.processFileData(data);

      if (filesToUpload.length === 0) {
        throw new Error('小红书短视频发布需要至少一个视频文件');
      }

      // 2. 上传视频文件
      await this.uploadFiles(filesToUpload);

      // 3. 等待页面跳转到编辑页面
      await this.waitForEditPageTransition();

      // 4. 注入内容
      if (data.content) {
        await this.injectContent(data.content);
      }

      this.log('✅ 小红书短视频发布完成');
      return { success: true, platform: 'xiaohongshu' };

    } catch (error) {
      this.logError('小红书短视频发布失败', error);
      throw error;
    }
  }
}
```

### 6.3 抖音适配器
**位置**: `MomentDots/content-scripts/adapters/douyin.js`

```javascript
class DouyinAdapter {
  // 短视频发布流程
  async publishShortVideo(data) {
    try {
      // 1. 处理视频文件
      const videoFiles = await this.collectVideoFiles(data);

      if (videoFiles.length === 0) {
        throw new Error('抖音短视频发布需要至少一个视频文件');
      }

      // 2. 上传视频文件
      await this.uploadVideoFile(videoFiles[0]);

      // 3. 等待页面跳转到编辑页面
      await this.waitForVideoEditPageTransition();

      // 4. 注入文字内容（标题和描述）
      await this.injectVideoContentInEditPage(data);

      this.log('✅ 抖音短视频发布完成');
      return { success: true, platform: 'douyin' };

    } catch (error) {
      this.logError('抖音短视频发布失败', error);
      throw error;
    }
  }

  // 上传视频文件（使用统一文件上传方法）
  async uploadVideoFile(videoFile) {
    return await this.uploadFilesUnified([videoFile], 'video', [
      '上传视频', '选择视频', '添加视频', '点击上传', '上传'
    ], '视频文件上传');
  }
}
```

### 6.4 bilibili适配器
**位置**: `MomentDots/content-scripts/adapters/bilibili.js`

```javascript
class BilibiliAdapter {
  // 视频投稿发布流程
  async publishVideo(data) {
    try {
      // 1. 验证当前在视频投稿页面
      if (!window.location.href.includes('/platform/upload/video/frame')) {
        throw new Error('视频投稿发布流程只能在视频投稿页面执行');
      }

      // 2. 处理视频文件上传
      const filesToUpload = await this.collectAllFiles(data);

      if (filesToUpload.length === 0) {
        throw new Error('视频投稿需要至少一个视频文件');
      }

      // 3. 上传视频文件
      await this.handleVideoUpload(filesToUpload);

      // 4. 等待视频处理完成
      await this.waitForVideoProcessing();

      // 5. 填充视频信息
      await this.fillVideoInfo(data);

      console.log('✅ bilibili视频投稿完成');
      return { success: true, platform: 'bilibili' };

    } catch (error) {
      console.error('bilibili视频投稿失败:', error);
      throw error;
    }
  }
}
```

### 6.5 视频号适配器
**位置**: `MomentDots/content-scripts/adapters/weixinchannels.js`

```javascript
class WeixinchannelsAdapter {
  // 短视频发布流程
  async publishShortVideo(data) {
    try {
      // 1. 验证当前在短视频发布页面
      if (!window.location.href.includes('/platform/post/create')) {
        throw new Error('短视频发布流程只能在短视频发布页面执行');
      }

      // 2. 处理视频文件上传
      if (data.fileIds?.length || data.files?.length) {
        await this.uploadFiles(data);
        this.log('✅ 视频文件上传成功');
      }

      // 3. 等待视频处理完成后，填充文本内容
      if (data.content) {
        await this.delay(2000); // 等待视频处理
        await this.activateEditingArea();
        await this.injectContent(data.content);
        this.log('✅ 视频内容填充成功');
      }

      this.log('✅ 视频号短视频发布完成');
      return { success: true, platform: 'weixinchannels' };

    } catch (error) {
      this.logError('视频号短视频发布失败', error);
      throw error;
    }
  }
}
```

## 7. UI组件和状态管理

### 7.1 短视频上传区域
**位置**: `MomentDots/main/main.js` - `createShortVideoUploadArea()`

```javascript
function createShortVideoUploadArea() {
  const shortVideoUploadHTML = `
    <div id="short-video-upload-area" class="space-y-3">
      <!-- 短视频上传区域计数 -->
      <div class="flex justify-end">
        <div class="text-xs text-gray-500">
          视频: <span id="video-count">0</span>/1 | 封面: <span id="cover-count">0</span>/2
        </div>
      </div>

      <!-- 视频上传区域 -->
      <div class="grid grid-cols-1 gap-4">
        <div class="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div id="video-upload-area" class="text-center">
            <label class="upload-label" for="short-video-upload">
              <div class="upload-content">
                <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z">
                  </path>
                </svg>
                <span class="upload-text">上传视频</span>
              </div>
            </label>
            <input id="short-video-upload" type="file"
                   accept="video/mp4,video/mov,video/avi,video/webm" class="hidden" />
          </div>
        </div>
      </div>
    </div>
  `;

  // 插入短视频上传区域并绑定事件
  mediaUploadDiv.insertAdjacentHTML('beforeend', shortVideoUploadHTML);
  bindShortVideoUploadEvents();
}
```

### 7.2 短视频预览更新
**位置**: `MomentDots/main/main.js` - `updateShortVideoPreview()`

```javascript
function updateShortVideoPreview() {
  const uploadArea = domCache.get('video-upload-area');
  if (!uploadArea) return;

  if (appState.shortVideoPreviews && appState.shortVideoPreviews.length > 0) {
    const videoData = appState.shortVideoPreviews[0];

    // 生成存储状态指示器
    const storageStatusIndicator = generateStorageStatusIndicator(videoData);

    // 替换上传区域内容为预览内容
    uploadArea.innerHTML = `
      <div class="short-video-preview-container">
        <video src="${videoData.dataUrl}" controls class="short-video-preview-video"
               title="${videoData.name}"></video>
        <div class="short-video-preview-overlay">
          <div class="short-video-info">
            <div class="short-video-name" title="${videoData.name}">
              ${videoData.name}
            </div>
            <div class="short-video-size">
              ${Utils.formatFileSize(videoData.size)}
            </div>
            ${storageStatusIndicator}
          </div>
          <button class="short-video-remove-btn" data-video-id="${videoData.id}"
                  title="删除视频">×</button>
        </div>
      </div>
    `;
  } else {
    // 恢复上传区域的占位符内容
    uploadArea.innerHTML = `
      <label class="upload-label" for="short-video-upload">
        <div class="upload-content">
          <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2v8a2 2 0 002 2z">
            </path>
          </svg>
          <span class="upload-text">上传视频</span>
        </div>
      </label>
      <input id="short-video-upload" type="file"
             accept="video/mp4,video/mov,video/avi,video/webm" class="hidden" />
    `;

    // 重新绑定事件
    rebindShortVideoUploadEvent();
  }
}
```

### 7.3 状态管理器
**位置**: `MomentDots/main/main.js` - `ShortVideoStateManager`

```javascript
class ShortVideoStateManager {
  static handleUploadSuccess(data, type, message) {
    // 确保当前内容类型保持为短视频
    const originalContentType = appState.currentContentType;

    if (type === 'video') {
      appState.shortVideoPreviews.push(data);
      updateShortVideoPreview();
    } else if (type === 'cover') {
      appState.shortVideoCovers.push(data);
      updateCoverPreview(data.coverType);
    }

    updateShortVideoCount();

    // 确保内容类型没有被意外更改
    if (appState.currentContentType !== originalContentType) {
      console.warn('⚠️ 检测到内容类型意外变化，正在恢复:', originalContentType);
      appState.currentContentType = originalContentType;
    }
  }
}
```

## 8. 错误处理和日志系统

### 8.1 文件错误处理器
**位置**: `MomentDots/main/main.js` - `FileErrorHandler`

```javascript
class FileErrorHandler {
  static handleFileError(error, fileName = '', context = '文件操作') {
    let message = error?.message || error || '未知错误';

    // 如果有文件名，添加到消息中
    if (fileName) {
      message = `${message}: ${fileName}`;
    }

    // 使用统一的错误处理器
    Utils.handleError(new Error(message), context);
  }

  static handleCountLimitError(maxCount, fileType = '图片') {
    const message = `最多只能上传 ${maxCount} 个${fileType}`;
    Utils.handleError(new Error(message), '文件数量限制');
  }
}
```

### 8.2 日志管理器
**位置**: `MomentDots/main/main.js` - `LogManager`

```javascript
class LogManager {
  static logError(context, error, additionalInfo = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ [${context}] ${errorMessage}`, {
      error: error,
      stack: error instanceof Error ? error.stack : undefined,
      ...additionalInfo
    });
  }

  static logSuccess(context, message, additionalInfo = {}) {
    console.log(`✅ [${context}] ${message}`, additionalInfo);
  }

  static logWarning(context, message, additionalInfo = {}) {
    console.warn(`⚠️ [${context}] ${message}`, additionalInfo);
  }

  static logInfo(context, message, additionalInfo = {}) {
    console.log(`ℹ️ [${context}] ${message}`, additionalInfo);
  }
}
```

## 9. 配置和常量

### 9.1 视频配置
**位置**: `MomentDots/main/main.js`

```javascript
const VIDEO_CONFIG = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedTypes: [
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/webm'
  ],
  maxVideos: 1 // 短视频模式只允许一个视频
};

const IMAGE_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp'
  ],
  maxImages: 32
};
```

### 9.2 平台配置
**位置**: `MomentDots/content-scripts/adapters/common/BaseConfigManager.js`

```javascript
getDefaultConfig() {
  return {
    // 平台限制（通用默认值）
    limits: {
      maxTitleLength: 100,
      maxContentLength: 2000,
      maxImages: 32,
      maxImageSize: 10485760,  // 10MB
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    },

    // 性能配置
    performance: {
      cacheTimeout: 3000,
      elementWaitTimeout: 1500,
      mutationObserverTimeout: 3000,
      highFrequencyCheck: 50,
      enablePerformanceMonitoring: true,
      enableMutationObserver: true
    }
  };
}
```

## 10. 性能优化策略

### 10.1 分块传输优化
- **分块大小**: 16MB，平衡传输效率和内存使用
- **并发控制**: 避免同时传输过多分块
- **错误重试**: 单个分块失败时的重试机制
- **进度反馈**: 实时显示上传进度

### 10.2 内存管理
- **Blob URL管理**: 统一创建和释放Blob URL
- **文件引用清理**: 及时清理不再使用的文件引用
- **内存监控**: 监控内存使用情况，防止内存泄漏

### 10.3 用户体验优化
- **即时预览**: 文件选择后立即显示预览
- **智能降级**: 新系统失败时自动使用传统方案
- **状态指示**: 清晰的上传状态和存储状态指示
- **错误提示**: 友好的错误提示和处理建议

## 11. 后续优化建议

### 11.1 性能提升
1. **断点续传**: 支持大文件上传中断后的断点续传
2. **压缩优化**: 在上传前对视频进行适当压缩
3. **缓存机制**: 实现文件的本地缓存机制
4. **并发上传**: 支持多个文件的并发上传

### 11.2 功能扩展
1. **格式转换**: 支持更多视频格式的自动转换
2. **预处理**: 视频预处理（裁剪、滤镜等）
3. **批量操作**: 支持批量视频上传和发布
4. **云存储**: 集成云存储服务，减少本地存储压力

### 11.3 代码重构
1. **模块化**: 进一步模块化文件处理逻辑
2. **类型安全**: 引入TypeScript提高代码质量
3. **测试覆盖**: 增加单元测试和集成测试
4. **文档完善**: 完善API文档和使用说明

---

**文档版本**: v1.0
**最后更新**: 2025-01-19
**维护团队**: MomentDots Team
