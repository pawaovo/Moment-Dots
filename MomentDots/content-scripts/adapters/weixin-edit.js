/**
 * 微信公众号编辑页Content Script
 * 负责在编辑页面注入内容
 */

// 日志配置 - 使用条件声明避免重复声明
if (typeof window.WEIXIN_DEBUG_MODE === 'undefined') {
  window.WEIXIN_DEBUG_MODE = false; // 生产环境设为false
}

function debugLogEdit(...args) {
  if (window.WEIXIN_DEBUG_MODE) {
    console.log('[WeChat-Edit]', ...args);
  }
}

// 重要操作日志（始终显示）
function infoLog(...args) {
  console.log(...args);
}

infoLog('🚀 微信公众号编辑页Content Script已加载');
debugLogEdit('当前页面URL:', window.location.href);
debugLogEdit('页面标题:', document.title);

// 优化的DOM元素缓存
const DOMCache = {
  cache: new Map(),
  cacheTimeout: 5000, // 5秒缓存超时

  // 通用缓存获取方法
  get(key, queryFn) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.elements;
    }

    const elements = queryFn();
    this.cache.set(key, {
      elements,
      timestamp: Date.now()
    });
    return elements;
  },

  // 清除缓存
  clear() {
    this.cache.clear();
  },

  // 获取标题输入框
  getTitleInput() {
    return this.get('titleInput', () => {
      const selectors = [
        'textarea#title',
        'textarea[placeholder*="请在这里输入标题"]',
        '.frm_input.js_title.js_counter.js_field.js_article_title',
        'textbox[name="title"]'
      ];

      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (element) return element;
        } catch (e) {
          // 忽略选择器错误
        }
      }
      return null;
    });
  },

  // 获取ProseMirror编辑器
  getProseMirrorEditors() {
    return this.get('proseMirrorEditors', () =>
      document.querySelectorAll('.ProseMirror')
    );
  },

  // 获取文件输入控件
  getFileInputs() {
    return this.get('fileInputs', () =>
      document.querySelectorAll('input[type="file"]')
    );
  },

  // 获取概要输入框（摘要输入框）
  getSummaryInput() {
    return this.get('summaryInput', () => {
      const selectors = [
        'textarea#js_description',
        'textarea[name="digest"]',
        'textarea[placeholder*="摘要"]',
        'textarea[placeholder*="选填，不填写则默认抓取正文开头部分文字"]',
        'textarea.js_desc',
        'textarea[max-length="120"]'
      ];

      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (element) return element;
        } catch (e) {
          // 忽略选择器错误
        }
      }
      return null;
    });
  }
};

// 监听来自Background Script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 编辑页收到消息:', message);
  console.log('消息发送者:', sender);

  if (message.action === 'injectContent') {
    // 使用立即调用的异步函数来处理异步操作
    (async () => {
      try {
        const { title, content, files } = message.data;

        console.log('🎯 开始注入内容:', {
          hasTitle: !!title,
          title: title,
          hasContent: !!content,
          contentLength: content?.length || 0,
          hasFiles: !!(files && files.length > 0),
          hasFileIds: !!(message.data.fileIds && message.data.fileIds.length > 0)
        });

        // 智能等待页面加载（使用缓存检查关键元素）
        const hasTitleInput = DOMCache.getTitleInput() !== null;
        const hasEditableArea = DOMCache.getProseMirrorEditors().length > 0;
        const needsWaiting = !hasTitleInput || !hasEditableArea;

        debugLogEdit('🔍 页面元素检查:', {
          hasTitleInput,
          hasEditableArea,
          needsWaiting
        });

        if (needsWaiting) {
          console.log('🔄 关键元素未就绪，等待页面加载...');
          await waitForPageAndEditorLoad();
        } else {
          console.log('✅ 页面关键元素已就绪，跳过等待');
        }

        // 🎯 获取预处理后的标题和概要数据
        const currentPlatform = message.data.platforms?.find(p => p.id === 'weixin');
        const titleToInject = currentPlatform?.processedTitle || title;
        const summaryToInject = currentPlatform?.processedSummary || message.data.summary;

        console.log('📝 微信公众号内容注入开始', {
          contentType: message.data.contentType,
          originalTitle: title?.length || 0,
          processedTitle: titleToInject?.length || 0,
          titleLimit: currentPlatform?.limits?.title,
          titleTruncated: title && titleToInject && title.length > titleToInject.length
        });

        // 记录注入结果
        const injectionResults = {
          title: false,
          summary: false,
          content: false,
          files: false,
          warnings: []
        };

        // 注入标题（必需步骤）
        if (titleToInject) {
          try {
            await injectTitle(titleToInject);
            injectionResults.title = true;
            infoLog('✅ 标题注入成功');
          } catch (error) {
            console.error('❌ 标题注入失败:', error);
            injectionResults.warnings.push(`标题注入失败: ${error.message}`);
          }
        }

        // 注入概要（可选步骤）
        if (summaryToInject) {
          try {
            await injectSummary(summaryToInject);
            injectionResults.summary = true;
            infoLog('✅ 概要注入成功');
          } catch (error) {
            console.warn('⚠️ 概要注入失败，但不影响整体流程:', error);
            injectionResults.warnings.push(`概要注入失败: ${error.message}`);
          }
        }

        // 注入内容到ProseMirror编辑器（必需步骤）
        if (content) {
          try {
            await injectContentToProseMirror(content);
            injectionResults.content = true;
            infoLog('✅ 内容注入成功');
          } catch (error) {
            console.error('❌ 内容注入失败:', error);
            injectionResults.warnings.push(`内容注入失败: ${error.message}`);
          }
        }

        // 处理图片上传（可选步骤，失败不影响整体流程）
        if (message.data.fileIds && message.data.fileIds.length > 0) {
          try {
            await handleImageUpload(message.data.fileIds);
            injectionResults.files = true;
            infoLog('✅ 文件上传成功');
          } catch (error) {
            console.warn('⚠️ 文件上传失败，但不影响内容注入:', error);
            injectionResults.warnings.push(`文件上传失败: ${error.message}`);
          }
        }
        // 兼容旧版本的files参数（已移除uploadFiles函数）
        else if (files && files.length > 0) {
          console.warn('⚠️ 检测到旧版本files参数，但uploadFiles函数已被移除，请使用fileIds');
          injectionResults.warnings.push('检测到旧版本files参数，请使用fileIds');
        }

        // 判断整体成功状态（只要标题或内容任一成功即可，概要为可选）
        const isOverallSuccess = injectionResults.title || injectionResults.content;

        if (isOverallSuccess) {
          infoLog('✅ 内容注入完成（部分或全部成功）', injectionResults);
          const successResponse = {
            success: true,
            message: '内容注入成功',
            details: injectionResults
          };
          console.log('准备发送成功响应:', successResponse);
          sendResponse(successResponse);
        } else {
          throw new Error('标题和内容注入均失败');
        }
      } catch (error) {
        console.error('❌ 内容注入失败:', error);
        const errorResponse = { success: false, error: error.message };
        console.log('准备发送错误响应:', errorResponse);
        sendResponse(errorResponse);
      }
    })();

    return true; // 保持消息通道开放，等待异步操作完成
  }
});

/**
 * 通用文本输入框注入函数（优化版本，消除重复代码）
 */
async function injectToTextInput(element, value, fieldName) {
  if (!element) {
    const error = `未找到${fieldName}输入框`;
    console.warn(`⚠️ ${error}`);
    throw new Error(error);
  }

  console.log(`开始注入${fieldName}:`, value.substring(0, 50));

  // 聚焦输入框
  element.focus();

  // 清空现有内容
  element.value = '';

  // 注入内容
  element.value = value;

  // 触发相关事件
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));

  console.log(`✅ ${fieldName}注入成功`);
}

/**
 * 注入标题
 */
async function injectTitle(title) {
  const titleInput = DOMCache.getTitleInput();
  await injectToTextInput(titleInput, title, '标题');
}

/**
 * 注入概要（摘要）
 */
async function injectSummary(summary) {
  const summaryInput = DOMCache.getSummaryInput();
  await injectToTextInput(summaryInput, summary, '概要');
}

/**
 * 查找正文编辑器（避免描述区域编辑器）
 */
function findContentEditor(proseMirrorEditors) {
  // 策略1：查找不包含"填写描述信息"的编辑器（正文编辑器）
  for (const editor of proseMirrorEditors) {
    const editorText = editor.textContent || '';
    const isDescriptionEditor = editorText.includes('填写描述信息') ||
                               editorText.includes('让大家了解更多内容') ||
                               editor.parentElement?.classList.contains('share-text__input');

    if (!isDescriptionEditor) {
      console.log('找到正文编辑器（策略1）');
      return editor;
    }
  }

  // 策略2：如果没找到，使用最后一个编辑器（通常是正文编辑器）
  if (proseMirrorEditors.length > 1) {
    console.log('使用最后一个编辑器作为正文编辑器（策略2）');
    return proseMirrorEditors[proseMirrorEditors.length - 1];
  }

  // 策略3：如果只有一个编辑器，检查是否是正文编辑器
  if (proseMirrorEditors.length === 1) {
    const editor = proseMirrorEditors[0];
    const editorText = editor.textContent || '';
    if (!editorText.includes('填写描述信息')) {
      console.log('使用唯一的编辑器作为正文编辑器（策略3）');
      return editor;
    }
  }

  return null;
}

/**
 * 处理内容格式，避免多余空行
 */
function processContentForWeixin(content) {
  let processedContent = content.trim(); // 移除开头和结尾的空白

  // 如果内容包含HTML标签，清理空段落
  if (processedContent.includes('<p>') || processedContent.includes('<div>')) {
    // 清理可能的多余空行
    processedContent = processedContent.replace(/^\s*<p>\s*<\/p>\s*/g, ''); // 移除开头的空段落
    processedContent = processedContent.replace(/\s*<p>\s*<\/p>\s*$/g, ''); // 移除结尾的空段落
    return processedContent;
  }

  // 纯文本内容，转换为HTML格式
  const lines = processedContent.split('\n')
    .map(line => line.trim())
    .filter(line => line !== ''); // 过滤空行

  return lines.length > 0
    ? lines.map(line => `<p>${line}</p>`).join('')
    : `<p>${processedContent}</p>`;
}

/**
 * 注入内容到ProseMirror编辑器（优化版本，使用缓存）
 */
async function injectContentToProseMirror(content) {
  console.log('开始注入内容到ProseMirror编辑器...');

  try {
    // 使用缓存获取ProseMirror编辑器
    const proseMirrorEditors = DOMCache.getProseMirrorEditors();
    console.log('找到ProseMirror编辑器数量:', proseMirrorEditors.length);

    if (proseMirrorEditors.length === 0) {
      throw new Error('未找到ProseMirror编辑器');
    }

    // 查找正文编辑器
    const targetEditor = findContentEditor(proseMirrorEditors);
    if (!targetEditor) {
      throw new Error('未找到合适的正文编辑器');
    }

    console.log('目标编辑器类名:', targetEditor.className);

    // 激活编辑器
    targetEditor.click();
    targetEditor.focus();

    // 等待编辑器激活
    await new Promise(resolve => setTimeout(resolve, WEIXIN_CONFIG.timeouts.editorActivation));

    // 清空现有内容（包括placeholder）
    targetEditor.innerHTML = '';

    // 处理内容格式，避免多余空行
    const processedContent = processContentForWeixin(content);
    console.log('准备注入的HTML内容:', processedContent.substring(0, 100));

    // 注入内容
    targetEditor.innerHTML = processedContent;

    // 触发相关事件让微信编辑器识别内容变化
    const events = ['input', 'change', 'keyup', 'DOMNodeInserted'];
    events.forEach(eventType => {
      targetEditor.dispatchEvent(new Event(eventType, { bubbles: true }));
    });

    // 验证注入结果
    const finalContent = targetEditor.textContent;
    console.log('注入后的内容:', finalContent.substring(0, 100));

    if (finalContent.trim().length === 0) {
      throw new Error('内容注入后为空');
    }

    console.log('✅ 内容注入成功到正文编辑器');
    return true;

  } catch (error) {
    console.error('❌ 内容注入失败:', error);
    throw error;
  }
}

/**
 * 等待页面和编辑器加载完成（优化版本，基于实际测试调整）
 */
function waitForPageAndEditorLoad() {
  return new Promise((resolve) => {
    let checkCount = 0;
    const maxChecks = WEIXIN_CONFIG.retries.maxPageChecks;

    const checkPageAndEditor = () => {
      checkCount++;

      // 检查页面基本加载状态
      const isPageReady = document.readyState === 'complete' || document.readyState === 'interactive';

      // 检查关键元素是否存在（更灵活的检测，文件输入控件为可选）
      const hasFileInputs = document.querySelectorAll('input[type="file"]').length >= 2;
      const hasTitleInput = document.querySelector('[placeholder*="标题"], textarea[placeholder*="标题"]') !== null;
      const hasDescriptionArea = document.querySelector('[class*="ProseMirror"], [contenteditable="true"]') !== null;

      // 检查微信编辑器的核心元素
      const hasWeixinEditor = document.querySelector('.js_editor') !== null ||
                             document.querySelector('.rich_media_content') !== null ||
                             document.querySelector('.weui-desktop-form') !== null;

      // 页面就绪条件：只要有标题输入、描述区域或微信编辑器任一即可（文件输入控件为可选）
      const isReady = isPageReady && (hasTitleInput || hasDescriptionArea || hasWeixinEditor);

      debugLogEdit(`📊 页面加载检查 ${checkCount}/${maxChecks}:`, {
        isPageReady,
        hasFileInputs: hasFileInputs ? '✅ 可用' : '⚠️ 不可用（可选）',
        hasTitleInput: hasTitleInput ? '✅ 可用' : '❌ 不可用',
        hasDescriptionArea: hasDescriptionArea ? '✅ 可用' : '❌ 不可用',
        hasWeixinEditor: hasWeixinEditor ? '✅ 可用' : '❌ 不可用',
        isReady
      });

      if (isReady) {
        console.log('✅ 页面和编辑器加载完成');
        resolve();
      } else if (checkCount >= maxChecks) {
        console.log('⏰ 页面加载检查达到最大次数，继续执行');
        resolve();
      } else {
        setTimeout(checkPageAndEditor, 100);
      }
    };

    // 立即检查一次
    checkPageAndEditor();

    // 备用超时机制
    setTimeout(() => {
      console.log('⏰ 页面加载等待超时，但这是正常的，继续执行');
      resolve();
    }, WEIXIN_CONFIG.timeouts.pageLoadWait);
  });
}

/**
 * 微信公众号平台配置
 */
const WEIXIN_CONFIG = {
  limits: {
    maxMediaFiles: 20,  // 微信公众号最多20张图片
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
  },
  timeouts: {
    pageLoadWait: 15000,      // 页面加载等待时间
    editorActivation: 300,    // 编辑器激活等待时间
    fileProcessing: 200,      // 文件处理等待时间
    eventTrigger: 100         // 事件触发间隔
  },
  retries: {
    maxPageChecks: 50,        // 页面检查最大次数
    fileUpload: 3             // 文件上传重试次数
  }
};

/**
 * 检查当前页面是否支持文件上传功能
 * @returns {boolean} - 支持返回true，不支持返回false
 */
function isFileUploadSupported() {
  // 检查是否有任何文件输入控件
  const fileInputs = document.querySelectorAll('input[type="file"]');

  // 检查是否有明显的上传相关元素
  const uploadElements = document.querySelectorAll('[class*="upload"], [class*="file"], [id*="upload"], [id*="file"]');

  // 检查页面URL是否包含文章编辑相关路径（可能不支持文件上传）
  const isArticleEditPage = window.location.href.includes('appmsg_edit') ||
                           window.location.href.includes('article') ||
                           document.title.includes('文章');

  debugLogEdit('🔍 文件上传支持检查:', {
    fileInputCount: fileInputs.length,
    uploadElementCount: uploadElements.length,
    isArticleEditPage: isArticleEditPage,
    currentUrl: window.location.href
  });

  // 如果是文章编辑页面且文件输入控件很少，可能不支持文件上传
  if (isArticleEditPage && fileInputs.length < 2) {
    console.log('💡 检测到文章编辑页面且文件输入控件不足，可能不支持文件上传');
    return false;
  }

  // 基本检查：至少要有一些文件相关元素
  return fileInputs.length > 0 || uploadElements.length > 0;
}

/**
 * 处理图片上传（统一处理逻辑，与其他平台保持一致）
 * 支持优雅降级：如果页面不支持文件上传，将跳过此步骤而不报错
 * @param {Array} fileIds - 文件ID数组
 * @returns {boolean} - 成功返回true，跳过返回false，失败抛出异常
 */
async function handleImageUpload(fileIds) {
  console.log('🖼️ 开始微信公众号图片上传流程...', {
    fileIds: fileIds,
    fileCount: fileIds.length,
    maxAllowed: WEIXIN_CONFIG.limits.maxMediaFiles
  });

  // 预检查：如果页面明显不支持文件上传，提前跳过
  if (!isFileUploadSupported()) {
    console.log('📝 检测到当前页面不支持文件上传功能，跳过文件上传步骤');
    return false;
  }

  try {
    // 获取文件数据
    const allFiles = [];
    for (const fileId of fileIds) {
      console.log(`📁 请求文件: ${fileId}`);

      const response = await chrome.runtime.sendMessage({
        action: 'getFile',
        fileId: fileId
      });

      if (response.success && response.arrayData) {
        const uint8Array = new Uint8Array(response.arrayData);
        const blob = new Blob([uint8Array], { type: response.metadata.type });
        const file = new File([blob], response.metadata.name, {
          type: response.metadata.type,
          lastModified: response.metadata.lastModified
        });

        allFiles.push(file);
        console.log(`✅ 成功获取文件: ${file.name} (${file.size} bytes, ${file.type})`);
      } else {
        console.warn(`⚠️ 警告: 文件ID ${fileId} 对应的文件未找到: ${response.error || 'Unknown error'}`);
      }
    }

    if (allFiles.length === 0) {
      console.log('📁 没有文件需要上传');
      return;
    }

    // 验证文件并应用数量限制（与其他平台保持一致的处理逻辑）
    const filesToUpload = validateAndLimitFiles(allFiles);

    if (filesToUpload.length === 0) {
      console.log('📁 没有通过验证的文件可以上传');
      return true; // 返回成功，避免整个流程失败
    }

    console.log(`📤 准备上传 ${filesToUpload.length} 个图片文件到微信公众号`);

    // 智能等待页面加载（只在必要时等待，使用缓存）
    let fileInputs = DOMCache.getFileInputs();
    if (fileInputs.length < 2) {
      console.log('🔄 文件输入控件不足，等待页面完全加载...');
      await waitForPageAndEditorLoad();
      // 清除缓存并重新查找文件输入控件
      DOMCache.clear();
      fileInputs = DOMCache.getFileInputs();
    } else {
      console.log('✅ 页面已准备就绪，跳过等待');
    }

    // 查找第二个文件输入控件（基于Playwright MCP测试发现）
    debugLogEdit(`🔍 找到 ${fileInputs.length} 个文件输入控件`);

    // 详细记录每个文件输入控件的信息
    fileInputs.forEach((input, index) => {
      console.log(`📋 文件输入控件 ${index}:`, {
        accept: input.accept,
        multiple: input.multiple,
        name: input.name,
        style: input.style.cssText,
        visible: input.offsetParent !== null
      });
    });

    if (fileInputs.length < 2) {
      console.warn(`⚠️ 文件输入控件不足，当前只有 ${fileInputs.length} 个，需要至少2个。跳过文件上传步骤。`);
      console.log('💡 提示：微信公众号文章页面可能不支持文件上传功能，这是正常现象');
      return false; // 返回false表示跳过，但不是错误
    }

    // 使用第二个文件输入控件（测试证明这个有效）
    const fileInput = fileInputs[1];
    console.log('📤 选择第二个文件输入控件进行上传', {
      accept: fileInput.accept,
      multiple: fileInput.multiple,
      name: fileInput.name || '(无名称)',
      className: fileInput.className || '(无类名)'
    });

    // 验证文件输入控件是否支持我们的文件类型
    const supportedTypes = fileInput.accept.toLowerCase();
    const hasImageSupport = supportedTypes.includes('image/') ||
                           supportedTypes.includes('image/png') ||
                           supportedTypes.includes('image/jpeg');

    if (!hasImageSupport) {
      console.warn('⚠️ 警告：选择的文件输入控件可能不支持图片类型');
    }

    // 注入文件到输入控件
    try {
      await injectFilesToInput(fileInput, filesToUpload);
      console.log('✅ 微信公众号图片上传流程完成');
      return true;
    } catch (injectionError) {
      console.error('❌ 文件注入到输入控件失败:', injectionError);
      throw new Error(`文件注入失败: ${injectionError.message}`);
    }

  } catch (error) {
    // 区分不同类型的错误
    if (error.message.includes('跳过文件上传')) {
      // 这是预期的跳过情况，不应该作为错误处理
      console.log('📝 文件上传已跳过，继续其他步骤');
      return false;
    } else {
      console.error('❌ 图片上传过程中发生错误:', error);
      throw error;
    }
  }
}

/**
 * 验证文件并应用数量限制（与其他平台保持一致的处理逻辑）
 * @param {Array} files - 文件数组
 * @returns {Array} 验证通过且符合数量限制的文件数组
 */
function validateAndLimitFiles(files) {
  const limits = WEIXIN_CONFIG.limits;
  const validFiles = [];
  let imageCount = 0;

  debugLogEdit(`📊 开始文件验证，总文件数: ${files.length}，平台限制: ${limits.maxMediaFiles} 张图片`);

  for (const file of files) {
    // 检查文件类型
    const isValidImage = limits.allowedImageTypes.includes(file.type);

    if (!isValidImage) {
      console.log(`❌ 文件 ${file.name} 格式不支持 (${file.type})，跳过`);
      continue;
    }

    // 检查图片数量限制，采用截断处理（与其他平台一致）
    if (validFiles.length >= limits.maxMediaFiles) {
      console.log(`⚠️ 图片数量已达到限制 (${limits.maxMediaFiles})，截断文件: ${file.name}`);
      continue;
    }

    validFiles.push(file);
    imageCount++;

    console.log(`✅ 文件验证通过: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, ${file.type})`);
  }

  const truncatedCount = files.length - validFiles.length;

  console.log(`📋 文件验证完成: ${imageCount} 张图片, 共 ${validFiles.length} 个有效文件`);

  if (truncatedCount > 0) {
    console.log(`⚠️ 截断了 ${truncatedCount} 个文件（超出平台限制 ${limits.maxMediaFiles} 张图片或格式不支持）`);
  }

  // 移除图片大小限制检查，与其他平台保持一致
  console.log('ℹ️ 微信公众号平台不限制单个图片文件大小');

  return validFiles;
}

/**
 * 将文件注入到输入控件（优化版本，避免用户激活权限问题）
 * @param {HTMLElement} fileInput - 文件输入控件
 * @param {Array} files - 文件数组
 */
async function injectFilesToInput(fileInput, files) {
  try {
    console.log('📤 开始注入文件到输入控件', {
      count: files.length,
      inputAccept: fileInput.accept,
      inputMultiple: fileInput.multiple
    });

    // 验证文件类型
    const validFiles = files.filter(file => {
      const isValidType = fileInput.accept.includes(file.type) ||
                         fileInput.accept.includes(file.type.split('/')[0] + '/*');
      if (!isValidType) {
        console.warn(`⚠️ 文件类型不匹配: ${file.type}, 期望: ${fileInput.accept}`);
      }
      return isValidType;
    });

    if (validFiles.length === 0) {
      throw new Error('没有符合要求的文件类型');
    }

    console.log(`📁 验证通过的文件数量: ${validFiles.length}/${files.length}`);

    // 使用DataTransfer API（测试验证有效且安全）
    const dataTransfer = new DataTransfer();
    validFiles.forEach(file => {
      dataTransfer.items.add(file);
      console.log(`➕ 添加文件: ${file.name} (${file.size} bytes, ${file.type})`);
    });

    // 设置文件到输入控件
    fileInput.files = dataTransfer.files;
    console.log(`📋 文件已设置到输入控件，files.length: ${fileInput.files.length}`);

    // 触发必要的事件（移除可能触发文件选择器的事件）
    const events = ['input', 'change'];

    // 使用 Promise 来确保事件按顺序触发
    for (let i = 0; i < events.length; i++) {
      const eventType = events[i];
      await new Promise(resolve => {
        setTimeout(() => {
          const event = new Event(eventType, {
            bubbles: true,
            cancelable: true
          });
          fileInput.dispatchEvent(event);
          console.log(`🎯 触发事件: ${eventType}`);
          resolve();
        }, i * WEIXIN_CONFIG.timeouts.eventTrigger);
      });
    }

    // 等待一下让微信处理文件
    await new Promise(resolve => setTimeout(resolve, WEIXIN_CONFIG.timeouts.fileProcessing));

    console.log('✅ 文件注入完成，等待微信处理...');
    return true;

  } catch (error) {
    console.error('❌ 文件注入失败:', error);
    throw new Error('文件注入失败: ' + error.message);
  }
}

// 移除未使用的uploadFiles函数，已被handleImageUpload替代

infoLog('✅ 微信公众号编辑页Content Script初始化完成');

// 向Background Script发送脚本加载完成的确认消息
try {
  chrome.runtime.sendMessage({
    action: 'weixinEditScriptLoaded',
    url: window.location.href,
    timestamp: Date.now()
  });
  console.log('📤 已发送脚本加载确认消息');
} catch (error) {
  console.error('❌ 发送确认消息失败:', error);
}
