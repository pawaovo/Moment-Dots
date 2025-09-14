/**
 * 文章抓取配置常量
 */
const ARTICLE_CONFIG = {
  // 超时设置
  TIMEOUT: 30000,              // 30秒超时
  LOAD_TIMEOUT: 2000,          // 页面加载额外等待时间
  SCROLL_TIMEOUT: 800,         // 滚动完成等待时间

  // 滚动设置
  SCROLL_INTERVAL: 800,        // 滚动间隔
  MAX_SCROLLS: 10,            // 最大滚动次数
  STABLE_THRESHOLD: 2,         // 稳定阈值

  // 重试设置
  MAX_RETRIES: 3,             // 最大重试次数

  // Readability配置
  CHAR_THRESHOLD: 200,         // 字符阈值
  NB_TOP_CANDIDATES: 5,        // 候选节点数量
  LINK_DENSITY_MODIFIER: 0,    // 链接密度修正

  // 阅读时间计算（中文阅读速度：字/分钟）
  READING_SPEED: 300
};

/**
 * 文章内容抓取服务
 * 基于Mozilla Readability算法，集成到MomentDots扩展架构
 */
class ArticleExtractorService {
  constructor() {
    this.extractionHistory = [];
    this.isExtracting = false;
    this.maxRetries = ARTICLE_CONFIG.MAX_RETRIES;
    this.timeout = ARTICLE_CONFIG.TIMEOUT;
  }

  /**
   * 主要的文章抓取方法
   * @param {string} url - 文章URL
   * @returns {Promise<Object>} 抓取结果
   */
  async extractArticle(url) {
    if (this.isExtracting) {
      throw new Error('正在抓取中，请稍候...');
    }

    this.isExtracting = true;
    let tab = null;
    
    try {
      // 验证URL格式
      this.validateUrl(url);
      
      // 1. 创建新标签页（复用现有模式）
      tab = await chrome.tabs.create({ 
        url: url, 
        active: false 
      });

      console.log(`开始抓取文章: ${url}, 标签页ID: ${tab.id}`);

      // 2. 等待页面加载（复用现有方法）
      await this.waitForTabLoad(tab.id);

      // 3. 注入Readability库（复用现有注入模式）
      await this.injectReadabilityScripts(tab.id);

      // 4. 执行内容抓取 - 使用独立函数而不是类方法
      const extractionResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: this.getExtractionFunction(),
        args: []
      });

      // 5. 处理结果
      if (!extractionResult || !extractionResult[0]) {
        throw new Error('脚本执行失败，未返回结果');
      }

      const result = extractionResult[0].result;
      if (!result || result.error) {
        throw new Error(result?.error || '抓取失败，未获取到有效内容');
      }

      // 6. 记录抓取历史
      this.recordExtraction(url, result);
      
      console.log('文章抓取成功:', result.title);
      return result;

    } catch (error) {
      console.error('文章抓取失败:', error);
      throw error;
    } finally {
      // 7. 清理标签页
      if (tab) {
        try {
          await chrome.tabs.remove(tab.id);
        } catch (cleanupError) {
          console.warn('清理标签页失败:', cleanupError);
        }
      }
      this.isExtracting = false;
    }
  }

  /**
   * 验证URL格式
   */
  validateUrl(url) {
    try {
      new URL(url);
    } catch {
      throw new Error('请输入有效的URL地址');
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('URL必须以http://或https://开头');
    }
  }

  /**
   * 等待标签页加载完成
   */
  async waitForTabLoad(tabId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('页面加载超时'));
      }, this.timeout);

      const checkReady = () => {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => document.readyState
        }, (results) => {
          if (chrome.runtime.lastError) {
            clearTimeout(timeout);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (results && results[0].result === 'complete') {
            clearTimeout(timeout);
            // 额外等待确保动态内容加载
            setTimeout(resolve, ARTICLE_CONFIG.LOAD_TIMEOUT);
          } else {
            setTimeout(checkReady, 500);
          }
        });
      };
      
      checkReady();
    });
  }

  /**
   * 注入Readability脚本（复用现有注入模式）
   */
  async injectReadabilityScripts(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          'libs/readability/JSDOMParser.js',
          'libs/readability/Readability.js',
          'libs/readability/Readability-readerable.js'
        ]
      });
      console.log('Readability脚本注入成功');
    } catch (error) {
      console.error('脚本注入失败:', error);
      throw new Error('无法注入必要的脚本文件');
    }
  }

  /**
   * 获取用于页面执行的独立函数
   * 这个方法返回一个独立的函数，用于chrome.scripting.executeScript
   */
  getExtractionFunction() {
    // 返回一个完全独立的函数，包含所有必要的逻辑和辅助函数
    return async function() {
      console.log('🎯 开始执行文章抓取...');

      // 定义智能滚动函数
      async function performSmartScrollAndLoad() {
        return new Promise((resolve) => {
          let scrollCount = 0;
          let lastHeight = 0;
          let stableCount = 0;
          const maxScrolls = 8;
          const stableThreshold = 2;

          console.log('开始智能滚动加载...');

          const scrollInterval = setInterval(() => {
            // 触发懒加载
            const lazyImages = document.querySelectorAll('img[data-src], img[data-original], img[loading="lazy"]');
            lazyImages.forEach(img => {
              if (img.dataset.src && !img.src) {
                img.src = img.dataset.src;
              }
              if (img.dataset.original && !img.src) {
                img.src = img.dataset.original;
              }
            });

            // 触发滚动和resize事件
            window.dispatchEvent(new Event('scroll'));
            window.dispatchEvent(new Event('resize'));

            // 滚动到底部
            window.scrollTo(0, document.body.scrollHeight);

            const currentHeight = document.body.scrollHeight;
            scrollCount++;

            console.log(`滚动第${scrollCount}次，页面高度: ${currentHeight}`);

            if (currentHeight === lastHeight) {
              stableCount++;
            } else {
              stableCount = 0;
            }

            if (scrollCount >= maxScrolls || stableCount >= stableThreshold) {
              clearInterval(scrollInterval);
              // 滚动回顶部
              window.scrollTo(0, 0);
              console.log('滚动加载完成');
              setTimeout(resolve, 500);
            }

            lastHeight = currentHeight;
          }, 600);
        });
      }

      // 定义内容增强函数
      function performContentEnhancement(article) {
        console.log('开始内容增强处理...');

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = article.content;

        // 提取图片
        const images = Array.from(tempDiv.querySelectorAll('img')).map(img => {
          // 查找图片说明
          function findImageCaption(imgElement) {
            const nextSibling = imgElement.nextElementSibling;
            if (nextSibling && (nextSibling.tagName === 'FIGCAPTION' || nextSibling.className.includes('caption'))) {
              return nextSibling.textContent.trim();
            }

            const parent = imgElement.parentElement;
            if (parent && parent.tagName === 'FIGURE') {
              const caption = parent.querySelector('figcaption');
              if (caption) return caption.textContent.trim();
            }

            return '';
          }

          return {
            src: img.src || img.dataset.src || img.dataset.original,
            alt: img.alt || '',
            title: img.title || '',
            width: img.width || null,
            height: img.height || null,
            caption: findImageCaption(img)
          };
        }).filter(img => img.src && !img.src.startsWith('data:image') && img.src.length > 10);

        // 提取链接
        const links = Array.from(tempDiv.querySelectorAll('a')).map(link => ({
          url: link.href,
          text: link.textContent.trim(),
          title: link.title || '',
          isExternal: !link.href.includes(window.location.hostname)
        })).filter(link => link.url && link.url !== '#' && link.text && link.text.length > 1);

        // 提取视频
        const videos = Array.from(tempDiv.querySelectorAll('video, iframe')).map(video => {
          function detectVideoPlatform(src) {
            if (src.includes('youtube.com') || src.includes('youtu.be')) return 'YouTube';
            if (src.includes('bilibili.com')) return 'Bilibili';
            if (src.includes('vimeo.com')) return 'Vimeo';
            if (src.includes('tiktok.com')) return 'TikTok';
            return 'Unknown';
          }

          return {
            src: video.src || video.dataset.src,
            type: video.tagName.toLowerCase(),
            title: video.title || '',
            platform: detectVideoPlatform(video.src || video.dataset.src || '')
          };
        }).filter(video => video.src);

        // 计算阅读时间（基于中文阅读速度）
        const readingTime = Math.ceil(article.length / 300);

        // 检测平台
        function detectPlatform() {
          const url = window.location.href;
          const hostname = window.location.hostname;

          if (url.includes('mp.weixin.qq.com')) return '微信公众号';
          if (hostname.includes('zhihu.com')) return '知乎';
          if (hostname.includes('okjike.com')) return '即刻';
          if (hostname.includes('juejin.cn')) return '掘金';
          if (hostname.includes('csdn.net')) return 'CSDN';
          if (hostname.includes('jianshu.com')) return '简书';
          if (hostname.includes('segmentfault.com')) return 'SegmentFault';

          return hostname;
        }

        // 生成摘要
        function generateExcerpt(textContent) {
          if (!textContent) return '';

          // 清理文本
          const cleanText = textContent.replace(/\s+/g, ' ').trim();

          // 按句子分割（中英文兼容）
          const sentences = cleanText.split(/[。！？.!?]/).filter(s => s.trim().length > 10);

          // 取前3句作为摘要
          const excerpt = sentences.slice(0, 3).join('。');

          // 限制长度
          return excerpt.length > 200 ? excerpt.substring(0, 200) + '...' : excerpt + '。';
        }

        // 提取站点名称
        function extractSiteName() {
          const siteName = document.querySelector('meta[property="og:site_name"]')?.content ||
                          document.querySelector('meta[name="application-name"]')?.content ||
                          document.title.split(' - ').pop() ||
                          window.location.hostname;
          return siteName;
        }

        const platform = detectPlatform();
        const excerpt = generateExcerpt(article.textContent);
        const siteName = extractSiteName();

        const enhancedData = {
          title: article.title || document.title,
          content: article.content,
          textContent: article.textContent,
          excerpt: excerpt,
          byline: article.byline,
          siteName: siteName,
          lang: article.lang || document.documentElement.lang || 'zh-CN',
          dir: article.dir || 'ltr',
          publishedTime: article.publishedTime,
          length: article.length,
          readingTime: readingTime,
          images: images,
          links: links,
          videos: videos,
          platform: platform,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          extractionMethod: 'mozilla-readability-enhanced'
        };

        console.log('内容增强完成:', enhancedData);
        return enhancedData;
      }

      // 主执行逻辑
      try {
        // 添加调试信息
        console.log('页面URL:', window.location.href);
        console.log('页面标题:', document.title);
        console.log('页面readyState:', document.readyState);

        // 1. 检查Readability库是否加载
        if (typeof window.isProbablyReaderable === 'undefined') {
          throw new Error('isProbablyReaderable函数未定义，Readability库可能未正确加载');
        }

        if (typeof window.Readability === 'undefined') {
          throw new Error('Readability类未定义，Readability库可能未正确加载');
        }

        console.log('✅ Readability库检查通过');

        // 2. 智能滚动加载内容
        console.log('开始智能滚动加载...');
        await performSmartScrollAndLoad();

        // 3. 预检查页面适合性
        console.log('开始页面可读性检查...');
        const isReaderable = isProbablyReaderable(document);
        console.log('页面可读性检查结果:', isReaderable);

        if (!isReaderable) {
          // 对于即刻等特殊页面，尝试降低要求
          console.log('⚠️ 标准可读性检查失败，尝试强制抓取...');
        }

        // 4. 使用Mozilla Readability提取
        console.log('开始使用Readability提取内容...');
        const documentClone = document.cloneNode(true);
        const reader = new Readability(documentClone, {
          charThreshold: 100,  // 降低字符阈值，适应即刻等短内容
          classesToPreserve: ['highlight', 'code', 'emoji', 'math', 'formula'],
          keepClasses: true,
          debug: true,  // 启用调试模式
          maxElemsToParse: 0,
          nbTopCandidates: 5,
          linkDensityModifier: 0
        });

        const article = reader.parse();
        console.log('Readability解析结果:', article);

        if (!article) {
          throw new Error('Readability解析失败，返回null');
        }

        if (!article.content || article.content.trim().length === 0) {
          throw new Error('解析的文章内容为空');
        }

        console.log('✅ 文章解析成功，内容长度:', article.content.length);

        // 5. 增强处理
        console.log('开始内容增强处理...');
        const enhancedData = performContentEnhancement(article);
        console.log('✅ 内容增强完成');

        return enhancedData;

      } catch (error) {
        console.error('❌ 页面内容抓取失败:', error);
        console.error('错误堆栈:', error.stack);
        return { error: error.message };
      }
    };
  }








  /**
   * 记录抓取历史
   */
  recordExtraction(url, result) {
    const record = {
      url: url,
      title: result.title,
      platform: result.platform,
      timestamp: result.timestamp,
      success: true,
      length: result.length
    };
    
    this.extractionHistory.unshift(record);
    
    // 只保留最近50条记录
    if (this.extractionHistory.length > 50) {
      this.extractionHistory = this.extractionHistory.slice(0, 50);
    }
  }







  /**
   * 获取抓取历史
   */
  getExtractionHistory() {
    return this.extractionHistory;
  }
}



// 导出服务类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArticleExtractorService;
} else if (typeof window !== 'undefined') {
  window.ArticleExtractorService = ArticleExtractorService;
} else if (typeof self !== 'undefined') {
  // Service Worker环境
  self.ArticleExtractorService = ArticleExtractorService;
}
