/**
 * 小红书长文平台适配器
 * 专门用于小红书长文发布功能
 *
 * 技术特点：
 * - A类平台（直接注入型）
 * - TipTap + ProseMirror 富文本编辑器
 * - 图片占位符处理机制
 * - 与现有小红书适配器共享基础配置
 */

(function() {
  'use strict';

  // 调试模式控制
  const DEBUG_MODE = false;
  const debugLog = DEBUG_MODE ? console.log.bind(console, '[小红书长文]') : () => {};

  /**
   * 小红书长文平台配置管理器
   * 继承小红书基础配置，添加长文特定配置
   */
  class XiaohongshuArticleConfigManager extends BaseConfigManager {
    constructor() {
      super('xiaohongshu-article');
    }

    /**
     * 加载小红书长文特定配置
     * @returns {Object} 配置对象
     */
    loadConfig() {
      const baseConfig = super.loadConfig();

      // 小红书长文特定配置
      const articleConfig = {
        // 延迟时间配置（优化后）
        delays: {
          FAST: 200,
          NORMAL: 500,
          NAVIGATION: 1000,
          EDITOR_INIT: 1500
        },

        // 小红书长文平台限制
        limits: {
          maxTitleLength: 64,      // 标题最大64字符
          maxContentLength: 10000, // 长文内容限制
          maxMediaFiles: 0,        // 不支持直接媒体文件上传
          allowedImageTypes: [],   // 不支持直接图片上传
          allowedVideoTypes: []    // 不支持视频上传
        },

        // 选择器配置
        selectors: {
          // 页面检测
          pageIndicators: [
            'div[contenteditable="true"].tiptap.ProseMirror',
            'input[placeholder*="输入标题"]'
          ],

          // 新建创作按钮 - 使用更通用的选择器
          newCreationButton: 'button',

          // 标题输入框 - 使用更通用的选择器
          titleInput: 'input[placeholder*="标题"], input[placeholder*="输入"], textarea[placeholder*="标题"], textarea[placeholder*="输入"]',

          // 内容编辑器
          contentEditor: 'div[contenteditable="true"].tiptap.ProseMirror',

          // 字数统计
          wordCount: 'div',

          // 一键排版按钮
          formatButton: 'button'
        },

        // URL模式
        urlPatterns: {
          publishPage: 'creator.xiaohongshu.com/publish/publish',
          targetParam: 'target=article'
        },

        // 图片占位符配置（优化后）
        imagePlaceholder: {
          template: '[图片：存在图片]',
          repeatCount: 1,  // 每张图片用1行占位符
          wrapInStrong: false  // 不使用粗体包装，保持简洁
        }
      };

      return this.mergeConfig(baseConfig, articleConfig);
    }
  }

  /**
   * 小红书长文平台适配器类
   * 继承PlatformAdapter基类，实现长文发布功能
   */
  class XiaohongshuArticleAdapter extends PlatformAdapter {
    constructor() {
      super();
      this.platform = 'xiaohongshu-article';
      this.configManager = new XiaohongshuArticleConfigManager();
      this.config = this.configManager.loadConfig();
      
      this.log('✅ 小红书长文适配器初始化完成');
    }

    /**
     * 日志输出（优化后）
     * @param {...any} args - 日志参数
     */
    log(...args) {
      debugLog(...args);
    }

    /**
     * 睡眠函数
     * @param {number} ms - 毫秒数
     * @returns {Promise}
     */
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 检查是否在小红书长文发布页面
     * @returns {boolean}
     */
    isOnPublishPage() {
      const url = window.location.href;
      const { urlPatterns } = this.config;

      return url.includes(urlPatterns.publishPage) &&
             url.includes(urlPatterns.targetParam);
    }

    /**
     * 检查是否在编辑状态
     * @returns {boolean}
     */
    isInEditMode() {
      const { selectors } = this.config;
      const editor = document.querySelector(selectors.contentEditor);
      const titleInput = document.querySelector(selectors.titleInput);

      this.log('🔍 编辑状态检查:', {
        editor: !!editor,
        titleInput: !!titleInput,
        editorSelector: selectors.contentEditor,
        titleSelector: selectors.titleInput
      });

      // 如果编辑器存在，就认为已经进入编辑模式
      // 标题输入框可能需要额外的时间加载
      return !!editor;
    }

    /**
     * 等待编辑器初始化
     * @returns {Promise<boolean>}
     */
    async waitForEditor() {
      const { delays } = this.config;
      const maxAttempts = 10;

      for (let i = 0; i < maxAttempts; i++) {
        if (this.isInEditMode()) {
          this.log('✅ 编辑器已初始化');
          return true;
        }
        await this.sleep(delays.FAST);
      }

      this.log('⚠️ 编辑器初始化超时');
      return false;
    }

    /**
     * 点击新建创作按钮（优化后）
     * @returns {Promise<boolean>}
     */
    async clickNewCreationButton() {
      const { delays } = this.config;
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          this.log(`🔍 查找新建创作按钮... (${attempt}/${maxAttempts})`);

          if (attempt > 1) {
            await this.sleep(delays.NORMAL);
          }

          const button = this.findNewCreationButton();
          if (button) {
            this.log('🖱️ 找到新建创作按钮，准备点击');
            button.click();

            await this.sleep(delays.NAVIGATION);
            return await this.waitForEditor();
          }

          this.log(`⏳ 第${attempt}次尝试失败，${attempt < maxAttempts ? '等待后重试' : '放弃'}`);

        } catch (error) {
          this.log(`❌ 第${attempt}次尝试出错:`, error.message);
        }
      }

      return false;
    }

    /**
     * 查找新建创作按钮
     * @returns {Element|null}
     */
    findNewCreationButton() {
      const buttons = document.querySelectorAll('button');
      this.log('📋 页面按钮总数:', buttons.length);

      if (buttons.length === 0) {
        this.log('⚠️ 页面上没有找到任何按钮');
        return null;
      }

      // 查找"新的创作"按钮
      for (const btn of buttons) {
        const text = btn.textContent?.trim();
        if (text && text.includes('新的创作')) {
          return btn;
        }
      }

      this.log('❌ 未找到新建创作按钮');
      return null;
    }

    /**
     * 处理图片占位符
     * 将内容中的图片转换为占位符文字
     * @param {string} content - 原始内容
     * @returns {string} - 处理后的内容
     */
    processImagePlaceholders(content) {
      const { imagePlaceholder } = this.config;

      this.log('🔍 处理图片占位符');

      // 创建占位符文本（最终优化版）
      const createPlaceholder = () => {
        const placeholderText = imagePlaceholder.template;

        // 使用特殊标记，后续在文本转换时处理
        return `__PLACEHOLDER_START__${placeholderText}__PLACEHOLDER_END__`;
      };

      let imageCount = 0;

      // 替换HTML中的img标签
      let processedContent = content.replace(/<img[^>]*>/gi, () => {
        imageCount++;
        return createPlaceholder();
      });

      // 替换Markdown格式的图片
      processedContent = processedContent.replace(/!\[([^\]]*)\]\([^)]*\)/g, () => {
        imageCount++;
        return createPlaceholder();
      });

      if (imageCount > 0) {
        this.log('📊 图片处理完成，转换了', imageCount, '张图片');
      }

      return processedContent;
    }

    /**
     * 注入标题
     * @param {string} title - 标题内容
     * @returns {Promise<boolean>}
     */
    async injectTitle(title) {
      const { selectors, limits } = this.config;

      try {
        // 尝试多种方式查找标题输入框
        let titleInput = document.querySelector(selectors.titleInput);

        if (!titleInput) {
          // 尝试其他可能的选择器
          const alternativeSelectors = [
            'input[placeholder*="标题"]',
            'input[placeholder*="输入"]',
            'textarea[placeholder*="标题"]',
            'textarea[placeholder*="输入"]',
            'input[type="text"]',
            'textarea'
          ];

          for (const selector of alternativeSelectors) {
            titleInput = document.querySelector(selector);
            if (titleInput) {
              this.log('✅ 使用替代选择器找到标题输入框:', selector);
              break;
            }
          }
        }

        if (!titleInput) {
          this.log('❌ 未找到标题输入框，尝试查找所有输入元素');
          const allInputs = document.querySelectorAll('input, textarea');
          this.log('📋 页面输入元素:', Array.from(allInputs).map(input => ({
            tag: input.tagName,
            type: input.type,
            placeholder: input.placeholder,
            id: input.id,
            className: input.className
          })));
          return false;
        }

        // 截断标题长度
        const truncatedTitle = title.length > limits.maxTitleLength ?
          title.substring(0, limits.maxTitleLength) : title;

        this.log('📝 注入标题:', truncatedTitle);

        // 清空并输入标题
        titleInput.value = '';
        titleInput.focus();
        titleInput.value = truncatedTitle;

        // 触发输入事件
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
        titleInput.dispatchEvent(new Event('keyup', { bubbles: true }));

        return true;

      } catch (error) {
        this.log('❌ 标题注入失败:', error);
        return false;
      }
    }

    /**
     * 注入内容
     * @param {string} content - 内容
     * @returns {Promise<boolean>}
     */
    async injectContent(content) {
      const { selectors, delays } = this.config;

      try {
        const editor = document.querySelector(selectors.contentEditor);
        if (!editor) {
          this.log('❌ 未找到内容编辑器');
          return false;
        }

        this.log('📝 开始内容注入');

        // 处理图片占位符
        const processedContent = this.processImagePlaceholders(content);

        // 转换为纯文本并保留段落结构
        const textContent = this.convertHtmlToText(processedContent);

        this.log('📝 注入内容长度:', textContent.length);

        // 清空并注入内容
        editor.innerHTML = '';
        editor.focus();
        await this.sleep(delays.FAST);

        return this.injectTextContent(editor, textContent);

      } catch (error) {
        this.log('❌ 内容注入失败:', error.message);
        return false;
      }
    }

    /**
     * 将HTML转换为纯文本（保留段落结构）
     * @param {string} html - HTML内容
     * @returns {string} - 纯文本内容
     */
    convertHtmlToText(html) {
      let result = html
        .replace(/<\/p>\s*<p>/gi, '\n\n')     // 段落间双换行
        .replace(/<\/p>/gi, '\n')             // 段落结束换行
        .replace(/<p>/gi, '')                 // 移除段落开始标签
        .replace(/<br\s*\/?>/gi, '\n')        // 换行标签
        .replace(/<[^>]*>/g, '')              // 移除所有其他HTML标签
        .replace(/\n\s*\n\s*\n+/g, '\n\n')    // 规范化多重换行
        .trim();

      // 处理图片占位符标记，确保独立成行
      result = result.replace(/__PLACEHOLDER_START__([^_]+)__PLACEHOLDER_END__/g, (match, placeholderText) => {
        return `\n\n${placeholderText}\n\n`;
      });

      // 最终清理：规范化换行
      result = result
        .replace(/\n\s*\n\s*\n+/g, '\n\n')    // 规范化多重换行
        .replace(/^\s*\n+/, '')               // 移除开头的空行
        .replace(/\n+\s*$/, '')               // 移除结尾的空行
        .trim();

      return result;
    }

    /**
     * 注入文本内容到编辑器
     * @param {Element} editor - 编辑器元素
     * @param {string} textContent - 文本内容
     * @returns {Promise<boolean>}
     */
    async injectTextContent(editor, textContent) {
      const { delays } = this.config;

      try {
        // 方法1: 使用模拟输入
        const lines = textContent.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (line) {
            document.execCommand('insertText', false, line);
          }

          // 处理换行
          if (i < lines.length - 1) {
            const nextLine = lines[i + 1];
            if (!nextLine || !nextLine.trim()) {
              // 段落分隔
              document.execCommand('insertParagraph', false);
              document.execCommand('insertParagraph', false);
              i++; // 跳过空行
            } else {
              // 行内换行
              document.execCommand('insertLineBreak', false);
            }
          }

          // 控制输入速度
          if (i % 10 === 0) {
            await this.sleep(delays.FAST / 4);
          }
        }

        await this.sleep(delays.NORMAL);
        this.log('✅ 内容注入成功');
        return true;

      } catch (error) {
        this.log('⚠️ 模拟输入失败，尝试直接设置:', error.message);

        // 方法2: 直接设置文本
        editor.textContent = textContent;
        editor.dispatchEvent(new Event('input', { bubbles: true }));

        await this.sleep(delays.FAST);
        this.log('✅ 直接设置内容成功');
        return true;
      }
    }

    /**
     * 发布内容到小红书长文平台
     * @param {Object} data - 发布数据
     * @returns {Promise<Object>} - 发布结果
     */
    async publishContent(data) {
      const { title, content } = data;
      const { delays } = this.config;

      try {
        this.log('🚀 开始小红书长文发布', {
          title: title?.substring(0, 30),
          contentLength: content?.length
        });

        // 1. 验证页面状态
        if (!this.isOnPublishPage()) {
          throw new Error('请先打开小红书长文发布页面');
        }

        // 2. 等待页面加载并进入编辑模式
        await this.sleep(delays.NAVIGATION);

        if (!this.isInEditMode()) {
          this.log('📝 进入编辑模式');
          const success = await this.clickNewCreationButton();
          if (!success) {
            throw new Error('无法进入编辑模式');
          }
        }

        await this.sleep(delays.NORMAL);
        
        // 3. 注入内容
        this.log('📝 注入标题和内容');

        const titleSuccess = await this.injectTitle(title);
        const contentSuccess = await this.injectContent(content);

        if (!titleSuccess || !contentSuccess) {
          throw new Error('内容注入失败');
        }

        this.log('✅ 发布完成');

        return {
          success: true,
          message: '内容已成功注入',
          platform: this.platform
        };

      } catch (error) {
        this.log('❌ 发布失败:', error.message);
        return {
          success: false,
          error: error.message,
          platform: this.platform
        };
      }
    }
  }

  // 消息监听器（优化后）
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'publish' && message.platform === 'xiaohongshu-article') {
        debugLog('收到发布消息');

        const adapter = window.MomentDots?.xiaohongshuArticleAdapter;
        if (!adapter) {
          sendResponse({
            success: false,
            error: 'Adapter not initialized',
            platform: 'xiaohongshu-article'
          });
          return true;
        }

        adapter.publishContent(message.data)
          .then(sendResponse)
          .catch(error => {
            sendResponse({
              success: false,
              error: error.message,
              platform: 'xiaohongshu-article'
            });
          });
        return true;
      }
    });
  }

  // 初始化适配器（优化后）
  if (typeof window !== 'undefined' && window.location.href.includes('target=article')) {
    window.MomentDots = window.MomentDots || {};
    window.MomentDots.xiaohongshuArticleAdapter = new XiaohongshuArticleAdapter();
    debugLog('✅ 适配器已初始化');
  }

})();
