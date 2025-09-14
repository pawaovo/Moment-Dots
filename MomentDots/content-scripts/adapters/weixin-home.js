/**
 * 微信公众号首页Content Script
 * 负责根据平台类型点击"图文"或"文章"按钮，触发新标签页打开
 *
 * 支持功能：
 * - 动态模式：点击"图文"按钮 (weixin平台)
 * - 文章模式：点击"文章"按钮 (weixin-article平台)
 */

// 日志配置
const DEBUG_MODE = false; // 生产环境设为false

function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

debugLog('微信公众号首页Content Script已加载');

// 监听来自Background Script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('首页收到消息:', message);

  if (message.action === 'clickImageTextButton') {
    // 兼容原有的图文按钮点击（动态模式）
    clickImageTextButton()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }

  if (message.action === 'clickArticleButton') {
    // 新增的文章按钮点击（文章模式）
    clickArticleButton()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }

  if (message.action === 'clickWeixinButton') {
    // 统一的按钮点击处理（根据平台类型自动选择）
    const platformType = message.platformType || 'weixin'; // 默认为动态模式
    clickWeixinButton(platformType)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }
});

/**
 * 统一的微信按钮点击处理（根据平台类型自动选择）
 * @param {string} platformType - 平台类型 ('weixin' 或 'weixin-article')
 */
async function clickWeixinButton(platformType) {
  if (platformType === 'weixin-article') {
    return await clickArticleButton();
  } else {
    return await clickImageTextButton();
  }
}

/**
 * 点击"图文"按钮（动态模式）
 */
async function clickImageTextButton() {
  return await clickButtonByText('图文', '图文按钮');
}

/**
 * 点击"文章"按钮（文章模式）
 */
async function clickArticleButton() {
  return await clickButtonByText('文章', '文章按钮');
}

// 按钮查找配置
const BUTTON_SEARCH_CONFIG = {
  '图文': {
    specificSelectors: [
      'div:nth-child(4) > .new-creation__menu-content',
      'div[data-testid="image-text-button"]',
      '.new-creation__menu-content',
      '[class*="new-creation"][class*="menu-content"]',
      'div[class*="menu-content"]'
    ]
  },
  '文章': {
    specificSelectors: [
      // 文章按钮的特定选择器可以在这里添加
    ]
  }
};

// 通用容器选择器（用于文本内容查找）
const CONTAINER_SELECTORS = [
  'div[class*="menu"]',
  'div[class*="button"]',
  'div[class*="creation"]',
  'button',
  'a',
  '[role="button"]'
];

/**
 * 通用的按钮点击方法（优化版）
 * @param {string} buttonText - 按钮文本内容
 * @param {string} buttonName - 按钮名称（用于日志）
 */
async function clickButtonByText(buttonText, buttonName) {
  try {
    debugLog(`开始查找并点击${buttonName}...`);

    // 等待页面完全加载
    await waitForPageLoad();

    // 统一的按钮查找逻辑
    const targetButton = await findButtonElement(buttonText, buttonName);

    // 执行按钮点击
    return await performButtonClick(targetButton, buttonName, buttonText);
  } catch (error) {
    console.error(`点击${buttonName}失败:`, error);
    throw error;
  }
}

/**
 * 查找按钮元素的统一逻辑
 * @param {string} buttonText - 按钮文本
 * @param {string} buttonName - 按钮名称（用于日志）
 * @returns {Element|null} - 找到的按钮元素或null
 */
async function findButtonElement(buttonText, buttonName) {
  // 方法1：使用特定选择器查找
  const config = BUTTON_SEARCH_CONFIG[buttonText];
  if (config && config.specificSelectors) {
    for (const selector of config.specificSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          debugLog(`找到${buttonName}，使用选择器:`, selector);
          return element;
        }
      } catch (e) {
        // 忽略选择器错误，继续尝试下一个
      }
    }
  }

  // 方法2：使用文本内容查找
  debugLog(`选择器方法失败，尝试文本内容查找${buttonName}...`);
  for (const containerSelector of CONTAINER_SELECTORS) {
    const containers = document.querySelectorAll(containerSelector);
    for (const element of containers) {
      if (element.textContent && element.textContent.trim() === buttonText &&
          element.offsetParent !== null && element.click) {
        debugLog(`通过文本内容查找找到${buttonName}`);
        return element;
      }
    }
  }

  return null;
}

/**
 * 执行按钮点击操作
 * @param {Element} button - 按钮元素
 * @param {string} buttonName - 按钮名称
 * @param {string} buttonText - 按钮文本
 * @returns {Object} - 点击结果
 */
async function performButtonClick(button, buttonName, buttonText) {
  debugLog(`准备点击${buttonName}...`);

  // 滚动到按钮位置确保可见
  button.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // 等待滚动完成
  await new Promise(resolve => setTimeout(resolve, 500));

  // 点击按钮
  button.click();

  debugLog(`${buttonName}点击完成`);

  // 等待一下确保点击生效
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    message: `${buttonName}点击成功`,
    buttonFound: true,
    buttonType: buttonText
  };
}

/**
 * 等待页面加载完成
 */
function waitForPageLoad() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
      // 备用超时机制
      setTimeout(resolve, 5000);
    }
  });
}

debugLog('微信公众号首页Content Script初始化完成');
