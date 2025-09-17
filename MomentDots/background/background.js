// 动态发布助手 - 后台脚本 (Service Worker)
console.log('=== Background Script Starting ===');

// 导入文章抓取服务
importScripts('../shared/services/ArticleExtractorService.js');

// 初始化提示词助手默认数据
async function initializePromptData() {
  const defaultPromptData = {
    promptCategories: ['全部', '创意设计', '内容可视化', '学习提升'],
    promptPrompts: [
      {
        id: 'prompt_1',
        name: '论文大师提示词',
        content: '你是一位资深的学术写作专家，请帮我改写以下内容，使其更加学术化、严谨且符合论文写作规范。请保持原意的同时，提升表达的专业性和逻辑性。',
        category: '学习提升',
        model: 'gemini-2.5-flash'
      },
      {
        id: 'prompt_2',
        name: '微信表情包提示词',
        content: '请将以下文字转换为适合微信聊天的表情包文案，要求生动有趣、朗朗上口，并适当添加emoji表情符号。\n\n原始内容：\n【用户输入内容】',
        category: '创意设计',
        model: 'gemini-2.5-flash'
      },
      {
        id: 'prompt_3',
        name: '平台文案转换提示词',
        content: '你是一名专业的文案策划和内容创作者，你的任务是将来自【A平台】的原始文案，改写成符合【B平台】发布习惯和用户喜好的新文案。\n\n请严格遵循以下规则进行改写：\n\n1. **保留核心信息**：确保新文案完整保留原始文案中的关键信息。\n2. **转换文案风格**：将原始文案中**直接描述提示词**的部分，直接改写为"**下面是提示词👇**"。\n3. **适配目标平台**：根据【B平台】的特点，优化文案的语言风格、排版和互动性，使之更具吸引力。\n\n**原始文案（来自【A平台】）：**\n【用户输入内容】\n\n**新文案（适合【B平台】）：**',
        category: '内容可视化',
        model: 'gemini-2.5-flash'
      }
    ],
    promptSettings: {
      models: [
        {
          id: 'gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          apiKey: '', // 用户需要在设置中配置
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
        }
      ],
      defaultModel: 'gemini-2.5-flash'
    }
  };

  // 检查是否已有数据，如果没有则初始化
  const existingData = await chrome.storage.local.get(['promptCategories', 'promptPrompts', 'promptSettings']);

  if (!existingData.promptCategories) {
    await chrome.storage.local.set({ promptCategories: defaultPromptData.promptCategories });
  }

  if (!existingData.promptPrompts) {
    await chrome.storage.local.set({ promptPrompts: defaultPromptData.promptPrompts });
  }

  if (!existingData.promptSettings) {
    await chrome.storage.local.set({ promptSettings: defaultPromptData.promptSettings });
  }
}

// Background Script文件中转服务 - 支持分块传输
class BackgroundFileService {
  constructor() {
    this.fileStorage = new Map(); // 使用Map存储Blob对象
    this.fileMetadata = new Map(); // 存储文件元数据
    this.uploadSessions = new Map(); // 存储分块上传会话
    console.log('BackgroundFileService initialized with chunked transfer support');
  }

  // 初始化文件上传会话
  initFileUpload(metadata) {
    try {
      // 生成唯一文件ID
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 验证元数据
      if (!metadata || !metadata.name || !metadata.size || !metadata.totalChunks) {
        throw new Error('Invalid metadata: name, size, and totalChunks are required');
      }

      // 创建上传会话
      const session = {
        fileId: fileId,
        metadata: {
          id: fileId,
          name: metadata.name,
          size: metadata.size,
          type: metadata.type || 'application/octet-stream',
          lastModified: metadata.lastModified || Date.now(),
          timestamp: Date.now()
        },
        totalChunks: metadata.totalChunks,
        receivedChunks: new Map(), // 存储接收到的分块
        receivedCount: 0,
        isComplete: false
      };

      this.uploadSessions.set(fileId, session);
      console.log(`File upload session initialized: ${fileId} (${metadata.size} bytes, ${metadata.totalChunks} chunks)`);

      return fileId;
    } catch (error) {
      console.error('Failed to initialize file upload:', error);
      throw error;
    }
  }

  // 接收文件分块
  uploadFileChunk(fileId, chunkIndex, chunkData, isLastChunk = false) {
    try {
      const session = this.uploadSessions.get(fileId);
      if (!session) {
        throw new Error(`Upload session not found: ${fileId}`);
      }

      if (session.isComplete) {
        throw new Error(`Upload session already completed: ${fileId}`);
      }

      // 验证分块数据
      if (!Array.isArray(chunkData) || chunkData.length === 0) {
        throw new Error(`Invalid chunk data for chunk ${chunkIndex}`);
      }

      // 转换回Uint8Array
      const uint8Array = new Uint8Array(chunkData);
      session.receivedChunks.set(chunkIndex, uint8Array);
      session.receivedCount++;

      // 只在最后一个分块时输出日志
      if (isLastChunk || session.receivedCount === session.totalChunks) {
        console.log(`Received final chunk for ${fileId} (${session.receivedCount}/${session.totalChunks} chunks)`);
      }

      // 检查是否所有分块都已接收
      if (session.receivedCount === session.totalChunks || isLastChunk) {
        this.assembleFile(fileId);
      }

      return true;
    } catch (error) {
      console.error('Failed to upload chunk:', error);
      throw error;
    }
  }

  // 组装完整文件
  assembleFile(fileId) {
    try {
      const session = this.uploadSessions.get(fileId);
      if (!session) {
        throw new Error(`Upload session not found: ${fileId}`);
      }

      console.log(`Assembling file: ${fileId}`);

      // 按顺序组装分块
      const chunks = [];
      let totalSize = 0;

      for (let i = 0; i < session.totalChunks; i++) {
        const chunk = session.receivedChunks.get(i);
        if (!chunk) {
          throw new Error(`Missing chunk ${i} for file ${fileId}`);
        }
        chunks.push(chunk);
        totalSize += chunk.length;
      }

      // 创建完整的Blob
      const blob = new Blob(chunks, { type: session.metadata.type });

      // 验证文件大小
      if (blob.size !== session.metadata.size) {
        console.warn(`File size mismatch: expected ${session.metadata.size}, got ${blob.size}`);
        // 更新元数据中的实际大小
        session.metadata.size = blob.size;
      }

      // 存储完整文件
      this.fileStorage.set(fileId, blob);
      this.fileMetadata.set(fileId, session.metadata);

      // 标记会话完成
      session.isComplete = true;

      console.log(`File assembled successfully: ${fileId} (${blob.size} bytes)`);

      // 清理上传会话（延迟清理，以防需要重试）
      setTimeout(() => {
        this.uploadSessions.delete(fileId);
        console.log(`Upload session cleaned up: ${fileId}`);
      }, 60000); // 1分钟后清理

      return blob.size;
    } catch (error) {
      console.error('Failed to assemble file:', error);
      throw error;
    }
  }

  // 存储文件（兼容原有接口，用于降级）
  storeFile(fileData) {
    try {
      // 生成唯一文件ID
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 验证文件数据
      if (!fileData || !(fileData instanceof Blob)) {
        throw new Error('Invalid file data: must be a Blob object');
      }

      // 存储Blob对象
      this.fileStorage.set(fileId, fileData);

      // 存储元数据
      this.fileMetadata.set(fileId, {
        id: fileId,
        name: fileData.name || 'unknown',
        size: fileData.size,
        type: fileData.type,
        lastModified: fileData.lastModified || Date.now(),
        timestamp: Date.now()
      });

      console.log(`File stored in background (legacy): ${fileId} (${fileData.size} bytes)`);
      return fileId;
    } catch (error) {
      console.error('Failed to store file in background:', error);
      throw error;
    }
  }

  // 获取文件（返回Blob对象）
  getFile(fileId) {
    try {
      const blob = this.fileStorage.get(fileId);
      const metadata = this.fileMetadata.get(fileId);

      if (!blob || !metadata) {
        console.warn(`File not found in background: ${fileId}`);
        return null;
      }

      console.log(`File retrieved from background: ${fileId} (${blob.size} bytes)`);
      return {
        blob: blob,
        metadata: metadata
      };
    } catch (error) {
      console.error('Failed to get file from background:', error);
      return null;
    }
  }

  // 删除文件
  deleteFile(fileId) {
    try {
      const deleted = this.fileStorage.delete(fileId) && this.fileMetadata.delete(fileId);
      if (deleted) {
        console.log(`File deleted from background: ${fileId}`);
      }
      return deleted;
    } catch (error) {
      console.error('Failed to delete file from background:', error);
      return false;
    }
  }

  // 获取存储统计
  getStorageStats() {
    const totalFiles = this.fileStorage.size;
    let totalSize = 0;

    for (const blob of this.fileStorage.values()) {
      totalSize += blob.size;
    }

    return {
      totalFiles,
      totalSize,
      files: Array.from(this.fileMetadata.values())
    };
  }

  // 清理过期文件（可选）
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 默认24小时
    const now = Date.now();
    let cleanedCount = 0;

    for (const [fileId, metadata] of this.fileMetadata.entries()) {
      if (now - metadata.timestamp > maxAge) {
        this.deleteFile(fileId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired files from background`);
    }

    return cleanedCount;
  }
}

// 创建全局文件服务实例
const backgroundFileService = new BackgroundFileService();

// 添加服务状态检查
function checkServiceStatus() {
  console.log('Service status check:', {
    backgroundFileService: !!backgroundFileService,
    uploadSessions: backgroundFileService ? backgroundFileService.uploadSessions.size : 'N/A',
    fileStorage: backgroundFileService ? backgroundFileService.fileStorage.size : 'N/A'
  });
}

// 加载PublishManager
console.log('Loading PublishManager...');

try {
  importScripts('./PublishManager.js');
  console.log('✅ PublishManager loaded successfully');

  // 验证加载结果
  if (typeof self.PublishManager !== 'undefined') {
    console.log('✅ PublishManager class available');

    if (typeof self.publishManager === 'undefined') {
      console.log('Creating PublishManager instance...');
      self.publishManager = new self.PublishManager();
    }
  }
} catch (error) {
  console.error('❌ Failed to load PublishManager:', error.message);

  // 尝试备用路径
  const alternativePaths = ['PublishManager.js', '../background/PublishManager.js'];

  for (const path of alternativePaths) {
    try {
      importScripts(path);
      console.log(`✅ PublishManager loaded with alternative path: ${path}`);
      break;
    } catch (altError) {
      console.error(`❌ Alternative path ${path} failed:`, altError.message);
    }
  }
}

// 测试脚本已移除，此处保留注释以备将来开发需要

// 平台配置 - Service Worker环境下需要直接定义
// 注意：这里需要与 shared/config/platforms.js 保持同步
const SUPPORTED_PLATFORMS = [
  {
    id: 'weibo',
    name: '微博',
    publishUrl: 'https://weibo.com/',
    videoPublishUrl: 'https://weibo.com/upload/channel',
    color: 'bg-red-500',
    logoUrl: 'https://favicon.im/weibo.com',
    domain: 'weibo.com',
    supportsVideo: true
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    publishUrl: 'https://creator.xiaohongshu.com/new/home',
    videoPublishUrl: 'https://creator.xiaohongshu.com/publish/publish',
    color: 'bg-red-500',
    logoUrl: 'https://favicon.im/www.xiaohongshu.com',
    domain: 'xiaohongshu.com',
    supportsVideo: true
  },
  {
    id: 'jike',
    name: '即刻',
    publishUrl: 'https://web.okjike.com',
    color: 'bg-yellow-500',
    logoUrl: 'https://favicon.im/web.okjike.com',
    domain: 'okjike.com'
  },
  {
    id: 'douyin',
    name: '抖音',
    publishUrl: 'https://creator.douyin.com/creator-micro/home',
    videoPublishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
    color: 'bg-black',
    logoUrl: 'https://favicon.im/www.douyin.com',
    domain: 'douyin.com',
    supportsVideo: true
  },
  {
    id: 'x',
    name: 'X',
    publishUrl: 'https://x.com/home',
    color: 'bg-black',
    logoUrl: 'https://favicon.im/x.com',
    domain: 'x.com'
  },
  {
    id: 'bilibili',
    name: 'Bilibili',
    publishUrl: 'https://t.bilibili.com/',
    videoPublishUrl: 'https://member.bilibili.com/platform/upload/video/frame',
    color: 'bg-blue-500',
    logoUrl: 'https://favicon.im/www.bilibili.com',
    domain: 'bilibili.com',
    supportsVideo: true
  },
  {
    id: 'weixin',
    name: '微信公众号',
    publishUrl: 'https://mp.weixin.qq.com/',
    color: 'bg-green-500',
    logoUrl: 'https://favicon.im/mp.weixin.qq.com',
    domain: 'mp.weixin.qq.com',
    crossTab: true,
    editPagePattern: 'appmsg_edit_v2'
  },
  {
    id: 'weixin-article',
    name: '微信公众号文章',
    publishUrl: 'https://mp.weixin.qq.com/',
    color: 'bg-green-500',
    logoUrl: 'https://favicon.im/mp.weixin.qq.com',
    domain: 'mp.weixin.qq.com',
    crossTab: true,
    editPagePattern: 'appmsg_edit_v2',
    contentType: 'article'
  },
  {
    id: 'weixinchannels',
    name: '微信视频号',
    publishUrl: 'https://channels.weixin.qq.com/platform/post/finderNewLifeCreate',
    videoPublishUrl: 'https://channels.weixin.qq.com/platform/post/create',
    color: 'bg-green-500',
    logoUrl: 'https://favicon.im/channels.weixin.qq.com',
    domain: 'channels.weixin.qq.com',
    supportsVideo: true
  }
];

// 获取微信平台配置的辅助函数
function getWeixinPlatformConfig(platformId = 'weixin') {
  return SUPPORTED_PLATFORMS.find(p => p.id === platformId);
}

// 全局状态
let publishState = {
  isPublishing: false,
  currentTasks: [],
  publishResults: []
};

// 任务调度器 - 集成新的PublishManager
class TaskScheduler {
  constructor() {
    this.maxConcurrency = 8; // 最大并发数 - 支持更多平台同时发布
    this.activeJobs = new Map();
    this.taskQueue = [];
    this.runningTasks = new Set(); // 修复：初始化runningTasks

    // 检查PublishManager是否可用
    if (self.publishManager) {
      this.publishManager = self.publishManager;
      console.log('TaskScheduler initialized with PublishManager');
    } else {
      console.warn('PublishManager not available, using fallback mode');
      this.publishManager = null;
    }
  }

  async executeTasks(platforms, content) {
    console.log('Starting publish tasks for platforms:', platforms);

    publishState.isPublishing = true;
    publishState.currentTasks = platforms;

    // 不清空整个结果数组，而是只清空当前要发布的平台的状态
    // 这样可以保持其他平台（如正在优化的平台）的状态
    const platformIds = platforms.map(p => p.id);
    publishState.publishResults = publishState.publishResults.filter(
      result => !platformIds.includes(result.platform.id)
    );

    // 保存状态到存储
    await this.saveState();

    // 通知侧边栏发布开始
    this.broadcastMessage({
      action: 'publishStarted',
      data: { platforms, content }
    });

    // 创建任务
    const tasks = platforms.map(platform => ({
      platform,
      content,
      execute: () => this.executeTask(platform, content)
    }));

    // 分批执行，控制并发，增加平台间隔离
    const chunks = this.chunkArray(tasks, this.maxConcurrency);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      // 为每个任务添加随机延迟，避免同时启动
      const tasksWithDelay = chunk.map((task, index) => {
        const delay = index * 200 + Math.floor(Math.random() * 300); // 200-500ms随机延迟
        return async () => {
          await new Promise(resolve => setTimeout(resolve, delay));
          return task.execute();
        };
      });

      const results = await Promise.allSettled(
        tasksWithDelay.map(task => task())
      );

      // 记录每个任务的结果
      results.forEach((result, index) => {
        const platform = chunk[index].platform;
        if (result.status === 'rejected') {
          console.warn(`Platform ${platform} failed:`, result.reason);
        } else {
          console.log(`Platform ${platform} completed:`, result.value);
        }
      });

      // 批次间延迟
      if (chunkIndex < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    publishState.isPublishing = false;
    await this.saveState();

    // 通知发布完成
    this.broadcastMessage({
      action: 'publishCompleted',
      data: { results: publishState.publishResults }
    });
  }

  async executeTask(platform, content) {
    console.log(`Executing task for platform: ${platform.name}`);

    try {
      // 添加到运行中的任务
      this.runningTasks.add(platform.id);

      // 检查是否为跨标签页平台
      if (platform.crossTab) {
        return await this.handleCrossTabPlatform(platform, content);
      }

      // 更新状态为发布中
      this.updatePublishResult({
        platform,
        status: 'publishing',
        message: '正在打开发布页面...',
        timestamp: Date.now()
      });

      // 1. 打开平台发布页面（使用正确的内容类型URL）
      const actualPublishUrl = getPlatformPublishUrl(platform, content.contentType);
      console.log(`准备为 ${platform.name} 创建标签页，内容类型: ${content.contentType}，URL: ${actualPublishUrl}`);

      const tab = await chrome.tabs.create({
        url: actualPublishUrl,
        active: false
      });

      console.log(`Created tab ${tab.id} for ${platform.name}, actual URL: ${tab.url}`);

      // 等待页面加载
      await this.waitForTabLoad(tab.id);

      // 更新状态
      this.updatePublishResult({
        platform,
        status: 'publishing',
        message: '页面加载完成，等待content script准备就绪...',
        timestamp: Date.now()
      });

      // 2. 等待content script准备就绪
      await this.waitForContentScript(tab.id, platform);

      // 3. 发送内容预填充指令
      console.log(`发送发布消息到标签页 ${tab.id}，平台: ${platform.name}`, {
        action: 'publish',
        hasImages: !!(content.images && content.images.length > 0),
        hasVideos: !!(content.videos && content.videos.length > 0),
        imageCount: content.images ? content.images.length : 0,
        videoCount: content.videos ? content.videos.length : 0
      });

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'publish',
        data: content
      });

      console.log(`收到标签页 ${tab.id} 的响应:`, response);

      // 更新状态
      this.updatePublishResult({
        platform,
        status: 'publishing',
        message: '正在预填充内容...',
        timestamp: Date.now()
      });

      // 4. 等待预填充完成
      await this.delay(3000); // 等待3秒让预填充完成

      // 5. 预填充完成状态
      this.updatePublishResult({
        platform,
        status: 'ready',
        message: '内容已预填充，请手动确认并发布',
        publishUrl: actualPublishUrl,
        timestamp: Date.now()
      });

      // 6. 不自动关闭标签页，让用户手动操作
      console.log(`${platform.name} 内容预填充完成，标签页保持打开状态`);

      // 标记任务完成但不关闭标签页
      this.runningTasks.delete(platform.id);

    } catch (error) {
      console.error(`Failed to publish to ${platform.name}:`, error);

      // 从运行中的任务中移除
      this.runningTasks.delete(platform.id);

      this.updatePublishResult({
        platform,
        status: 'failed',
        message: error.message || '发布失败',
        timestamp: Date.now()
      });
    }
  }

  async waitForTabLoad(tabId) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = 30000; // 30秒超时

      const checkTab = () => {
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
            reject(new Error('Tab load timeout'));
            return;
          }

          setTimeout(checkTab, 500); // 统一使用500ms检查间隔
        });
      };

      checkTab();
    });
  }

  async waitForContentScript(tabId, platform) {
    const maxAttempts = 10;
    const delay = 1000; // 1秒

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`尝试连接到标签页 ${tabId} 的content script (${attempt}/${maxAttempts})`);

        // 发送ping消息测试连接
        const response = await chrome.tabs.sendMessage(tabId, {
          action: 'ping'
        });

        if (response && response.success) {
          console.log(`Content script for ${platform.name} 已准备就绪`);
          return;
        }
      } catch (error) {
        console.log(`尝试 ${attempt} 失败:`, error.message);

        if (attempt === maxAttempts) {
          throw new Error(`Content script for ${platform.name} 未能在 ${maxAttempts} 秒内准备就绪`);
        }

        // 等待后重试
        await this.delay(delay);
      }
    }
  }

  updatePublishResult(result) {
    // 更新结果数组
    const existingIndex = publishState.publishResults.findIndex(
      r => r.platform.id === result.platform.id
    );

    if (existingIndex >= 0) {
      publishState.publishResults[existingIndex] = result;
    } else {
      publishState.publishResults.push(result);
    }

    // 保存状态
    this.saveState();

    // 广播更新
    this.broadcastMessage({
      action: 'publishResult',
      data: result
    });
  }

  broadcastMessage(message) {
    // 发送消息到所有扩展页面
    chrome.runtime.sendMessage(message).catch(() => {
      // 忽略没有接收者的错误
    });
  }

  async saveState() {
    try {
      await chrome.storage.local.set({
        publishStatus: {
          isPublishing: publishState.isPublishing,
          timestamp: Date.now()
        },
        publishResults: publishState.publishResults
      });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  chunkArray(array, size) {
    return Array.from({ length: Math.ceil(array.length / size) },
      (_, i) => array.slice(i * size, i * size + size)
    );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 跨标签页平台处理方法
  async handleCrossTabPlatform(platform, content) {
    // 支持微信公众号和微信公众号文章
    if (platform.id === 'weixin' || platform.id === 'weixin-article') {
      return await this.publishToWeixin(platform, content);
    }

    throw new Error(`Unsupported cross-tab platform: ${platform.id}`);
  }

  // 微信公众号发布流程
  async publishToWeixin(platform, content) {
    try {
      console.log('开始微信公众号跨标签页发布流程');

      // 更新状态
      this.updatePublishResult({
        platform,
        status: 'publishing',
        message: '正在打开微信公众号首页...',
        timestamp: Date.now()
      });

      // 1. 打开微信公众号首页
      const homeTab = await chrome.tabs.create({
        url: platform.publishUrl,
        active: false
      });

      console.log(`Created WeChat home tab ${homeTab.id}, URL: ${homeTab.url}`);

      // 2. 将发布数据和首页标签页ID一次性存储到session storage
      const publishData = {
        title: content.title,
        content: content.content,
        files: content.files,
        fileIds: content.fileIds, // 确保fileIds被传递
        timestamp: Date.now(),
        status: 'waiting_for_edit_page',
        platform: platform.id,
        homeTabId: homeTab.id // 直接包含首页标签页ID
      };

      await chrome.storage.session.set({
        weixinPublishData: publishData
      });

      // 3. 等待页面加载
      await this.waitForTabLoad(homeTab.id);

      // 更新状态
      this.updatePublishResult({
        platform,
        status: 'publishing',
        message: '正在注入首页脚本...',
        timestamp: Date.now()
      });

      // 4. 注入首页content script
      console.log('开始注入首页脚本到标签页:', homeTab.id);
      await this.injectWeixinHomeScript(homeTab.id);
      console.log('✅ 首页脚本注入完成');

      // 等待脚本加载
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 根据平台类型确定按钮类型和消息内容
      const isArticleMode = platform.id === 'weixin-article';
      const buttonType = isArticleMode ? '文章' : '图文';
      const actionMessage = isArticleMode ? 'clickWeixinButton' : 'clickImageTextButton';

      // 更新状态
      this.updatePublishResult({
        platform,
        status: 'publishing',
        message: `正在点击${buttonType}按钮...`,
        timestamp: Date.now()
      });

      // 5. 发送点击按钮的指令（根据平台类型选择不同的按钮）
      console.log(`发送点击${buttonType}按钮消息到标签页:`, homeTab.id);
      const messageData = {
        action: actionMessage
      };

      // 如果是统一处理方式，传递平台类型
      if (actionMessage === 'clickWeixinButton') {
        messageData.platformType = platform.id;
      }

      const response = await chrome.tabs.sendMessage(homeTab.id, messageData);

      console.log('收到首页标签页响应:', response);

      if (!response || !response.success) {
        throw new Error(`点击${buttonType}按钮失败: ` + (response?.error || '未知错误'));
      }

      console.log(`✅ ${buttonType}按钮点击成功，等待编辑页面打开...`);

      // 更新状态
      this.updatePublishResult({
        platform,
        status: 'publishing',
        message: '等待编辑页面打开...',
        timestamp: Date.now()
      });

      // 6. 等待编辑页面自动打开并处理（通过标签页监听器）
      // 这里不需要等待，因为标签页监听器会处理后续流程

      return { success: true, platform };
    } catch (error) {
      console.error('微信公众号发布失败:', error);

      this.updatePublishResult({
        platform,
        status: 'failed',
        message: error.message,
        timestamp: Date.now()
      });

      throw error;
    }
  }

  // 注入微信首页脚本
  async injectWeixinHomeScript(tabId) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/adapters/weixin-home.js']
    });
  }

  // 注入微信编辑页脚本
  async injectWeixinEditScript(tabId) {
    try {
      console.log('注入依赖脚本: UniversalContentInjector.js');
      // 先注入依赖脚本
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/shared/UniversalContentInjector.js']
      });
      console.log('✅ UniversalContentInjector.js 注入成功');

      console.log('注入微信编辑页脚本: weixin-edit.js');
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/adapters/weixin-edit.js']
      });
      console.log('✅ weixin-edit.js 注入成功');
    } catch (error) {
      console.error('❌ 脚本注入失败:', error);
      throw error;
    }
  }
}

// 创建任务调度器实例
const taskScheduler = new TaskScheduler();

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async () => {
  console.log('Extension icon clicked');

  try {
    // 创建新标签页并打开主页面
    const newTab = await chrome.tabs.create({
      url: chrome.runtime.getURL('main/main.html'),
      active: true
    });

    console.log('Created new tab:', newTab.id);
  } catch (error) {
    console.error('Failed to create new tab:', error);
  }
});

// 监听消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message);

  // 分块文件上传消息处理
  if (message.action === 'initFileUpload') {
    console.log('Processing initFileUpload request:', message.metadata);
    try {
      if (!backgroundFileService) {
        throw new Error('BackgroundFileService not initialized');
      }

      const fileId = backgroundFileService.initFileUpload(message.metadata);
      console.log('File upload initialized successfully:', fileId);
      sendResponse({ success: true, fileId: fileId });
    } catch (error) {
      console.error('Failed to initialize file upload:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // 保持消息通道开放
  }

  if (message.action === 'uploadFileChunk') {
    try {
      if (!backgroundFileService) {
        throw new Error('BackgroundFileService not initialized');
      }

      const result = backgroundFileService.uploadFileChunk(
        message.fileId,
        message.chunkIndex,
        message.chunkData,
        message.isLastChunk
      );
      sendResponse({ success: true, result: result });
    } catch (error) {
      console.error('Failed to upload file chunk:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // 保持消息通道开放
  }

  // 文件操作消息处理（兼容原有接口）
  if (message.action === 'storeFile') {
    try {
      const fileId = backgroundFileService.storeFile(message.fileData);
      sendResponse({ success: true, fileId: fileId });
    } catch (error) {
      console.error('Failed to store file:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // 保持消息通道开放
  }

  if (message.action === 'getFile') {
    try {
      const fileData = backgroundFileService.getFile(message.fileId);
      if (fileData) {
        // 将Blob转换为ArrayBuffer以便传输 - 优化版本
        fileData.blob.arrayBuffer().then(arrayBuffer => {
          const uint8Array = new Uint8Array(arrayBuffer);
          const arrayData = Array.from(uint8Array);

          // 简化的数据完整性验证
          if (arrayData.length !== fileData.blob.size) {
            console.error(`[Background] 文件数据完整性检查失败: ${message.fileId}`);
            sendResponse({
              success: false,
              error: `文件数据完整性检查失败`
            });
            return;
          }

          sendResponse({
            success: true,
            arrayData: arrayData,
            metadata: {
              ...fileData.metadata,
              size: fileData.blob.size // 确保包含正确的大小
            }
          });
        }).catch(error => {
          console.error(`[Background] 文件转换失败: ${message.fileId}`, error);
          sendResponse({ success: false, error: `文件转换失败: ${error.message}` });
        });
      } else {
        sendResponse({ success: false, error: 'File not found' });
      }
    } catch (error) {
      console.error(`[Background] getFile处理异常: ${message.fileId}`, error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // 保持消息通道开放
  }

  if (message.action === 'deleteFile') {
    try {
      const deleted = backgroundFileService.deleteFile(message.fileId);
      sendResponse({ success: deleted });
    } catch (error) {
      console.error('Failed to delete file:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (message.action === 'getStorageStats') {
    try {
      checkServiceStatus(); // 添加状态检查
      const stats = backgroundFileService.getStorageStats();
      sendResponse({ success: true, stats: stats });
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  // 添加服务状态检查消息
  if (message.action === 'checkServiceStatus') {
    try {
      checkServiceStatus();
      sendResponse({
        success: true,
        status: {
          backgroundFileService: !!backgroundFileService,
          uploadSessions: backgroundFileService ? backgroundFileService.uploadSessions.size : 0,
          fileStorage: backgroundFileService ? backgroundFileService.fileStorage.size : 0
        }
      });
    } catch (error) {
      console.error('Failed to check service status:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  // 发布相关消息处理
  if (message.action === 'startPublish') {
    handlePublishRequest(message.data);
    sendResponse({ success: true });
    return true; // 保持消息通道开放
  } else if (message.action === 'retryPublish') {
    handleRetryRequest(message.data);
    sendResponse({ success: true });
    return true; // 保持消息通道开放
  } else if (message.action === 'getPublishStatus') {
    sendResponse({
      isPublishing: publishState.isPublishing,
      results: publishState.publishResults
    });
    return true; // 保持消息通道开放
  } else if (message.action === 'pageRefreshed') {
    // 处理主页面刷新事件
    handlePageRefresh(message.data);
    sendResponse({ success: true });
    return true; // 保持消息通道开放
  } else if (message.action === 'updatePlatformOptimizationStatus') {
    // 处理平台优化状态更新
    handlePlatformOptimizationStatusUpdate(message);
    sendResponse({ success: true });
    return true; // 保持消息通道开放
  } else if (message.action === 'resetPublishState') {
    // 处理发布状态重置
    handleResetPublishState(message.data);
    sendResponse({ success: true });
    return true; // 保持消息通道开放
  } else if (message.action === 'extensionOpened') {
    // 处理扩展程序图标打开事件
    handleExtensionOpened(message.data);
    sendResponse({ success: true });
    return true; // 保持消息通道开放
  } else if (message.action === 'debugPlatforms') {
    // 调试命令：检查当前平台配置
    console.log('=== 平台配置调试信息 ===');
    SUPPORTED_PLATFORMS.forEach(platform => {
      console.log(`${platform.name} (${platform.id}): ${platform.publishUrl}`);
    });
    sendResponse({ success: true, platforms: SUPPORTED_PLATFORMS });

  } else if (message.action === 'weixinEditScriptLoaded') {
    // 微信编辑页脚本加载确认
    console.log('✅ 收到微信编辑页脚本加载确认:', {
      url: message.url,
      timestamp: message.timestamp
    });
    sendResponse({ success: true });

  } else if (message.action === 'extractArticle') {
    // 文章抓取请求
    handleArticleExtraction(message.url, sendResponse);
    return true; // 保持消息通道开放

  }

  return true; // 保持消息通道开放
});

// 生成发布数据统计信息的辅助函数
function getPublishDataStats(data) {
  const { title, content, summary, platforms, images, videos, files, fileIds } = data;
  return {
    title,
    content,
    summary,
    hasSummary: !!summary,
    summaryLength: summary?.length || 0,
    platforms: platforms.length,
    imageCount: images ? images.length : 0,
    videoCount: videos ? videos.length : 0,
    fileCount: files ? files.length : 0,
    fileIdsCount: fileIds ? fileIds.length : 0,
    hasImages: !!(images && images.length > 0),
    hasVideos: !!(videos && videos.length > 0),
    hasFiles: !!(files && files.length > 0),
    hasFileIds: !!(fileIds && fileIds.length > 0),
    usingNewFileSystem: !!(fileIds && fileIds.length > 0)
  };
}

async function handlePublishRequest(data) {
  // 支持新的fileIds字段和原有的images/files/videos字段，以及summary字段
  const { title, content, summary, contentType, platforms, images, videos, files, fileIds } = data;

  console.log('🔍 [DEBUG] Background Script - 处理发布请求:', {
    ...getPublishDataStats(data),
    hasSummary: !!summary,
    summary: summary,
    summaryLength: summary?.length || 0,
    timestamp: new Date().toISOString()
  });

  if (!content || !platforms || platforms.length === 0) {
    console.error('Invalid publish data');
    return;
  }

  try {
    // 保存发布数据 - 添加summary字段
    const publishData = {
      title,
      content,
      summary: data.summary || '', // 添加导语字段
      contentType,
      platforms
    };

    // 添加详细的导语数据调试
    console.log('🔍 [DEBUG] Background Script - 构建发布数据:', {
      hasSummary: !!data.summary,
      summary: data.summary,
      summaryLength: data.summary?.length || 0,
      summaryType: typeof data.summary,
      publishDataSummary: publishData.summary,
      timestamp: new Date().toISOString()
    });

    if (fileIds && fileIds.length > 0) {
      // 新方案：只保存文件ID
      publishData.fileIds = fileIds;
      console.log('Using new file management system with fileIds:', fileIds);
    } else {
      // 原有方案：保存图片和视频数据（向后兼容）
      publishData.images = images;
      publishData.videos = videos; // 添加视频数据支持
      publishData.files = files;
      console.log('Using legacy file management system');
    }

    await chrome.storage.local.set({ publishData });

    // 执行发布任务
    await taskScheduler.executeTasks(platforms, publishData);

  } catch (error) {
    console.error('Failed to execute publish tasks:', error);

    // 通知前端发布失败
    try {
      const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('main/main.html') });
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'publishError',
          error: error.message
        });
      }
    } catch (notifyError) {
      console.error('Failed to notify frontend of error:', notifyError);
    }
  }
}

async function handleRetryRequest(data) {
  const { platform } = data;

  console.log('Handling retry request for platform:', platform);

  try {
    // 获取当前内容
    const result = await chrome.storage.local.get(['publishData']);
    if (result.publishData) {
      console.log('Retry with data:', getPublishDataStats(result.publishData));

      // 根据内容类型更新平台的发布URL
      const actualPublishUrl = getPlatformPublishUrl(platform, result.publishData.contentType);
      const updatedPlatform = {
        ...platform,
        publishUrl: actualPublishUrl
      };

      console.log(`重试时使用的URL: ${actualPublishUrl} (内容类型: ${result.publishData.contentType})`);

      // 传递完整的发布数据和更新后的平台配置
      await taskScheduler.executeTask(updatedPlatform, result.publishData);
    }
  } catch (error) {
    console.error('Failed to retry publish:', error);
  }
}

/**
 * 根据内容类型获取平台的发布URL
 * @param {Object} platform - 平台配置
 * @param {string} contentType - 内容类型
 * @returns {string} - 发布URL
 */
function getPlatformPublishUrl(platform, contentType) {
  if (contentType === '短视频' && platform.videoPublishUrl) {
    return platform.videoPublishUrl;
  }
  return platform.publishUrl;
}

// 统一的页面状态清理函数
async function handlePageStateReset(eventType, data) {
  console.log(`Handling ${eventType} event:`, data);

  try {
    if (data.clearSidepanel) {
      // 清空发布状态数据
      await chrome.storage.local.remove(['publishResults']);
      console.log('Cleared publish results from storage');

      // 关闭侧边栏
      await closeSidepanel();
    }
  } catch (error) {
    console.error(`Failed to handle ${eventType}:`, error);
  }
}

// 页面刷新事件处理器
async function handlePageRefresh(data) {
  return handlePageStateReset('page refresh', data);
}

// 扩展程序打开事件处理器
async function handleExtensionOpened(data) {
  return handlePageStateReset('extension opened', data);
}

// 关闭侧边栏的统一函数
async function closeSidepanel() {
  try {
    // 方法1：向侧边栏发送关闭消息（让侧边栏自己处理关闭）
    await chrome.runtime.sendMessage({
      action: 'closeSidepanel',
      data: { reason: 'pageRefreshed' }
    });
    console.log('Sidepanel close message sent');
  } catch (messageError) {
    // 如果消息发送失败，尝试直接关闭
    console.log('Message failed, trying direct close:', messageError.message);

    try {
      // 方法2：直接禁用侧边栏
      const mainTabs = await chrome.tabs.query({ url: chrome.runtime.getURL('main/main.html') });
      if (mainTabs.length > 0) {
        await chrome.sidePanel.setOptions({
          tabId: mainTabs[0].id,
          enabled: false
        });
        console.log('Sidepanel disabled directly');
      }
    } catch (directError) {
      console.log('Direct sidepanel close also failed:', directError.message);
    }
  }
}

// 监听标签页更新，确保内容脚本正确注入
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 添加详细的标签页更新日志
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('📋 标签页更新:', {
      tabId,
      url: tab.url,
      title: tab.title,
      status: changeInfo.status
    });

    // 从平台配置中动态获取支持的域名
    const supportedDomains = SUPPORTED_PLATFORMS.map(platform => platform.domain);
    console.log('支持的域名:', supportedDomains);

    const isSupported = supportedDomains.some(domain => tab.url.includes(domain));
    console.log('是否为支持的平台:', isSupported);

    if (isSupported) {
      const platform = getPlatformFromUrl(tab.url);
      console.log('检测到的平台:', platform);

      if (platform) {
        console.log(`✅ Tab updated for platform: ${platform}`);

        // 处理跨标签页平台（支持微信公众号和微信公众号文章）
        if (platform === 'weixin' || platform === 'weixin-article') {
          console.log('🎯 开始处理微信公众号跨标签页逻辑');
          await handleWeixinTabUpdate(tabId, tab.url);
        }

        // 内容脚本会通过 manifest.json 自动注入
      }
    }
  }
});

function getPlatformFromUrl(url) {
  // 基于平台配置动态检测，避免硬编码
  const platform = SUPPORTED_PLATFORMS.find(p => url.includes(p.domain));
  return platform ? platform.id : null;
}

// 微信公众号标签页更新处理
async function handleWeixinTabUpdate(tabId, url) {
  console.log('处理微信标签页更新:', { tabId, url });

  // 检测是否是微信公众号编辑页面
  if (isWeixinEditPage(url)) {
    // 日志已在 isWeixinEditPage 函数内输出，避免重复

    try {
      // 检查是否有待处理的发布数据
      console.log('检查session storage中的发布数据...');
      const result = await chrome.storage.session.get(['weixinPublishData']);
      console.log('Session storage结果:', result);

      if (result.weixinPublishData && result.weixinPublishData.status === 'waiting_for_edit_page') {
        // 根据存储的平台ID获取对应的平台配置
        const platformId = result.weixinPublishData.platform || 'weixin';
        const weixinPlatform = getWeixinPlatformConfig(platformId);

        console.log('✅ 找到待处理的微信发布数据，开始处理编辑页面', {
          platformId: platformId,
          platformName: weixinPlatform?.name
        });

        // 🧹 提前清理首页标签页（优化用户体验，让用户更快看到标签页被清理）
        if (result.weixinPublishData.homeTabId) {
          try {
            console.log('🧹 编辑页面已打开，立即关闭首页标签页:', result.weixinPublishData.homeTabId);
            await chrome.tabs.remove(result.weixinPublishData.homeTabId);
            console.log('✅ 首页标签页已提前清理');
          } catch (tabError) {
            // 标签页可能已经被用户关闭，这不是致命错误
            console.log('⚠️ 首页标签页清理失败（可能已被关闭）:', tabError.message);
          }
        }

        // 更新发布状态
        taskScheduler.updatePublishResult({
          platform: { id: weixinPlatform.id, name: weixinPlatform.name },
          status: 'publishing',
          message: '正在注入编辑页面脚本...',
          timestamp: Date.now()
        });

        // 注入编辑页面content script
        console.log('开始注入编辑页面脚本到标签页:', tabId);
        await taskScheduler.injectWeixinEditScript(tabId);
        console.log('✅ 编辑页面脚本注入完成');

        // 等待脚本加载
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 更新发布状态
        taskScheduler.updatePublishResult({
          platform: { id: weixinPlatform.id, name: weixinPlatform.name },
          status: 'publishing',
          message: '正在注入内容...',
          timestamp: Date.now()
        });

        // 发送发布数据到新标签页
        console.log('发送内容注入消息到标签页:', tabId);
        console.log('发送的数据:', {
          action: 'injectContent',
          title: result.weixinPublishData.title,
          contentLength: result.weixinPublishData.content?.length || 0
        });

        // 添加超时处理的消息发送
        const response = await Promise.race([
          chrome.tabs.sendMessage(tabId, {
            action: 'injectContent',
            data: result.weixinPublishData
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('消息发送超时')), 10000)
          )
        ]);

        console.log('收到编辑页面响应:', response);
        console.log('响应类型:', typeof response);
        console.log('响应详情:', {
          hasResponse: !!response,
          success: response?.success,
          message: response?.message,
          error: response?.error
        });

        if (response && response.success) {
          console.log('✅ 内容注入成功');

          // 更新状态为待确认（与其他平台保持一致，显示重试按钮）
          taskScheduler.updatePublishResult({
            platform: { id: weixinPlatform.id, name: weixinPlatform.name },
            status: 'ready',
            message: '内容注入成功，请在编辑页面完成发布',
            timestamp: Date.now()
          });

          // 更新存储状态（首页标签页已在前面清理，无需再次设置）
          await chrome.storage.session.set({
            weixinPublishData: {
              ...result.weixinPublishData,
              status: 'content_injected',
              editTabId: tabId
              // homeTabId 已在前面清理时移除，无需重复设置为null
            }
          });
        } else {
          throw new Error('内容注入失败: ' + (response?.error || '未知错误'));
        }
      } else {
        console.log('⚠️ 未找到待处理的微信发布数据或状态不匹配');
      }
    } catch (error) {
      console.error('处理微信编辑页面失败:', error);

      // 尝试获取平台配置用于错误状态更新
      try {
        const result = await chrome.storage.session.get(['weixinPublishData']);
        const platformId = result.weixinPublishData?.platform || 'weixin';
        const weixinPlatform = getWeixinPlatformConfig(platformId);

        if (weixinPlatform) {
          // 更新状态为失败
          taskScheduler.updatePublishResult({
            platform: { id: weixinPlatform.id, name: weixinPlatform.name },
            status: 'failed',
            message: error.message,
            timestamp: Date.now()
          });
        }
      } catch (statusError) {
        console.error('更新错误状态失败:', statusError);
      }
    }
  }
}

// 检测微信公众号编辑页面
function isWeixinEditPage(url) {
  const weixinConfig = getWeixinPlatformConfig();
  const isWeixinDomain = url.includes(weixinConfig.domain);
  const hasEditPattern = url.includes(weixinConfig.editPagePattern);
  const hasEditAction = url.includes('action=edit');

  const result = isWeixinDomain && hasEditPattern && hasEditAction;

  // 只在检测到编辑页面时输出日志，减少冗余输出
  if (result) {
    console.log('✅ 检测到微信编辑页面:', url);
  }

  return result;
}

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('动态发布助手已安装/更新', details);

  try {
    // 清理旧数据和缓存
    await chrome.storage.local.clear();
    console.log('旧数据已清理');

    // 初始化提示词助手数据
    await initializePromptData();
    console.log('提示词助手数据初始化完成');

    // 验证平台配置完整性
    validatePlatformConfig();
  } catch (error) {
    console.error('扩展初始化失败:', error);
  }
});

/**
 * 验证平台配置的完整性和正确性
 */
function validatePlatformConfig() {
  console.log('验证平台配置...');

  const requiredFields = ['id', 'name', 'publishUrl', 'color', 'logoUrl', 'domain'];
  let isValid = true;

  SUPPORTED_PLATFORMS.forEach(platform => {
    const missingFields = requiredFields.filter(field => !platform[field]);
    if (missingFields.length > 0) {
      console.error(`❌ 平台 ${platform.name || platform.id} 缺少必要字段: ${missingFields.join(', ')}`);
      isValid = false;
    }

    // 验证抖音URL配置
    if (platform.id === 'douyin' && platform.publishUrl.includes('content/upload')) {
      console.error('⚠️ 检测到旧的抖音URL配置，请检查配置文件！');
      isValid = false;
    }
  });

  if (isValid) {
    console.log(`✅ 平台配置验证通过，共 ${SUPPORTED_PLATFORMS.length} 个平台`);
  } else {
    console.error('❌ 平台配置验证失败，请检查配置文件');
  }
}

// Service Worker 启动时恢复状态
chrome.runtime.onStartup.addListener(async () => {
  try {
    const result = await chrome.storage.local.get(['publishStatus', 'publishResults']);
    if (result.publishStatus) {
      publishState.isPublishing = result.publishStatus.isPublishing || false;
    }
    if (result.publishResults) {
      publishState.publishResults = result.publishResults;
    }
    console.log('Background state restored:', publishState);
  } catch (error) {
    console.error('Failed to restore state:', error);
  }
});

console.log('动态发布助手后台脚本已加载');

// 文章抓取处理函数
async function handleArticleExtraction(url, sendResponse) {
  console.log('开始处理文章抓取请求:', url);

  try {
    // 验证URL
    if (!url || typeof url !== 'string') {
      throw new Error('无效的URL');
    }

    // 创建文章抓取服务实例
    const extractorService = new ArticleExtractorService();

    // 执行文章抓取
    const result = await extractorService.extractArticle(url);

    console.log('文章抓取成功:', {
      title: result.title,
      length: result.length,
      platform: result.platform
    });

    sendResponse({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('文章抓取处理异常:', error);
    sendResponse({
      success: false,
      error: error.message || '抓取失败，请重试'
    });
  }
}

// 处理平台优化状态更新
function handlePlatformOptimizationStatusUpdate(message) {
  console.log('📊 后台脚本收到平台优化状态更新:', message);

  try {
    // 创建发布结果对象，与现有的发布结果格式保持一致
    const publishResult = {
      platform: {
        id: message.platformId,
        name: getPlatformNameById(message.platformId)
      },
      status: message.status,
      message: message.message,
      timestamp: message.timestamp,
      isOptimizing: message.status === 'optimizing'
    };

    // 更新发布状态
    taskScheduler.updatePublishResult(publishResult);

    console.log('✅ 平台优化状态已更新并转发到侧边栏');

  } catch (error) {
    console.error('❌ 处理平台优化状态更新失败:', error);
  }
}

// 处理发布状态重置 - 优化版本
function handleResetPublishState(data) {
  console.log('🔄 后台脚本收到发布状态重置请求:', data.reason);

  try {
    // 批量重置发布状态
    Object.assign(publishState, {
      publishResults: [],
      isPublishing: false
    });

    // 保存并广播状态变更
    taskScheduler.saveState();
    taskScheduler.broadcastMessage({
      action: 'publishStateReset',
      data: {
        reason: data.reason,
        selectedPlatforms: data.selectedPlatforms,
        timestamp: Date.now()
      }
    });

    console.log('✅ 发布状态已重置');

  } catch (error) {
    console.error('❌ 重置发布状态失败:', error);
  }
}

// 根据平台ID获取平台名称的辅助函数 - 使用统一的PlatformUtils
function getPlatformNameById(platformId) {
  // 如果PlatformUtils可用，使用统一工具
  if (typeof PlatformUtils !== 'undefined' && PlatformUtils.getPlatformNameById) {
    return PlatformUtils.getPlatformNameById(platformId);
  }

  // 降级到本地实现（保持兼容性）
  const platformNames = {
    'weibo': '微博',
    'xiaohongshu': '小红书',
    'douyin': '抖音',
    'jike': '即刻',
    'bilibili': 'B站',
    'weixinchannels': '微信视频号',
    'weixin': '微信公众号',
    'weixin-article': '微信公众号(文章)'
  };
  return platformNames[platformId] || platformId;
}






