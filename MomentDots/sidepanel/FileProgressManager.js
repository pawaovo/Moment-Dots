/**
 * 文件处理进度管理器
 * 用于在侧边栏显示各平台的文件处理进度
 */

class FileProgressManager {
  constructor() {
    this.platformProgress = new Map(); // 存储各平台的进度状态
    this.isActive = false; // 是否正在处理文件
    this.currentFileInfo = null; // 当前处理的文件信息
    this.messageListener = null; // 消息监听器引用
    this.cleanupTimer = null; // 清理定时器引用

    // 进度阶段定义 - 简化权重计算
    this.PROGRESS_STAGES = {
      DISTRIBUTED_DOWNLOAD: { weight: 40 },
      FILE_ASSEMBLY: { weight: 30 },
      INJECTION: { weight: 30 }
    };

    this.initializeMessageListener();
  }

  /**
   * 初始化消息监听器
   */
  initializeMessageListener() {
    // 创建消息监听器并保存引用以便清理
    this.messageListener = (message, sender, sendResponse) => {
      try {
        if (message.action === 'fileProgressUpdate') {
          this.handleProgressUpdate(message);
          sendResponse({ success: true });
          return true; // 表示异步响应
        } else if (message.action === 'fileProcessingStart') {
          this.handleProcessingStart(message);
          sendResponse({ success: true });
          return true;
        } else if (message.action === 'fileProcessingComplete') {
          this.handleProcessingComplete(message);
          sendResponse({ success: true });
          return true;
        }
      } catch (error) {
        console.error('FileProgressManager message handling error:', error);
        sendResponse({ success: false, error: error.message });
        return true;
      }
      return false; // 不处理的消息
    };

    chrome.runtime.onMessage.addListener(this.messageListener);
  }

  /**
   * 开始文件处理
   */
  startFileProcessing(fileInfo, platformIds) {
    this.isActive = true;
    this.currentFileInfo = fileInfo;
    
    // 初始化各平台进度
    platformIds.forEach(platformId => {
      this.platformProgress.set(platformId, {
        currentStage: 'DISTRIBUTED_DOWNLOAD',
        currentSubStage: 'INIT',
        overallProgress: 0,
        stageProgress: 0,
        message: '准备开始...',
        timestamp: Date.now()
      });
    });

    // 通知侧边栏更新显示
    this.notifySidebarUpdate();
  }

  /**
   * 更新平台进度 - 简化版本
   */
  updatePlatformProgress(platformId, stage, subStage, progress, message) {
    if (!this.platformProgress.has(platformId)) {
      return;
    }

    const platformData = this.platformProgress.get(platformId);
    const stageConfig = this.PROGRESS_STAGES[stage];

    if (!stageConfig) {
      console.warn(`Unknown progress stage: ${stage}`);
      return;
    }

    // 简化的进度计算
    const overallProgress = this.calculateOverallProgress(stage, progress);

    // 更新平台数据
    Object.assign(platformData, {
      currentStage: stage,
      currentSubStage: subStage,
      overallProgress: Math.round(overallProgress),
      stageProgress: Math.min(100, Math.max(0, progress)),
      message: message || '处理中...',
      timestamp: Date.now()
    });

    // 通知侧边栏更新（优化为只更新进度条）
    this.notifyProgressUpdate(platformId, platformData);
  }

  /**
   * 计算总体进度 - 提取为独立方法
   */
  calculateOverallProgress(stage, progress) {
    const stageKeys = ['DISTRIBUTED_DOWNLOAD', 'FILE_ASSEMBLY', 'INJECTION'];
    const currentStageIndex = stageKeys.indexOf(stage);

    let previousProgress = 0;
    for (let i = 0; i < currentStageIndex; i++) {
      previousProgress += this.PROGRESS_STAGES[stageKeys[i]].weight;
    }

    const currentStageProgress = this.PROGRESS_STAGES[stage].weight * progress / 100;
    return previousProgress + currentStageProgress;
  }

  /**
   * 完成文件处理
   */
  completeFileProcessing(platformId) {
    if (this.platformProgress.has(platformId)) {
      const platformData = this.platformProgress.get(platformId);
      Object.assign(platformData, {
        currentStage: 'INJECTION',
        currentSubStage: 'COMPLETE',
        overallProgress: 100,
        stageProgress: 100,
        message: '处理完成',
        timestamp: Date.now()
      });
    }

    // 检查是否所有平台都完成了
    const allCompleted = Array.from(this.platformProgress.values())
      .every(data => data.overallProgress === 100);

    if (allCompleted) {
      // 延迟清理，保存定时器引用以便清理
      this.cleanupTimer = setTimeout(() => {
        this.resetProgress();
      }, 2000);
    }

    this.notifyProgressUpdate(platformId, this.platformProgress.get(platformId));
  }

  /**
   * 重置进度状态
   */
  resetProgress() {
    this.isActive = false;
    this.currentFileInfo = null;
    this.platformProgress.clear();

    // 清理定时器
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.notifySidebarUpdate();
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 移除消息监听器
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }

    // 清理定时器
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.resetProgress();
  }

  /**
   * 获取平台进度数据
   */
  getPlatformProgress(platformId) {
    return this.platformProgress.get(platformId) || null;
  }

  /**
   * 获取所有平台进度数据
   */
  getAllProgress() {
    return {
      isActive: this.isActive,
      currentFileInfo: this.currentFileInfo,
      platformProgress: Object.fromEntries(this.platformProgress)
    };
  }

  /**
   * 处理进度更新消息
   */
  handleProgressUpdate(message) {
    const { platformId, stage, subStage, progress, message: progressMessage } = message;
    this.updatePlatformProgress(platformId, stage, subStage, progress, progressMessage);
  }

  /**
   * 处理处理开始消息
   */
  handleProcessingStart(message) {
    const { fileInfo, platformIds } = message;
    this.startFileProcessing(fileInfo, platformIds);
  }

  /**
   * 处理处理完成消息
   */
  handleProcessingComplete(message) {
    const { platformId } = message;
    this.completeFileProcessing(platformId);
  }

  /**
   * 检查是否在background script环境
   */
  isBackgroundScript() {
    return typeof self !== 'undefined' && typeof window === 'undefined';
  }

  /**
   * 发送消息到侧边栏 - 统一方法
   */
  sendMessageToSidebar(message) {
    if (!this.isBackgroundScript()) return;

    chrome.runtime.sendMessage(message).catch(error => {
      // 忽略侧边栏未打开的错误
      if (!error.message.includes('Receiving end does not exist')) {
        console.error('Failed to send message to sidebar:', error);
      }
    });
  }

  /**
   * 通知侧边栏更新显示
   */
  notifySidebarUpdate() {
    this.sendMessageToSidebar({
      action: 'fileProgressStateUpdate',
      progressData: this.getAllProgress()
    });
  }

  /**
   * 通知单个平台进度更新
   */
  notifyProgressUpdate(platformId, progressData) {
    this.sendMessageToSidebar({
      action: 'singlePlatformProgressUpdate',
      platformId: platformId,
      progressData: progressData
    });
  }
}

// 创建全局实例 - 只在background script中自动创建
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  // Background script环境
  self.fileProgressManager = new FileProgressManager();
  console.log('FileProgressManager auto-initialized in background script');
}
// 在sidepanel中手动创建实例
