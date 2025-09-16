/**
 * 内容优化服务 - 统一管理AI内容优化相关功能
 * 整合分散在各处的优化逻辑，提供统一的接口
 */

class ContentOptimizationService {
  constructor() {
    this.cache = new Map(); // 缓存优化结果
    this.isInitialized = false;

    // 并发控制配置
    this.maxConcurrency = 20; // Gemini API支持的最大并发数
    this.activeRequests = 0;  // 当前活跃的请求数
    this.requestQueue = [];   // 等待队列

    // 只在开发环境输出初始化日志
    if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
      console.log(`🚀 ContentOptimizationService 初始化，最大并发数: ${this.maxConcurrency}`);
    }
  }

  /**
   * 初始化服务
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // 预加载必要的配置
      await this.loadSettings();
      this.isInitialized = true;
      console.log('✅ 内容优化服务初始化完成');
    } catch (error) {
      console.error('❌ 内容优化服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取AI设置
   * @returns {Promise<Object>} AI设置
   */
  async loadSettings() {
    try {
      // 尝试从不同的存储位置获取设置
      const results = await Promise.allSettled([
        chrome.storage.local.get(['promptSettings']),
        chrome.storage.local.get(['settings'])
      ]);

      // 优先使用promptSettings，降级到settings
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const settings = result.value.promptSettings || result.value.settings;
          if (settings && this.validateSettings(settings)) {
            this.settings = settings;
            return settings;
          }
        }
      }

      throw new Error('未找到有效的AI设置');
    } catch (error) {
      console.error('加载AI设置失败:', error);
      throw new Error('AI API未配置，请先在提示词助手中配置API Key');
    }
  }

  /**
   * 验证设置有效性
   * @param {Object} settings - 设置对象
   * @returns {boolean} 是否有效
   */
  validateSettings(settings) {
    if (!settings) return false;

    // 检查MomentDots格式
    if (settings.models && settings.models.length > 0) {
      return settings.models.some(model => model.apiKey);
    }

    // 检查独立prompt扩展格式
    return !!(settings.apiKey);
  }

  /**
   * 获取API配置
   * @param {string} modelId - 模型ID
   * @returns {Object} API配置
   */
  getAPIConfig(modelId = null) {
    if (!this.settings) {
      throw new Error('设置未加载');
    }

    let apiKey, endpoint, model;

    if (this.settings.models && this.settings.models.length > 0) {
      // MomentDots格式
      model = this.settings.models.find(m => m.id === (modelId || this.settings.defaultModel)) 
              || this.settings.models[0];
      apiKey = model.apiKey;
      endpoint = model.endpoint;
    } else if (this.settings.apiKey) {
      // 独立prompt扩展格式
      apiKey = this.settings.apiKey;
      endpoint = this.settings.endpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      model = { id: 'gemini-2.5-flash' };
    }

    if (!apiKey) {
      throw new Error('API Key未配置');
    }

    return { apiKey, endpoint, model };
  }

  /**
   * 获取提示词信息
   * @param {string} promptName - 提示词名称
   * @returns {Promise<Object>} 提示词信息
   */
  async getPromptByName(promptName) {
    try {
      // 尝试从不同的存储位置获取提示词
      const results = await Promise.allSettled([
        chrome.storage.local.get(['promptPrompts']),
        chrome.storage.local.get(['prompts'])
      ]);

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const prompts = result.value.promptPrompts || result.value.prompts;
          if (prompts && Array.isArray(prompts)) {
            const prompt = prompts.find(p => p.name === promptName);
            if (prompt) return prompt;
          }
        }
      }

      throw new Error(`未找到提示词: ${promptName}`);
    } catch (error) {
      console.error('获取提示词失败:', error);
      throw error;
    }
  }

  /**
   * 组合提示词内容
   * @param {string} promptContent - 提示词内容
   * @param {string} originalText - 原始文本
   * @returns {string} 组合后的内容
   */
  combinePromptContent(promptContent, originalText) {
    if (promptContent.includes('【用户输入内容】')) {
      return promptContent.replace('【用户输入内容】', originalText);
    } else {
      return `${promptContent}\n\n用户输入的内容：\n${originalText}`;
    }
  }

  /**
   * 调用AI API进行内容优化 - 并发控制版本
   * @param {string} originalContent - 原始内容
   * @param {string} promptName - 提示词名称
   * @returns {Promise<string>} 优化后的内容
   */
  async optimizeContent(originalContent, promptName) {
    // 检查缓存
    const cacheKey = `${promptName}:${originalContent}`;
    if (this.cache.has(cacheKey)) {
      console.log('🎯 使用缓存的优化结果');
      return this.cache.get(cacheKey);
    }

    // 并发控制：如果达到最大并发数，等待空闲槽位
    await this.acquireSlot();

    try {
      // 确保服务已初始化
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🤖 开始AI内容优化，提示词: ${promptName} (${this.activeRequests}/${this.maxConcurrency})`);

      // 获取提示词（异步）和API配置（同步）
      const promptData = await this.getPromptByName(promptName);
      const apiConfig = this.getAPIConfig(null);

      // 组合内容
      const combinedContent = this.combinePromptContent(promptData.content, originalContent);

      // 调用API
      const optimizedContent = await this.callAPI(apiConfig, combinedContent);

      // 缓存结果（LRU策略）
      this.setCacheWithLimit(cacheKey, optimizedContent);

      console.log('✅ AI内容优化完成', {
        originalLength: originalContent.length,
        optimizedLength: optimizedContent.length,
        promptUsed: promptName,
        activeRequests: this.activeRequests
      });

      return optimizedContent;

    } catch (error) {
      console.error('❌ AI内容优化失败:', error);
      throw new Error(`内容优化失败: ${error.message}`);
    } finally {
      // 释放槽位
      this.releaseSlot();
    }
  }

  /**
   * 调用AI API
   * @param {Object} apiConfig - API配置
   * @param {string} content - 内容
   * @returns {Promise<string>} API响应
   */
  async callAPI(apiConfig, content) {
    const { apiKey, endpoint, model } = apiConfig;

    // 构建请求体
    const requestBody = {
      contents: [{
        parts: [{ text: content }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    };

    // 构建请求URL
    const url = endpoint.includes('?') 
      ? `${endpoint}&key=${apiKey}`
      : `${endpoint}?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API调用失败: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('API返回数据格式异常');
    }

    return data.candidates[0].content.parts[0].text;
  }

  /**
   * 获取并发槽位
   * @returns {Promise<void>}
   */
  async acquireSlot() {
    if (this.activeRequests < this.maxConcurrency) {
      this.activeRequests++;
      return;
    }

    // 如果达到并发限制，加入等待队列
    return new Promise((resolve) => {
      this.requestQueue.push(resolve);
    });
  }

  /**
   * 释放并发槽位
   */
  releaseSlot() {
    this.activeRequests--;

    // 处理等待队列中的下一个请求
    if (this.requestQueue.length > 0) {
      const nextResolve = this.requestQueue.shift();
      this.activeRequests++;
      nextResolve();
    }
  }

  /**
   * 获取并发状态信息
   * @returns {Object} 并发状态
   */
  getConcurrencyStatus() {
    return {
      activeRequests: this.activeRequests,
      maxConcurrency: this.maxConcurrency,
      queueLength: this.requestQueue.length,
      utilizationRate: (this.activeRequests / this.maxConcurrency * 100).toFixed(1) + '%'
    };
  }

  /**
   * 设置缓存（带大小限制）
   * @param {string} key - 缓存键
   * @param {string} value - 缓存值
   */
  setCacheWithLimit(key, value) {
    if (this.cache.size >= 50) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ 优化结果缓存已清除');
  }

  /**
   * 重置并发控制状态（用于测试或异常恢复）
   */
  resetConcurrencyControl() {
    this.activeRequests = 0;
    this.requestQueue = [];
    console.log('🔄 并发控制状态已重置');
  }
}

// 创建单例实例
const contentOptimizationService = new ContentOptimizationService();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContentOptimizationService, contentOptimizationService };
} else if (typeof window !== 'undefined') {
  window.ContentOptimizationService = ContentOptimizationService;
  window.contentOptimizationService = contentOptimizationService;
}
