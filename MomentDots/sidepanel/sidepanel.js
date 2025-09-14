// 侧边栏状态监控脚本
console.log('Sidepanel script loaded');

// 应用状态
let sidepanelState = {
  publishResults: [],
  isPublishing: false,
  lastUpdate: null,
  currentView: 'status' // 'status' 或 'prompt'
};

// DOM 元素引用
let elements = {};

// Logo缓存管理器实例
let logoCacheManager = null;

// 初始化侧边栏
async function initializeSidepanel() {
  console.log('初始化侧边栏...');

  try {
    // 获取DOM元素
    elements.root = document.getElementById('sidepanel-root');
    elements.statusView = document.getElementById('statusView');
    elements.promptView = document.getElementById('promptView');
    elements.statusViewBtn = document.getElementById('statusViewBtn');
    elements.promptViewBtn = document.getElementById('promptViewBtn');

    // 设置视图切换事件
    setupViewSwitching();

    // 初始化Logo缓存管理器
    if (typeof LogoCacheManager !== 'undefined') {
      logoCacheManager = new LogoCacheManager({ enableLogging: false });
      await logoCacheManager.initializeCache(SUPPORTED_PLATFORMS);
      console.log('Logo缓存管理器初始化完成');
    }

    // 加载保存的状态
    await loadSavedState();

    // 渲染初始界面
    renderSidepanel();

    // 设置消息监听
    setupMessageListeners();

    // 设置定时更新
    setupPeriodicUpdate();

    console.log('侧边栏初始化完成');
  } catch (error) {
    console.error('侧边栏初始化失败:', error);
    showError('初始化失败，请刷新页面重试');
  }
}

// 设置视图切换功能
function setupViewSwitching() {
  console.log('设置视图切换功能...');

  // 状态视图按钮
  elements.statusViewBtn?.addEventListener('click', () => {
    switchToView('status');
  });

  // 提示词视图按钮
  elements.promptViewBtn?.addEventListener('click', () => {
    switchToView('prompt');
  });
}

// 切换视图
function switchToView(viewType) {
  console.log(`切换到视图: ${viewType}`);

  sidepanelState.currentView = viewType;

  if (viewType === 'status') {
    // 显示状态视图
    elements.statusView.style.display = 'flex';
    elements.promptView.style.display = 'none';

    // 更新按钮样式
    elements.statusViewBtn.className = 'flex-1 px-3 py-2 text-sm font-medium rounded-md bg-blue-100 text-blue-700';
    elements.promptViewBtn.className = 'flex-1 px-3 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 ml-2';
  } else if (viewType === 'prompt') {
    // 显示提示词视图
    elements.statusView.style.display = 'none';
    elements.promptView.style.display = 'flex';

    // 更新按钮样式
    elements.statusViewBtn.className = 'flex-1 px-3 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700';
    elements.promptViewBtn.className = 'flex-1 px-3 py-2 text-sm font-medium rounded-md bg-blue-100 text-blue-700 ml-2';
  }
}

// 加载保存的状态
async function loadSavedState() {
  try {
    const status = await loadPublishStatus();
    sidepanelState.publishResults = status.publishResults || [];
    sidepanelState.isPublishing = status.isPublishing || false;
    sidepanelState.lastUpdate = new Date();
    
    console.log('加载状态:', sidepanelState);
  } catch (error) {
    console.error('加载状态失败:', error);
  }
}

// 渲染侧边栏界面
function renderSidepanel() {
  if (!elements.statusView) return;

  const hasResults = sidepanelState.publishResults.length > 0;

  if (!hasResults && !sidepanelState.isPublishing) {
    renderEmptyState();
  } else {
    renderPublishStatus();
  }

  // 设置事件监听器（只在首次调用时绑定）
  setupEventListeners();
}

// 渲染空状态
function renderEmptyState() {
  elements.statusView.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full p-6 text-center">
      <div class="w-16 h-16 mb-4 bg-gray-200 rounded-full flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">等待发布任务</h3>
      <p class="text-sm text-gray-500">点击扩展图标开始创建内容</p>
    </div>
  `;
}

// 渲染发布状态
function renderPublishStatus() {
  const statusHtml = sidepanelState.publishResults.map(result => createStatusItem(result)).join('');
  const stats = calculatePublishStats();

  elements.statusView.innerHTML = `
    <div class="flex flex-col h-full">
      <!-- 头部 -->
      <div class="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">发布状态</h2>
          <div class="flex items-center space-x-2">
            <!-- 成功发布统计 -->
            <div class="flex items-center text-gray-700">
              <span class="text-lg font-medium">${stats.successful}/${stats.total}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 状态列表 -->
      <div class="flex-1 overflow-y-auto status-list">
        ${statusHtml || '<div class="p-4 text-center text-gray-500">暂无发布记录</div>'}
      </div>
      
      <!-- 底部操作 -->
      ${renderBottomActions()}
    </div>
  `;
}

// 创建状态项
function createStatusItem(result) {
  // 处理platform可能是字符串或对象的情况
  const platformId = typeof result.platform === 'string' ? result.platform : result.platform?.id;
  const platform = getPlatformById(platformId) || { id: platformId, name: platformId, logoUrl: '' };
  const statusConfig = getStatusConfig(result.status);
  const platformIcon = generatePlatformIcon(platform);

  return `
    <div class="px-4 py-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div class="flex items-center justify-between">
        <!-- 左侧：平台图标 + 名称 -->
        <div class="flex items-center space-x-3 flex-1">
          <div class="flex-shrink-0">
            ${platformIcon}
          </div>
          <div class="font-medium text-gray-900 truncate">
            ${platform.name}
          </div>
        </div>

        <!-- 中间：发布状态 -->
        <div class="flex items-center ${statusConfig.textColor} mx-3">
          ${statusConfig.icon}
          <span class="text-sm ml-1">${statusConfig.text}</span>
        </div>

        <!-- 右侧：重试按钮 -->
        <div class="flex-shrink-0">
          ${shouldShowRetryButton(result.status) ? `
            <button data-platform-id="${platform.id}" data-action="retry"
                    class="retry-button w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="重试发布">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// 判断是否显示重试按钮
function shouldShowRetryButton(status) {
  return status === 'failed' || status === 'ready';
}

// 生成平台图标HTML
function generatePlatformIcon(platform) {
  if (platform.logoUrl) {
    return `<img src="${platform.logoUrl}" alt="${platform.name}" class="w-6 h-6 rounded platform-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
     <div class="w-6 h-6 ${platform.color || 'bg-gray-500'} rounded flex items-center justify-center text-white text-xs font-medium platform-logo-fallback" style="display:none;">
       ${platform.name.charAt(0)}
     </div>`;
  }

  return `<div class="w-6 h-6 ${platform.color || 'bg-gray-500'} rounded flex items-center justify-center text-white text-xs font-medium">
       ${platform.name.charAt(0)}
     </div>`;
}

// 计算发布统计信息
function calculatePublishStats() {
  const totalPlatforms = sidepanelState.publishResults.length;

  // 统计成功发布的平台数量（状态为 ready 或 success）
  const successfulPlatforms = sidepanelState.publishResults.filter(result =>
    result.status === 'ready' || result.status === 'success'
  ).length;

  return {
    successful: successfulPlatforms,
    total: totalPlatforms
  };
}

// 获取状态配置 - 简化为三种状态
function getStatusConfig(status) {
  // 定义基础配置模板
  const publishingConfig = {
    text: '发布中',
    textColor: 'text-blue-600',
    icon: '<div class="w-2 h-2 bg-blue-600 rounded-full status-publishing"></div>'
  };

  const readyConfig = {
    text: '待确认',
    textColor: 'text-orange-600',
    icon: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>'
  };

  const failedConfig = {
    text: '请重试',
    textColor: 'text-red-600',
    icon: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>'
  };

  // 状态映射
  const statusMap = {
    pending: publishingConfig,
    publishing: publishingConfig,
    ready: readyConfig,
    success: readyConfig,
    failed: failedConfig
  };

  return statusMap[status] || publishingConfig;
}

// 渲染底部操作
function renderBottomActions() {
  const hasAnyItems = sidepanelState.publishResults.length > 0;

  if (!hasAnyItems) return '';

  return `
    <div class="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
      <div class="flex justify-center">
        <button data-action="clear"
                class="action-button px-8 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium">
          清空记录
        </button>
      </div>
    </div>
  `;
}

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// 设置事件监听器 - 使用事件委托优化性能
function setupEventListeners() {
  // 移除旧的事件监听器
  if (elements.root.eventListenerAdded) {
    return; // 避免重复绑定
  }

  // 使用事件委托，只在根元素上绑定一次
  elements.root.addEventListener('click', function(event) {
    const target = event.target.closest('button');
    if (!target) return;

    // 处理重试按钮
    if (target.classList.contains('retry-button')) {
      const platformId = target.getAttribute('data-platform-id');
      if (platformId) {
        retryPlatform(platformId);
      }
      return;
    }

    // 处理操作按钮
    if (target.classList.contains('action-button')) {
      const action = target.getAttribute('data-action');
      if (action === 'clear') {
        clearResults();
      }
      return;
    }
  });

  // 标记已添加事件监听器
  elements.root.eventListenerAdded = true;
}

// 设置消息监听
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('侧边栏收到消息:', message);
    
    switch (message.action) {
      case 'publishResult':
        if (message.data) {
          handlePublishResult(message.data);
        } else {
          console.error('publishResult消息缺少data字段:', message);
        }
        break;
      case 'publishStarted':
        if (message.data) {
          handlePublishStarted(message.data);
        } else {
          console.error('publishStarted消息缺少data字段:', message);
        }
        break;
      case 'publishCompleted':
        if (message.data) {
          handlePublishCompleted(message.data);
        } else {
          console.error('publishCompleted消息缺少data字段:', message);
        }
        break;
      case 'pageRefreshed':
        handlePageRefreshed(message.data);
        break;
      case 'closeSidepanel':
        handleCloseSidepanel(message.data);
        break;
      default:
        console.log('未知消息类型:', message.action);
    }
  });
}

// 处理发布结果
function handlePublishResult(result) {
  console.log('处理发布结果:', result);

  // 安全检查result对象
  if (!result || typeof result !== 'object') {
    console.error('无效的发布结果:', result);
    return;
  }

  // 更新或添加结果
  // 处理platform可能是字符串或对象的情况
  const resultPlatformId = result.platform ?
    (typeof result.platform === 'string' ? result.platform : result.platform?.id) :
    'unknown';
  const existingIndex = sidepanelState.publishResults.findIndex(
    r => {
      if (!r || !r.platform) return false;
      const existingPlatformId = typeof r.platform === 'string' ? r.platform : r.platform?.id;
      return existingPlatformId === resultPlatformId;
    }
  );
  
  if (existingIndex >= 0) {
    sidepanelState.publishResults[existingIndex] = result;
  } else {
    sidepanelState.publishResults.push(result);
  }
  
  sidepanelState.lastUpdate = new Date();
  renderSidepanel();
}

// 处理发布开始
function handlePublishStarted(data) {
  console.log('发布开始:', data);
  sidepanelState.isPublishing = true;
  renderSidepanel();
}

// 处理发布完成
function handlePublishCompleted(data) {
  console.log('发布完成:', data);
  sidepanelState.isPublishing = false;
  renderSidepanel();
}

// 处理页面刷新事件
function handlePageRefreshed(data) {
  console.log('收到页面刷新事件:', data);

  if (data && data.clearSidepanel) {
    // 清空侧边栏状态
    clearSidepanelState();
    console.log('侧边栏状态已清空');
  }
}

// 处理关闭侧边栏事件
function handleCloseSidepanel(data) {
  console.log('收到关闭侧边栏事件:', data);

  // 清空状态
  clearSidepanelState();

  // 尝试关闭或隐藏侧边栏
  closeSidepanelUI();
}

// 清空侧边栏状态的工具函数
function clearSidepanelState() {
  sidepanelState.publishResults = [];
  sidepanelState.isPublishing = false;
  sidepanelState.lastUpdate = null;
  renderSidepanel();
}

// 关闭侧边栏UI的工具函数
function closeSidepanelUI() {
  try {
    // 尝试关闭窗口
    if (typeof window !== 'undefined' && window.close) {
      setTimeout(() => window.close(), 100);
      console.log('侧边栏窗口关闭指令已发送');
      return;
    }
  } catch (closeError) {
    console.log('无法关闭侧边栏窗口:', closeError.message);
  }

  // 备用方案：显示关闭状态
  if (elements.root) {
    elements.root.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full p-6 text-center">
        <div class="w-16 h-16 mb-4 bg-gray-200 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">侧边栏已关闭</h3>
        <p class="text-sm text-gray-500">主页面已刷新，侧边栏状态已重置</p>
      </div>
    `;
    console.log('侧边栏显示关闭状态');
  }
}

// 设置定时更新
function setupPeriodicUpdate() {
  setInterval(async () => {
    try {
      await loadSavedState();
      renderSidepanel();
    } catch (error) {
      console.error('定时更新失败:', error);
    }
  }, 5000); // 每5秒更新一次
}

// 内部函数 - 事件处理
async function refreshStatus() {
  await loadSavedState();
  renderSidepanel();
}

function retryPlatform(platformId) {
  console.log('重试平台:', platformId);

  // 获取平台信息
  const platform = getPlatformById(platformId);
  if (!platform) {
    console.error('未找到平台信息:', platformId);
    return;
  }

  // 发送重试消息到后台脚本
  chrome.runtime.sendMessage({
    action: 'retryPublish',
    data: { platform }
  }).then(() => {
    console.log('重试消息已发送');
  }).catch(error => {
    console.error('发送重试消息失败:', error);
  });
}

async function clearResults() {
  sidepanelState.publishResults = [];
  await savePublishData({ publishResults: [] });
  renderSidepanel();
}

// 显示错误
function showError(message) {
  if (elements.root) {
    elements.root.innerHTML = `
      <div class="flex items-center justify-center h-full p-6 text-center">
        <div class="text-red-600">
          <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <p class="text-sm">${message}</p>
        </div>
      </div>
    `;
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeSidepanel);

console.log('侧边栏脚本加载完成');
