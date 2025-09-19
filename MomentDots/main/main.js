// 动态发布助手 - 主页面 (新标签页模式)
console.log('Main page script loaded');

// 注意：将在页面加载后动态加载平台配置和存储工具

// 统一DOM缓存管理器
class DOMCache {
  constructor() {
    this.elements = {};
    this.containers = {};
  }

  get(id) {
    if (!this.elements[id]) {
      this.elements[id] = document.getElementById(id);
    }
    return this.elements[id];
  }

  clear() {
    this.elements = {};
    this.containers = {};
  }

  refresh(id) {
    delete this.elements[id];
    return this.get(id);
  }

  // 获取或创建容器元素
  getContainer(key, createFn) {
    if (!this.containers[key] || !this.containers[key].parentNode) {
      this.containers[key] = createFn();
    }
    return this.containers[key];
  }

  // 批量初始化常用元素
  initCommonElements() {
    const commonIds = [
      // 媒体相关
      'image-preview', 'image-count', 'clear-all-images',
      'image-upload', 'video-upload',
      'platform-list', 'video-count', 'cover-count',

      // 内容输入
      'title-input', 'content-textarea',

      // 文章相关
      'article-title-input', 'article-excerpt-input', 'article-rich-editor',
      'fetch-article-btn', 'article-url-input',

      // 短视频相关
      'short-video-upload', 'horizontal-cover-upload', 'vertical-cover-upload',
      'short-video-upload-area', 'video-upload-area',

      // 操作按钮
      'sync-button', 'toggle-format-btn', 'copy-content-btn', 'clear-content-btn'
    ];

    commonIds.forEach(id => {
      this.get(id);
    });
  }
}

// 常量配置
const CONFIG = {
  DEBOUNCE_DELAY: 300, // 防抖延迟时间（毫秒）
  NOTIFICATION_HIDE_DELAY: 300 // 通知隐藏延迟时间（毫秒）
};

// 提示词选择器配置常量
const PROMPT_SELECTOR_CONFIG = {
  DELAYS: {
    SIDEBAR_LOAD: 800,        // 侧边栏加载延迟
    SIDEBAR_QUICK: 100,       // 侧边栏快速响应延迟
    POPUP_HIDE: 100,          // 弹窗隐藏延迟
    OUTSIDE_CLICK: 100,       // 外部点击检测延迟
    CONFIG_SAVE: 500          // 配置保存延迟（批量处理）
  },
  LIMITS: {
    MAX_PROMPTS_PER_PLATFORM: 3,  // 每个平台最大提示词数量
    POPUP_WIDTH: 320,              // 弹窗宽度（从250px增加到320px）
    POPUP_HEIGHT: 240              // 弹窗高度（相应调整）
  },
  SELECTORS: {
    PROMPT_CONTAINER: '.prompt-selector-container',
    PROMPT_LABEL: '.prompt-label',
    PROMPT_CHECKBOX: '.prompt-checkbox',
    PROMPT_ITEM: '.prompt-item',
    ADD_PROMPT_BTN: '.add-prompt-btn',
    REMOVE_PROMPT_BTN: '.remove-prompt-btn'
  }
};

// 工具函数集合（提前定义以避免初始化顺序问题）
const Utils = {
  // 格式化文件大小显示
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 防抖函数 - 优化频繁操作
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // 节流函数 - 限制执行频率
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // 错误边界处理
  safeExecute(fn, errorMessage = '操作失败') {
    try {
      return fn();
    } catch (error) {
      this.handleError(error, errorMessage);
      return null;
    }
  },

  // 统一的错误处理
  handleError(error, context = '操作失败', showNotif = true) {
    // 使用统一的错误处理器
    let processedError = error;
    let userMessage = error?.message || error || '未知错误';

    if (window.errorHandler) {
      processedError = window.errorHandler.handle(error, { context, component: 'Utils' });
      userMessage = processedError.getUserMessage ? processedError.getUserMessage() : userMessage;
    }

    console.error(`❌ ${context}:`, processedError);

    if (showNotif && typeof showNotification === 'function') {
      showNotification(`${context}: ${userMessage}`, 'error');
    }

    return { error: true, message: userMessage, context };
  },

  // 性能监控
  performanceMonitor: {
    timers: new Map(),

    start(label) {
      this.timers.set(label, performance.now());
    },

    end(label) {
      const startTime = this.timers.get(label);
      if (startTime) {
        const duration = performance.now() - startTime;
        console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
        this.timers.delete(label);
        return duration;
      }
      return null;
    }
  }
};

// 文章数据处理器
class ArticleDataProcessor {
  /**
   * 格式化文章为指定格式
   * @param {Object} article - 文章数据
   * @param {string} format - 格式类型 ('markdown', 'plaintext', 'html')
   * @returns {string} - 格式化后的内容
   */
  static formatArticle(article, format = 'markdown') {
    if (!article) return '';

    switch (format) {
      case 'markdown':
        return this.formatAsMarkdown(article);
      case 'plaintext':
        return this.formatAsPlainText(article);
      case 'html':
        return this.formatAsHtml(article);
      default:
        return this.formatAsMarkdown(article);
    }
  }

  /**
   * 格式化为Markdown格式
   * @private
   */
  static formatAsMarkdown(article) {
    let content = '';

    if (article.title) {
      content += `# ${article.title}\n\n`;
    }

    if (article.excerpt) {
      content += `> ${article.excerpt}\n\n`;
    }

    if (article.content) {
      content += FormatConverter.htmlToMarkdown(article.content);
    }

    if (article.url) {
      content += `\n\n---\n\n**原文链接：** ${article.url}`;
    }

    return content;
  }

  /**
   * 格式化为纯文本格式
   * @private
   */
  static formatAsPlainText(article) {
    let content = '';

    if (article.title) {
      content += `${article.title}\n\n`;
    }

    if (article.excerpt) {
      content += `${article.excerpt}\n\n`;
    }

    if (article.content) {
      // 使用Utils的统一文本提取方法
      content += Utils.htmlToPlainText(article.content);
    }

    if (article.url) {
      content += `\n\n---\n原文链接：${article.url}`;
    }

    return content;
  }

  /**
   * 格式化为HTML格式
   * @private
   */
  static formatAsHtml(article) {
    return article.content || '';
  }


  /**
   * 验证文章数据完整性
   * @param {Object} article - 文章数据
   * @returns {Object} - 验证结果
   */
  static validateArticle(article) {
    const issues = [];
    const warnings = [];

    if (!article) {
      issues.push('文章数据为空');
      return { valid: false, issues, warnings };
    }

    // 检查必要字段
    if (!article.title || article.title.trim() === '') {
      issues.push('缺少文章标题');
    }

    if (!article.content || article.content.trim() === '') {
      issues.push('缺少文章内容');
    }

    // 检查可选但重要的字段
    if (!article.excerpt) {
      warnings.push('建议添加文章摘要');
    }

    if (!article.url) {
      warnings.push('缺少原文链接');
    }

    if (article.length && article.length < 100) {
      warnings.push('文章内容较短，可能不完整');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      score: this._calculateQualityScore(article)
    };
  }

  /**
   * 计算文章质量评分（简化版）
   * @private
   */
  static _calculateQualityScore(article) {
    let score = 0;

    // 基础必要字段
    if (article.title) score += 30;
    if (article.content) score += 50;

    // 可选增强字段
    if (article.excerpt) score += 10;
    if (article.url) score += 10;

    return score;
  }

  /**
   * 清理和标准化文章数据
   * @param {Object} article - 原始文章数据
   * @returns {Object} - 清理后的文章数据
   */
  static cleanArticleData(article) {
    if (!article) return null;

    return {
      title: (article.title || '').trim(),
      content: article.content || '',
      textContent: article.textContent || '',
      excerpt: (article.excerpt || '').trim(),
      url: article.url || '',
      byline: article.byline || '',
      siteName: article.siteName || '',
      publishedTime: article.publishedTime || '',
      readingTime: article.readingTime || 0,
      length: article.length || 0,
      images: article.images || [],
      links: article.links || [],
      videos: article.videos || [],
      platform: article.platform || '',
      timestamp: article.timestamp || new Date().toISOString()
    };
  }
}

// 短视频状态管理工具
class ShortVideoStateManager {
  /**
   * 统一的上传完成处理
   * @param {Object} data - 文件数据
   * @param {string} type - 类型 ('video' 或 'cover')
   * @param {string} message - 成功消息
   */
  static handleUploadSuccess(data, type, message) {
    // 确保当前内容类型保持为短视频，防止意外切换
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

    // 使用专门的短视频状态保存函数，避免触发页面切换
    this.saveShortVideoState();
    showNotification(message, 'success');
  }

  /**
   * 专门的短视频状态保存函数
   * 避免触发完整的UI更新和页面切换
   */
  static saveShortVideoState() {
    // 直接调用存储保存，不使用防抖，确保状态立即保存
    saveToStorageData().catch(error => {
      console.error('短视频状态保存失败:', error);
    });
  }


}

// 简化的文件错误处理工具
class FileErrorHandler {
  /**
   * 处理文件相关错误（统一入口）
   * @param {Error|string} error - 错误对象或错误消息
   * @param {string} fileName - 文件名（可选）
   * @param {string} context - 错误上下文
   */
  static handleFileError(error, fileName = '', context = '文件操作') {
    let message = error?.message || error || '未知错误';

    // 如果有文件名，添加到消息中
    if (fileName) {
      message = `${message}: ${fileName}`;
    }

    // 使用统一的错误处理器
    Utils.handleError(new Error(message), context);
  }

  /**
   * 处理文件数量限制错误
   */
  static handleCountLimitError(maxCount, fileType = '图片') {
    const message = `最多只能上传 ${maxCount} 个${fileType}`;
    Utils.handleError(new Error(message), '文件数量限制');
  }

  /**
   * 处理文件格式错误
   */
  static handleFormatError(fileName, fileType = '图片') {
    const message = `不支持的${fileType}格式: ${fileName}`;
    Utils.handleError(new Error(message), '文件格式错误');
  }
}

// 统一文件验证工具
class FileValidator {
  /**
   * 统一的文件验证函数
   * @param {File} file - 要验证的文件
   * @param {string} fileType - 文件类型 ('image' 或 'video')
   * @returns {Object} - 验证结果 {valid: boolean, error?: string}
   */
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

  /**
   * 验证文件并显示错误通知（兼容现有代码）
   * @param {File} file - 要验证的文件
   * @param {string} fileType - 文件类型
   * @returns {boolean} - 是否验证通过
   */
  static validateFileWithNotification(file, fileType = 'image') {
    const result = this.validateFile(file, fileType);

    if (!result.valid) {
      // 使用统一的文件错误处理
      FileErrorHandler.handleFileError(result.error, '', '文件验证');
      return false;
    }

    console.log(`${fileType === 'video' ? 'Video' : 'File'} validated: ${file.name} (${file.size} bytes)`);
    return true;
  }
}

// 统一格式转换器
class FormatConverter {
  // 简单的转换缓存
  static _cache = new Map();
  static _maxCacheSize = 20; // 限制缓存大小，避免内存泄漏

  /**
   * 处理富文本编辑器中的懒加载图片
   * 将data-src属性的URL设置为src属性，使图片能够正常显示
   * @param {HTMLElement} container - 包含图片的容器元素
   */
  static processLazyImages(container) {
    if (!container) return;

    const images = container.querySelectorAll('img[data-src]');
    images.forEach(img => {
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc && (!img.src || img.src.startsWith('data:image/svg+xml'))) {
        // 如果src是占位符或为空，使用data-src的真实URL
        img.src = dataSrc;
        console.log('懒加载图片已处理:', dataSrc.substring(0, 50) + '...');
      }
    });
  }

  /**
   * 生成缓存键（使用内容的前100字符）
   * @private
   */
  static _generateCacheKey(html) {
    return html.substring(0, 100);
  }

  /**
   * 设置缓存结果
   * @private
   */
  static _setCacheResult(key, result) {
    // 限制缓存大小，使用LRU策略
    if (this._cache.size >= this._maxCacheSize) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
    this._cache.set(key, result);
  }

  /**
   * 清除转换缓存
   */
  static clearCache() {
    const cacheSize = this._cache.size;
    this._cache.clear();
    if (cacheSize > 0) {
      console.log(`🗑️ 格式转换缓存已清理，释放了 ${cacheSize} 个缓存项`);
    }
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats() {
    return {
      size: this._cache.size,
      maxSize: this._maxCacheSize,
      usage: `${this._cache.size}/${this._maxCacheSize}`
    };
  }

  /**
   * HTML转Markdown（带缓存）
   */
  static htmlToMarkdown(html) {
    if (!html) return '';

    // 检查缓存
    const cacheKey = this._generateCacheKey(html);
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    // 执行转换
    const result = this._convertHtmlToMarkdown(html);

    // 缓存结果
    this._setCacheResult(cacheKey, result);

    return result;
  }

  /**
   * 实际的HTML转Markdown转换逻辑
   * @private
   */
  static _convertHtmlToMarkdown(html) {

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    let markdown = '';

    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const tagName = node.tagName.toLowerCase();
      const children = Array.from(node.childNodes).map(processNode).join('');

      switch (tagName) {
        case 'h1': return `# ${children}\n\n`;
        case 'h2': return `## ${children}\n\n`;
        case 'h3': return `### ${children}\n\n`;
        case 'h4': return `#### ${children}\n\n`;
        case 'h5': return `##### ${children}\n\n`;
        case 'h6': return `###### ${children}\n\n`;
        case 'p': return `${children}\n\n`;
        case 'strong': case 'b': return `**${children}**`;
        case 'em': case 'i': return `*${children}*`;
        case 'code': return `\`${children}\``;
        case 'pre': return `\`\`\`\n${children}\n\`\`\`\n\n`;
        case 'blockquote': return `> ${children}\n\n`;
        case 'a': return `[${children}](${node.href || '#'})`;
        case 'img': {
          // 优先使用data-src属性（懒加载图片的真实URL），否则使用src属性
          const dataSrc = node.getAttribute('data-src');
          const imageUrl = dataSrc || node.src || '';
          return `![${node.alt || ''}](${imageUrl})`;
        }
        case 'ul': return `${children}\n`;
        case 'ol': return `${children}\n`;
        case 'li': return `- ${children}\n`;
        case 'br': return '\n';
        case 'hr': return '---\n\n';
        default: return children;
      }
    }

    return processNode(tempDiv).trim();
  }

  /**
   * Markdown转HTML（带缓存）
   */
  static markdownToHtml(markdown) {
    if (!markdown) return '';

    // 检查缓存
    const cacheKey = 'md_' + this._generateCacheKey(markdown);
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    // 执行转换
    const result = this._convertMarkdownToHtml(markdown);

    // 缓存结果
    this._setCacheResult(cacheKey, result);

    return result;
  }

  /**
   * 实际的Markdown转HTML转换逻辑
   * @private
   */
  static _convertMarkdownToHtml(markdown) {

    const lines = markdown.split('\n');
    let html = '';
    let inCodeBlock = false;

    for (let line of lines) {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          html += '</pre>';
          inCodeBlock = false;
        } else {
          html += '<pre>';
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        html += line + '\n';
        continue;
      }

      // 标题
      if (line.startsWith('# ')) {
        html += `<h1>${line.substring(2)}</h1>`;
      } else if (line.startsWith('## ')) {
        html += `<h2>${line.substring(3)}</h2>`;
      } else if (line.startsWith('### ')) {
        html += `<h3>${line.substring(4)}</h3>`;
      } else if (line.startsWith('#### ')) {
        html += `<h4>${line.substring(5)}</h4>`;
      } else if (line.startsWith('##### ')) {
        html += `<h5>${line.substring(6)}</h5>`;
      } else if (line.startsWith('###### ')) {
        html += `<h6>${line.substring(7)}</h6>`;
      }
      // 引用
      else if (line.startsWith('> ')) {
        html += `<blockquote>${line.substring(2)}</blockquote>`;
      }
      // 列表
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        html += `<li>${line.substring(2)}</li>`;
      }
      // 分割线
      else if (line.trim() === '---') {
        html += '<hr>';
      }
      // 普通段落
      else if (line.trim()) {
        // 处理内联格式
        let processedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
          .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

        html += `<p>${processedLine}</p>`;
      } else {
        html += '<br>';
      }
    }

    return html;
  }

  /**
   * HTML转纯文本
   */
  static htmlToPlainText(html) {
    if (!html) return '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  /**
   * 转义HTML字符
   */
  static escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
  }
}

// 应用状态
let appState = {
  title: '',
  content: '',
  selectedPlatforms: [],
  imagePreviews: [], // 改为数组支持多图片
  videoPreviews: [], // 视频预览数组
  shortVideoPreviews: [], // 短视频预览数组
  shortVideoCovers: [], // 短视频封面数组
  isPublishing: false,
  currentContentType: '动态' // 当前内容类型
};

// 主页面控制器类 - 集成新的文件管理服务
class MainPageController {
  constructor() {
    this.fileManager = null;
    this.memoryManager = null;
    this.useChunkedTransfer = false; // 默认为false，等待异步初始化
    this.isInitialized = false;
    this.initPromise = this.initServices(); // 保存初始化Promise
  }

  // 初始化服务
  async initServices() {
    try {
      // 添加重试机制的Background Script连接测试
      let testResponse = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && !testResponse?.success) {
        try {
          testResponse = await chrome.runtime.sendMessage({
            action: 'getStorageStats'
          });

          if (testResponse && testResponse.success) {
            console.log('✅ Background Script connection successful');
            console.log('📊 文件缓存状态:', {
              totalFiles: testResponse.totalFiles,
              totalSizeMB: testResponse.totalSizeMB,
              sessionId: testResponse.sessionId
            });
            this.useChunkedTransfer = true;
            break;
          }
        } catch (error) {
          console.warn(`Background Script connection attempt ${retryCount + 1} failed:`, error.message);
        }

        retryCount++;
        if (retryCount < maxRetries) {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        }
      }

      if (!this.useChunkedTransfer) {
        console.warn('Background Script connection failed after retries, using legacy mode');
      }

      // 初始化FileManager作为降级方案
      try {
        this.fileManager = new FileManager({
          maxFiles: IMAGE_CONFIG.maxImages,
          allowedTypes: IMAGE_CONFIG.allowedTypes
        });
        this.memoryManager = window.memoryManager; // 使用全局实例
      } catch (error) {
        console.warn('FileManager initialization failed:', error);
        this.fileManager = null;
      }

      this.isInitialized = true;
      console.log('Services initialized successfully', {
        chunkedTransfer: this.useChunkedTransfer,
        fileManager: !!this.fileManager,
        retryCount: retryCount
      });
    } catch (error) {
      console.error('Failed to initialize services:', error);
      this.useChunkedTransfer = false;
      this.fileManager = null;
      this.isInitialized = true; // 即使失败也标记为已初始化
    }
  }

  // 确保服务已初始化的辅助方法
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initPromise;
    }
  }

  // 处理文件选择 - 智能选择传输方案
  async handleFileSelection(files) {
    try {
      // 确保服务已初始化
      await this.ensureInitialized();

      // 检查图片数量限制（累积计算）
      const remainingSlots = IMAGE_CONFIG.maxImages - appState.imagePreviews.length;
      if (remainingSlots <= 0) {
        FileErrorHandler.handleCountLimitError(IMAGE_CONFIG.maxImages, '图片');
        return;
      }

      // 限制处理的文件数量
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      if (filesToProcess.length < files.length) {
        showNotification(`只能再上传 ${remainingSlots} 张图片，已自动选择前 ${filesToProcess.length} 张`, 'warning');
      }

      // 显示加载状态
      uploadLoadingManager.show(filesToProcess.length);

      if (this.useChunkedTransfer) {
        return await this.handleFileSelectionChunked(filesToProcess);
      } else if (this.fileManager) {
        return await this.handleFileSelectionFileManager(filesToProcess);
      } else {
        return this.handleFileSelectionLegacy(filesToProcess);
      }
    } catch (error) {
      Utils.handleError(error, '文件处理失败');

      // 隐藏加载状态
      uploadLoadingManager.hide();

      // 降级到原有方案
      return this.handleFileSelectionLegacy(files);
    }
  }

  // 视频文件选择处理
  async handleVideoSelection(files) {
    try {
      // 确保服务已初始化
      await this.ensureInitialized();

      // 检查是否超过最大视频数量
      const remainingSlots = VIDEO_CONFIG.maxVideos - appState.videoPreviews.length;
      if (remainingSlots <= 0) {
        FileErrorHandler.handleCountLimitError(VIDEO_CONFIG.maxVideos, '视频');
        return;
      }

      // 过滤视频文件并限制数量
      const videoFiles = Array.from(files).filter(file =>
        VIDEO_CONFIG.allowedTypes.includes(file.type)
      ).slice(0, remainingSlots);

      if (videoFiles.length === 0) {
        FileErrorHandler.handleFileError('请选择有效的视频文件', '', '文件选择');
        return;
      }

      // 显示加载状态
      uploadLoadingManager.show(videoFiles.length);

      let previews = [];

      // 尝试使用分块传输处理视频文件
      if (this.useChunkedTransfer) {
        previews = await this.handleVideoSelectionChunked(videoFiles);
      } else {
        // 降级方案：直接处理视频文件
        previews = await this.handleVideoSelectionLegacy(videoFiles);
      }

      // 统一的结果处理
      this.finishVideoSelection(previews);

    } catch (error) {
      Utils.handleError(error, '视频处理失败');
      uploadLoadingManager.hide();

      // 降级到原有方案
      videoUploadHandler.handleUpload({ target: { files } });
    }
  }

  // 完成视频选择的统一处理
  finishVideoSelection(previews) {
    if (previews.length > 0) {
      // 追加到现有视频列表
      appState.videoPreviews = [...appState.videoPreviews, ...previews];

      // 更新UI
      updateVideoPreview();

      // 显示成功提示
      showNotification(`成功处理 ${previews.length} 个视频文件`, 'success');

      // 保存数据
      saveToStorageData();
    }

    // 隐藏加载状态
    uploadLoadingManager.hide();
  }

  // 分块传输视频文件处理
  async handleVideoSelectionChunked(videoFiles) {
    const previews = [];

    for (const file of videoFiles) {
      try {
        // 验证文件
        if (!this.validateVideoFile(file)) {
          uploadLoadingManager.incrementProcessed();
          continue;
        }

        // 使用分块传输上传视频文件
        const fileId = await this.uploadFileInChunks(file);

        if (fileId) {
          // 创建预览数据
          const preview = this.createVideoPreviewData(file, fileId);
          previews.push(preview);
        } else {
          FileErrorHandler.handleFileError('视频上传失败', file.name, '视频上传');
        }

        uploadLoadingManager.incrementProcessed();
      } catch (error) {
        Utils.handleError(error, `处理视频失败: ${file.name}`);
        uploadLoadingManager.incrementProcessed();
      }
    }

    return previews;
  }

  // 降级方案视频文件处理
  async handleVideoSelectionLegacy(videoFiles) {
    const previews = [];

    for (const file of videoFiles) {
      try {
        // 验证文件
        if (!this.validateVideoFile(file)) {
          uploadLoadingManager.incrementProcessed();
          continue;
        }

        // 生成统一格式的ID
        const videoId = this.generateUniqueId();

        // 创建预览数据
        const preview = this.createVideoPreviewData(file, videoId);
        previews.push(preview);

        uploadLoadingManager.incrementProcessed();
      } catch (error) {
        Utils.handleError(error, `处理视频失败: ${file.name}`);
        uploadLoadingManager.incrementProcessed();
      }
    }

    return previews;
  }

  // 🚀 优化：使用统一的文件数据创建（替代重复代码）
  createVideoPreviewData(file, id) {
    return FileDataManager.createFileData(file, {
      id: id,
      prefix: 'file'
    });
  }

  // 🚀 优化：使用统一的ID生成
  generateUniqueId() {
    return FileDataManager.generateUniqueId('file');
  }

  // 验证视频文件（使用统一验证器）
  validateVideoFile(file) {
    return FileValidator.validateFileWithNotification(file, 'video');
  }

  // 分块传输文件处理
  async handleFileSelectionChunked(files) {
    const previews = [];

    for (const file of files) {
      try {
        // 验证文件
        if (!this.validateFile(file)) {
          continue;
        }

        // 使用分块传输上传文件
        const fileId = await this.uploadFileInChunks(file);

        if (fileId) {
          // 创建预览数据
          const preview = {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: URL.createObjectURL(file), // 创建本地预览URL
            lastModified: file.lastModified
          };

          previews.push(preview);
        } else {
          FileErrorHandler.handleFileError('文件上传失败', file.name, '文件上传');
        }

        // 更新加载进度
        uploadLoadingManager.incrementProcessed();
      } catch (error) {
        Utils.handleError(error, `处理文件失败: ${file.name}`);

        // 更新加载进度（即使失败也要计数）
        uploadLoadingManager.incrementProcessed();
      }
    }

    if (previews.length > 0) {
      // 追加到现有图片列表，而不是替换
      appState.imagePreviews = [...appState.imagePreviews, ...previews];

      // 更新UI
      updateImagePreview();

      // 显示成功提示
      showNotification(`成功处理 ${previews.length} 个文件`, 'success');


    }
  }

  // FileManager文件处理（降级方案1）
  async handleFileSelectionFileManager(files) {
    const previews = await this.fileManager.handleFileSelection(files);

    // 追加到现有图片列表，而不是替换
    const newPreviews = previews.map(preview => ({
      id: preview.id,
      name: preview.name,
      size: preview.size,
      dataUrl: preview.previewUrl,
      thumbnail: preview.thumbnail
    }));

    appState.imagePreviews = [...appState.imagePreviews, ...newPreviews];

    // 更新UI
    updateImagePreview();

    // 显示成功提示
    showNotification(`成功处理 ${previews.length} 个文件`, 'success');

    // 隐藏加载状态
    uploadLoadingManager.hide();


  }

  // 分块上传文件
  async uploadFileInChunks(file) {
    try {
      const chunkSize = 16 * 1024 * 1024; // 16MB per chunk - 优化传输效率
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

      if (!initResponse.success) {
        throw new Error('Failed to initialize file upload: ' + initResponse.error);
      }

      const fileId = initResponse.fileId;

      // 2. 分块读取和上传
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        // 读取分块为ArrayBuffer
        const arrayBuffer = await this.readFileAsArrayBuffer(chunk);

        // 转换为Uint8Array以便JSON序列化
        const uint8Array = new Uint8Array(arrayBuffer);
        const chunkData = Array.from(uint8Array);

        // 上传分块
        const chunkResponse = await chrome.runtime.sendMessage({
          action: 'uploadFileChunk',
          fileId: fileId,
          chunkIndex: chunkIndex,
          chunkData: chunkData,
          isLastChunk: chunkIndex === totalChunks - 1
        });

        if (!chunkResponse.success) {
          throw new Error(`Failed to upload chunk ${chunkIndex}: ${chunkResponse.error}`);
        }
      }

      return fileId;

    } catch (error) {
      console.error('Chunked upload failed:', error);
      throw error;
    }
  }

  // 读取文件为ArrayBuffer
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  // 验证文件（使用统一验证器）
  validateFile(file) {
    return FileValidator.validateFileWithNotification(file, 'image');
  }

  // 降级方案 - 原有的文件处理逻辑
  handleFileSelectionLegacy(files) {
    console.log('Using legacy file handling');
    // 调用原有的处理逻辑
    imageUploadHandler.handleUpload({ target: { files } });
  }

  // 发布内容 - 新的实现
  async publishContent() {
    // 输入验证和按钮状态管理已在 handleStartPublish 中统一处理
    const publishData = await createPublishData(true);
    await executePublish(publishData);
  }

  // 获取内存使用统计
  getMemoryStats() {
    if (this.memoryManager) {
      return this.memoryManager.getMemoryStats();
    }
    return null;
  }

  // 清理资源
  async cleanup() {
    if (this.fileManager) {
      await this.fileManager.cleanup();
    }
  }


}

// 创建全局控制器实例
let mainController = null;

// 图片上传配置
const IMAGE_CONFIG = {
  maxImages: 32,
  // 移除文件大小限制，允许上传任意大小的图片
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};

// 视频上传配置
const VIDEO_CONFIG = {
  maxVideos: 8,
  allowedTypes: ['video/mp4', 'video/mov', 'video/avi', 'video/webm']
};

// 数据管理函数 - 使用统一的存储工具
async function loadFromStorageData() {
  try {
    const data = await loadPublishData();
    console.log(`🔍 [DEBUG] 从存储加载数据:`, {
      title: data.title,
      content: data.content ? data.content.substring(0, 50) + '...' : '',
      platforms: data.selectedPlatforms?.length || 0,
      images: data.imagePreviews?.length || 0,
      videos: data.videoPreviews?.length || 0,
      hasArticleData: !!data.articleData,
      articleData: data.articleData,
      excerpt: data.articleData?.excerpt,
      excerptLength: data.articleData?.excerpt?.length || 0,
      timestamp: new Date().toISOString()
    });

    appState.title = data.title;
    appState.content = data.content;
    appState.selectedPlatforms = data.selectedPlatforms;
    appState.imagePreviews = data.imagePreviews || []; // 支持多图片数据
    appState.videoPreviews = data.videoPreviews || []; // 支持视频数据
    appState.shortVideoPreviews = data.shortVideoPreviews || []; // 加载短视频数据
    appState.shortVideoCovers = data.shortVideoCovers || []; // 加载短视频封面数据
    // 智能内容类型管理：如果当前已经是短视频模式且正在上传，保持当前状态
    const isShortVideoUploading = appState.currentContentType === '短视频' &&
                                  (appState.shortVideoPreviews?.length > 0 || appState.shortVideoCovers?.length > 0);

    if (isShortVideoUploading && data.currentContentType === '短视频') {
      // 保持短视频模式，不切换
      console.log('🔒 保持短视频模式，避免上传过程中的页面切换');
    } else {
      appState.currentContentType = data.currentContentType || '动态'; // 加载内容类型
    }

    appState.articleData = data.articleData || {}; // 加载文章相关数据

    // 如果正在短视频上传过程中，跳过内容类型更新以避免页面切换
    updateUI(isShortVideoUploading);
  } catch (error) {
    console.error('Failed to load from storage:', error);
  }
}

// 重置应用状态到初始值
function resetAppState() {
  // 清理图片URL对象
  appState.imagePreviews.forEach(image => {
    if (image.dataUrl && image.dataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(image.dataUrl);
    }
  });

  // 清理视频URL对象
  appState.videoPreviews.forEach(video => {
    if (video.dataUrl && video.dataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(video.dataUrl);
    }
  });

  // 清理短视频URL对象
  appState.shortVideoPreviews.forEach(video => {
    if (video.dataUrl && video.dataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(video.dataUrl);
    }
  });

  // 清理短视频封面URL对象
  appState.shortVideoCovers.forEach(cover => {
    if (cover.dataUrl && cover.dataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cover.dataUrl);
    }
  });

  appState.title = '';
  appState.content = '';
  appState.selectedPlatforms = [];
  appState.imagePreviews = [];
  appState.videoPreviews = [];
  appState.shortVideoPreviews = [];
  appState.shortVideoCovers = [];
  appState.isPublishing = false;
  appState.currentContentType = '动态'; // 重置内容类型到默认值
  appState.articleData = {}; // 重置文章数据
}

// 检测页面加载类型 - 优化版本
function getPageLoadType() {
  // 缓存常用值以提升性能
  const url = window.location.href;
  const referrer = document.referrer;

  // 检查是否为页面刷新
  if (isPageRefresh()) {
    return 'refresh';
  }

  // 检查是否为扩展程序图标打开
  if (isExtensionOpen(url, referrer)) {
    return 'extension_open';
  }

  return 'new_open';
}

// 检测页面是否为刷新加载 - 优化版本
function isPageRefresh() {
  // 优先使用现代API
  const navigationEntries = performance.getEntriesByType('navigation');
  if (navigationEntries.length > 0) {
    return navigationEntries[0].type === 'reload';
  }

  // 降级到旧API
  if (performance.navigation && performance.navigation.type === 1) {
    return true;
  }

  // 最后的备用检查
  return document.referrer === window.location.href;
}

// 检测是否为扩展程序图标打开 - 修复版本，更严格的检测逻辑
function isExtensionOpen(url = window.location.href, referrer = document.referrer) {
  // 快速检查：必须是扩展程序URL
  if (!url.includes('chrome-extension://') || !url.includes('/main/main.html')) {
    return false;
  }

  // 更严格的检测逻辑：只有在特定条件下才认为是扩展程序图标打开
  // 1. 没有referrer（直接从扩展图标打开）
  // 2. referrer是chrome://newtab/（从新标签页打开）
  // 3. referrer是chrome://extensions/（从扩展管理页面打开）
  const isDirectOpen = !referrer || referrer === '';
  const isFromNewTab = referrer === 'chrome://newtab/';
  const isFromExtensions = referrer.startsWith('chrome://extensions/');

  // 排除页面刷新的情况（referrer等于当前页面URL）
  const isPageRefresh = referrer === url;

  return (isDirectOpen || isFromNewTab || isFromExtensions) && !isPageRefresh;
}

// 初始化页面数据 - 优化版本
async function initializePageData() {
  try {
    const loadType = getPageLoadType();
    console.log('页面加载类型:', loadType);

    // 所有加载类型都执行相同的重置操作
    const sourceMap = {
      'refresh': '页面刷新',
      'extension_open': '扩展程序图标打开',
      'default': '新打开页面'
    };

    const source = sourceMap[loadType] || sourceMap['default'];
    await handleSafeStateReset(source);

    updateUI();
  } catch (error) {
    console.error('初始化页面数据失败:', error);
    // 发生错误时重置为默认状态
    resetAppState();
    updateUI();
  }
}



// 安全的状态重置处理（避免消息通道错误）
async function handleSafeStateReset(source) {
  try {
    console.log(`${source}：开始重置页面状态`);

    // 1. 清理本地存储数据
    await clearStorageKeys(['publishData', 'publishResults']);

    // 2. 重置应用状态
    resetAppState();

    // 3. 不调用可能导致消息通道错误的后台脚本通信
    // 避免在页面刷新/打开时立即与后台脚本通信

    console.log(`${source}：页面状态已重置`);
  } catch (error) {
    console.warn(`${source} 状态重置过程中出现错误:`, error);
    // 即使清理失败，也要确保应用状态被重置
    try {
      resetAppState();
    } catch (resetError) {
      console.error('重置应用状态失败:', resetError);
    }
  }
}

// 统一的后台脚本通知函数
async function notifyBackgroundScript(actionType) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: actionType,
      data: { clearSidepanel: true }
    });

    // 确保响应被正确处理
    if (response && !response.success) {
      console.warn('后台脚本响应异常:', response.error);
    }
  } catch (error) {
    // 简化错误处理，只记录日志
    if (error.message.includes('message channel closed')) {
      console.warn('消息通道已关闭，这可能是正常的清理过程');
    } else if (error.message.includes('Extension context invalidated')) {
      console.warn('扩展上下文已失效，请刷新页面');
    } else {
      console.warn('后台脚本通信失败:', error.message);
    }
  }
}





// 统一的发布状态清理函数 - 优化合并重复逻辑
async function clearPublishResults(options = {}) {
  const {
    isNewSession = false,
    selectedPlatforms = [],
    reason = 'manual'
  } = options;

  try {
    if (isNewSession) {
      console.log('🧹 开始新发布会话，清理历史状态...');
    }

    // 清理Chrome Storage中的发布状态
    await clearStorageKeys(['publishResults', 'publishStatus']);

    if (isNewSession) {
      // 新会话需要发送重置消息
      await chrome.runtime.sendMessage({
        action: 'resetPublishState',
        data: { reason, selectedPlatforms }
      });
      console.log('✅ 历史发布状态已清理，当前选择平台:', selectedPlatforms);
    } else {
      // 普通清理发送清理消息
      await notifyBackgroundScript('clearPublishResults');
      console.log('已清理发布状态数据');
    }

  } catch (error) {
    const errorMsg = isNewSession ? '清理发布会话状态失败' : '清理发布结果失败';
    console.warn(`⚠️ ${errorMsg}:`, error);

    // 新会话清理失败不抛出错误，继续发布流程
    if (!isNewSession) {
      throw error;
    }
  }
}

// 统一的存储清理工具函数
async function clearStorageKeys(keys) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    await chrome.storage.local.remove(keys);
  }
}

// 防抖的存储保存函数（用于频繁操作）
const debouncedSaveToStorage = Utils.debounce(async function() {
  await saveToStorageData();
}, 300);

async function saveToStorageData() {
  try {
    const dataToSave = {
      title: appState.title,
      content: appState.content,
      selectedPlatforms: appState.selectedPlatforms,
      imagePreviews: appState.imagePreviews, // 支持多图片数据
      videoPreviews: appState.videoPreviews, // 支持视频数据
      shortVideoPreviews: appState.shortVideoPreviews, // 保存短视频数据
      shortVideoCovers: appState.shortVideoCovers, // 保存短视频封面数据
      currentContentType: appState.currentContentType, // 保存当前内容类型
      articleData: appState.articleData // 保存文章相关数据（如概要等）
    };

    // 添加详细的导语数据保存调试
    console.log('🔍 [DEBUG] 保存数据到存储:', {
      hasArticleData: !!dataToSave.articleData,
      articleData: dataToSave.articleData,
      excerpt: dataToSave.articleData?.excerpt,
      excerptLength: dataToSave.articleData?.excerpt?.length || 0,
      contentType: dataToSave.currentContentType,
      platforms: dataToSave.selectedPlatforms?.length || 0,
      timestamp: new Date().toISOString()
    });

    await savePublishData(dataToSave);
  } catch (error) {
    Utils.handleError(error, '保存数据失败', false); // 不显示通知，避免干扰用户
  }
}

// 优化的事件处理函数（使用防抖和统一逻辑）
const handleTitleChange = Utils.debounce(function(event) {
  appState.title = event.target.value;
  saveToStorageData();
}, CONFIG.DEBOUNCE_DELAY);

// 统一的内容变化处理函数
const handleContentChange = Utils.debounce(function(event) {
  appState.content = event.target.value;
  saveToStorageData();
}, CONFIG.DEBOUNCE_DELAY);

// 文章编辑器使用相同的处理逻辑
const handleArticleEditorChange = handleContentChange;

/**
 * 统一的内容获取和验证函数
 * 合并了验证和发布时的重复逻辑
 */
function getAndValidateContent() {
  let content = '';
  let title = '';
  let isValid = true;
  let message = '';

  if (appState.currentContentType === '文章') {
    const articleRichEditor = domCache.get('article-rich-editor');
    const articleTitleInput = domCache.get('article-title-input');

    if (articleRichEditor) {
      let rawContent = articleRichEditor.innerHTML || '';
      content = standardizeRichTextContent(rawContent);

      // 验证内容
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';

      if (!textContent.trim()) {
        isValid = false;
        message = '请输入文章内容';
      } else {
        // 简化日志记录，避免冗余信息
        console.log('📝 文章内容已标准化', {
          textLength: textContent.trim().length,
          hasRichContent: content.includes('<img') || content.includes('<a')
        });
      }
    } else {
      isValid = false;
      message = '请输入文章内容';
    }

    if (articleTitleInput) {
      title = articleTitleInput.value || '';
    }
  } else {
    // 其他模式的内容验证
    const titleInput = domCache.get('title-input');
    const contentTextarea = domCache.get('content-textarea');

    if (titleInput) {
      title = titleInput.value;
    }

    if (contentTextarea) {
      content = contentTextarea.value;
    }

    if (!content.trim()) {
      isValid = false;
      message = '请输入内容';
    }
  }

  return { content, title, isValid, message };
}

/**
 * 统一富文本内容格式化处理
 * 确保直接输入的内容与链接获取的内容格式一致
 */
function standardizeRichTextContent(content) {
  if (!content || !content.trim()) return content;

  try {
    // 创建临时容器处理内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    // 应用与链接获取内容相同的处理逻辑
    FormatConverter.processLazyImages(tempDiv);

    // 清理和标准化HTML结构
    cleanAndStandardizeHTML(tempDiv);

    return tempDiv.innerHTML;
  } catch (error) {
    console.warn('富文本内容格式化失败:', error);
    return content; // 返回原始内容作为备用
  }
}

/**
 * 清理和标准化HTML结构
 */
function cleanAndStandardizeHTML(container) {
  // 移除空的段落和换行
  const emptyElements = container.querySelectorAll('p:empty, br + br, div:empty');
  emptyElements.forEach(el => el.remove());

  // 标准化段落结构
  const textNodes = Array.from(container.childNodes).filter(node =>
    node.nodeType === Node.TEXT_NODE && node.textContent.trim()
  );

  textNodes.forEach(textNode => {
    const p = document.createElement('p');
    p.textContent = textNode.textContent.trim();
    container.replaceChild(p, textNode);
  });

  // 确保所有内容都在适当的容器中
  const directTextElements = container.querySelectorAll('strong, em, a, span');
  directTextElements.forEach(el => {
    if (el.parentNode === container && !el.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote')) {
      const p = document.createElement('p');
      container.insertBefore(p, el);
      p.appendChild(el);
    }
  });
}

// 文章富文本编辑器内容变化处理（使用防抖优化性能）
const handleArticleRichEditorChange = Utils.debounce(function(event) {
  // 从contenteditable div获取内容
  let content = event.target.innerHTML || '';

  // 统一内容格式化处理，确保与链接获取内容一致
  content = standardizeRichTextContent(content);

  appState.content = content;
  saveToStorageData();
}, CONFIG.DEBOUNCE_DELAY);

// 文章标题输入变化处理
function handleArticleTitleChange(event) {
  appState.title = event.target.value;
  saveToStorageData();
}

// 文章概要输入变化处理
function handleArticleExcerptChange(event) {
  // 概要内容可以存储在appState的额外字段中，或者合并到content中
  // 这里我们将概要信息存储到appState的新字段中
  if (!appState.articleData) {
    appState.articleData = {};
  }
  appState.articleData.excerpt = event.target.value;

  // 添加详细调试日志
  console.log('🔍 [DEBUG] 概要输入变化:', {
    value: event.target.value,
    length: event.target.value.length,
    appStateArticleData: appState.articleData,
    timestamp: new Date().toISOString()
  });

  saveToStorageData();
}

// 文件上传处理器类 - 优化后的实现
class ImageUploadHandler {
  constructor() {
    this.processedCount = 0;
    this.totalFiles = 0;
    this.inputElement = null;
  }

  // 验证单个文件（使用统一验证器）
  validateFile(file) {
    return FileValidator.validateFile(file, 'image');
  }

  // 🚀 优化：使用统一的ID生成
  generateUniqueId() {
    return FileDataManager.generateUniqueId('image');
  }

  // 处理单个文件完成
  handleFileComplete(success = true) {
    this.processedCount++;

    // 更新加载进度
    uploadLoadingManager.incrementProcessed();

    if (this.processedCount === this.totalFiles) {
      this.finishUpload();
    }
  }

  // 完成上传处理
  finishUpload() {
    updateImagePreview();
    debouncedSaveToStorage();

    if (this.inputElement) {
      this.inputElement.value = ''; // 清空文件输入
    }

    // 重置计数器
    this.processedCount = 0;
    this.totalFiles = 0;
  }

  // 处理文件上传
  handleUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    this.inputElement = event.target;

    // 检查是否超过最大图片数量
    const remainingSlots = IMAGE_CONFIG.maxImages - appState.imagePreviews.length;
    if (remainingSlots <= 0) {
      FileErrorHandler.handleCountLimitError(IMAGE_CONFIG.maxImages, '图片');
      return;
    }

    // 处理选中的文件
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    this.totalFiles = filesToProcess.length;
    this.processedCount = 0;

    // 显示加载状态
    uploadLoadingManager.show(this.totalFiles);

    filesToProcess.forEach((file) => {
      // 验证文件
      const validation = this.validateFile(file);
      if (!validation.valid) {
        FileErrorHandler.handleFileError(validation.error, '', '文件验证');
        this.handleFileComplete(false);
        return;
      }

      // 读取文件
      const reader = new FileReader();

      reader.onload = (e) => {
        const imageData = {
          id: this.generateUniqueId(),
          name: file.name,
          size: file.size,
          dataUrl: e.target.result
        };

        appState.imagePreviews.push(imageData);
        this.handleFileComplete(true);
      };

      reader.onerror = () => {
        FileErrorHandler.handleFileError('读取文件失败', file.name, '文件读取');
        this.handleFileComplete(false);
      };

      reader.readAsDataURL(file);
    });
  }
}

// 创建全局上传处理器实例
const imageUploadHandler = new ImageUploadHandler();

// 视频上传处理器类
class VideoUploadHandler {
  constructor() {
    this.processedCount = 0;
    this.totalFiles = 0;
    this.inputElement = null;
  }

  // 验证单个视频文件（使用统一验证器）
  validateFile(file) {
    return FileValidator.validateFile(file, 'video');
  }

  // 🚀 优化：使用统一的ID生成
  generateUniqueId() {
    return FileDataManager.generateUniqueId('video');
  }

  // 处理单个文件完成
  handleFileComplete(success = true) {
    this.processedCount++;

    // 更新加载进度
    uploadLoadingManager.incrementProcessed();

    if (this.processedCount === this.totalFiles) {
      this.finishUpload();
    }
  }

  // 完成上传处理
  finishUpload() {
    updateVideoPreview();
    debouncedSaveToStorage();

    if (this.inputElement) {
      this.inputElement.value = ''; // 清空文件输入
    }

    // 重置计数器
    this.processedCount = 0;
    this.totalFiles = 0;
  }

  // 处理视频上传
  handleUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    this.inputElement = event.target;

    // 检查是否超过最大视频数量
    const remainingSlots = VIDEO_CONFIG.maxVideos - appState.videoPreviews.length;
    if (remainingSlots <= 0) {
      FileErrorHandler.handleCountLimitError(VIDEO_CONFIG.maxVideos, '视频');
      return;
    }

    // 处理选中的文件
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    this.totalFiles = filesToProcess.length;
    this.processedCount = 0;

    // 显示加载状态
    uploadLoadingManager.show(this.totalFiles);

    filesToProcess.forEach((file) => {
      // 验证文件
      const validation = this.validateFile(file);
      if (!validation.valid) {
        FileErrorHandler.handleFileError(validation.error, '', '文件验证');
        this.handleFileComplete(false);
        return;
      }

      // 创建视频预览
      const videoData = {
        id: this.generateUniqueId(),
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: URL.createObjectURL(file)
      };

      appState.videoPreviews.push(videoData);
      this.handleFileComplete(true);
    });
  }
}

// 创建全局视频上传处理器实例
const videoUploadHandler = new VideoUploadHandler();

// 优化的上传加载状态管理器
class UploadLoadingManager {
  constructor() {
    this.processedCount = 0;
    this.totalCount = 0;
    this.loadingContainer = null;
    this.hideTimer = null;
  }

  // 初始化DOM元素引用
  initElements() {
    // 根据当前页面类型选择合适的加载容器
    this.loadingContainer = this.findAppropriateLoadingContainer();

    // 如果找不到加载容器，尝试在当前页面创建一个
    if (!this.loadingContainer) {
      this.createTemporaryLoadingContainer();
    }
  }

  // 查找合适的加载容器
  findAppropriateLoadingContainer() {
    // 根据页面类型选择容器ID
    const containerId = appState.currentContentType === '短视频'
      ? 'short-video-upload-loading'
      : 'upload-loading';

    const container = document.getElementById(containerId);
    if (container) {
      return container;
    }

    // 如果短视频容器不存在，尝试通用容器作为后备
    if (containerId === 'short-video-upload-loading') {
      return document.getElementById('upload-loading');
    }

    return null;
  }

  // 创建临时加载状态容器
  createTemporaryLoadingContainer() {
    const isShortVideo = appState.currentContentType === '短视频';

    // 选择父容器
    const parentContainer = this.findParentContainer(isShortVideo);
    if (!parentContainer) return;

    // 创建容器
    const tempContainer = this.createLoadingElement(isShortVideo);

    // 确保父容器有相对定位（短视频页面需要）
    if (isShortVideo && parentContainer.style.position !== 'relative') {
      parentContainer.style.position = 'relative';
    }

    parentContainer.appendChild(tempContainer);
    this.loadingContainer = tempContainer;
  }

  // 查找父容器
  findParentContainer(isShortVideo) {
    if (isShortVideo) {
      return document.querySelector('#video-upload-area') ||
             document.querySelector('.short-video-upload-container') ||
             document.querySelector('#short-video-upload-area');
    } else {
      return document.querySelector('.image-upload-container') ||
             document.querySelector('.content-area');
    }
  }

  // 创建加载元素
  createLoadingElement(isShortVideo) {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = '<div class="simple-loading-spinner"></div>';
    tempContainer.style.display = 'none';

    if (isShortVideo) {
      tempContainer.id = 'short-video-upload-loading';
      tempContainer.style.cssText += `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 20;
        background-color: rgba(255, 255, 255, 0.95);
        border-radius: 50%;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        pointer-events: none;
      `;
    } else {
      tempContainer.id = 'upload-loading';
      tempContainer.className = 'smart-upload-loading';
    }

    return tempContainer;
  }

  // 显示加载状态
  show(totalFiles) {
    // 强制重新初始化，确保找到正确的容器
    this.initElements();

    // 清除可能存在的隐藏定时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.processedCount = 0;
    this.totalCount = totalFiles;

    if (this.loadingContainer) {
      this.loadingContainer.style.display = 'block';
    }
  }

  // 增加已处理数量
  incrementProcessed() {
    this.processedCount++;

    // 如果全部处理完成，延迟隐藏加载状态
    if (this.processedCount >= this.totalCount) {
      this.hideTimer = setTimeout(() => {
        this.hide();
      }, CONFIG.NOTIFICATION_HIDE_DELAY);
    }
  }

  // 隐藏加载状态
  hide() {
    // 清除定时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.processedCount = 0;
    this.totalCount = 0;

    if (this.loadingContainer) {
      this.loadingContainer.style.display = 'none';
    }
  }
}

// 创建全局加载状态管理器实例
const uploadLoadingManager = new UploadLoadingManager();

// 优化的上传函数 - 集成新的文件管理
async function handleImageUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  if (mainController) {
    // 使用新的文件管理方案
    await mainController.handleFileSelection(files);
  } else {
    // 降级到原有方案
    imageUploadHandler.handleUpload(event);
  }
}

// 视频上传处理函数
async function handleVideoUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  if (mainController) {
    // 使用新的文件管理方案（与图片上传保持一致）
    await mainController.handleVideoSelection(files);
  } else {
    // 降级到原有方案
    videoUploadHandler.handleUpload(event);
  }
}

// 支持的文件类型常量
const SUPPORTED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/mov', 'video/quicktime', 'video/avi', 'video/webm'],
  get ALL() {
    return [...this.IMAGE, ...this.VIDEO];
  },
  get ACCEPT_STRING() {
    return this.ALL.join(',');
  }
};

// 文件类型识别和分类处理
function categorizeFiles(files) {
  const imageFiles = [];
  const videoFiles = [];
  const unsupportedFiles = [];

  Array.from(files).forEach(file => {
    if (SUPPORTED_FILE_TYPES.IMAGE.includes(file.type)) {
      imageFiles.push(file);
    } else if (SUPPORTED_FILE_TYPES.VIDEO.includes(file.type)) {
      videoFiles.push(file);
    } else {
      unsupportedFiles.push(file);
    }
  });

  return { imageFiles, videoFiles, unsupportedFiles };
}

// 处理混合文件上传
async function handleMixedFileUpload(files) {
  if (!mainController) {
    console.warn('MainController not available, skipping file upload');
    return;
  }

  const { imageFiles, videoFiles, unsupportedFiles } = categorizeFiles(files);

  // 显示不支持的文件提示
  if (unsupportedFiles.length > 0) {
    const unsupportedNames = unsupportedFiles.map(f => f.name).join(', ');
    FileErrorHandler.handleFormatError(unsupportedNames, '文件');
  }

  // 并行处理图片和视频文件
  const uploadPromises = [];

  if (imageFiles.length > 0) {
    uploadPromises.push(mainController.handleFileSelection(imageFiles));
  }

  if (videoFiles.length > 0) {
    uploadPromises.push(mainController.handleVideoSelection(videoFiles));
  }

  // 等待所有上传完成
  if (uploadPromises.length > 0) {
    await Promise.all(uploadPromises);
  }
}

// 创建隐藏的文件输入元素
function createFileInput() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = SUPPORTED_FILE_TYPES.ACCEPT_STRING;
  input.style.display = 'none';
  return input;
}

// 上传提示框点击处理
function handlePlaceholderClick() {
  const fileInput = createFileInput();

  fileInput.addEventListener('change', async (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await handleMixedFileUpload(files);
    }
    // 清理临时输入元素
    document.body.removeChild(fileInput);
  });

  document.body.appendChild(fileInput);
  fileInput.click();
}

// 拖拽事件处理
function setupDragAndDrop(placeholder) {
  const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
  const dragEnterEvents = ['dragenter', 'dragover'];

  // 防止默认拖拽行为
  dragEvents.forEach(eventName => {
    placeholder.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  // 拖拽进入和悬停 - 统一处理函数
  const handleDragEnter = () => placeholder.classList.add('drag-over');
  dragEnterEvents.forEach(eventName => {
    placeholder.addEventListener(eventName, handleDragEnter, false);
  });

  // 拖拽离开
  placeholder.addEventListener('dragleave', (e) => {
    // 只有当拖拽真正离开元素时才移除样式
    if (!placeholder.contains(e.relatedTarget)) {
      placeholder.classList.remove('drag-over');
    }
  }, false);

  // 文件释放
  placeholder.addEventListener('drop', async (e) => {
    placeholder.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      await handleMixedFileUpload(files);
    }
  }, false);
}

// 防止默认拖拽行为
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function togglePlatform(platform) {
  const isSelected = appState.selectedPlatforms.find(p => p.id === platform.id);
  if (isSelected) {
    appState.selectedPlatforms = appState.selectedPlatforms.filter(p => p.id !== platform.id);
  } else {
    appState.selectedPlatforms.push(platform);
  }
  updatePlatformSelection();
  saveToStorageData();
}

// 缓存平台信息以避免重复查找
const platformCache = new Map(SUPPORTED_PLATFORMS.map(p => [p.id, p]));

/**
 * 生成平台logo HTML（统一的logo渲染逻辑）
 * @param {Object} platform - 平台对象
 * @returns {string} - logo HTML字符串
 */
function generatePlatformLogoHTML(platform) {
  return `
    <img
      src="${platform.logoUrl}"
      alt="${platform.name} logo"
      class="w-6 h-6 rounded-sm mr-3 platform-logo"
      data-platform-id="${platform.id}"
      onerror="handleLogoError(this, '${platform.id}')"
    />
    <div class="w-6 h-6 rounded-sm ${platform.color} mr-3" style="display: none;"></div>
  `;
}

/**
 * 处理平台logo加载失败的情况
 * @param {HTMLImageElement} imgElement - 图片元素
 * @param {string} platformId - 平台ID
 */
function handleLogoError(imgElement, platformId) {
  const platform = platformCache.get(platformId);
  if (!platform) return;

  // 隐藏失败的图片
  imgElement.style.display = 'none';

  // 显示备用的颜色块
  const fallbackElement = imgElement.nextElementSibling;
  if (fallbackElement) {
    fallbackElement.style.display = 'block';
    fallbackElement.classList.add('platform-logo-fallback');
    // 添加平台名称首字母作为备用显示
    fallbackElement.textContent = platform.name.charAt(0);
  }

  // 只在开发环境输出警告
  if (window.location.href.includes('localhost') || window.location.href.includes('file://')) {
    console.warn(`Failed to load logo for ${platform.name}, using fallback`);
  }
}

async function handleStartPublish() {
  // 统一的内容获取和验证逻辑
  const contentValidation = getAndValidateContent();
  if (!contentValidation.isValid) {
    alert(contentValidation.message);
    return;
  }

  if (appState.selectedPlatforms.length === 0) {
    alert('请选择至少一个平台');
    return;
  }

  // 统一的按钮反馈效果
  showButtonClickFeedback();

  try {
    // 清理历史发布状态，确保从干净状态开始
    await clearPublishResults({
      isNewSession: true,
      selectedPlatforms: appState.selectedPlatforms.map(p => p.id),
      reason: 'newSession'
    });

    // 立即打开侧边栏（在用户手势触发的上下文中）
    await openSidepanelForPublish();

    // 检查是否有平台需要进行内容优化
    const platformsNeedOptimization = await getPlatformsNeedingOptimization();

    if (platformsNeedOptimization.length > 0) {
      // 有平台需要优化，先进行内容优化
      await handleContentOptimizationFlow(contentValidation, platformsNeedOptimization);
    } else {
      // 没有平台需要优化，直接发布
      const publishData = await createPublishDataFromValidated(contentValidation, mainController);
      await executePublish(publishData);
    }

  } catch (error) {
    Utils.handleError(error, '发布失败，请重试');
  }
}

// 在用户手势触发的上下文中打开侧边栏
async function openSidepanelForPublish() {
  try {
    console.log('📱 正在打开侧边栏...');

    // 在用户手势触发的上下文中打开侧边栏
    await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });

    // 等待侧边栏加载完成
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('✅ 侧边栏已打开');

  } catch (error) {
    console.error('❌ 打开侧边栏失败:', error);
    // 不抛出错误，继续执行发布流程
  }
}

// AI内容优化功能 - 使用统一的优化服务
async function optimizeContentWithPrompt(originalContent, promptName) {
  try {
    // 使用ContentOptimizationService简化优化逻辑
    if (window.contentOptimizationService) {
      return await window.contentOptimizationService.optimizeContent(originalContent, promptName);
    } else {
      // 降级到原有实现（保持兼容性）
      console.log(`🤖 开始AI内容优化，提示词: ${promptName}`);
      const promptData = await getPromptByName(promptName);
      if (!promptData) {
        throw new Error(`未找到提示词: ${promptName}`);
      }
      const optimizedContent = await callAIOptimizationAPI(originalContent, promptData);
      console.log('✅ AI内容优化完成');
      return optimizedContent;
    }
  } catch (error) {
    console.error('❌ AI内容优化失败:', error);
    throw new Error(`内容优化失败: ${error.message}`);
  }
}

// 获取提示词详细信息
async function getPromptByName(promptName) {
  try {
    // 尝试从MomentDots的存储键获取
    let result = await chrome.storage.local.get(['promptPrompts']);
    let prompts = result.promptPrompts || [];

    // 如果没有找到，尝试从独立prompt扩展的存储键获取
    if (prompts.length === 0) {
      result = await chrome.storage.local.get(['prompts']);
      prompts = result.prompts || [];
    }

    const foundPrompt = prompts.find(prompt => prompt.name === promptName);
    console.log(`查找提示词 "${promptName}":`, foundPrompt ? '找到' : '未找到', `(共${prompts.length}个提示词)`);

    return foundPrompt;
  } catch (error) {
    console.error('获取提示词失败:', error);
    return null;
  }
}

// 调用AI优化API
async function callAIOptimizationAPI(originalContent, promptData) {
  try {
    // 获取AI API设置
    const settings = await getAISettings();
    if (!settings) {
      throw new Error('AI API未配置，请先在提示词助手中配置API Key');
    }

    // 获取API配置（支持两种设置结构）
    let apiKey, endpoint;

    if (settings.models && settings.models.length > 0) {
      // MomentDots格式：settings.models[0].apiKey
      const model = settings.models.find(m => m.id === (promptData.model || settings.defaultModel)) || settings.models[0];
      apiKey = model.apiKey;
      endpoint = model.endpoint;
    } else if (settings.apiKey) {
      // 独立prompt扩展格式：settings.apiKey
      apiKey = settings.apiKey;
      endpoint = settings.endpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    }

    if (!apiKey) {
      throw new Error('API Key未配置，请先在提示词助手中配置API Key');
    }

    console.log('使用API配置:', { endpoint: endpoint, hasApiKey: !!apiKey });

    // 构建请求内容
    let combinedContent = promptData.content;
    if (combinedContent.includes('【用户输入内容】')) {
      combinedContent = combinedContent.replace('【用户输入内容】', originalContent);
    } else {
      combinedContent = `${promptData.content}\n\n用户输入的内容：\n${originalContent}`;
    }

    console.log('发送给AI的内容:', combinedContent.substring(0, 200) + '...');

    // 调用Gemini API
    const requestBody = {
      contents: [{
        parts: [{
          text: combinedContent
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    };

    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API请求失败: ${response.status} ${response.statusText}${errorData.error?.message ? ' - ' + errorData.error.message : ''}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('API返回数据格式错误');
    }

    const result = data.candidates[0].content.parts[0].text;
    console.log('AI优化结果:', result.substring(0, 200) + '...');

    return result;

  } catch (error) {
    console.error('AI API调用失败:', error);
    throw error;
  }
}

// 获取AI设置
async function getAISettings() {
  try {
    // 尝试从MomentDots的存储键获取
    let result = await chrome.storage.local.get(['promptSettings']);
    let settings = result.promptSettings;

    // 如果没有找到，尝试从独立prompt扩展的存储键获取
    if (!settings) {
      result = await chrome.storage.local.get(['settings']);
      settings = result.settings;
    }

    console.log('获取AI设置:', settings ? '找到' : '未找到');
    return settings || null;
  } catch (error) {
    console.error('获取AI设置失败:', error);
    return null;
  }
}

// 平台优化状态管理
const platformOptimizationStatus = new Map();

// 更新平台优化状态
function updatePlatformOptimizationStatus(platformId, status, message) {
  platformOptimizationStatus.set(platformId, {
    status: status, // 'optimizing', 'publishing', 'completed', 'failed'
    message: message,
    timestamp: Date.now()
  });

  // 通知侧边栏更新状态显示
  notifySidebarStatusUpdate(platformId, status, message);

  // 状态更新日志已在MessageManager中统一处理
}

// 获取平台优化状态
function getPlatformOptimizationStatus(platformId) {
  return platformOptimizationStatus.get(platformId) || null;
}

// 清除平台优化状态
function clearPlatformOptimizationStatus(platformId) {
  platformOptimizationStatus.delete(platformId);
}

// 通知侧边栏状态更新 - 使用统一的消息管理器
function notifySidebarStatusUpdate(platformId, status, message) {
  // 使用MessageManager简化消息发送逻辑
  if (window.messageManager) {
    window.messageManager.sendStatusUpdate(platformId, status, message);
  } else {
    // 降级到原有实现（保持兼容性）
    chrome.runtime.sendMessage({
      action: 'updatePlatformOptimizationStatus',
      platformId: platformId,
      status: status,
      message: message,
      timestamp: Date.now()
    }).catch(error => {
      console.log('⚠️ 状态更新发送失败:', error.message);
    });
  }
}

// 显示通知消息
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // 添加样式
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    zIndex: '10000',
    maxWidth: '400px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease-in-out'
  });

  // 根据类型设置背景色
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  notification.style.backgroundColor = colors[type] || colors.info;

  // 添加到页面
  document.body.appendChild(notification);

  // 显示动画
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  // 自动隐藏
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}
// 提取文件ID的辅助函数 - 优化版本
function extractFileIds(previews) {
  return (previews || [])
    .filter(preview => {
      // 🚀 支持新的即时预览系统：优先使用fileId字段
      return preview.fileId || (preview.id && preview.id.startsWith('file_'));
    })
    .map(preview => {
      // 🚀 优先返回Background Script中的文件ID
      return preview.fileId || preview.id;
    });
}

// 创建发布数据的统一函数（保留向后兼容）
async function createPublishData(useFileIds = false) {
  const contentData = getAndValidateContent();
  return await createPublishDataFromValidated(contentData, useFileIds);
}

/**
 * 基于已验证内容创建发布数据（优化版，避免重复验证）
 * @param {Object} validatedContent - 已验证的内容
 * @param {boolean} useFileIds - 是否使用文件ID
 * @param {Array} specificPlatforms - 指定的平台列表（可选，默认使用所有选中平台）
 */
async function createPublishDataFromValidated(validatedContent, useFileIds = false, specificPlatforms = null) {
  const { content, title } = validatedContent;
  const platformsToUse = specificPlatforms || appState.selectedPlatforms;

  // 同步到appState
  appState.content = content;
  appState.title = title;

  return await buildPublishDataStructure(title, content, useFileIds, platformsToUse);
}

/**
 * 构建发布数据结构（提取的公共逻辑）
 * @param {string} title - 标题
 * @param {string} content - 内容
 * @param {boolean} useFileIds - 是否使用文件ID
 * @param {Array} platformsToUse - 要使用的平台列表
 */
async function buildPublishDataStructure(title, content, useFileIds = false, platformsToUse = null) {
  const platforms = platformsToUse || appState.selectedPlatforms;

  console.log('📝 发布数据创建完成', {
    contentType: appState.currentContentType,
    titleLength: title.length,
    contentLength: content.length,
    platformCount: platforms.length
  });

  // 添加URL路由调试日志
  console.log('🔗 平台URL路由调试:', {
    contentType: appState.currentContentType,
    platforms: platforms.map(p => ({
      name: p.name,
      originalUrl: p.publishUrl,
      routedUrl: getPlatformPublishUrl(p, appState.currentContentType)
    }))
  });

  // 根据内容类型更新平台的发布URL
  const platformsWithCorrectUrls = platforms.map(platform => ({
    ...platform,
    publishUrl: getPlatformPublishUrl(platform, appState.currentContentType)
  }));

  // 根据内容类型确定要传递的文件数据
  let images = [];
  let videos = [];
  let allFiles = [];

  if (appState.currentContentType === '短视频') {
    // 短视频模式：使用短视频数据
    videos = [...(appState.shortVideoPreviews || [])];
    images = [...(appState.shortVideoCovers || [])];
    allFiles = [...videos, ...images];

    console.log('📁 短视频文件数据收集:', {
      shortVideoPreviews: appState.shortVideoPreviews?.length || 0,
      shortVideoCovers: appState.shortVideoCovers?.length || 0,
      totalVideos: videos.length,
      totalImages: images.length,
      totalFiles: allFiles.length
    });
  } else {
    // 动态/文章模式：使用原有数据
    images = appState.imagePreviews || [];
    videos = appState.videoPreviews || [];
    allFiles = [...images, ...videos];
  }

  // 添加详细的导语数据调试
  const summaryData = appState.articleData?.excerpt || '';
  console.log('🔍 [DEBUG] 构建发布数据 - 导语字段:', {
    hasArticleData: !!appState.articleData,
    articleData: appState.articleData,
    summaryData: summaryData,
    summaryLength: summaryData.length,
    summaryType: typeof summaryData,
    timestamp: new Date().toISOString()
  });

  const baseData = {
    title: title,
    content: content,
    summary: summaryData, // 添加导语/概要字段
    contentType: appState.currentContentType, // 添加内容类型字段
    platforms: platformsWithCorrectUrls,
    images: images,
    videos: videos,
    files: allFiles
  };

  if (useFileIds) {
    // 检查是否有文件ID（新方案）- 根据内容类型处理不同的数据源
    let imageFileIds = [];
    let videoFileIds = [];

    if (appState.currentContentType === '短视频') {
      // 短视频模式：从短视频数据中提取文件ID
      videoFileIds = extractFileIds(appState.shortVideoPreviews);
      imageFileIds = extractFileIds(appState.shortVideoCovers);
    } else {
      // 动态/文章模式：从原有数据中提取文件ID
      imageFileIds = extractFileIds(appState.imagePreviews);
      videoFileIds = extractFileIds(appState.videoPreviews);
    }

    const allFileIds = [...imageFileIds, ...videoFileIds];

    if (allFileIds.length > 0) {
      console.log('📁 [新方案] 文件管理:', {
        imageFileIds: imageFileIds.length,
        videoFileIds: videoFileIds.length,
        totalFileIds: allFileIds.length
      });
      return { ...baseData, fileIds: allFileIds };
    }
  }

  // 降级到原有方案或无文件ID
  console.log('📁 [原有方案] 文件管理:', {
    images: baseData.images.length,
    videos: baseData.videos.length,
    totalFiles: baseData.files.length
  });
  return baseData;
}

// 获取需要内容优化的平台列表
async function getPlatformsNeedingOptimization() {
  const platformsNeedOptimization = [];

  for (const platform of appState.selectedPlatforms) {
    const config = getPlatformPromptConfig(platform.id);
    if (config.isEnabled && config.selectedPrompt) {
      platformsNeedOptimization.push({
        platform: platform,
        promptName: config.selectedPrompt
      });
    }
  }

  console.log('需要内容优化的平台:', platformsNeedOptimization.map(p => p.platform.name));
  return platformsNeedOptimization;
}

// 处理内容优化流程 - 并发优化版本
async function handleContentOptimizationFlow(contentValidation, platformsNeedOptimization) {
  console.log('🎯 开始内容优化流程（并发模式）...');

  // 分离需要优化和不需要优化的平台
  const platformsNeedOptimizationIds = platformsNeedOptimization.map(p => p.platform.id);
  const platformsNoOptimization = appState.selectedPlatforms.filter(
    platform => !platformsNeedOptimizationIds.includes(platform.id)
  );

  // 立即为需要优化的平台显示"优化中"状态
  for (const { platform, promptName } of platformsNeedOptimization) {
    updatePlatformOptimizationStatus(platform.id, 'optimizing', `正在使用"${promptName}"优化内容...`);
  }

  // 先发布不需要优化的平台
  if (platformsNoOptimization.length > 0) {
    console.log('📤 先发布不需要优化的平台:', platformsNoOptimization.map(p => p.name));
    const publishDataNoOptimization = await createPublishDataFromValidated(
      contentValidation,
      mainController,
      platformsNoOptimization
    );
    await executePublish(publishDataNoOptimization);
  }

  // 并发处理需要优化的平台
  if (platformsNeedOptimization.length > 0) {
    await handleConcurrentOptimization(contentValidation, platformsNeedOptimization);
  }
}

// 并发优化处理函数 - 优化版本
async function handleConcurrentOptimization(contentValidation, platformsNeedOptimization) {
  console.log(`🚀 并发优化 ${platformsNeedOptimization.length} 个平台:`,
    platformsNeedOptimization.map(p => p.platform.name));

  try {
    // 创建所有优化任务，错误处理已在optimizeAndPublishPlatform中完成
    const optimizationPromises = platformsNeedOptimization.map(({ platform, promptName }) =>
      optimizeAndPublishPlatform(contentValidation, platform, promptName)
        .then(result => ({ platform, success: true, result }))
        .catch(error => {
          // 错误已在handleOptimizationError中处理，这里只记录结果
          return { platform, success: false, error: error.message };
        })
    );

    // 等待所有优化完成
    const results = await Promise.all(optimizationPromises);

    // 统计并显示结果
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`🎉 并发优化完成: ${successCount}/${results.length}`);

    // 简化的通知逻辑
    if (failureCount === 0) {
      showNotification(`所有 ${successCount} 个平台内容优化完成`, 'success');
    } else if (successCount > 0) {
      showNotification(`${successCount} 个平台优化成功，${failureCount} 个失败`, 'warning');
    } else {
      showNotification('所有平台优化失败，请检查网络和API配置', 'error');
    }

  } catch (error) {
    console.error('❌ 并发优化流程异常:', error);
    showNotification('内容优化流程异常，请重试', 'error');
  }
}

// 优化并发布单个平台 - 重构为更清晰的职责分离
async function optimizeAndPublishPlatform(contentValidation, platform, promptName) {
  const platformName = platform.name;

  try {
    console.log(`🔄 开始优化平台 ${platformName} 的内容，使用提示词: ${promptName}`);

    // 步骤1: 内容优化
    const optimizedContent = await optimizeContentWithPrompt(contentValidation.content, promptName);

    // 步骤2: 更新状态并准备发布数据
    updatePlatformOptimizationStatus(platform.id, 'publishing', '内容优化完成，正在发布...');

    const optimizedContentValidation = {
      ...contentValidation,
      content: optimizedContent
    };

    // 步骤3: 执行发布
    await publishOptimizedContent(optimizedContentValidation, platform);

    console.log(`✅ 平台 ${platformName} 内容优化和发布完成`);
    return true;

  } catch (error) {
    return handleOptimizationError(platform, error);
  }
}

// 发布优化后的内容
async function publishOptimizedContent(contentValidation, platform) {
  const publishData = await createPublishDataFromValidated(
    contentValidation,
    mainController,
    [platform]
  );
  await executePublish(publishData);
}

// 处理优化错误
function handleOptimizationError(platform, error) {
  const errorMessage = `优化失败: ${error.message}`;
  console.error(`❌ 平台 ${platform.name} ${errorMessage}:`, error);

  updatePlatformOptimizationStatus(platform.id, 'failed', errorMessage);
  showNotification(`${platform.name} 内容${errorMessage}`, 'error');

  return false; // 不抛出错误，继续处理其他平台
}

// 执行发布的统一函数
async function executePublish(publishData) {
  try {
    // 简化的发布数据验证日志
    console.log('📤 发布流程启动:', {
      contentType: publishData.contentType,
      platformCount: publishData.platforms?.length || 0,
      hasFiles: !!(publishData.files && publishData.files.length > 0) || !!(publishData.fileIds && publishData.fileIds.length > 0)
    });

    // 验证必要字段
    if (!publishData.content || !publishData.platforms || publishData.platforms.length === 0) {
      throw new Error('发布数据不完整：缺少内容或平台信息');
    }

    console.log('📤 发布数据验证通过，发送到background script...');

    // 发送消息到后台脚本
    const response = await chrome.runtime.sendMessage({
      action: 'startPublish',
      data: publishData
    });

    if (response && response.success) {
      console.log('✅ 发布请求已发送');
    } else {
      throw new Error('发布请求失败');
    }

    // 不再重复打开侧边栏，因为已经在handleStartPublish中打开了

    // 显示成功提示
    showNotification('发布任务已启动，请查看侧边栏监控进度', 'success');

  } catch (error) {
    Utils.handleError(error, '发布失败');
    throw error; // 重新抛出错误以便上层处理
  }
}







// UI更新函数
function updateUI(skipContentTypeUpdate = false) {
  const titleInput = domCache.get('title-input');
  const contentTextarea = domCache.get('content-textarea');

  // 文章模式的输入框
  const articleTitleInput = domCache.get('article-title-input');
  const articleExcerptInput = domCache.get('article-excerpt-input');
  const articleRichEditor = domCache.get('article-rich-editor');

  if (titleInput) titleInput.value = appState.title;
  if (contentTextarea) contentTextarea.value = appState.content;

  // 更新文章模式的输入框
  if (articleTitleInput) articleTitleInput.value = appState.title;
  if (articleExcerptInput) {
    const excerptValue = appState.articleData?.excerpt || '';
    articleExcerptInput.value = excerptValue;

    // 添加调试日志
    console.log('🔍 [DEBUG] UI更新 - 概要输入框:', {
      hasExcerptInput: !!articleExcerptInput,
      excerptValue: excerptValue,
      excerptLength: excerptValue.length,
      appStateArticleData: appState.articleData,
      timestamp: new Date().toISOString()
    });
  }
  if (articleRichEditor) articleRichEditor.innerHTML = appState.content;

  // 更新内容类型按钮状态和页面区域（可选跳过以防止意外切换）
  if (!skipContentTypeUpdate) {
    updateContentTypeButtons(true);
  } else {
    // 只更新按钮状态，不更新页面区域
    updateContentTypeButtons(false);
  }

  // 渲染平台列表（基于当前内容类型）
  renderPlatformList();
  updatePlatformSelection();
  updateImagePreview();
  updateVideoPreview();
  updateSyncButton();
}

// 更新内容类型按钮状态
function updateContentTypeButtons(updateSections = false) {
  if (updateSections) {
    console.log('🔄 更新内容类型按钮和页面区域:', appState.currentContentType);
  }

  const allButtons = document.querySelectorAll('.content-type-btn');
  allButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.trim() === appState.currentContentType) {
      btn.classList.add('active');
    }
  });

  // 只在明确需要时更新页面区域
  if (updateSections) {
    updatePageSections(appState.currentContentType);
  }
}

// 全局统一DOM缓存实例
const domCache = new DOMCache();

// 兼容性方法 - 保持现有接口不变
domCache.init = function() {
  this.initCommonElements();
};

domCache.getGridContainer = function() {
  return this.getContainer('gridContainer', () => {
    const container = document.createElement('div');
    container.className = 'image-grid';
    return container;
  });
};

domCache.getVideoGridContainer = function() {
  return this.getContainer('videoGridContainer', () => {
    let container = document.getElementById('video-grid');
    if (!container) {
      container = document.createElement('div');
      container.id = 'video-grid';
      container.className = 'image-grid';
    }
    return container;
  });
};

// 兼容性属性访问器
Object.defineProperties(domCache, {
  previewContainer: { get() { return this.get('image-preview'); } },
  imageCountDisplay: { get() { return this.get('image-count'); } },
  platformListContainer: { get() { return this.get('platform-list'); } },
  clearAllBtn: { get() { return this.get('clear-all-images'); } },
  videoCountElement: { get() { return this.get('video-count'); } },
  coverCountElement: { get() { return this.get('cover-count'); } }
});

// 创建单个图片预览元素
function createImagePreviewElement(imageData, index) {
  const previewDiv = document.createElement('div');
  previewDiv.className = 'image-preview-container';
  previewDiv.dataset.imageId = imageData.id; // 添加数据属性便于查找

  // 创建图片元素
  const img = document.createElement('img');
  img.src = imageData.dataUrl;
  img.alt = `预览图片 ${index + 1}`;
  img.title = `${imageData.name} (${formatFileSize(imageData.size)})`;
  img.loading = 'lazy'; // 懒加载优化

  // 创建删除按钮
  const removeBtn = document.createElement('button');
  removeBtn.className = 'image-remove-btn';
  removeBtn.textContent = '×';
  removeBtn.title = `删除图片: ${imageData.name}`;
  removeBtn.setAttribute('aria-label', `删除图片: ${imageData.name}`);

  // 使用事件委托优化 - 在父容器上绑定事件
  removeBtn.dataset.imageId = imageData.id;

  // 组装预览元素
  previewDiv.appendChild(img);
  previewDiv.appendChild(removeBtn);

  return previewDiv;
}

// 优化后的图片预览更新函数 - 使用通用函数减少重复代码
function updateImagePreview() {
  updateMediaPreview(
    'image',
    appState.imagePreviews,
    createImagePreviewElement,
    () => domCache.getGridContainer()
  );
}

// 控制上传提示框显示状态
function toggleUploadPlaceholder(previewContainer, show) {
  const placeholder = previewContainer.querySelector('.upload-placeholder');
  if (placeholder) {
    placeholder.style.display = show ? 'flex' : 'none';
  }
}

// 清理预览相关的DOM元素，只保留上传提示框
function cleanupPreviewElements(previewContainer) {
  const children = Array.from(previewContainer.children);
  children.forEach(child => {
    if (!child.classList.contains('upload-placeholder')) {
      previewContainer.removeChild(child);
    }
  });
}

// 通用媒体预览更新函数 - 优化用户体验和DOM清理
function updateMediaPreview(mediaType, mediaArray, createElementFn, getContainerFn) {
  // 确保DOM缓存已初始化
  if (!domCache.previewContainer) {
    domCache.init();
  }

  const { previewContainer } = domCache;
  if (!previewContainer) return;

  const mediaCount = mediaArray.length;
  const gridContainer = getContainerFn();

  if (mediaCount > 0) {
    // 隐藏上传提示框
    toggleUploadPlaceholder(previewContainer, false);

    // 清空网格容器
    gridContainer.innerHTML = '';

    // 创建媒体预览元素
    const fragment = document.createDocumentFragment();

    mediaArray.forEach((mediaData, index) => {
      const previewElement = createElementFn(mediaData, index);
      fragment.appendChild(previewElement);
    });

    gridContainer.appendChild(fragment);

    // 如果网格容器不在预览容器中，则添加
    if (!gridContainer.parentNode) {
      previewContainer.appendChild(gridContainer);
    }
  } else {
    // 当没有媒体时，清空对应网格容器
    gridContainer.innerHTML = '';

    // 如果网格容器在预览容器中，则移除它
    if (gridContainer.parentNode === previewContainer) {
      previewContainer.removeChild(gridContainer);
    }

    // 检查是否还有其他媒体
    const hasOtherMedia = mediaType === 'image'
      ? appState.videoPreviews.length > 0
      : appState.imagePreviews.length > 0;

    if (!hasOtherMedia) {
      // 清理所有预览相关的DOM元素，只保留上传提示框
      cleanupPreviewElements(previewContainer);

      // 显示上传提示框
      toggleUploadPlaceholder(previewContainer, true);
    }
  }

  // 确保预览容器始终可见
  previewContainer.style.display = 'block';

  // 更新媒体计数显示
  updateMediaCount();
}



function removeImage(imageId) {
  Utils.safeExecute(() => {
    if (imageId === undefined) {
      // 删除所有图片 - 先释放URL对象
      appState.imagePreviews.forEach(image => {
        if (image.dataUrl && image.dataUrl.startsWith('blob:')) {
          URL.revokeObjectURL(image.dataUrl);
        }
      });
      appState.imagePreviews = [];
    } else {
      // 删除指定ID的图片
      const initialLength = appState.imagePreviews.length;
      const imageToRemove = appState.imagePreviews.find(img => img.id === imageId);

      // 释放URL对象
      if (imageToRemove && imageToRemove.dataUrl && imageToRemove.dataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.dataUrl);
      }

      appState.imagePreviews = appState.imagePreviews.filter(img => img.id !== imageId);

      // 验证删除是否成功
      if (appState.imagePreviews.length === initialLength) {
        console.warn(`图片删除失败: 未找到ID为 ${imageId} 的图片`);
        return;
      }
    }

    updateImagePreview();
    debouncedSaveToStorage();
  }, '删除图片失败');
}

// 创建单个视频预览元素
function createVideoPreviewElement(videoData, index) {
  const previewDiv = document.createElement('div');
  previewDiv.className = 'video-preview-container';
  previewDiv.dataset.videoId = videoData.id;

  // 创建视频元素
  const video = document.createElement('video');
  video.src = videoData.dataUrl;
  video.alt = `预览视频 ${index + 1}`;
  video.title = `${videoData.name} (${formatFileSize(videoData.size)})`;
  video.controls = false;
  video.muted = true;
  video.preload = 'metadata';
  video.style.width = '70px';
  video.style.height = '70px';
  video.style.objectFit = 'cover';
  video.style.borderRadius = '0.5rem';
  video.style.border = '1px solid #d1d5db';

  // 创建删除按钮
  const removeBtn = document.createElement('button');
  removeBtn.className = 'video-remove-btn';
  removeBtn.textContent = '×';
  removeBtn.title = `删除视频: ${videoData.name}`;
  removeBtn.setAttribute('aria-label', `删除视频: ${videoData.name}`);
  removeBtn.dataset.videoId = videoData.id;

  // 组装预览元素
  previewDiv.appendChild(video);
  previewDiv.appendChild(removeBtn);

  return previewDiv;
}

// 视频预览更新函数 - 使用通用函数减少重复代码
function updateVideoPreview() {
  updateMediaPreview(
    'video',
    appState.videoPreviews,
    createVideoPreviewElement,
    () => domCache.getVideoGridContainer()
  );
}

// 删除视频
function removeVideo(videoId) {
  Utils.safeExecute(() => {
    console.log(`[DEBUG] 尝试删除视频，ID: ${videoId}`);
    console.log(`[DEBUG] 当前视频列表:`, appState.videoPreviews.map(v => ({ id: v.id, name: v.name })));

    if (videoId === undefined) {
      // 删除所有视频
      appState.videoPreviews.forEach(video => {
        if (video.dataUrl && video.dataUrl.startsWith('blob:')) {
          URL.revokeObjectURL(video.dataUrl);
        }
      });
      appState.videoPreviews = [];
      console.log(`[DEBUG] 已清空所有视频`);
    } else {
      // 删除指定ID的视频
      const initialLength = appState.videoPreviews.length;
      const videoToRemove = appState.videoPreviews.find(video => video.id === videoId);

      console.log(`[DEBUG] 找到要删除的视频:`, videoToRemove ? { id: videoToRemove.id, name: videoToRemove.name } : 'null');

      if (videoToRemove && videoToRemove.dataUrl && videoToRemove.dataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoToRemove.dataUrl);
      }

      appState.videoPreviews = appState.videoPreviews.filter(video => video.id !== videoId);

      // 验证删除是否成功
      if (appState.videoPreviews.length === initialLength) {
        console.error(`[DEBUG] 视频删除失败: 未找到ID为 ${videoId} 的视频`);
        console.error(`[DEBUG] 可用的视频ID列表:`, appState.videoPreviews.map(v => v.id));
        return;
      }

      console.log(`[DEBUG] 视频删除成功，剩余视频数量: ${appState.videoPreviews.length}`);
    }

    updateVideoPreview();
    debouncedSaveToStorage();
  }, '删除视频失败');
}

// 更新媒体计数显示（图片+视频）
function updateMediaCount() {
  const imageCount = appState.imagePreviews.length;
  const videoCount = appState.videoPreviews.length;
  const totalCount = imageCount + videoCount;

  if (domCache.imageCountDisplay) {
    if (totalCount > 0) {
      let countText = '';
      if (imageCount > 0 && videoCount > 0) {
        countText = `图片 ${imageCount}/${IMAGE_CONFIG.maxImages}    视频 ${videoCount}/${VIDEO_CONFIG.maxVideos}`;
      } else if (imageCount > 0) {
        countText = `图片 ${imageCount}/${IMAGE_CONFIG.maxImages}`;
      } else if (videoCount > 0) {
        countText = `视频 ${videoCount}/${VIDEO_CONFIG.maxVideos}`;
      }

      domCache.imageCountDisplay.textContent = countText;
      domCache.imageCountDisplay.style.display = 'inline';
    } else {
      domCache.imageCountDisplay.style.display = 'none';
    }
  }

  // 更新清空按钮显示
  if (domCache.clearAllBtn) {
    domCache.clearAllBtn.style.display = totalCount > 0 ? 'inline-block' : 'none';
  }
}



// 向后兼容
function formatFileSize(bytes) {
  return Utils.formatFileSize(bytes);
}

// 清空所有媒体文件（图片和视频）
function clearAllImages() {
  // 清理图片的URL对象
  appState.imagePreviews.forEach(image => {
    if (image.dataUrl && image.dataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(image.dataUrl);
    }
  });

  // 清理视频的URL对象
  appState.videoPreviews.forEach(video => {
    if (video.dataUrl && video.dataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(video.dataUrl);
    }
  });

  appState.imagePreviews = [];
  appState.videoPreviews = [];
  updateImagePreview();
  updateVideoPreview();
  debouncedSaveToStorage();

  // 清空文件输入
  const imageUpload = domCache.get('image-upload');
  if (imageUpload) {
    imageUpload.value = '';
  }

  const videoUpload = domCache.get('video-upload');
  if (videoUpload) {
    videoUpload.value = '';
  }
}

function updatePlatformSelection() {
  // 获取当前显示的平台列表
  let currentPlatforms;
  if (appState.currentContentType === '短视频') {
    currentPlatforms = getVideoSupportedPlatforms();
  } else if (appState.currentContentType === '文章') {
    currentPlatforms = getArticlePlatforms();
  } else {
    currentPlatforms = SUPPORTED_PLATFORMS;
  }

  currentPlatforms.forEach(platform => {
    const checkbox = domCache.get(`platform-${platform.id}`);
    if (checkbox) {
      checkbox.checked = appState.selectedPlatforms.some(p => p.id === platform.id);
    }
  });
}

function updateSyncButton() {
  const syncButton = domCache.get('sync-button');
  if (syncButton) {
    syncButton.disabled = appState.isPublishing;
    const buttonText = syncButton.querySelector('.button-text');
    const buttonIcon = syncButton.querySelector('.button-icon');

    if (buttonText) {
      buttonText.textContent = appState.isPublishing ? '发布中...' : '开始同步';
    }

    if (buttonIcon && appState.isPublishing) {
      buttonIcon.classList.add('loading-spinner');
    } else if (buttonIcon) {
      buttonIcon.classList.remove('loading-spinner');
    }
  }
}

// 显示按钮点击反馈效果
function showButtonClickFeedback() {
  const syncButton = domCache.get('sync-button');
  if (syncButton) {
    // 添加点击效果类
    syncButton.classList.add('button-clicked');

    // 短暂延迟后移除效果
    setTimeout(() => {
      syncButton.classList.remove('button-clicked');
    }, 200);
  }
}

// 通知系统
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    'bg-blue-500 text-white'
  }`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // 3秒后自动移除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// 处理提示词助手按钮点击
async function handleOpenPromptHelper() {
  try {
    // 检查侧边栏是否已经打开
    const isSidePanelAlreadyOpen = isSidePanelOpen();

    // 打开侧边栏并切换到提示词助手视图
    await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });

    // 如果侧边栏之前没有打开，需要等待其完全加载
    const delay = isSidePanelAlreadyOpen ? PROMPT_SELECTOR_CONFIG.DELAYS.SIDEBAR_QUICK : PROMPT_SELECTOR_CONFIG.DELAYS.SIDEBAR_LOAD;

    // 延迟发送消息，确保侧边栏已完全加载
    setTimeout(() => {
      // 发送消息到侧边栏，切换到提示词视图（统一使用带平台信息的格式）
      chrome.runtime.sendMessage({
        action: 'switchToPromptView',
        platformId: null, // 通用模式，不指定特定平台
        platformName: null
      });

      console.log(`已发送switchToPromptView消息（通用模式），延迟: ${delay}ms`);
    }, delay);

    showNotification('提示词助手已打开', 'success');
  } catch (error) {
    console.error('打开提示词助手失败:', error);
    showNotification('打开提示词助手失败，请重试', 'error');
  }
}

// ===== 提示词选择器功能 =====

// DOM缓存管理器
class PromptSelectorDOMCache {
  constructor() {
    this.cache = new Map();
  }

  getPromptContainer(platformId) {
    const key = `prompt-container-${platformId}`;
    if (!this.cache.has(key)) {
      const element = document.querySelector(`${PROMPT_SELECTOR_CONFIG.SELECTORS.PROMPT_CONTAINER}[data-platform-id="${platformId}"]`);
      this.cache.set(key, element);
    }
    return this.cache.get(key);
  }

  getPromptLabel(platformId) {
    const key = `prompt-label-${platformId}`;
    if (!this.cache.has(key)) {
      const element = document.querySelector(`${PROMPT_SELECTOR_CONFIG.SELECTORS.PROMPT_LABEL}[data-platform-id="${platformId}"]`);
      this.cache.set(key, element);
    }
    return this.cache.get(key);
  }

  getPromptCheckbox(platformId) {
    const key = `prompt-checkbox-${platformId}`;
    if (!this.cache.has(key)) {
      const element = document.querySelector(`${PROMPT_SELECTOR_CONFIG.SELECTORS.PROMPT_CHECKBOX}[data-platform-id="${platformId}"]`);
      this.cache.set(key, element);
    }
    return this.cache.get(key);
  }

  invalidateCache(platformId = null) {
    if (platformId) {
      // 清除特定平台的缓存
      this.cache.delete(`prompt-container-${platformId}`);
      this.cache.delete(`prompt-label-${platformId}`);
      this.cache.delete(`prompt-checkbox-${platformId}`);
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
  }
}

// 平台提示词配置状态
let platformPromptConfig = {};

// 当前显示的悬浮弹窗
let currentPromptPopup = null;

// DOM缓存实例
const promptDOMCache = new PromptSelectorDOMCache();

// 统一的弹窗事件处理器
class PromptPopupEventHandler {
  constructor() {
    this.outsideClickHandler = null;
  }

  // 绑定弹窗的事件（点击模式下不需要鼠标进出事件）
  bindPopupEvents(popup) {
    // 阻止弹窗内部点击事件冒泡，避免触发外部点击关闭
    popup.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // 绑定容器的点击事件
  bindContainerEvents(container, platformId) {
    if (!container) return;

    // 清理所有旧的事件监听器
    this.cleanupContainerEvents(container);

    // 创建新的点击事件处理器
    container._clickHandler = (e) => {
      // 检查点击的是否是复选框，如果是则不触发弹窗
      if (e.target.classList.contains('prompt-checkbox') ||
          e.target.type === 'checkbox') {
        return; // 让复选框的默认行为和change事件处理
      }

      e.stopPropagation();
      // 如果弹窗已显示且是同一个平台，则隐藏弹窗
      if (currentPromptPopup && currentPromptPopup.dataset.platformId === platformId) {
        hidePromptPopup();
      } else {
        // 显示弹窗
        showPromptPopup(platformId, container);
      }
    };

    // 绑定点击事件
    container.addEventListener('click', container._clickHandler);

    // 标记已绑定事件
    container._eventsbound = true;
  }

  // 清理容器事件监听器
  cleanupContainerEvents(container) {
    if (container._clickHandler) {
      container.removeEventListener('click', container._clickHandler);
      container._clickHandler = null;
    }
    container._eventsbound = false;
  }

  // 绑定全局外部点击事件
  bindOutsideClickHandler() {
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
    }

    this.outsideClickHandler = (e) => {
      // 检查点击是否在弹窗外部
      if (currentPromptPopup && !currentPromptPopup.contains(e.target)) {
        hidePromptPopup();
      }
    };

    // 延迟绑定，避免立即触发
    setTimeout(() => {
      document.addEventListener('click', this.outsideClickHandler);
    }, PROMPT_SELECTOR_CONFIG.DELAYS.OUTSIDE_CLICK);
  }

  // 移除全局外部点击事件
  unbindOutsideClickHandler() {
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
      this.outsideClickHandler = null;
    }
  }
}

const popupEventHandler = new PromptPopupEventHandler();



// 初始化平台提示词配置
async function initializePlatformPromptConfig() {
  try {
    const result = await chrome.storage.local.get(['platformPromptConfig']);
    platformPromptConfig = result.platformPromptConfig || {};
    console.log('平台提示词配置已加载:', platformPromptConfig);
  } catch (error) {
    console.error('加载平台提示词配置失败:', error);
    platformPromptConfig = {};
  }
}

// 配置管理器，支持批量保存以提高性能
class PlatformPromptConfigManager {
  constructor() {
    this.pendingSave = false;
    this.saveDelay = PROMPT_SELECTOR_CONFIG.DELAYS.CONFIG_SAVE;
  }

  // 立即保存配置（用于重要操作）
  async saveImmediately() {
    try {
      await chrome.storage.local.set({ platformPromptConfig });
      console.log('平台提示词配置已保存');
    } catch (error) {
      console.error('保存平台提示词配置失败:', error);
    }
  }

  // 延迟保存配置（批量处理，提高性能）
  scheduleSave() {
    if (this.pendingSave) return;
    this.pendingSave = true;

    setTimeout(async () => {
      try {
        await chrome.storage.local.set({ platformPromptConfig });
        console.log('平台提示词配置已批量保存');
      } catch (error) {
        console.error('保存平台提示词配置失败:', error);
      } finally {
        this.pendingSave = false;
      }
    }, this.saveDelay);
  }
}

const configManager = new PlatformPromptConfigManager();

// 保存平台提示词配置（向后兼容）
async function savePlatformPromptConfig() {
  await configManager.saveImmediately();
}

// 获取平台的提示词配置
function getPlatformPromptConfig(platformId) {
  return platformPromptConfig[platformId] || {
    selectedPrompt: null,
    availablePrompts: [],
    isEnabled: false
  };
}

// 更新平台的提示词配置
function updatePlatformPromptConfig(platformId, config, immediate = false) {
  platformPromptConfig[platformId] = {
    ...getPlatformPromptConfig(platformId),
    ...config
  };

  // 根据需要选择立即保存或延迟保存
  if (immediate) {
    configManager.saveImmediately();
  } else {
    configManager.scheduleSave();
  }
}

// 绑定提示词选择器事件
function bindPromptSelectorEvents(platform) {
  const promptContainer = promptDOMCache.getPromptContainer(platform.id);
  const promptLabel = promptDOMCache.getPromptLabel(platform.id);
  const promptCheckbox = promptDOMCache.getPromptCheckbox(platform.id);

  // 检查是否已经绑定过事件，避免重复绑定
  if (promptContainer && !promptContainer._eventsbound) {
    // 使用统一的事件处理器绑定容器事件
    popupEventHandler.bindContainerEvents(promptContainer, platform.id);
  }



  if (promptCheckbox) {
    // 移除旧的事件监听器（如果存在）
    if (promptCheckbox._changeHandler) {
      promptCheckbox.removeEventListener('change', promptCheckbox._changeHandler);
    }
    if (promptCheckbox._clickHandler) {
      promptCheckbox.removeEventListener('click', promptCheckbox._clickHandler);
    }

    // 创建change事件处理器
    promptCheckbox._changeHandler = (e) => {
      e.stopPropagation();
      const config = getPlatformPromptConfig(platform.id);
      updatePlatformPromptConfig(platform.id, {
        isEnabled: e.target.checked
      });
    };

    // 创建click事件处理器，防止冒泡到容器
    promptCheckbox._clickHandler = (e) => {
      e.stopPropagation();
      // 不阻止默认行为，让复选框正常工作
    };

    promptCheckbox.addEventListener('change', promptCheckbox._changeHandler);
    promptCheckbox.addEventListener('click', promptCheckbox._clickHandler);
  }

  // 智能恢复保存的状态，确保DOM元素完全加载
  requestAnimationFrame(() => {
    restorePromptSelectorState(platform.id);
  });
}

// 恢复提示词选择器状态 - 优化版本
function restorePromptSelectorState(platformId) {
  const config = getPlatformPromptConfig(platformId);
  const promptLabel = promptDOMCache.getPromptLabel(platformId);
  const promptCheckbox = promptDOMCache.getPromptCheckbox(platformId);

  // 只在有配置变化时才输出日志
  if (config.selectedPrompt) {
    console.log(`恢复平台 ${platformId} 的提示词状态:`, config.selectedPrompt);
  }

  // 统一处理标签状态
  if (promptLabel) {
    const hasHistory = config.selectedPrompt;
    promptLabel.textContent = hasHistory ? config.selectedPrompt : '无模板';
    promptLabel.className = promptLabel.className.replace(/text-(blue|gray)-600/g, '') + ' text-gray-600';
    promptLabel.title = hasHistory
      ? `上次使用: ${config.selectedPrompt}，点击重新选择`
      : '点击选择提示词模板';
  }

  // 统一处理复选框状态
  if (promptCheckbox) {
    promptCheckbox.checked = false;
    // 批量更新配置，避免频繁保存
    updatePlatformPromptConfig(platformId, { isEnabled: false }, false);
  }
}

// 切换提示词选择状态
function togglePromptSelection(platformId) {
  const config = getPlatformPromptConfig(platformId);
  const promptCheckbox = promptDOMCache.getPromptCheckbox(platformId);

  if (config.selectedPrompt && promptCheckbox) {
    promptCheckbox.checked = !promptCheckbox.checked;
    updatePlatformPromptConfig(platformId, {
      isEnabled: promptCheckbox.checked
    });
  }
}



// 显示提示词选择弹窗
function showPromptPopup(platformId, targetElement) {
  // 关闭已存在的弹窗
  hidePromptPopup();

  const config = getPlatformPromptConfig(platformId);
  const popup = createPromptPopup(platformId, config);

  // 设置平台ID标识
  popup.dataset.platformId = platformId;

  // 定位弹窗
  positionPromptPopup(popup, targetElement);

  // 添加到页面
  document.body.appendChild(popup);
  currentPromptPopup = popup;

  // 使用统一的事件处理器绑定弹窗事件
  popupEventHandler.bindPopupEvents(popup);

  // 绑定外部点击关闭事件
  popupEventHandler.bindOutsideClickHandler();
}

// 隐藏提示词选择弹窗
function hidePromptPopup() {
  if (currentPromptPopup) {
    currentPromptPopup.remove();
    currentPromptPopup = null;
  }

  // 移除外部点击事件监听器
  popupEventHandler.unbindOutsideClickHandler();
}

// 创建提示词选择弹窗
function createPromptPopup(platformId, config) {
  const popup = document.createElement('div');
  popup.className = 'prompt-popup fixed bg-white border border-gray-200 rounded-lg shadow-lg p-5 z-50';

  const promptList = config.availablePrompts.slice(0, PROMPT_SELECTOR_CONFIG.LIMITS.MAX_PROMPTS_PER_PLATFORM);

  popup.innerHTML = `
    <div class="prompt-popup-wrapper flex flex-col h-full">
      <!-- 内容区域 -->
      <div class="prompt-popup-content flex-1 overflow-y-auto">
        ${promptList.length > 0 ? `
          <div class="space-y-3 p-1">
            ${promptList.map(prompt => `
              <div class="prompt-item flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" data-prompt-name="${prompt}">
                <span class="text-sm text-gray-700 flex-1 truncate pr-2">${prompt}</span>
                <button class="remove-prompt-btn text-red-500 hover:text-red-700 ml-2 text-sm font-medium" data-prompt-name="${prompt}">×</button>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="text-sm text-gray-500 text-center py-8">暂无可用模板</div>
        `}
      </div>

      <!-- 底部固定按钮区域 -->
      <div class="prompt-popup-footer border-t border-gray-100 pt-3 mt-3">
        <button class="add-prompt-btn w-full text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-300 rounded-lg px-4 py-3 transition-colors">
          添加
        </button>
      </div>
    </div>
  `;

  // 绑定弹窗内的事件
  bindPromptPopupEvents(popup, platformId);

  return popup;
}

// 检测侧边栏是否打开
function isSidePanelOpen() {
  // 方法1：检查页面宽度变化
  // Chrome侧边栏通常占用400-500px，当打开时页面宽度会明显减少
  const currentWidth = window.innerWidth;
  const screenWidth = window.screen.availWidth;

  // 如果当前窗口宽度明显小于屏幕宽度，可能是侧边栏打开了
  if (currentWidth < screenWidth * 0.75) {
    return true;
  }

  // 方法2：检查主容器的位置
  const mainContainer = document.querySelector('.main-container') || document.body;
  if (mainContainer) {
    const containerRect = mainContainer.getBoundingClientRect();
    // 如果主容器的右边距离窗口右边有明显距离，说明侧边栏可能打开了
    const rightGap = window.innerWidth - containerRect.right;
    if (rightGap > 100) {
      return true;
    }
  }

  // 方法3：检查是否存在侧边栏相关的DOM元素或样式变化
  const bodyStyle = window.getComputedStyle(document.body);
  const hasTransform = bodyStyle.transform && bodyStyle.transform !== 'none';

  return hasTransform;
}

// 定位提示词弹窗（改进版，考虑侧边栏状态）
function positionPromptPopup(popup, targetElement) {
  const rect = targetElement.getBoundingClientRect();
  const popupRect = {
    width: PROMPT_SELECTOR_CONFIG.LIMITS.POPUP_WIDTH,
    height: PROMPT_SELECTOR_CONFIG.LIMITS.POPUP_HEIGHT
  };

  // 检测侧边栏状态
  const sidePanelOpen = isSidePanelOpen();

  // 计算可用的右侧空间
  let availableRightSpace = window.innerWidth - rect.right;

  // 如果侧边栏打开，减少可用空间（侧边栏通常占用400-500px）
  if (sidePanelOpen) {
    availableRightSpace -= 450; // 预留侧边栏空间
  }

  // 默认显示在目标元素右侧
  let left = rect.right + 10;
  let top = rect.top;

  // 检查右侧空间是否足够
  if (availableRightSpace < popupRect.width + 20) {
    // 右侧空间不足，显示在左侧
    left = rect.left - popupRect.width - 10;

    // 如果左侧也不够，尝试调整到合适位置
    if (left < 10) {
      if (sidePanelOpen) {
        // 侧边栏打开时，优先显示在目标元素上方或下方
        left = rect.left;
        if (rect.top > popupRect.height + 20) {
          top = rect.top - popupRect.height - 10; // 显示在上方
        } else {
          top = rect.bottom + 10; // 显示在下方
        }
      } else {
        // 侧边栏未打开时，强制显示在右侧
        left = window.innerWidth - popupRect.width - 10;
      }
    }
  }

  // 检查垂直位置，确保弹窗不超出屏幕
  if (top + popupRect.height > window.innerHeight) {
    top = window.innerHeight - popupRect.height - 10;
  }

  // 确保弹窗不超出屏幕边界
  left = Math.max(10, Math.min(left, window.innerWidth - popupRect.width - 10));
  top = Math.max(10, top);

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;


}

// 绑定弹窗内的事件
function bindPromptPopupEvents(popup, platformId) {
  // 提示词项目点击事件
  popup.querySelectorAll('.prompt-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-prompt-btn')) return;

      const promptName = item.dataset.promptName;
      selectPromptForPlatform(platformId, promptName);
      hidePromptPopup();
    });
  });

  // 删除提示词按钮事件
  popup.querySelectorAll('.remove-prompt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const promptName = btn.dataset.promptName;
      removePromptFromPlatform(platformId, promptName);
      hidePromptPopup();
    });
  });

  // 添加提示词按钮事件
  const addBtn = popup.querySelector('.add-prompt-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openPromptHelperForPlatform(platformId);
      hidePromptPopup();
    });
  }


}

// 处理弹窗外部点击
function handlePopupOutsideClick(e) {
  if (currentPromptPopup && !currentPromptPopup.contains(e.target)) {
    hidePromptPopup();
    document.removeEventListener('click', handlePopupOutsideClick, true);
  }
}

// 为平台选择提示词
function selectPromptForPlatform(platformId, promptName) {
  const config = getPlatformPromptConfig(platformId);
  updatePlatformPromptConfig(platformId, {
    selectedPrompt: promptName,
    isEnabled: true
  });

  // 更新UI显示
  const promptLabel = promptDOMCache.getPromptLabel(platformId);
  const promptCheckbox = promptDOMCache.getPromptCheckbox(platformId);

  if (promptLabel) {
    promptLabel.textContent = promptName;
    promptLabel.classList.add('text-blue-600');
    promptLabel.classList.remove('text-gray-600');
  }

  if (promptCheckbox) {
    promptCheckbox.checked = true;
  }

  showNotification(`已为${getPlatformName(platformId)}选择提示词: ${promptName}`, 'success');
}

// 从平台移除提示词
function removePromptFromPlatform(platformId, promptName) {
  const config = getPlatformPromptConfig(platformId);
  const updatedPrompts = config.availablePrompts.filter(p => p !== promptName);

  updatePlatformPromptConfig(platformId, {
    availablePrompts: updatedPrompts
  });

  // 如果移除的是当前选中的提示词，重置选择
  if (config.selectedPrompt === promptName) {
    updatePlatformPromptConfig(platformId, {
      selectedPrompt: null,
      isEnabled: false
    });

    // 更新UI显示
    const promptLabel = promptDOMCache.getPromptLabel(platformId);
    const promptCheckbox = promptDOMCache.getPromptCheckbox(platformId);

    if (promptLabel) {
      promptLabel.textContent = '无模板';
      promptLabel.classList.remove('text-blue-600');
      promptLabel.classList.add('text-gray-600');
    }

    if (promptCheckbox) {
      promptCheckbox.checked = false;
    }
  }

  showNotification(`已从${getPlatformName(platformId)}移除提示词"${promptName}"`, 'success');
}

// 为特定平台打开提示词助手
async function openPromptHelperForPlatform(platformId) {
  try {
    // 保存当前操作的平台ID
    window.currentPromptPlatformId = platformId;

    // 检查侧边栏是否已经打开
    const isSidePanelAlreadyOpen = isSidePanelOpen();

    // 打开侧边栏
    await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });

    // 如果侧边栏之前没有打开，需要等待其完全加载
    const delay = isSidePanelAlreadyOpen ? PROMPT_SELECTOR_CONFIG.DELAYS.SIDEBAR_QUICK : PROMPT_SELECTOR_CONFIG.DELAYS.SIDEBAR_LOAD;

    // 延迟发送消息，确保侧边栏已完全加载
    setTimeout(() => {
      // 发送消息到侧边栏，切换到提示词视图并传递平台信息
      chrome.runtime.sendMessage({
        action: 'switchToPromptView',
        platformId: platformId,
        platformName: getPlatformName(platformId)
      });

      console.log(`已发送switchToPromptView消息，平台: ${platformId}, 延迟: ${delay}ms`);
    }, delay);

    showNotification('提示词助手已打开，请选择要添加的提示词', 'success');
  } catch (error) {
    console.error('打开提示词助手失败:', error);
    showNotification('打开提示词助手失败，请重试', 'error');
  }
}

// 获取平台名称
function getPlatformName(platformId) {
  const platform = [...SUPPORTED_PLATFORMS, ...getArticlePlatforms(), ...getVideoSupportedPlatforms()]
    .find(p => p.id === platformId);
  return platform ? platform.name : platformId;
}

// 从提示词助手添加提示词到平台
function addPromptToPlatform(platformId, promptName) {
  const config = getPlatformPromptConfig(platformId);

  // 检查是否已存在
  if (config.availablePrompts.includes(promptName)) {
    showNotification('该提示词已存在', 'warning');
    return;
  }

  // 最多保存指定数量的提示词
  const updatedPrompts = [...config.availablePrompts, promptName].slice(-PROMPT_SELECTOR_CONFIG.LIMITS.MAX_PROMPTS_PER_PLATFORM);

  updatePlatformPromptConfig(platformId, {
    availablePrompts: updatedPrompts
  });

  showNotification(`已添加提示词"${promptName}"到${getPlatformName(platformId)}`, 'success');
}



// 监听来自侧边栏的消息
function setupPromptHelperMessageListener() {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'addPromptToPlatform') {
        const { platformId, promptName } = message;
        if (platformId && promptName) {
          addPromptToPlatform(platformId, promptName);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: '缺少必要参数' });
        }
        return true;
      } else if (message.action === 'removePromptFromPlatform') {
        const { platformId, promptName } = message;
        if (platformId && promptName) {
          removePromptFromPlatform(platformId, promptName);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: '缺少必要参数' });
        }
        return true;
      }
    });
  }
}

// 创建页面内容
function createPageContent() {
  const root = document.getElementById('main-root');

  root.innerHTML = `
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <h1 class="text-xl font-semibold text-gray-900">动态发布助手</h1>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="content-area">
      <div class="form-grid">
        <!-- Content Form -->
        <div class="space-y-6">
          <!-- Content Card -->
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div class="px-6 py-4 border-b border-gray-200">
              <!-- 内容类型按钮组 -->
              <div class="flex items-center space-x-3">
                <button class="content-type-btn">动态</button>
                <button class="content-type-btn">文章</button>
                <button class="content-type-btn">短视频</button>
              </div>
              <p class="mt-3 text-sm text-gray-500">填写要发布的动态内容</p>
            </div>
            <div class="p-6 space-y-6">
              <!-- Title Input -->
              <div id="title-input-section">
                <label for="title-input" class="block text-sm font-medium text-gray-700 mb-2">
                  标题 <span class="text-gray-400">(可选)</span>
                </label>
                <input
                  id="title-input"
                  type="text"
                  class="input-field"
                  placeholder="输入动态标题..."
                  autocomplete="off"
                />
              </div>

              <!-- 文章抓取区域 (仅在文章模式下显示) -->
              <div id="article-extraction-section" class="article-extraction-section-clean" style="display: none;">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  链接
                </label>
                <div class="flex space-x-3 mb-4">
                  <input
                    id="article-url-input"
                    type="url"
                    class="input-field flex-1"
                    placeholder="输入文章链接"
                    autocomplete="off"
                  />
                  <button
                    id="fetch-article-btn"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <span class="btn-text">获取文章</span>
                    <span class="btn-loading hidden">抓取中...</span>
                  </button>
                </div>

                <!-- 文章标题输入框 -->
                <div class="mb-4">
                  <label for="article-title-input" class="block text-sm font-medium text-gray-700 mb-2">
                    标题及概要
                  </label>
                  <input
                    id="article-title-input"
                    type="text"
                    class="input-field w-full"
                    placeholder="输入或编辑文章标题..."
                    autocomplete="off"
                  />
                </div>

                <!-- 文章概要输入框 -->
                <div class="mb-4">
                  <textarea
                    id="article-excerpt-input"
                    class="textarea-field w-full"
                    rows="3"
                    placeholder="输入或编辑文章概要..."
                    autocomplete="off"
                  ></textarea>
                </div>
              </div>

              <!-- Content Textarea -->
              <div id="content-textarea-section">
                <label for="content-textarea" class="block text-sm font-medium text-gray-700 mb-2">
                  内容 <span class="text-red-500">*</span>
                </label>
                <textarea
                  id="content-textarea"
                  class="textarea-field"
                  rows="8"
                  placeholder="分享你的想法..."
                  autocomplete="off"
                ></textarea>
                <p class="mt-1 text-xs text-gray-500">支持文本内容，将自动适配各平台格式</p>
              </div>

              <!-- 文章编辑区域 (仅在文章模式下显示) -->
              <div id="article-editor-section" style="display: none;">
                <label for="article-rich-editor" class="block text-sm font-medium text-gray-700 mb-2">
                  内容 <span class="text-red-500">*</span>
                </label>
                <div class="article-rich-editor-container">
                  <!-- 富文本编辑器 -->
                  <div
                    id="article-rich-editor"
                    class="article-rich-editor-field"
                    contenteditable="true"
                    data-placeholder="文章内容将在这里显示，您可以进行编辑..."
                  ></div>

                  <!-- 底部操作按钮 -->
                  <div class="article-editor-actions">
                    <button id="toggle-format-btn" class="btn-secondary">
                      🔄 切换格式
                    </button>
                    <button id="copy-content-btn" class="btn-secondary">
                      📄 复制内容
                    </button>
                    <button id="clear-content-btn" class="btn-secondary btn-danger">
                      🗑️ 清除
                    </button>
                  </div>
                </div>
                <p class="mt-1 text-xs text-gray-500">支持富文本内容编辑，包含图片、链接等格式。可在富文本和Markdown格式之间切换。</p>
              </div>

              <!-- Media Upload -->
              <div id="media-upload-section">
                <div class="space-y-3 image-upload-container">
                  <!-- 媒体上传按钮区域 - 与计数信息在同一行 -->
                  <div class="media-upload-row">
                    <!-- 左侧：上传按钮组 -->
                    <div class="media-upload-buttons">
                      <!-- 图片上传按钮 -->
                      <label class="cursor-pointer relative" title="上传图片">
                        <div class="flex items-center justify-center w-16 h-16 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                          <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          multiple
                          class="hidden"
                        />
                      </label>

                      <!-- 视频上传按钮 -->
                      <label class="cursor-pointer relative" title="上传视频">
                        <div class="flex items-center justify-center w-16 h-16 border-2 border-gray-300 border-dashed rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors">
                          <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                        <input
                          id="video-upload"
                          type="file"
                          accept="video/mp4,video/mov,video/avi,video/webm"
                          multiple
                          class="hidden"
                        />
                      </label>

                      <!-- 传输文件按钮（占位符） -->
                      <button class="cursor-pointer relative" title="传输文件（即将推出）" disabled>
                        <div class="flex items-center justify-center w-16 h-16 border-2 border-gray-200 border-dashed rounded-lg opacity-50">
                          <svg class="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                          </svg>
                        </div>
                      </button>
                    </div>

                    <!-- 右侧：媒体计数和清空按钮 -->
                    <div class="media-count-controls">
                      <span id="image-count" class="text-xs text-gray-500" style="display: none;"></span>
                      <button
                        id="clear-all-images"
                        type="button"
                        class="text-xs text-red-600 hover:text-red-800 hidden"
                        title="清空所有图片和视频"
                      >
                        清空全部
                      </button>
                    </div>
                  </div>

                  <!-- 媒体预览区域 -->
                  <div id="image-preview">
                    <!-- 默认上传提示框 -->
                    <div class="upload-placeholder">
                      <div class="upload-placeholder-content">
                        <svg class="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                        <span class="upload-placeholder-text">上传文件</span>
                      </div>
                    </div>
                  </div>

                  <!-- 统一定位的加载状态 -->
                  <div id="upload-loading" class="smart-upload-loading" style="display: none;">
                    <div class="simple-loading-spinner"></div>
                  </div>

                  <!-- 格式支持说明 -->
                  <p class="mt-2 text-xs text-gray-500">
                    图片：支持 JPG、PNG、GIF、WebP 格式&nbsp;&nbsp;&nbsp;&nbsp;视频：支持 MP4、MOV、AVI、WebM 格式
                  </p>
                </div>


              </div>
            </div>
          </div>


        </div>

        <!-- Platform Selection -->
        <div class="space-y-6">
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-start justify-between">
                <div>
                  <h2 class="text-lg font-medium text-gray-900">选择平台</h2>
                  <p class="mt-1 text-sm text-gray-500">选择要发布的社交媒体平台</p>
                </div>
                <div class="flex flex-col space-y-3 min-w-0 flex-shrink-0 ml-4">
                  <!-- 提示词按钮 - 次级按钮 -->
                  <button
                    id="prompt-helper-btn"
                    class="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors whitespace-nowrap"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    提示词
                  </button>
                  <!-- 开始同步按钮 - 主按钮，增大横向长度，删除图标，高度与提示词按钮一致 -->
                  <button
                    id="sync-button"
                    class="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap min-w-[120px]"
                  >
                    <span class="button-text">开始同步</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="p-6">
              <div class="space-y-4" id="platform-list">
                ${SUPPORTED_PLATFORMS.map(platform => `
                  <div class="flex items-center space-x-3">
                    <!-- 平台选择区域 -->
                    <div class="flex-1 flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer platform-item" data-platform-id="${platform.id}">
                      <input
                        type="checkbox"
                        id="platform-${platform.id}"
                        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <div class="ml-4 flex-1">
                        <div class="flex items-center">
                          ${generatePlatformLogoHTML(platform)}
                          <span class="text-sm font-medium text-gray-900">${platform.name}</span>
                        </div>
                      </div>
                    </div>
                    <!-- 提示词选择器独立区域 -->
                    <div class="prompt-selector-container border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors" data-platform-id="${platform.id}">
                      <div class="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="prompt-${platform.id}"
                          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 prompt-checkbox"
                          data-platform-id="${platform.id}"
                        />
                        <span
                          class="text-xs text-gray-600 cursor-pointer hover:text-blue-600 transition-colors prompt-label whitespace-nowrap"
                          data-platform-id="${platform.id}"
                        >
                          无模板
                        </span>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  `;

  // 添加页面样式
  addPageStyles();
}

// 添加页面样式
function addPageStyles() {
  if (!document.getElementById('page-styles')) {
    const style = document.createElement('style');
    style.id = 'page-styles';
    style.textContent = `
      /* 上传提示框样式 */
      .upload-placeholder {
        min-height: 120px;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        background-color: #f9fafb;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 12px;
        transition: all 0.2s ease;
        cursor: pointer;
        position: relative;
      }

      .upload-placeholder:hover {
        border-color: #9ca3af;
        background-color: #f3f4f6;
      }

      .upload-placeholder.drag-over {
        border-color: #3b82f6;
        background-color: #eff6ff;
        border-style: solid;
      }

      .upload-placeholder-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }

      .upload-placeholder-text {
        margin-top: 8px;
        font-size: 14px;
        color: #6b7280;
        font-weight: 500;
      }

      .upload-icon {
        color: #9ca3af;
        transition: color 0.2s ease;
      }

      .upload-placeholder:hover .upload-icon {
        color: #6b7280;
      }

      .upload-placeholder.drag-over .upload-icon {
        color: #3b82f6;
      }

      /* 内容类型按钮样式 */
      .content-type-btn {
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background-color: #ffffff;
        color: #374151;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 80px;
        text-align: center;
      }

      .content-type-btn:hover {
        border-color: #9ca3af;
        background-color: #f9fafb;
        color: #111827;
      }

      .content-type-btn:focus {
        outline: none;
        ring: 2px;
        ring-color: #3b82f6;
        ring-opacity: 0.5;
      }

      .content-type-btn.active {
        background-color: #3b82f6;
        color: #ffffff;
        border-color: #3b82f6;
      }

      /* 短视频上传区域样式 */
      .short-video-upload-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin-top: 1rem;
        position: relative; /* 为加载动画提供定位基准 */
      }

      /* 短视频专用加载状态样式 */
      #short-video-upload-area {
        position: relative; /* 为加载动画提供定位基准 */
      }

      #short-video-upload-loading {
        position: absolute;
        top: 50%; /* 居中定位 */
        left: 50%;
        transform: translate(-50%, -50%); /* 完全居中 */
        z-index: 20; /* 确保在最上层 */
        background-color: rgba(255, 255, 255, 0.95);
        border-radius: 50%;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        pointer-events: none;
      }

      .video-upload-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        position: relative; /* 为视频上传区域内的加载动画提供定位基准 */
      }

      /* 即时预览相关样式 */
      .short-video-preview-container {
        position: relative;
        width: 100%;
        height: 160px;
        border-radius: 8px;
        overflow: hidden;
        background: #000;
      }

      .short-video-preview-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
      }

      .short-video-preview-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.5) 100%);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 8px;
        pointer-events: none;
      }

      .short-video-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        color: white;
        font-size: 12px;
      }

      .short-video-name {
        font-weight: 500;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .short-video-size {
        opacity: 0.8;
        font-size: 11px;
      }

      .storage-status {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 12px;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
        width: fit-content;
      }

      .storage-status.storage-success {
        color: #10b981;
      }

      .storage-status.storage-failed {
        color: #ef4444;
      }

      .storage-icon {
        width: 12px;
        height: 12px;
      }

      .short-video-remove-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        background: rgba(0,0,0,0.7);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        line-height: 1;
        pointer-events: auto;
        transition: all 0.2s ease;
      }

      .short-video-remove-btn:hover {
        background: rgba(239, 68, 68, 0.9);
        transform: scale(1.1);
      }

      .cover-upload-section {
        display: flex;
        flex-direction: row;
        gap: 1rem;
      }

      .cover-upload-area {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex: 1;
      }

      .upload-area {
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        padding: 0.75rem;
        text-align: center;
        transition: all 0.2s ease;
        background-color: #f9fafb;
      }

      .upload-area:hover {
        border-color: #9ca3af;
        background-color: #f3f4f6;
      }

      .video-upload-area {
        min-height: 160px;
        height: 160px;
      }

      .horizontal-cover-area {
        min-height: 130px;
        height: 130px;
        aspect-ratio: 4/3;
      }

      .vertical-cover-area {
        min-height: 150px;
        height: 150px;
        width: 112px;
        margin: 0 auto;
        aspect-ratio: 3/4;
      }

      .upload-label {
        display: block;
        cursor: pointer;
        width: 100%;
        height: 100%;
      }

      .upload-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 0.5rem;
      }

      .upload-icon {
        width: 2rem;
        height: 2rem;
        color: #9ca3af;
      }

      .upload-text {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }

      .upload-hint {
        font-size: 0.75rem;
        color: #6b7280;
      }

      .preview-area {
        min-height: 60px;
      }

      .video-preview-item,
      .cover-preview-item {
        margin-top: 0.5rem;
      }

      /* 🚀 优化：重复的短视频预览样式已删除，使用上面的统一样式定义 */



      /* 短视频封面预览容器样式 */
      .short-video-cover-preview-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background-color: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        overflow: hidden;
      }

      /* 竖封面预览容器样式 - 3:4比例 */
      .short-video-vertical-cover-preview-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background-color: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        overflow: hidden;
      }

      .short-video-cover-preview-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
      }

      .cover-remove-btn {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 20px;
        height: 20px;
        background-color: #ef4444;
        color: white;
        border-radius: 50%;
        font-size: 10px;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .cover-remove-btn:hover {
        background-color: #dc2626;
        transform: scale(1.1);
      }



      /* 响应式设计 */
      @media (max-width: 768px) {
        .short-video-upload-container {
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .cover-upload-section {
          flex-direction: row;
          gap: 1rem;
        }

        .cover-upload-area {
          flex: 1;
        }
      }

      /* 文章抓取相关样式 */
      .article-extraction-section {
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        margin-bottom: 20px;
      }

      /* 文章抓取简洁样式 */
      .article-extraction-section-clean {
        padding: 0;
        background: transparent;
        border: none;
        margin-bottom: 0;
      }

      /* 文章编辑器样式 */
      .article-editor-container {
        position: relative;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: #ffffff;
        overflow: hidden;
      }

      /* 富文本编辑器容器样式 */
      .article-rich-editor-container {
        position: relative;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: #ffffff;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      /* 富文本编辑器字段样式 */
      .article-rich-editor-field {
        flex: 1;
        min-height: 300px;
        max-height: 500px;
        padding: 16px;
        border: none;
        outline: none;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #374151;
        background: transparent;
        overflow-y: auto;
        word-wrap: break-word;
        word-break: break-word;
      }

      /* 富文本编辑器焦点样式 */
      .article-rich-editor-field:focus {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      /* 富文本编辑器占位符样式 */
      .article-rich-editor-field:empty:before {
        content: attr(data-placeholder);
        color: #9ca3af;
        pointer-events: none;
        position: absolute;
      }

      /* 富文本编辑器内容样式 */
      .article-rich-editor-field h1,
      .article-rich-editor-field h2,
      .article-rich-editor-field h3,
      .article-rich-editor-field h4,
      .article-rich-editor-field h5,
      .article-rich-editor-field h6 {
        margin: 16px 0 8px 0;
        font-weight: 600;
        line-height: 1.3;
      }

      .article-rich-editor-field h1 { font-size: 24px; }
      .article-rich-editor-field h2 { font-size: 20px; }
      .article-rich-editor-field h3 { font-size: 18px; }
      .article-rich-editor-field h4 { font-size: 16px; }
      .article-rich-editor-field h5 { font-size: 14px; }
      .article-rich-editor-field h6 { font-size: 12px; }

      .article-rich-editor-field p {
        margin: 8px 0;
        line-height: 1.6;
      }

      .article-rich-editor-field img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 8px 0;
      }

      .article-rich-editor-field a {
        color: #3b82f6;
        text-decoration: underline;
      }

      .article-rich-editor-field a:hover {
        color: #1d4ed8;
      }

      .article-rich-editor-field blockquote {
        margin: 16px 0;
        padding: 12px 16px;
        background: #f8f9fa;
        border-left: 4px solid #3b82f6;
        border-radius: 0 4px 4px 0;
      }

      .article-rich-editor-field ul,
      .article-rich-editor-field ol {
        margin: 8px 0;
        padding-left: 24px;
      }

      .article-rich-editor-field li {
        margin: 4px 0;
      }

      /* 编辑器操作按钮样式 */
      .article-editor-actions {
        padding: 12px 16px;
        background: #f8f9fa;
        border-top: 1px solid #e9ecef;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
        flex-shrink: 0;
      }

      .article-editor-field {
        width: 100%;
        min-height: 300px;
        padding: 16px;
        border: none;
        outline: none;
        resize: vertical;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #374151;
        background: transparent;
      }

      .article-editor-field:focus {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .article-editor-field::placeholder {
        color: #9ca3af;
      }

      /* 注意：文章编辑器工具栏样式已移除，因为工具栏功能未实现 */

      /* 概要信息区域样式 */
      .article-summary-section {
        margin-top: 16px;
        background: white;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .article-summary {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .summary-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
      }

      .summary-stat-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        color: #495057;
        font-weight: 500;
      }

      .summary-excerpt {
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
        border-left: 4px solid #007bff;
      }

      .summary-excerpt-content {
        color: #6c757d;
        line-height: 1.5;
        font-size: 14px;
        margin: 0;
      }

      /* 文章内容展示区域样式 */
      .article-content-display {
        margin-top: 16px;
        background: white;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        max-width: 100%;
        box-sizing: border-box;
      }

      /* 新的文章内容容器样式 */
      .article-content-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-width: 100%;
        box-sizing: border-box;
      }

      .article-content-area {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        max-height: 400px;
        word-wrap: break-word;
        word-break: break-word;
        box-sizing: border-box;
      }

      /* 保留原有的article-preview样式以兼容其他地方的使用 */
      .article-preview {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        max-width: 100%;
        word-wrap: break-word;
        box-sizing: border-box;
      }

      .article-header {
        padding: 20px;
        border-bottom: 1px solid #e9ecef;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .article-title {
        margin: 0 0 12px 0;
        font-size: 20px;
        font-weight: 600;
        line-height: 1.3;
        color: white;
      }

      .article-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 13px;
        opacity: 0.9;
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .article-content-wrapper {
        padding: 20px;
        max-width: 100%;
        overflow: hidden;
        word-wrap: break-word;
        box-sizing: border-box;
      }

      .article-excerpt {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 16px;
        border-left: 3px solid #007bff;
      }

      .article-excerpt h4 {
        margin: 0 0 6px 0;
        font-size: 14px;
        color: #495057;
      }

      .article-excerpt p {
        margin: 0;
        color: #6c757d;
        line-height: 1.4;
        font-size: 13px;
      }

      .content-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #495057;
      }

      .article-actions {
        padding: 16px 20px;
        background: #f8f9fa;
        border-top: 1px solid #e9ecef;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
        flex-shrink: 0;
      }

      .btn-secondary {
        padding: 8px 12px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .btn-secondary:hover {
        background: #545b62;
        transform: translateY(-1px);
      }

      .btn-secondary.btn-danger {
        background: #dc3545;
      }

      .btn-secondary.btn-danger:hover {
        background: #c82333;
      }

      /* 防止内容撑开容器的通用规则 */
      .article-preview *,
      .article-content-display *,
      .content-display * {
        max-width: 100% !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        box-sizing: border-box !important;
      }

      .article-preview img,
      .article-content-display img,
      .content-display img {
        max-width: 100% !important;
        height: auto !important;
        object-fit: contain !important;
      }

      .article-preview table,
      .article-content-display table,
      .content-display table {
        width: 100% !important;
        table-layout: fixed !important;
        word-wrap: break-word !important;
      }

      .article-preview pre,
      .article-content-display pre,
      .content-display pre {
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
        overflow-x: auto !important;
        max-width: 100% !important;
      }

      .error-message {
        text-align: center;
        padding: 30px 16px;
        color: #721c24;
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 6px;
      }

      .error-icon {
        font-size: 32px;
        margin-bottom: 12px;
      }

      .error-message h4 {
        margin: 0 0 8px 0;
        color: #721c24;
        font-size: 16px;
      }

      .error-message p {
        margin: 0 0 16px 0;
        font-size: 14px;
      }

      .error-suggestions {
        text-align: left;
        max-width: 350px;
        margin: 0 auto;
      }

      .error-suggestions h5 {
        margin: 0 0 6px 0;
        color: #721c24;
        font-size: 14px;
      }

      .error-suggestions ul {
        margin: 0;
        padding-left: 16px;
      }

      .error-suggestions li {
        margin-bottom: 3px;
        color: #856404;
        font-size: 12px;
      }

      /* 响应式设计 */
      @media (max-width: 768px) {
        .article-extraction-section {
          padding: 12px;
          margin-bottom: 16px;
        }

        .article-summary-section {
          padding: 12px;
          margin-top: 12px;
        }

        .summary-stats {
          gap: 12px;
        }

        .summary-stat-item {
          font-size: 13px;
        }

        .summary-excerpt {
          padding: 10px;
        }

        .summary-excerpt-content {
          font-size: 13px;
        }

        .article-content-display {
          margin-top: 12px;
        }

        .article-content-area {
          padding: 16px;
          max-height: 300px;
        }

        .article-header {
          padding: 16px;
        }

        .article-title {
          font-size: 18px;
        }

        .article-meta {
          font-size: 12px;
          gap: 8px;
        }

        .article-content-wrapper {
          padding: 16px;
        }

        .article-actions {
          padding: 12px 16px;
          gap: 6px;
        }

        .btn-secondary {
          padding: 6px 10px;
          font-size: 11px;
        }

        .content-stats {
          gap: 8px;
          padding: 10px;
        }

        .stat-item {
          font-size: 11px;
        }
      }

      @media (max-width: 480px) {
        .article-extraction-section {
          padding: 10px;
        }

        .article-summary-section {
          padding: 10px;
          margin-top: 10px;
        }

        .summary-stats {
          gap: 8px;
          flex-direction: column;
          align-items: flex-start;
        }

        .summary-stat-item {
          font-size: 12px;
        }

        .summary-excerpt {
          padding: 8px;
        }

        .summary-excerpt-content {
          font-size: 12px;
        }

        .article-content-display {
          margin-top: 10px;
        }

        .article-content-area {
          padding: 12px;
          max-height: 250px;
        }

        .article-header {
          padding: 12px;
        }

        .article-title {
          font-size: 16px;
          margin-bottom: 8px;
        }

        .article-meta {
          flex-direction: column;
          gap: 4px;
          align-items: flex-start;
        }

        .article-content-wrapper {
          padding: 12px;
        }

        .article-actions {
          padding: 10px 12px;
          flex-direction: column;
          align-items: stretch;
        }

        .btn-secondary {
          justify-content: center;
          width: 100%;
        }

        .error-message {
          padding: 20px 12px;
        }

        .error-suggestions {
          max-width: 100%;
        }
      }

      /* 提示词选择器样式 */
      .prompt-selector-container {
        position: relative;
      }

      .prompt-checkbox {
        flex-shrink: 0;
      }

      .prompt-label {
        font-size: 0.75rem;
        white-space: nowrap;
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .prompt-popup {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
        width: 320px;
        height: 240px;
        display: flex;
        flex-direction: column;
      }

      .prompt-popup-wrapper {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .prompt-popup-content {
        flex: 1;
        overflow-y: auto;
        max-height: calc(240px - 60px); /* 减去底部按钮区域的高度 */
      }

      .prompt-popup-footer {
        flex-shrink: 0;
        background: white;
        border-radius: 0 0 12px 12px;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }



      .prompt-item {
        border-radius: 4px;
        transition: background-color 0.15s ease;
      }

      .prompt-item:hover {
        background-color: #f9fafb;
      }

      .remove-prompt-btn {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #ef4444;
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        line-height: 1;
        transition: background-color 0.15s ease;
      }

      .remove-prompt-btn:hover {
        background: #dc2626;
      }

      .add-prompt-btn {
        transition: all 0.15s ease;
      }

      .add-prompt-btn:hover {
        background-color: #dbeafe;
        border-color: #3b82f6;
      }

      /* 响应式调整 */
      @media (max-width: 768px) {
        .prompt-selector-container {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// 内容类型切换处理函数
function handleContentTypeSwitch(contentType, clickedButton) {
  console.log(`🔄 内容类型切换: ${appState.currentContentType} → ${contentType}`);

  // 更新应用状态中的当前内容类型
  appState.currentContentType = contentType;

  // 使用统一的按钮状态更新函数（包含区域更新）
  updateContentTypeButtons(true);

  // 重新渲染平台列表
  renderPlatformList();

  // 立即保存状态到存储，确保刷新后状态一致
  saveToStorageData();
}

// 统一的页面区域管理函数
function updatePageSections(contentType) {
  // 初始化DOM缓存
  if (!domCache.articleExtractionSection) {
    domCache.articleExtractionSection = document.getElementById('article-extraction-section');
  }
  if (!domCache.titleInputSection) {
    domCache.titleInputSection = document.getElementById('title-input-section');
  }
  if (!domCache.contentTextareaSection) {
    domCache.contentTextareaSection = document.getElementById('content-textarea-section');
  }
  if (!domCache.articleEditorSection) {
    domCache.articleEditorSection = document.getElementById('article-editor-section');
  }
  if (!domCache.mediaUploadSection) {
    domCache.mediaUploadSection = document.getElementById('media-upload-section');
  }
  if (!domCache.dynamicUploadArea) {
    domCache.dynamicUploadArea = document.querySelector('.image-upload-container');
  }
  if (!domCache.shortVideoUploadArea) {
    domCache.shortVideoUploadArea = document.getElementById('short-video-upload-area');
  }

  const {
    dynamicUploadArea,
    shortVideoUploadArea,
    articleExtractionSection,
    titleInputSection,
    contentTextareaSection,
    articleEditorSection,
    mediaUploadSection
  } = domCache;

  if (contentType === '短视频') {
    // 短视频模式：显示标题输入、常规内容输入、媒体上传区域（包含短视频上传）
    if (titleInputSection) titleInputSection.style.display = 'block';
    if (contentTextareaSection) contentTextareaSection.style.display = 'block';
    if (articleEditorSection) articleEditorSection.style.display = 'none';
    if (articleExtractionSection) articleExtractionSection.style.display = 'none';
    if (mediaUploadSection) mediaUploadSection.style.display = 'block';
    if (dynamicUploadArea) dynamicUploadArea.style.display = 'none';

    if (shortVideoUploadArea) {
      shortVideoUploadArea.style.display = 'block';
    } else {
      // 如果短视频上传区域不存在，创建它
      createShortVideoUploadArea();
    }
  } else if (contentType === '文章') {
    // 文章模式：隐藏标题输入、隐藏常规内容输入、隐藏媒体上传，显示文章抓取和文章编辑器
    if (titleInputSection) titleInputSection.style.display = 'none';
    if (contentTextareaSection) contentTextareaSection.style.display = 'none';
    if (articleEditorSection) articleEditorSection.style.display = 'block';
    if (mediaUploadSection) mediaUploadSection.style.display = 'none';
    if (dynamicUploadArea) dynamicUploadArea.style.display = 'none';
    if (shortVideoUploadArea) shortVideoUploadArea.style.display = 'none';

    if (articleExtractionSection) {
      articleExtractionSection.style.display = 'block';
      // 使用统一的初始化管理器
      ArticleManagerInitializer.initialize();
    }
  } else {
    // 动态模式：显示标题输入、常规内容输入、媒体上传区域
    if (titleInputSection) titleInputSection.style.display = 'block';
    if (contentTextareaSection) contentTextareaSection.style.display = 'block';
    if (articleEditorSection) articleEditorSection.style.display = 'none';
    if (articleExtractionSection) articleExtractionSection.style.display = 'none';
    if (mediaUploadSection) mediaUploadSection.style.display = 'block';
    if (dynamicUploadArea) dynamicUploadArea.style.display = 'block';
    if (shortVideoUploadArea) shortVideoUploadArea.style.display = 'none';
  }

  // 更新页面描述文本
  const descriptionText = document.querySelector('.px-6.py-4.border-b.border-gray-200 p');
  if (descriptionText) {
    switch (contentType) {
      case '动态':
        descriptionText.textContent = '填写要发布的动态内容';
        break;
      case '文章':
        descriptionText.textContent = '填写要发布的文章内容';
        break;
      case '短视频':
        descriptionText.textContent = '填写要发布的短视频内容';
        break;
    }
  }
}

// 创建短视频上传区域
function createShortVideoUploadArea() {
  const mediaUploadDiv = document.querySelector('.image-upload-container').parentNode;

  const shortVideoUploadHTML = `
    <div id="short-video-upload-area" class="space-y-3" style="display: block;">
      <!-- 短视频上传区域计数 -->
      <div class="flex justify-end">
        <div class="text-xs text-gray-500">
          视频: <span id="video-count">0</span>/1 | 封面: <span id="cover-count">0</span>/2
        </div>
      </div>

      <!-- 上传区域容器 -->
      <div class="short-video-upload-container">
        <!-- 左侧：视频上传区 -->
        <div class="video-upload-section">
          <div id="video-upload-area" class="upload-area video-upload-area">
            <label class="upload-label" for="short-video-upload">
              <div class="upload-content">
                <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                <span class="upload-text">上传视频</span>
              </div>
            </label>
            <input
              id="short-video-upload"
              type="file"
              accept="video/mp4,video/mov,video/avi,video/webm"
              class="hidden"
            />
            <!-- 视频上传专用加载状态 -->
            <div id="short-video-upload-loading" style="display: none;">
              <div class="simple-loading-spinner"></div>
            </div>
          </div>
        </div>

        <!-- 右侧：封面上传区 -->
        <div class="cover-upload-section">
          <!-- 横封面上传区 -->
          <div class="cover-upload-area">
            <div id="horizontal-cover-area" class="upload-area horizontal-cover-area">
              <label class="upload-label" for="horizontal-cover-upload">
                <div class="upload-content">
                  <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span class="upload-text">4:3横封面</span>
                </div>
              </label>
              <input
                id="horizontal-cover-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
              />
            </div>
          </div>

          <!-- 竖封面上传区 -->
          <div class="cover-upload-area">
            <div id="vertical-cover-area" class="upload-area vertical-cover-area">
              <label class="upload-label" for="vertical-cover-upload">
                <div class="upload-content">
                  <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span class="upload-text">3:4竖封面</span>
                </div>
              </label>
              <input
                id="vertical-cover-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
              />
            </div>
          </div>
        </div>
      </div>



      <!-- 格式支持说明 -->
      <p class="mt-2 text-xs text-gray-500">
        图片：支持 JPG、PNG、GIF、WebP 格式&nbsp;&nbsp;&nbsp;&nbsp;视频：支持 MP4、MOV、AVI、WebM 格式
      </p>
    </div>
  `;

  // 插入短视频上传区域
  mediaUploadDiv.insertAdjacentHTML('beforeend', shortVideoUploadHTML);

  // 绑定短视频上传事件
  bindShortVideoUploadEvents();

  // 重新设置事件委托以包含新创建的短视频区域
  setupShortVideoEventDelegation();

  // 更新DOM缓存
  domCache.shortVideoUploadArea = domCache.get('short-video-upload-area');
  domCache.videoCountElement = domCache.get('video-count');
  domCache.coverCountElement = domCache.get('cover-count');
}

// 统一的短视频文件上传处理函数
async function handleShortVideoFileUpload(file, fileType, additionalData = {}) {
  try {
    let fileData;

    if (mainController) {
      // 确保mainController已初始化
      await mainController.ensureInitialized();

      if (mainController.useChunkedTransfer) {
        // 使用分块传输
        try {
          const fileId = await mainController.uploadFileInChunks(file);

          if (fileId) {
            fileData = createShortVideoFileData(file, fileId, additionalData);
            console.log(`✅ 短视频文件上传成功 (新系统): ${file.name} -> ${fileId}`);
          } else {
            throw new Error(`Failed to upload ${fileType}`);
          }
        } catch (error) {
          console.error('Chunked upload failed, using fallback:', error);
          fileData = createShortVideoFileData(file, null, additionalData);
        }
      } else {
        // 降级方案
        console.log(`⚠️ 短视频文件上传 (传统系统): ${file.name}`);
        fileData = createShortVideoFileData(file, null, additionalData);
      }
    } else {
      // 没有mainController，使用降级方案
      console.warn('MainController not available, using fallback');
      fileData = createShortVideoFileData(file, null, additionalData);
    }

    return fileData;
  } catch (error) {
    console.error(`${fileType} upload failed:`, error);
    throw error;
  }
}

// 🚀 优化：统一的日志处理工具类（避免与现有ErrorHandler冲突）
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

// 🚀 优化：统一的文件处理工具类
class FileDataManager {
  // 统一的ID生成函数
  static generateUniqueId(prefix = 'file') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 统一的元数据标准化函数
  static standardizeMetadata(file, additionalData = {}) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified || Date.now(),
      timestamp: Date.now(),
      ...additionalData
    };
  }

  // 统一的文件数据创建函数（替代所有重复的创建函数）
  static createFileData(file, options = {}) {
    const {
      id = null,
      prefix = 'file',
      blobUrl = null,
      fileId = null,
      storageStatus = 'stored',
      isInstantPreview = false,
      ...additionalData
    } = options;

    const finalId = id || this.generateUniqueId(prefix);
    const dataUrl = blobUrl || URL.createObjectURL(file);

    return {
      id: finalId,
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: dataUrl,
      file: file, // 保留原始文件引用
      fileId: fileId, // Background Script中的文件ID
      timestamp: Date.now(),
      isInstantPreview: isInstantPreview,
      storageStatus: storageStatus,
      ...additionalData
    };
  }

  // Blob URL管理
  static managedBlobUrls = new Set();

  static createManagedBlobUrl(file) {
    const blobUrl = URL.createObjectURL(file);
    this.managedBlobUrls.add(blobUrl);
    return blobUrl;
  }

  static revokeBlobUrl(blobUrl) {
    if (this.managedBlobUrls.has(blobUrl)) {
      URL.revokeObjectURL(blobUrl);
      this.managedBlobUrls.delete(blobUrl);
    }
  }

  static revokeAllBlobUrls() {
    this.managedBlobUrls.forEach(url => URL.revokeObjectURL(url));
    this.managedBlobUrls.clear();
  }
}

// 向后兼容的全局函数（保持现有代码正常工作）
function generateUniqueFileId(prefix = 'file') {
  return FileDataManager.generateUniqueId(prefix);
}

function createShortVideoFileData(file, fileId = null, additionalData = {}) {
  return FileDataManager.createFileData(file, {
    fileId: fileId,
    prefix: additionalData.prefix || 'file',
    ...additionalData
  });
}

// 渲染平台列表函数
function renderPlatformList() {
  // 使用DOM缓存
  if (!domCache.platformListContainer) {
    domCache.platformListContainer = domCache.get('platform-list');
  }
  const platformListContainer = domCache.platformListContainer;
  if (!platformListContainer) return;

  // 根据当前内容类型获取要显示的平台
  let platformsToShow;
  if (appState.currentContentType === '短视频') {
    // 短视频模式：只显示支持视频的平台
    platformsToShow = getVideoSupportedPlatforms();

    // 过滤掉不支持视频的已选择平台
    appState.selectedPlatforms = appState.selectedPlatforms.filter(platform =>
      platformsToShow.some(p => p.id === platform.id)
    );
  } else if (appState.currentContentType === '文章') {
    // 文章模式：只显示文章专用平台
    platformsToShow = getArticlePlatforms();

    // 过滤掉不是文章平台的已选择平台
    appState.selectedPlatforms = appState.selectedPlatforms.filter(platform =>
      platformsToShow.some(p => p.id === platform.id)
    );
  } else {
    // 动态模式：显示所有平台
    platformsToShow = SUPPORTED_PLATFORMS;
  }

  // 生成平台列表HTML
  const platformListHTML = platformsToShow.map(platform => `
    <div class="flex items-center space-x-3">
      <!-- 平台选择区域 -->
      <div class="flex-1 flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer platform-item" data-platform-id="${platform.id}">
        <input
          type="checkbox"
          id="platform-${platform.id}"
          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
        <div class="ml-4 flex-1">
          <div class="flex items-center">
            ${generatePlatformLogoHTML(platform)}
            <span class="text-sm font-medium text-gray-900">${platform.name}</span>
          </div>
        </div>
      </div>
      <!-- 提示词选择器独立区域 -->
      <div class="prompt-selector-container border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors" data-platform-id="${platform.id}">
        <div class="flex items-center space-x-2">
          <input
            type="checkbox"
            id="prompt-${platform.id}"
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 prompt-checkbox"
            data-platform-id="${platform.id}"
          />
          <span
            class="text-xs text-gray-600 cursor-pointer hover:text-blue-600 transition-colors prompt-label whitespace-nowrap"
            data-platform-id="${platform.id}"
          >
            无模板
          </span>
        </div>
      </div>
    </div>
  `).join('');

  // 更新平台列表容器
  platformListContainer.innerHTML = platformListHTML;

  // 重新绑定事件监听器
  rebindPlatformEvents(platformsToShow);

  // 更新平台选择状态
  updatePlatformSelection();
}

// 重新绑定平台事件监听器
function rebindPlatformEvents(platforms) {
  // 清除DOM缓存，因为平台列表可能已重新渲染
  promptDOMCache.invalidateCache();

  platforms.forEach(platform => {
    const checkbox = document.getElementById(`platform-${platform.id}`);
    // 修复：明确选择平台选择区域（第一个具有该属性的元素）
    const platformItem = document.querySelector(`.platform-item[data-platform-id="${platform.id}"]`);

    if (checkbox) {
      // 移除旧的事件监听器（如果存在）
      checkbox.removeEventListener('change', checkbox._toggleHandler);
      // 创建新的事件处理器并保存引用
      checkbox._toggleHandler = () => togglePlatform(platform);
      checkbox.addEventListener('change', checkbox._toggleHandler);
    }

    // 绑定提示词选择器事件
    bindPromptSelectorEvents(platform);

    if (platformItem) {
      // 移除旧的事件监听器（如果存在）
      platformItem.removeEventListener('click', platformItem._clickHandler);
      // 创建新的事件处理器并保存引用
      platformItem._clickHandler = (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          togglePlatform(platform);
        }
      };
      platformItem.addEventListener('click', platformItem._clickHandler);
    }
  });
}

// 为短视频区域单独设置事件委托
function setupShortVideoEventDelegation() {
  const shortVideoUploadArea = domCache.get('short-video-upload-area');
  if (shortVideoUploadArea) {
    // 移除可能存在的旧事件监听器
    shortVideoUploadArea.removeEventListener('click', handleShortVideoClick);
    // 添加新的事件监听器
    shortVideoUploadArea.addEventListener('click', handleShortVideoClick);
  }
}

// 短视频区域点击事件处理函数
function handleShortVideoClick(event) {
  // 处理短视频删除按钮点击
  if (event.target.classList.contains('short-video-remove-btn')) {
    const videoId = event.target.dataset.videoId;
    if (videoId) {
      removeShortVideo(videoId);
    }
  }

  // 处理封面删除按钮点击
  if (event.target.classList.contains('cover-remove-btn')) {
    const coverId = event.target.dataset.coverId;
    const coverType = event.target.dataset.coverType;
    if (coverId && coverType) {
      removeCover(coverId, coverType);
    }
  }
}

// 绑定短视频上传事件
function bindShortVideoUploadEvents() {
  // 视频上传
  const videoUpload = domCache.get('short-video-upload');
  if (videoUpload) {
    videoUpload.addEventListener('change', handleShortVideoUpload);
  }

  // 横封面上传
  const horizontalCoverUpload = domCache.get('horizontal-cover-upload');
  if (horizontalCoverUpload) {
    horizontalCoverUpload.addEventListener('change', (e) => handleCoverUpload(e, 'horizontal'));
  }

  // 竖封面上传
  const verticalCoverUpload = domCache.get('vertical-cover-upload');
  if (verticalCoverUpload) {
    verticalCoverUpload.addEventListener('change', (e) => handleCoverUpload(e, 'vertical'));
  }
}

// 处理短视频上传 - 增强版：即时预览功能
async function handleShortVideoUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const file = files[0]; // 只取第一个文件

  // 确保当前处于短视频模式
  if (appState.currentContentType !== '短视频') {
    appState.currentContentType = '短视频';
    updateContentTypeButtons(true);
  }

  // 验证视频文件（使用统一验证器）
  if (!FileValidator.validateFileWithNotification(file, 'video')) {
    return;
  }

  // 清空之前的视频（只允许一个视频）
  appState.shortVideoPreviews = [];

  try {
    // 🚀 新功能：即时预览处理
    await handleInstantVideoPreview(file);

    console.log('✅ 短视频即时预览已就绪，用户可以立即开始发布');
  } catch (error) {
    console.error('即时预览失败，降级到原有方案:', error);
    // 降级到原有上传方案
    await handleLegacyVideoUpload(file);
  } finally {
    // 清空文件输入，允许重复选择同一文件
    if (event.target) {
      event.target.value = '';
    }
  }
}

// 🚀 优化：即时视频预览处理（使用统一工具类和日志管理）
async function handleInstantVideoPreview(file) {
  const context = '即时视频预览';
  LogManager.logInfo(context, `开始处理: ${file.name}`);

  // 1. 使用统一的Blob URL管理
  const blobUrl = FileDataManager.createManagedBlobUrl(file);

  // 2. 同步存储到Background Script（使用Blob URL，速度很快）
  try {
    const fileId = await storeCompleteFileToBackground(file);

    // 3. 使用统一的文件数据创建函数
    const videoData = FileDataManager.createFileData(file, {
      prefix: 'instant_video',
      blobUrl: blobUrl,
      fileId: fileId,
      isInstantPreview: true,
      storageStatus: 'stored'
    });

    appState.shortVideoPreviews = [videoData];

    // 4. 立即更新UI，用户可以开始发布
    updateShortVideoPreview();
    updateShortVideoCount();
    enablePublishButton();

    LogManager.logSuccess(context, '文件已存储，用户可以立即发布', {
      fileId: fileId,
      fileName: file.name,
      fileSize: file.size
    });
  } catch (error) {
    LogManager.logWarning(context, '存储失败，但预览仍可用', { error: error });

    // 即使存储失败，仍然显示预览（使用本地Blob URL）
    const videoData = FileDataManager.createFileData(file, {
      prefix: 'instant_video',
      blobUrl: blobUrl,
      fileId: null,
      isInstantPreview: true,
      storageStatus: 'failed'
    });

    appState.shortVideoPreviews = [videoData];

    updateShortVideoPreview();
    updateShortVideoCount();
    enablePublishButton();
  }
}



// 降级方案：原有的视频上传逻辑
async function handleLegacyVideoUpload(file) {
  console.log('🔄 使用原有视频上传方案');

  // 显示加载状态
  uploadLoadingManager.show(1);

  try {
    // 使用统一的文件上传处理函数
    const videoData = await handleShortVideoFileUpload(file, 'short video', {
      prefix: 'short_video'
    });

    if (videoData) {
      // 使用统一的状态管理
      ShortVideoStateManager.handleUploadSuccess(videoData, 'video', '视频上传成功');
    }

    // 更新加载进度
    uploadLoadingManager.incrementProcessed();
  } catch (error) {
    Utils.handleError(error, '短视频上传失败');
    // 即使失败也要更新进度以隐藏加载状态
    uploadLoadingManager.incrementProcessed();
  }
}

// 🚀 优化：存储完整文件到Background Script（使用统一日志管理）
async function storeCompleteFileToBackground(file) {
  const context = '文件存储';

  try {
    LogManager.logInfo(context, `开始存储: ${file.name} (${Utils.formatFileSize(file.size)})`);

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
      LogManager.logSuccess(context, `存储成功: ${response.fileId}`, {
        fileName: file.name,
        fileSize: file.size
      });
      return response.fileId;
    } else {
      throw new Error(response?.error || '文件存储失败');
    }
  } catch (error) {
    LogManager.logError(context, error, {
      fileName: file.name,
      fileSize: file.size
    });
    throw error;
  }
}

// 启用发布按钮（即时预览后立即可用）
function enablePublishButton() {
  const syncButton = domCache.get('sync-button');
  if (syncButton) {
    syncButton.disabled = false;
    syncButton.classList.remove('opacity-50', 'cursor-not-allowed');
    syncButton.classList.add('hover:bg-blue-600');

    // 更新按钮文本提示用户可以立即发布
    const originalText = syncButton.textContent;
    if (!originalText.includes('✅')) {
      syncButton.textContent = '✅ ' + originalText;
    }
  }

  console.log('✅ 发布按钮已启用，用户可以立即开始发布');
}

// 处理封面上传
async function handleCoverUpload(event, coverType) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const file = files[0]; // 只取第一个文件

  // 验证图片文件（使用统一验证器）
  if (!FileValidator.validateFileWithNotification(file, 'image')) {
    return;
  }

  // 初始化封面数组
  if (!appState.shortVideoCovers) {
    appState.shortVideoCovers = [];
  }

  // 移除同类型的旧封面（每种类型只允许一个）
  appState.shortVideoCovers = appState.shortVideoCovers.filter(cover => cover.coverType !== coverType);

  // 显示加载状态
  uploadLoadingManager.show(1);

  try {
    // 使用统一的文件上传处理函数
    const coverData = await handleShortVideoFileUpload(file, `${coverType} cover`, {
      prefix: `${coverType}_cover`,
      coverType: coverType
    });

    if (coverData) {
      // 使用统一的状态管理
      const message = `${coverType === 'horizontal' ? '横' : '竖'}封面上传成功`;
      ShortVideoStateManager.handleUploadSuccess(coverData, 'cover', message);
    }

    // 更新加载进度
    uploadLoadingManager.incrementProcessed();
  } catch (error) {
    Utils.handleError(error, '封面上传失败');
    // 即使失败也要更新进度以隐藏加载状态
    uploadLoadingManager.incrementProcessed();
  }
}

// 更新短视频预览 - 增强版：支持即时预览和存储状态显示
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
        <video
          src="${videoData.dataUrl}"
          controls
          class="short-video-preview-video"
          title="${videoData.name}"
        ></video>
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
          <button
            class="short-video-remove-btn"
            data-video-id="${videoData.id}"
            title="删除视频"
          >
            ×
          </button>
        </div>
      </div>
    `;
  } else {
    // 恢复上传区域的占位符内容
    uploadArea.innerHTML = `
      <label class="upload-label" for="short-video-upload">
        <div class="upload-content">
          <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
          <span class="upload-text">上传视频</span>
        </div>
      </label>
      <input
        id="short-video-upload"
        type="file"
        accept="video/mp4,video/mov,video/avi,video/webm"
        class="hidden"
      />
    `;

    // 强制刷新DOM缓存并重新绑定事件
    domCache.refresh('short-video-upload');
    rebindShortVideoUploadEvent();
  }
}

// 生成存储状态指示器（简化版）
function generateStorageStatusIndicator(videoData) {
  if (!videoData.isInstantPreview) {
    // 非即时预览的视频，不显示存储状态
    return '';
  }

  const status = videoData.storageStatus || 'stored';

  switch (status) {
    case 'stored':
      return `
        <div class="storage-status storage-success" title="已安全存储到扩展程序">
          <svg class="storage-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
          <span>已存储</span>
        </div>
      `;
    case 'failed':
      return `
        <div class="storage-status storage-failed" title="存储失败，将使用本地文件">
          <svg class="storage-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
          <span>本地文件</span>
        </div>
      `;
    default:
      return '';
  }
}

// 专门的短视频上传事件重绑定函数
function rebindShortVideoUploadEvent() {
  const videoUpload = domCache.get('short-video-upload');
  if (videoUpload) {
    // 移除可能存在的旧事件监听器（防止重复绑定）
    videoUpload.removeEventListener('change', handleShortVideoUpload);
    // 添加新的事件监听器
    videoUpload.addEventListener('change', handleShortVideoUpload);
  }
}

// 更新封面预览
function updateCoverPreview(coverType) {
  const uploadArea = document.getElementById(`${coverType}-cover-area`);
  if (!uploadArea) return;

  if (appState.shortVideoCovers) {
    const coverData = appState.shortVideoCovers.find(cover => cover.coverType === coverType);

    if (coverData) {
      // 根据封面类型选择不同的容器样式
      const containerClass = coverType === 'vertical'
        ? 'short-video-vertical-cover-preview-container'
        : 'short-video-cover-preview-container';

      // 替换上传区域内容为预览内容
      uploadArea.innerHTML = `
        <div class="${containerClass}">
          <img
            src="${coverData.dataUrl}"
            alt="${coverType}封面"
            class="short-video-cover-preview-image"
            title="${coverData.name}"
          />
          <button
            class="cover-remove-btn"
            data-cover-id="${coverData.id}"
            data-cover-type="${coverType}"
            title="删除封面"
          >
            ×
          </button>
        </div>
      `;
    } else {
      // 恢复上传区域的占位符内容
      const isHorizontal = coverType === 'horizontal';
      uploadArea.innerHTML = `
        <label class="upload-label" for="${coverType}-cover-upload">
          <div class="upload-content">
            <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span class="upload-text">${isHorizontal ? '4:3横封面' : '3:4竖封面'}</span>
          </div>
        </label>
        <input
          id="${coverType}-cover-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
        />
      `;

      // 重新绑定事件
      const coverUpload = document.getElementById(`${coverType}-cover-upload`);
      if (coverUpload) {
        coverUpload.addEventListener('change', (e) => handleCoverUpload(e, coverType));
      }
    }
  }
}

// 更新短视频计数
function updateShortVideoCount() {
  // 使用DOM缓存
  if (!domCache.videoCountElement) {
    domCache.videoCountElement = domCache.get('video-count');
  }
  if (!domCache.coverCountElement) {
    domCache.coverCountElement = domCache.get('cover-count');
  }

  if (domCache.videoCountElement) {
    const videoCount = appState.shortVideoPreviews ? appState.shortVideoPreviews.length : 0;
    domCache.videoCountElement.textContent = videoCount;
  }

  if (domCache.coverCountElement) {
    const coverCount = appState.shortVideoCovers ? appState.shortVideoCovers.length : 0;
    domCache.coverCountElement.textContent = coverCount;
  }
}

// 删除短视频
function removeShortVideo(videoId) {
  if (appState.shortVideoPreviews) {
    const videoIndex = appState.shortVideoPreviews.findIndex(video => video.id === videoId);
    if (videoIndex !== -1) {
      console.log('🗑️ 删除短视频:', appState.shortVideoPreviews[videoIndex].name);

      // 释放URL对象
      if (appState.shortVideoPreviews[videoIndex].dataUrl &&
          appState.shortVideoPreviews[videoIndex].dataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(appState.shortVideoPreviews[videoIndex].dataUrl);
      }
      // 从数组中移除
      appState.shortVideoPreviews.splice(videoIndex, 1);

      // 更新预览（这会触发事件重绑定）
      updateShortVideoPreview();

      // 更新计数和显示通知
      updateShortVideoCount();

      // 保存状态
      ShortVideoStateManager.saveShortVideoState();

      showNotification('视频已删除', 'success');

      console.log('✅ 短视频删除完成，上传功能已重新激活');
    }
  }
}

// 删除封面
function removeCover(coverId, coverType) {
  if (appState.shortVideoCovers) {
    const coverIndex = appState.shortVideoCovers.findIndex(cover => cover.id === coverId);
    if (coverIndex !== -1) {
      // 释放URL对象
      if (appState.shortVideoCovers[coverIndex].dataUrl &&
          appState.shortVideoCovers[coverIndex].dataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(appState.shortVideoCovers[coverIndex].dataUrl);
      }
      // 从数组中移除
      appState.shortVideoCovers.splice(coverIndex, 1);
      // 更新预览
      updateCoverPreview(coverType);
      // 更新计数和显示通知
      updateShortVideoCount();
      const message = `${coverType === 'horizontal' ? '横' : '竖'}封面已删除`;
      showNotification(message, 'success');
    }
  }
}

// 事件委托处理器
function setupEventDelegation() {
  // 为图片预览容器设置事件委托
  const previewContainer = domCache.get('image-preview');
  if (previewContainer) {
    previewContainer.addEventListener('click', (event) => {
      // 处理图片删除按钮点击
      if (event.target.classList.contains('image-remove-btn')) {
        const imageId = event.target.dataset.imageId;
        if (imageId) {
          removeImage(imageId);
        }
      }

      // 处理视频删除按钮点击
      if (event.target.classList.contains('video-remove-btn')) {
        const videoId = event.target.dataset.videoId;
        if (videoId) {
          removeVideo(videoId);
        }
      }
    });
  }
}

// 绑定事件监听器
function bindEventListeners() {
  // 标题输入
  const titleInput = domCache.get('title-input');
  if (titleInput) {
    titleInput.addEventListener('input', handleTitleChange);
  }

  // 内容输入
  const contentTextarea = domCache.get('content-textarea');
  if (contentTextarea) {
    contentTextarea.addEventListener('input', handleContentChange);
  }

  // 文章富文本编辑器输入
  const articleRichEditor = domCache.get('article-rich-editor');
  if (articleRichEditor) {
    articleRichEditor.addEventListener('input', handleArticleRichEditorChange);
  }

  // 文章标题输入
  const articleTitleInput = domCache.get('article-title-input');
  if (articleTitleInput) {
    articleTitleInput.addEventListener('input', handleArticleTitleChange);
  }

  // 文章概要输入
  const articleExcerptInput = domCache.get('article-excerpt-input');
  if (articleExcerptInput) {
    articleExcerptInput.addEventListener('input', handleArticleExcerptChange);
  }

  // 图片上传
  const imageUpload = domCache.get('image-upload');
  if (imageUpload) {
    imageUpload.addEventListener('change', handleImageUpload);
  }

  // 视频上传
  const videoUpload = domCache.get('video-upload');
  if (videoUpload) {
    videoUpload.addEventListener('change', handleVideoUpload);
  }

  // 弹窗关闭按钮（使用事件委托处理动态创建的元素）
  document.addEventListener('click', function(event) {
    if (event.target.closest('.modal-close-btn')) {
      const modal = event.target.closest('.fixed');
      if (modal) {
        modal.remove();
      }
    }
  });

  // 清空所有媒体文件按钮
  const clearAllBtn = domCache.get('clear-all-images');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      if (confirm('确定要删除所有图片和视频吗？')) {
        clearAllImages();
      }
    });
  }

  // 设置事件委托
  setupEventDelegation();

  // 上传提示框交互功能
  const uploadPlaceholder = document.querySelector('.upload-placeholder');
  if (uploadPlaceholder) {
    // 点击上传
    uploadPlaceholder.addEventListener('click', handlePlaceholderClick);

    // 拖拽上传
    setupDragAndDrop(uploadPlaceholder);
  }

  // 开始同步按钮
  const syncButton = domCache.get('sync-button');
  if (syncButton) {
    syncButton.addEventListener('click', handleStartPublish);
  }

  // 提示词助手按钮
  const promptHelperBtn = domCache.get('prompt-helper-btn');
  if (promptHelperBtn) {
    promptHelperBtn.addEventListener('click', handleOpenPromptHelper);
  }

  // 内容类型按钮切换
  const contentTypeButtons = document.querySelectorAll('.content-type-btn');
  contentTypeButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const buttonText = button.textContent.trim();
      handleContentTypeSwitch(buttonText, button);
    });

    // 设置默认激活状态（第一个按钮"动态"）
    if (index === 0) {
      button.classList.add('active');
    }
  });

  // 初始化平台选择事件（使用统一的绑定函数）
  rebindPlatformEvents(SUPPORTED_PLATFORMS);

  // 初始化提示词选择器功能
  initializePlatformPromptConfig();
  setupPromptHelperMessageListener();
}

// 页面初始化
async function initializePage() {
  console.log('Initializing main page...');
  console.log('扩展程序版本检查 - 测试抖音导航功能已添加 v1.0');

  // 创建页面内容
  createPageContent();

  // 初始化DOM缓存
  domCache.init();

  // 绑定事件监听器
  bindEventListeners();

  // 设置消息监听器
  setupMessageListeners();

  // 初始化logo缓存管理器
  try {
    // 在生产环境中禁用日志
    const isProduction = !window.location.href.includes('localhost') && !window.location.href.includes('file://');
    window.logoCacheManager = new LogoCacheManager({
      enableLogging: !isProduction,
      concurrencyLimit: 2 // 降低并发数以减少资源消耗
    });
    await window.logoCacheManager.initializeCache(SUPPORTED_PLATFORMS);
    if (!isProduction) {
      console.log('Logo cache manager initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize logo cache manager:', error);
  }

  // 初始化主控制器
  try {
    mainController = new MainPageController();
    // 等待异步初始化完成
    await mainController.ensureInitialized();
    console.log('MainPageController initialized successfully', {
      useChunkedTransfer: mainController.useChunkedTransfer,
      hasFileManager: !!mainController.fileManager
    });
  } catch (error) {
    console.error('Failed to initialize MainPageController:', error);
    console.log('Falling back to legacy implementation');
  }

  // 初始化页面数据（根据加载类型决定是否清空）
  await initializePageData();

  // 初始化文章管理器
  ArticleManagerInitializer.initialize();

  console.log('Main page initialized successfully');


}

// 设置消息监听器
function setupMessageListeners() {
  // 检查是否在扩展环境中
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      console.log('Main page received message:', message);



      if (message.action === 'publishError') {
        // 发布错误信息只显示通知，不影响按钮状态
        // 按钮状态与发布进度已分离，发布状态通过侧边栏显示
        showNotification(`发布失败: ${message.error}`, 'error');
      }

      return true;
    });
  } else {
    console.log('Chrome extension APIs not available, running in standalone mode');
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}

// 错误处理统计（开发模式下）
if (window.location.href.includes('localhost') || window.location.href.includes('file://')) {
  // 添加全局错误监听器
  window.addEventListener('error', (event) => {
    if (window.errorHandler) {
      window.errorHandler.handle(event.error, {
        context: '全局错误',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    }
  });

  // 添加Promise错误监听器
  window.addEventListener('unhandledrejection', (event) => {
    if (window.errorHandler) {
      window.errorHandler.handle(event.reason, {
        context: '未处理的Promise错误'
      });
    }
  });
}

// 页面卸载时清理资源
window.addEventListener('beforeunload', async () => {
  if (mainController) {
    try {
      await mainController.cleanup();
      console.log('Resources cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup resources:', error);
    }
  }
});

// 🧹 简化的调试工具
window.debugCache = {
  async stats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStorageStats' });
      console.table(response);
      return response;
    } catch (error) {
      console.error('获取缓存状态失败:', error);
      return null;
    }
  },

  async clear() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'clearFileCache' });
      console.log('🗑️ 缓存清理完成:', response);
      return response;
    } catch (error) {
      console.error('清理缓存失败:', error);
      return null;
    }
  }
};

// 🚀 分布式下载调试工具
window.debugDistributed = {
  async platforms() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getActivePlatforms' });
      console.log('🎯 活跃平台:', response);
      return response;
    } catch (error) {
      console.error('获取活跃平台失败:', error);
      return null;
    }
  },

  async sessions() {
    try {
      // 获取本地存储的分布式会话
      const result = await chrome.storage.local.get();
      const sessions = Object.keys(result).filter(key => key.startsWith('distributed_session_'));

      console.log('📋 分布式会话:', sessions);
      sessions.forEach(sessionKey => {
        console.log(`  ${sessionKey}:`, result[sessionKey]);
      });

      return sessions.map(key => result[key]);
    } catch (error) {
      console.error('获取分布式会话失败:', error);
      return null;
    }
  },

  help() {
    console.log(`
🚀 分布式下载调试工具:
- debugDistributed.platforms() : 查看当前活跃平台
- debugDistributed.sessions()  : 查看分布式下载会话
- debugDistributed.help()      : 显示此帮助信息

💡 分布式下载原理:
- 多个平台协作下载同一文件的不同分块
- 避免重复下载，提升效率80%
- 自动降级到传统下载方式
    `);
  }
};

console.log('🚀 分布式下载调试工具已加载，输入 debugDistributed.help() 查看使用说明');





// 文章管理器初始化器
class ArticleManagerInitializer {
  static initialize() {
    if (!window.articleManagerInitialized) {
      try {
        if (typeof articleManager !== 'undefined') {
          articleManager.init();
          window.articleManagerInitialized = true;
          console.log('Article manager initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize article manager:', error);
      }
    }
  }

  static reset() {
    window.articleManagerInitialized = false;
  }
}

// 文章管理器类
class ArticleManager {
  constructor() {
    this.currentArticle = null;
    this.isExtracting = false;
    this.domCache = new DOMCache();
    this.currentFormat = 'markdown'; // 默认使用markdown格式，对用户更友好
    this.originalHtmlContent = null; // 保存原始HTML内容，确保往返转换一致性
  }

  /**
   * 初始化文章抓取功能
   */
  init() {
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const fetchBtn = this.domCache.get('fetch-article-btn');
    const urlInput = this.domCache.get('article-url-input');

    if (fetchBtn) {
      fetchBtn.addEventListener('click', () => this.handleFetchArticle());
    }

    if (urlInput) {
      urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleFetchArticle();
        }
      });
    }

    // 绑定富文本编辑器操作按钮事件
    this.bindRichEditorEvents();
  }

  /**
   * 绑定富文本编辑器事件
   */
  bindRichEditorEvents() {
    const toggleFormatBtn = domCache.get('toggle-format-btn');
    const copyContentBtn = domCache.get('copy-content-btn');
    const clearContentBtn = domCache.get('clear-content-btn');

    if (toggleFormatBtn) {
      toggleFormatBtn.addEventListener('click', () => this.toggleRichEditorFormat());
    }

    if (copyContentBtn) {
      copyContentBtn.addEventListener('click', () => this.copyRichEditorContent());
    }

    if (clearContentBtn) {
      clearContentBtn.addEventListener('click', () => this.clearRichEditorContent());
    }
  }

  /**
   * 处理文章抓取
   */
  async handleFetchArticle() {
    const urlInput = this.domCache.get('article-url-input');
    const url = urlInput?.value?.trim();

    if (!url) {
      this.handleError('请输入文章链接', '输入验证');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.handleError('请输入有效的网址', '输入验证');
      return;
    }

    // 清理格式转换缓存，为新文章腾出空间
    FormatConverter.clearCache();

    this.setExtracting(true);

    try {
      // 发送消息给background script
      const response = await chrome.runtime.sendMessage({
        action: 'extractArticle',
        url: url
      });

      if (response.success) {
        // 清理和验证文章数据
        const cleanedArticle = ArticleDataProcessor.cleanArticleData(response.data);
        const validation = ArticleDataProcessor.validateArticle(cleanedArticle);

        this.currentArticle = cleanedArticle;
        this.displayArticle(cleanedArticle);
        this.fillFormWithArticle(cleanedArticle);

        // 显示抓取结果和质量信息
        let message = '文章抓取成功！';
        if (validation.warnings.length > 0) {
          message += ` (质量评分: ${validation.score}/100)`;
        }
        showNotification(message, 'success');

        // 在控制台显示详细的验证信息（开发模式）
        if (validation.warnings.length > 0) {
          console.log('📝 文章质量提醒:', validation.warnings);
        }
      } else {
        this.handleError(response.error || '抓取失败，请重试', '服务响应');
      }
    } catch (error) {
      this.handleError(error, '文章抓取');
    } finally {
      this.setExtracting(false);
    }
  }

  /**
   * 验证URL
   */
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * 设置抓取状态
   */
  setExtracting(isExtracting) {
    this.isExtracting = isExtracting;
    const fetchBtn = domCache.get('fetch-article-btn');
    const btnText = fetchBtn?.querySelector('.btn-text');
    const btnLoading = fetchBtn?.querySelector('.btn-loading');

    if (fetchBtn) {
      fetchBtn.disabled = isExtracting;
    }

    if (btnText && btnLoading) {
      if (isExtracting) {
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
      } else {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
      }
    }
  }

  /**
   * 显示文章内容
   */
  displayArticle(article) {
    // 填充标题输入框
    this.fillTitleInput(article);

    // 填充概要输入框
    this.fillExcerptInput(article);

    // 填充富文本编辑器
    this.fillRichEditor(article);
  }

  /**
   * 获取文章相关DOM元素（使用缓存）
   */
  getArticleElements() {
    return {
      titleInput: this.domCache.get('article-title-input'),
      excerptInput: this.domCache.get('article-excerpt-input'),
      richEditor: this.domCache.get('article-rich-editor')
    };
  }

  /**
   * 填充标题输入框
   */
  fillTitleInput(article) {
    const { titleInput } = this.getArticleElements();
    if (titleInput && article.title) {
      titleInput.value = article.title;
    }
  }

  /**
   * 填充概要输入框
   */
  fillExcerptInput(article) {
    const { excerptInput } = this.getArticleElements();
    if (excerptInput && article.excerpt) {
      excerptInput.value = article.excerpt;
    }
  }

  /**
   * 填充富文本编辑器
   */
  fillRichEditor(article) {
    const { richEditor } = this.getArticleElements();
    if (!richEditor || !article.content) return;

    // 保存原始HTML内容，确保往返转换一致性
    this.originalHtmlContent = article.content;

    // 默认使用富文本格式显示
    this.currentFormat = 'html';

    // 直接显示富文本内容
    richEditor.innerHTML = article.content;
    // 处理懒加载图片，确保图片能够正常显示
    FormatConverter.processLazyImages(richEditor);
  }

  /**
   * 切换富文本编辑器格式
   */
  toggleRichEditorFormat() {
    const { richEditor } = this.getArticleElements();
    if (!richEditor) return;

    // 如果没有原始HTML内容，无法进行格式切换
    if (!this.originalHtmlContent) {
      showNotification('没有可切换的内容', 'warning');
      return;
    }

    // 切换格式状态
    this.currentFormat = this.currentFormat === 'markdown' ? 'html' : 'markdown';

    if (this.currentFormat === 'markdown') {
      // 转换为Markdown格式：始终基于原始HTML内容转换
      const markdownContent = FormatConverter.htmlToMarkdown(this.originalHtmlContent);
      richEditor.innerHTML = `<pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 0;">${FormatConverter.escapeHtml(markdownContent)}</pre>`;
    } else {
      // 转换为富文本格式：直接恢复原始HTML内容
      richEditor.innerHTML = this.originalHtmlContent;
      // 处理懒加载图片，确保图片能够正常显示
      FormatConverter.processLazyImages(richEditor);
    }

    const formatName = this.currentFormat === 'markdown' ? 'Markdown' : '富文本';
    showNotification(`已切换到${formatName}格式`, 'success');
  }

  /**
   * 复制富文本编辑器内容
   */
  async copyRichEditorContent() {
    const { richEditor } = this.getArticleElements();
    if (!richEditor) return;

    try {
      // 根据实际内容判断格式，而不是依赖currentFormat状态
      const content = richEditor.innerHTML;
      const isMarkdownFormat = content.includes('<pre') && content.includes('style="white-space: pre-wrap');

      if (isMarkdownFormat) {
        // Markdown格式：复制纯文本
        const markdownText = richEditor.textContent;
        await navigator.clipboard.writeText(markdownText);
        showNotification('Markdown内容已复制到剪贴板', 'success');
      } else {
        // 富文本格式：尝试复制富文本和纯文本
        await this.copyRichTextContent(richEditor);
      }
    } catch (error) {
      Utils.handleError(error, '复制失败');
    }
  }

  /**
   * 复制富文本内容（支持HTML格式）
   */
  async copyRichTextContent(richEditor) {
    try {
      // 检查是否支持现代剪贴板API
      if (navigator.clipboard && navigator.clipboard.write) {
        // 获取HTML内容和纯文本内容
        const htmlContent = richEditor.innerHTML;
        const textContent = richEditor.innerText || richEditor.textContent;

        // 创建剪贴板数据项
        const clipboardItems = [
          new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([textContent], { type: 'text/plain' })
          })
        ];

        // 写入剪贴板
        await navigator.clipboard.write(clipboardItems);
        showNotification('富文本内容已复制到剪贴板', 'success');
      } else {
        // 降级方案：使用传统方法复制纯文本
        await this.fallbackCopyText(richEditor);
      }
    } catch (error) {
      console.error('富文本复制失败，尝试降级方案:', error);
      // 如果富文本复制失败，降级到纯文本复制
      await this.fallbackCopyText(richEditor);
    }
  }

  /**
   * 降级复制方案：使用选择和复制命令
   */
  async fallbackCopyText(richEditor) {
    try {
      // 方案1：尝试使用现代API复制纯文本
      const textContent = richEditor.innerText || richEditor.textContent;
      await navigator.clipboard.writeText(textContent);
      showNotification('内容已复制到剪贴板（纯文本格式）', 'success');
    } catch (error) {
      // 方案2：使用传统的选择和复制方法
      this.legacyCopyContent(richEditor);
    }
  }

  /**
   * 传统复制方法：模拟用户选择和复制操作
   */
  legacyCopyContent(richEditor) {
    try {
      // 保存当前选择
      const selection = window.getSelection();
      const originalRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      // 选择富文本编辑器的所有内容
      const range = document.createRange();
      range.selectNodeContents(richEditor);
      selection.removeAllRanges();
      selection.addRange(range);

      // 执行复制命令
      const successful = document.execCommand('copy');

      // 恢复原始选择
      selection.removeAllRanges();
      if (originalRange) {
        selection.addRange(originalRange);
      }

      if (successful) {
        showNotification('内容已复制到剪贴板', 'success');
      } else {
        throw new Error('execCommand copy failed');
      }
    } catch (error) {
      Utils.handleError(error, '复制失败，请手动选择内容进行复制');
    }
  }

  /**
   * 清除文章输入框内容（统一方法）
   */
  clearArticleInputs() {
    const { titleInput, excerptInput, richEditor } = this.getArticleElements();
    const urlInput = this.domCache.get('article-url-input');

    // 清除所有输入框
    if (titleInput) titleInput.value = '';
    if (excerptInput) excerptInput.value = '';
    if (richEditor) richEditor.innerHTML = '';
    if (urlInput) urlInput.value = '';

    // 重置状态
    this.currentArticle = null;
    this.originalHtmlContent = null;
    this.currentFormat = 'html';
  }

  /**
   * 清除富文本编辑器内容
   */
  clearRichEditorContent() {
    if (!confirm('确定要清除当前内容吗？')) {
      return;
    }

    this.clearArticleInputs();
    showNotification('内容已清除', 'success');
  }

  /**
   * 生成文章概要信息HTML
   */
  generateArticleSummaryHTML(article) {
    const readingTimeText = article.readingTime ? `约 ${article.readingTime} 分钟` : '';
    const characterCount = article.length || 0;
    const imageCount = article.images?.length || 0;

    return `
      <div class="article-summary">
        <!-- 统计信息行 -->
        <div class="summary-stats">
          <span class="summary-stat-item">📝 ${characterCount} 字符</span>
          ${imageCount > 0 ? `<span class="summary-stat-item">🖼️ ${imageCount} 张图片</span>` : ''}
          ${readingTimeText ? `<span class="summary-stat-item">⏱️ ${readingTimeText}</span>` : ''}
        </div>

        <!-- 文章摘要 -->
        ${article.excerpt ? `
          <div class="summary-excerpt">
            <div class="summary-excerpt-content">${FormatConverter.escapeHtml(article.excerpt)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成文章内容HTML（重构后的简化版本）
   */
  generateArticleContentHTML(article) {
    return `
      <div class="article-content-container">
        <!-- 文章内容区域 -->
        <div class="article-content-area">
          <div class="content-display ${this.currentFormat}">
            ${this.currentFormat === 'html' ?
              article.content :
              `<div class="markdown-content">${FormatConverter.markdownToHtml(FormatConverter.htmlToMarkdown(article.content))}</div>`
            }
          </div>
        </div>

        <!-- 底部操作按钮 -->
        <div class="article-actions">
          <button class="btn-secondary" onclick="articleManager.toggleFormat()">
            🔄 切换格式
          </button>
          <button class="btn-secondary" onclick="articleManager.copyToClipboard('content')">
            📄 复制内容
          </button>
          <button class="btn-secondary btn-danger" onclick="articleManager.clearArticle()">
            🗑️ 清除
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 填充表单 - 统一入口
   */
  fillFormWithArticle(article) {
    if (!article) return;

    if (appState.currentContentType === '文章') {
      this.fillFormForArticleMode(article);
    } else {
      this.fillFormForOtherModes(article);
    }

    showNotification('内容已填充到表单', 'success');
  }

  /**
   * 文章模式下的表单填充
   */
  fillFormForArticleMode(article) {
    const articleEditor = this.domCache.get('article-editor');
    if (!articleEditor) return;

    // 使用统一的文章数据处理器
    const format = this.currentFormat === 'markdown' ? 'markdown' : 'plaintext';
    const content = ArticleDataProcessor.formatArticle(article, format);

    articleEditor.value = content;
    appState.content = content;

    // 添加成功提示
    console.log(`✅ 文章内容已填充到编辑器 (${this.currentFormat === 'markdown' ? 'Markdown' : '纯文本'}格式)`);
  }

  /**
   * 其他模式下的表单填充
   */
  fillFormForOtherModes(article) {
    // 填充标题
    const titleInput = this.domCache.get('title-input');
    if (titleInput && article.title) {
      titleInput.value = article.title;
      appState.title = article.title;
    }

    // 填充内容 - 使用统一的文章数据处理器
    const contentTextarea = this.domCache.get('content-textarea');
    if (contentTextarea) {
      // 为其他模式使用纯文本格式，但使用textContent而不是content
      const articleForOtherModes = {
        ...article,
        content: article.textContent || article.content // 优先使用textContent
      };

      const content = ArticleDataProcessor.formatArticle(articleForOtherModes, 'plaintext');
      contentTextarea.value = content;
      appState.content = content;
    }
  }

  /**
   * 复制到剪贴板
   */
  async copyToClipboard(type) {
    if (!this.currentArticle) return;

    let textToCopy = '';
    let formatName = '';

    switch (type) {
      case 'content':
        // 使用统一的文章数据处理器
        const format = this.currentFormat === 'markdown' ? 'markdown' : 'plaintext';
        textToCopy = ArticleDataProcessor.formatArticle(this.currentArticle, format);
        formatName = this.currentFormat === 'markdown' ? 'Markdown格式' : '纯文本格式';
        break;
      case 'url':
        textToCopy = this.currentArticle.url || '';
        formatName = '链接';
        break;
    }

    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        showNotification(`已复制${formatName}内容到剪贴板`, 'success');
      } catch (error) {
        Utils.handleError(error, '复制失败');
      }
    }
  }

  /**
   * 切换格式（纯文本/Markdown）
   */
  toggleFormat() {
    if (!this.currentArticle) return;

    // 在markdown和html(纯文本)之间切换
    this.currentFormat = this.currentFormat === 'markdown' ? 'html' : 'markdown';

    // 重新显示文章预览
    this.displayArticle(this.currentArticle);

    // 重新填充表单内容
    this.fillFormWithArticle(this.currentArticle);

    const formatName = this.currentFormat === 'markdown' ? 'Markdown' : '纯文本';
    showNotification(`已切换到${formatName}格式`, 'success');
  }





  /**
   * 清除文章
   */
  clearArticle() {
    // 添加确认对话框，避免误操作
    if (this.currentArticle && !confirm('确定要清除当前文章内容吗？')) {
      return;
    }

    // 使用统一的清除方法
    this.clearArticleInputs();

    // 清除内容展示区域
    const displayArea = this.domCache.get('article-content-display');
    if (displayArea) {
      displayArea.style.display = 'none';
      displayArea.innerHTML = '';
    }

    // 清除概要信息区域
    const summaryArea = this.domCache.get('article-summary-section');
    if (summaryArea) {
      summaryArea.style.display = 'none';
      summaryArea.innerHTML = '';
    }

    showNotification('文章内容已清除', 'success');
  }

  /**
   * 统一错误处理
   */
  handleError(error, context = '') {
    // 复用Utils的错误处理逻辑
    const result = Utils.handleError(error, context || '文章操作失败');

    // 显示文章管理器特有的错误界面
    this.showError(result.message);
  }

  /**
   * 显示错误
   */
  showError(message) {
    // 隐藏概要信息区域
    const summaryArea = this.domCache.get('article-summary-section');
    if (summaryArea) {
      summaryArea.style.display = 'none';
    }

    const displayArea = this.domCache.get('article-content-display');
    if (!displayArea) return;

    displayArea.innerHTML = `
      <div class="error-message">
        <div class="error-icon">⚠️</div>
        <h4>抓取失败</h4>
        <p>${FormatConverter.escapeHtml(message)}</p>
        <div class="error-suggestions">
          <h5>建议：</h5>
          <ul>
            <li>检查网址是否正确</li>
            <li>确保网页可以正常访问</li>
            <li>尝试刷新页面后重试</li>
            <li>某些网站可能有反爬虫保护</li>
          </ul>
        </div>
      </div>
    `;
    displayArea.style.display = 'block';
  }


}

// 创建全局文章管理器实例
const articleManager = new ArticleManager();
