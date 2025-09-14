/**
 * MomentDots 扩展程序功能测试脚本
 *
 * 功能：
 * - 扩展程序状态检测
 * - 平台配置验证
 * - 后台脚本通信测试
 * - 内容脚本状态检查
 * - 存储系统测试
 */

class ExtensionTester {
  constructor() {
    this.testResults = new Map();
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.warningTests = 0;

    // 支持的平台列表（从manifest.json获取）
    this.supportedPlatforms = [
      { id: 'weibo', name: '微博', url: 'https://weibo.com/*' },
      { id: 'xiaohongshu', name: '小红书', url: 'https://creator.xiaohongshu.com/*' },
      { id: 'douyin', name: '抖音', url: 'https://creator.douyin.com/*' },
      { id: 'jike', name: '即刻', url: 'https://web.okjike.com/*' },
      { id: 'bilibili', name: 'Bilibili', url: 'https://t.bilibili.com/*' },
      { id: 'weixinchannels', name: '微信视频号', url: 'https://channels.weixin.qq.com/*' }
    ];

    // 扩展程序核心组件
    this.coreComponents = [
      'chrome.runtime',
      'chrome.storage',
      'chrome.tabs',
      'chrome.sidePanel'
    ];

    this.init();
  }

  /**
   * 检查扩展程序状态
   */
  checkExtensionStatus() {
    const statusElement = document.getElementById('extensionStatus');
    const statusText = document.getElementById('extensionStatusText');
    const detailsElement = document.getElementById('extensionDetails');

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // 扩展程序环境
      statusElement.className = 'extension-info';
      statusText.textContent = '✅ 扩展程序运行正常，可以进行完整功能测试';

      // 显示扩展程序详细信息
      if (chrome.runtime.getManifest) {
        const manifest = chrome.runtime.getManifest();
        document.getElementById('extensionId').textContent = chrome.runtime.id;
        document.getElementById('extensionVersion').textContent = manifest.version;
        detailsElement.style.display = 'block';
      }

    } else {
      // 非扩展程序环境
      statusElement.className = 'extension-info';
      statusElement.style.background = '#fef3cd';
      statusElement.style.borderColor = '#fbbf24';
      statusText.innerHTML = '⚠️ 当前不在扩展程序环境中运行，部分功能可能无法正常工作。<br>请通过 <code>chrome-extension://[扩展ID]/test/test.html</code> 访问。';
    }
  }
  
  /**
   * 初始化测试器
   */
  init() {
    this.checkExtensionStatus();
    this.setupEventListeners();
    this.generatePlatformTestCards();
    this.generateCoreComponentTests();
    this.updateStatistics();
    this.log('info', '测试系统初始化完成');
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    document.getElementById('runAllTests').addEventListener('click', () => {
      this.runAllTests();
    });

    document.getElementById('clearLogs').addEventListener('click', () => {
      this.clearLogs();
    });

    document.getElementById('testCoreComponents').addEventListener('click', () => {
      this.testCoreComponents();
    });

    // 高级测试按钮事件
    document.getElementById('testBackgroundScript').addEventListener('click', () => {
      this.testBackgroundScript();
    });

    document.getElementById('testStorageSystem').addEventListener('click', () => {
      this.testStorageSystem();
    });

    document.getElementById('testPermissions').addEventListener('click', () => {
      this.testPermissions();
    });

    document.getElementById('testDOMSelectors').addEventListener('click', () => {
      this.testDOMSelectors();
    });

    // 头部快捷按钮
    const mainPageBtn = document.getElementById('openMainPage');
    if (mainPageBtn) {
      mainPageBtn.addEventListener('click', () => {
        this.openMainPage();
      });
    }

    const sidepanelBtn = document.getElementById('openSidepanel');
    if (sidepanelBtn) {
      sidepanelBtn.addEventListener('click', () => {
        this.openSidepanel();
      });
    }

    // 复制扩展ID按钮
    const copyIdBtn = document.getElementById('copyExtensionId');
    if (copyIdBtn) {
      copyIdBtn.addEventListener('click', () => {
        this.copyExtensionId();
      });
    }
  }
  
  /**
   * 生成平台测试卡片
   */
  generatePlatformTestCards() {
    const container = document.getElementById('platformTestsContainer');
    
    this.supportedPlatforms.forEach(platform => {
      const card = this.createPlatformTestCard(platform);
      container.appendChild(card);
    });
  }
  
  /**
   * 创建平台测试卡片
   */
  createPlatformTestCard(platform) {
    const card = document.createElement('div');
    card.className = 'platform-test-card';
    card.innerHTML = `
      <div class="platform-header">
        <span class="platform-name">📱 ${platform.name}</span>
        <div id="${platform.id}Status" class="status-indicator status-pending"></div>
      </div>
      <div class="platform-content">
        <div class="flex justify-between items-center mb-4">
          <span class="text-sm text-gray-600">平台配置验证</span>
          <button id="test${platform.id}" class="btn btn-primary btn-small">测试此平台</button>
        </div>
        <div id="${platform.id}Tests" class="space-y-2">
          <div class="test-item">
            <span class="test-name">URL配置</span>
            <span class="test-result result-pending">待测试</span>
          </div>
          <div class="test-item">
            <span class="test-name">权限配置</span>
            <span class="test-result result-pending">待测试</span>
          </div>
          <div class="test-item">
            <span class="test-name">内容脚本配置</span>
            <span class="test-result result-pending">待测试</span>
          </div>
          <div class="test-item">
            <span class="test-name">平台可访问性</span>
            <span class="test-result result-pending">待测试</span>
          </div>
        </div>
      </div>
    `;
    
    // 绑定测试按钮事件
    card.querySelector(`#test${platform.id}`).addEventListener('click', () => {
      this.testPlatform(platform);
    });
    
    return card;
  }
  
  /**
   * 生成核心组件测试项目
   */
  generateCoreComponentTests() {
    const container = document.getElementById('coreComponentTests');

    this.coreComponents.forEach(component => {
      const testItem = document.createElement('div');
      testItem.className = 'test-item';
      const componentName = component.replace('chrome.', '');
      testItem.innerHTML = `
        <span class="test-name">${componentName} API</span>
        <span id="${componentName}Result" class="test-result result-pending">待测试</span>
      `;
      container.appendChild(testItem);
    });
  }
  
  /**
   * 执行所有测试
   */
  async runAllTests() {
    this.log('info', '🚀 开始执行全部测试...');
    this.clearResults();

    try {
      // 1. 测试核心组件
      await this.testCoreComponents();

      // 2. 测试后台脚本通信
      await this.testBackgroundScript();

      // 3. 测试存储系统
      await this.testStorageSystem();

      // 4. 测试所有平台配置
      for (const platform of this.supportedPlatforms) {
        await this.testPlatform(platform);
        await this.delay(300); // 避免测试过快
      }

      // 5. 执行综合测试
      await this.runIntegrationTests();

      this.log('success', '✅ 全部测试完成');
      this.updateProgress(100);

    } catch (error) {
      this.log('error', '❌ 测试执行失败', error);
    }
  }
  
  /**
   * 测试核心组件
   */
  async testCoreComponents() {
    this.log('info', '🔧 开始测试扩展程序核心组件...');

    let passedCount = 0;
    const totalCount = this.coreComponents.length;

    for (const component of this.coreComponents) {
      try {
        const componentPath = component.split('.');
        let obj = window;
        let isAvailable = true;

        for (const part of componentPath) {
          if (obj && typeof obj[part] !== 'undefined') {
            obj = obj[part];
          } else {
            isAvailable = false;
            break;
          }
        }

        const componentName = component.replace('chrome.', '');
        const result = isAvailable ? 'pass' : 'fail';

        this.updateTestResult(`${componentName}Result`, result);

        if (isAvailable) {
          passedCount++;
          this.log('success', `✅ ${component} API 可用`);
        } else {
          this.log('error', `❌ ${component} API 不可用`);
        }

      } catch (error) {
        const componentName = component.replace('chrome.', '');
        this.updateTestResult(`${componentName}Result`, 'fail');
        this.log('error', `❌ ${component} 测试异常`, error);
      }
    }

    // 更新核心组件状态
    const overallStatus = passedCount === totalCount ? 'success' :
                         passedCount > 0 ? 'warning' : 'error';
    this.updateStatusIndicator('coreComponentStatus', overallStatus);

    this.log('info', `核心组件测试完成: ${passedCount}/${totalCount} 通过`);
  }

  /**
   * 测试后台脚本通信
   */
  async testBackgroundScript() {
    this.log('info', '📡 开始测试后台脚本通信...');

    try {
      if (!chrome.runtime) {
        this.log('error', '❌ Chrome Runtime API 不可用');
        return false;
      }

      // 测试基本通信
      const response = await chrome.runtime.sendMessage({
        action: 'debugPlatforms'
      });

      if (response && response.success) {
        this.log('success', `✅ 后台脚本通信正常，支持 ${response.platforms.length} 个平台`);
        return true;
      } else {
        this.log('warning', '⚠️ 后台脚本响应异常');
        return false;
      }

    } catch (error) {
      this.log('error', '❌ 后台脚本通信失败', error.message);
      return false;
    }
  }

  /**
   * 测试存储系统
   */
  async testStorageSystem() {
    this.log('info', '💾 开始测试存储系统...');

    try {
      if (!chrome.storage) {
        this.log('error', '❌ Chrome Storage API 不可用');
        return false;
      }

      // 测试写入
      const testData = { testKey: 'testValue', timestamp: Date.now() };
      await chrome.storage.local.set({ extensionTest: testData });

      // 测试读取
      const result = await chrome.storage.local.get(['extensionTest']);

      if (result.extensionTest && result.extensionTest.testKey === 'testValue') {
        this.log('success', '✅ 存储系统读写正常');

        // 清理测试数据
        await chrome.storage.local.remove(['extensionTest']);
        return true;
      } else {
        this.log('error', '❌ 存储系统读取失败');
        return false;
      }

    } catch (error) {
      this.log('error', '❌ 存储系统测试异常', error.message);
      return false;
    }
  }
  
  /**
   * 测试单个平台
   */
  async testPlatform(platform) {
    this.log('info', `📱 开始测试 ${platform.name} 平台...`);

    const tests = [
      { name: 'URL配置', test: () => this.testPlatformURL(platform) },
      { name: '权限配置', test: () => this.testPlatformPermissions(platform) },
      { name: '内容脚本配置', test: () => this.testContentScriptConfig(platform) },
      { name: '平台可访问性', test: () => this.testPlatformAccessibility(platform) }
    ];

    let passedCount = 0;
    const testContainer = document.getElementById(`${platform.id}Tests`);
    const testItems = testContainer.querySelectorAll('.test-item');

    for (let i = 0; i < tests.length; i++) {
      try {
        const result = await tests[i].test();
        const resultElement = testItems[i].querySelector('.test-result');

        this.updateTestResult(resultElement, result ? 'pass' : 'fail');

        if (result) {
          passedCount++;
          this.log('success', `✅ ${platform.name} - ${tests[i].name} 通过`);
        } else {
          this.log('error', `❌ ${platform.name} - ${tests[i].name} 失败`);
        }

      } catch (error) {
        const resultElement = testItems[i].querySelector('.test-result');
        this.updateTestResult(resultElement, 'fail');
        this.log('error', `❌ ${platform.name} - ${tests[i].name} 异常`, error);
      }
    }

    // 更新平台状态
    const overallStatus = passedCount === tests.length ? 'success' :
                         passedCount > 0 ? 'warning' : 'error';
    this.updateStatusIndicator(`${platform.id}Status`, overallStatus);

    this.log('info', `${platform.name} 测试完成: ${passedCount}/${tests.length} 通过`);
  }
  
  /**
   * 测试平台URL配置
   */
  testPlatformURL(platform) {
    try {
      const url = new URL(platform.url.replace('/*', ''));
      return url.protocol === 'https:' && url.hostname.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 测试平台权限配置
   */
  async testPlatformPermissions(platform) {
    try {
      if (!chrome.permissions) {
        return false;
      }

      const permissions = await chrome.permissions.getAll();
      const hostPermissions = permissions.origins || [];

      // 检查是否有对应平台的权限
      return hostPermissions.some(permission =>
        platform.url.includes(permission.replace('/*', '')) ||
        permission.includes(new URL(platform.url.replace('/*', '')).hostname)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * 测试内容脚本配置
   */
  async testContentScriptConfig(platform) {
    try {
      // 通过后台脚本获取manifest信息
      const response = await chrome.runtime.sendMessage({
        action: 'debugPlatforms'
      });

      if (response && response.platforms) {
        return response.platforms.some(p => p.id === platform.id);
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 测试平台可访问性
   */
  async testPlatformAccessibility(platform) {
    try {
      // 简单的网络连通性测试
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(platform.url.replace('/*', ''), {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true; // 如果没有抛出异常，说明网络可达
    } catch (error) {
      // 网络错误或超时
      return false;
    }
  }

  /**
   * 测试权限系统
   */
  async testPermissions() {
    this.log('info', '🔐 开始测试权限系统...');

    try {
      if (!chrome.permissions) {
        this.log('error', '❌ Chrome Permissions API 不可用');
        return false;
      }

      const permissions = await chrome.permissions.getAll();
      this.log('success', `✅ 权限系统正常，已获得 ${permissions.permissions.length} 个权限，${permissions.origins.length} 个域名权限`);

      // 详细权限信息
      this.log('info', `权限列表: ${permissions.permissions.join(', ')}`);
      this.log('info', `域名权限: ${permissions.origins.join(', ')}`);

      return true;
    } catch (error) {
      this.log('error', '❌ 权限系统测试失败', error.message);
      return false;
    }
  }

  /**
   * 打开主页面
   */
  async openMainPage() {
    this.log('info', '🏠 打开扩展程序主页面...');

    try {
      const mainPageUrl = chrome.runtime.getURL('main/main.html');
      await chrome.tabs.create({ url: mainPageUrl });
      this.log('success', '✅ 主页面已打开');
    } catch (error) {
      this.log('error', '❌ 打开主页面失败', error.message);
    }
  }

  /**
   * 打开侧边栏
   */
  async openSidepanel() {
    this.log('info', '📋 打开扩展程序侧边栏...');

    try {
      const currentWindow = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: currentWindow.id });
      this.log('success', '✅ 侧边栏已打开');
    } catch (error) {
      this.log('error', '❌ 打开侧边栏失败', error.message);
    }
  }

  /**
   * 复制扩展程序ID
   */
  async copyExtensionId() {
    try {
      const extensionId = chrome.runtime.id;
      await navigator.clipboard.writeText(extensionId);
      this.log('success', `✅ 扩展程序ID已复制: ${extensionId}`);
    } catch (error) {
      this.log('error', '❌ 复制扩展程序ID失败', error.message);
    }
  }

  /**
   * 测试DOM选择器
   */
  async testDOMSelectors() {
    this.log('info', '🎯 开始测试DOM选择器...');

    const commonSelectors = [
      'input[type="file"]',
      'textarea',
      'div[contenteditable="true"]',
      'button',
      '.publish-btn',
      '.upload-btn'
    ];

    let validSelectors = 0;

    commonSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length >= 0) { // 即使没找到元素也算选择器有效
          validSelectors++;
          this.log('info', `✓ 选择器有效: ${selector}`);
        }
      } catch (error) {
        this.log('warning', `⚠️ 选择器无效: ${selector}`, error);
      }
    });

    this.log('info', `DOM选择器测试完成: ${validSelectors}/${commonSelectors.length} 有效`);
    return validSelectors === commonSelectors.length;
  }
  
  /**
   * 执行综合测试
   */
  async runIntegrationTests() {
    this.log('info', '🔄 执行综合集成测试...');
    
    // 测试错误处理系统
    if (typeof window.ErrorHandler !== 'undefined') {
      this.log('success', '✅ 错误处理系统可用');
    } else {
      this.log('warning', '⚠️ 错误处理系统未加载');
    }
    
    // 测试日志系统
    if (typeof window.Logger !== 'undefined') {
      this.log('success', '✅ 日志系统可用');
    } else {
      this.log('warning', '⚠️ 日志系统未加载');
    }
  }
  
  /**
   * 更新测试结果显示
   */
  updateTestResult(element, result) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    
    if (!element) return;
    
    element.className = 'test-result';
    
    switch (result) {
      case 'pass':
        element.classList.add('result-pass');
        element.textContent = '通过';
        this.passedTests++;
        break;
      case 'fail':
        element.classList.add('result-fail');
        element.textContent = '失败';
        this.failedTests++;
        break;
      case 'warning':
        element.classList.add('result-warning');
        element.textContent = '警告';
        this.warningTests++;
        break;
      default:
        element.classList.add('result-pending');
        element.textContent = '待测试';
    }
    
    this.totalTests++;
    this.updateStatistics();
  }
  
  /**
   * 更新状态指示器
   */
  updateStatusIndicator(elementId, status) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.className = 'status-indicator';
    element.classList.add(`status-${status}`);
  }
  
  /**
   * 更新统计信息
   */
  updateStatistics() {
    document.getElementById('totalTests').textContent = this.totalTests;
    document.getElementById('passedTests').textContent = this.passedTests;
    document.getElementById('failedTests').textContent = this.failedTests;
    document.getElementById('warningTests').textContent = this.warningTests;
  }
  
  /**
   * 更新进度条
   */
  updateProgress(percentage) {
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = `${percentage}%`;
  }
  
  /**
   * 记录日志
   */
  log(level, message, data = null) {
    const logContainer = document.getElementById('logContainer');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${level}`;
    
    let logText = `[${timestamp}] ${message}`;
    if (data) {
      logText += ` ${JSON.stringify(data)}`;
    }
    
    logEntry.textContent = logText;
    logContainer.appendChild(logEntry);
    
    // 自动滚动到底部
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // 同时输出到控制台
    console.log(`[ExtensionTester] ${message}`, data || '');
  }
  
  /**
   * 清空日志
   */
  clearLogs() {
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '<div class="log-entry log-info">[系统] 日志已清空</div>';
  }
  
  /**
   * 清空测试结果
   */
  clearResults() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.warningTests = 0;
    this.updateStatistics();
    this.updateProgress(0);
  }
  
  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 高级测试：模拟文件处理
   */
  async testFileProcessing() {
    this.log('info', '📁 开始测试文件处理功能...');

    try {
      // 创建模拟文件
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      if (typeof window.FileProcessorBase !== 'undefined') {
        const processor = new window.FileProcessorBase('test', {});

        // 测试文件验证
        const validation = processor.validateFiles([mockFile]);
        this.log('success', '✅ 文件验证功能正常', validation);

        return true;
      } else {
        this.log('warning', '⚠️ FileProcessorBase 未加载，跳过文件处理测试');
        return false;
      }
    } catch (error) {
      this.log('error', '❌ 文件处理测试失败', error);
      return false;
    }
  }

  /**
   * 高级测试：DOM选择器验证
   */
  async testDOMSelectors() {
    this.log('info', '🎯 开始测试DOM选择器...');

    const commonSelectors = [
      'input[type="file"]',
      'textarea',
      'div[contenteditable="true"]',
      'button',
      '.publish-btn',
      '.upload-btn'
    ];

    let validSelectors = 0;

    commonSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length >= 0) { // 即使没找到元素也算选择器有效
          validSelectors++;
          this.log('info', `✓ 选择器有效: ${selector}`);
        }
      } catch (error) {
        this.log('warning', `⚠️ 选择器无效: ${selector}`, error);
      }
    });

    this.log('info', `DOM选择器测试完成: ${validSelectors}/${commonSelectors.length} 有效`);
    return validSelectors === commonSelectors.length;
  }

  /**
   * 高级测试：错误处理机制
   */
  async testErrorHandling() {
    this.log('info', '🚨 开始测试错误处理机制...');

    try {
      if (typeof window.ErrorHandler !== 'undefined') {
        const errorHandler = new window.ErrorHandler();

        // 测试错误分类
        const testError = new Error('Test network error');
        const handledError = errorHandler.handle(testError, { context: 'test' });

        this.log('success', '✅ 错误处理机制正常', {
          type: handledError.type,
          message: handledError.message
        });

        return true;
      } else {
        this.log('warning', '⚠️ ErrorHandler 未加载');
        return false;
      }
    } catch (error) {
      this.log('error', '❌ 错误处理测试失败', error);
      return false;
    }
  }

  /**
   * 性能测试：基类加载时间
   */
  async testPerformance() {
    this.log('info', '⚡ 开始性能测试...');

    const startTime = performance.now();

    // 测试基类访问性能
    let accessCount = 0;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      if (typeof window.BaseClassLoader !== 'undefined') {
        accessCount++;
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.log('info', `性能测试完成: ${iterations} 次访问耗时 ${duration.toFixed(2)}ms`);

    return duration < 100; // 100ms内完成认为性能良好
  }

  /**
   * 生成测试报告
   */
  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.totalTests,
        passed: this.passedTests,
        failed: this.failedTests,
        warnings: this.warningTests,
        successRate: this.totalTests > 0 ? (this.passedTests / this.totalTests * 100).toFixed(2) : 0
      },
      baseClasses: {},
      platforms: {},
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      }
    };

    // 收集基类状态
    this.baseClasses.forEach(baseClass => {
      report.baseClasses[baseClass] = typeof window[baseClass] !== 'undefined';
    });

    // 收集平台状态
    this.supportedPlatforms.forEach(platform => {
      report.platforms[platform.id] = {
        name: platform.name,
        adapterLoaded: typeof window[platform.adapterClass] !== 'undefined',
        status: 'tested' // 可以扩展更多状态信息
      };
    });

    this.log('info', '📊 测试报告生成完成', report);

    // 可以将报告保存到localStorage或发送到服务器
    try {
      localStorage.setItem('momentdots-test-report', JSON.stringify(report));
      this.log('success', '✅ 测试报告已保存到本地存储');
    } catch (error) {
      this.log('warning', '⚠️ 无法保存测试报告到本地存储', error);
    }

    return report;
  }

  /**
   * 导出测试报告
   */
  exportTestReport() {
    const report = this.generateTestReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `momentdots-test-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.log('success', '✅ 测试报告已导出');
  }
}

// 扩展测试功能类
class AdvancedTester extends ExtensionTester {
  constructor() {
    super();
    this.addAdvancedFeatures();
  }

  /**
   * 添加高级功能
   */
  addAdvancedFeatures() {
    // 添加导出报告按钮
    const headerActions = document.querySelector('.test-header .flex.items-center.space-x-3');
    if (headerActions) {
      const exportBtn = document.createElement('button');
      exportBtn.className = 'btn btn-secondary';
      exportBtn.textContent = '导出报告';
      exportBtn.addEventListener('click', () => this.exportTestReport());
      headerActions.appendChild(exportBtn);
    }

    // 添加高级测试选项
    this.addAdvancedTestOptions();
  }

  /**
   * 添加高级测试选项
   */
  addAdvancedTestOptions() {
    const sidebar = document.querySelector('.test-sidebar');
    if (sidebar) {
      const advancedSection = document.createElement('div');
      advancedSection.className = 'p-4 border-t border-gray-200';
      advancedSection.innerHTML = `
        <h4 class="font-semibold text-gray-900 mb-3">高级测试</h4>
        <div class="space-y-2">
          <button id="testFileProcessing" class="btn btn-secondary btn-small w-full">文件处理测试</button>
          <button id="testDOMSelectors" class="btn btn-secondary btn-small w-full">DOM选择器测试</button>
          <button id="testErrorHandling" class="btn btn-secondary btn-small w-full">错误处理测试</button>
          <button id="testPerformance" class="btn btn-secondary btn-small w-full">性能测试</button>
        </div>
      `;

      sidebar.appendChild(advancedSection);

      // 绑定事件
      document.getElementById('testFileProcessing').addEventListener('click', () => this.testFileProcessing());
      document.getElementById('testDOMSelectors').addEventListener('click', () => this.testDOMSelectors());
      document.getElementById('testErrorHandling').addEventListener('click', () => this.testErrorHandling());
      document.getElementById('testPerformance').addEventListener('click', () => this.testPerformance());
    }
  }

  /**
   * 扩展的全部测试
   */
  async runAllTests() {
    await super.runAllTests();

    // 执行高级测试
    this.log('info', '🚀 开始执行高级测试...');

    await this.testFileProcessing();
    await this.testDOMSelectors();
    await this.testErrorHandling();
    await this.testPerformance();

    // 生成最终报告
    this.generateTestReport();

    this.log('success', '🎉 所有测试完成！');
  }
}

// 页面加载完成后初始化高级测试器
document.addEventListener('DOMContentLoaded', () => {
  window.extensionTester = new AdvancedTester();
});

// 导出到全局作用域供调试使用
window.ExtensionTester = ExtensionTester;
window.AdvancedTester = AdvancedTester;
