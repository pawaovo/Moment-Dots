# MomentDots 平台架构指南

**版本：** v2.1
**更新日期：** 2025-01-21
**作者：** MomentDots 开发团队

## 📋 目录

1. [项目概述](#项目概述)
2. [平台分类体系](#平台分类体系)
3. [统一基类架构](#统一基类架构)
4. [A类平台实现详解](#a类平台实现详解)
5. [B类平台实现详解](#b类平台实现详解)
6. [跨标签页平台实现](#跨标签页平台实现)
7. [微信视频号技术实现](#微信视频号技术实现)
8. [配置管理体系](#配置管理体系)
9. [工厂模式集成](#工厂模式集成)
10. [性能优化策略](#性能优化策略)

## 🎯 项目概述

MomentDots是一个Chrome浏览器扩展程序，旨在实现**一键发布动态到多个社交媒体平台**。项目采用统一的架构模式，支持微博、小红书、即刻、抖音、X、Bilibili、微信公众号和微信视频号等8个主流平台。

### 技术栈

- **核心技术**: Chrome Extension Manifest V3
- **前端技术**: 原生JavaScript (ES6+)、HTML5、CSS3
- **样式框架**: Tailwind CSS
- **状态管理**: Zustand
- **构建工具**: TypeScript编译器、Tailwind CSS
- **开发工具**: Node.js、npm
- **测试工具**: Playwright MCP Bridge

### 核心设计原则

- **统一架构**：所有平台适配器遵循统一的基类架构
- **模块化设计**：每个平台独立适配器，便于维护和扩展
- **代码复用**：最大化代码复用，最小化重复实现
- **性能优化**：高效的DOM操作和异步处理机制
- **类型安全**：TypeScript提供类型检查和编译时错误检测

## 🏗️ 平台分类体系

基于平台的技术特征和操作流程，MomentDots将所有支持的平台分为三大类：

### A类：直接注入型平台

**操作流程：** 打开页面 → 直接注入内容（标题、正文、文件）

**代表平台：**
- 微博 (weibo)
- 即刻 (jike)
- X (x)
- Bilibili (bilibili)
- **微信视频号 (weixinchannels)** ⭐

**技术特征：**
- 页面加载完成后立即可以进行内容注入
- 不需要额外的页面导航或按钮点击
- DOM元素在页面加载时就已经可用
- 使用统一的 `PlatformAdapter` 基类

### B类：多步骤操作型平台

**操作流程：** 打开首页 → 点击"发布"按钮 → 上传文件 → 自动跳转到编辑页面 → 注入内容

**代表平台：**
- 小红书 (xiaohongshu)
- 抖音 (douyin)

**技术特征：**
- 需要模拟用户点击操作进入发布流程
- 先上传文件，后注入文本内容
- 涉及页面跳转和状态变化
- 使用复杂的状态管理机制

### 跨标签页特殊平台

**操作流程：** 首页点击按钮 → 新标签页打开编辑器 → 跨标签页数据传递 → 内容注入

**代表平台：**
- 微信公众号 (weixin)

**技术特征：**
- 使用Background Script协调多标签页
- 数据通过chrome.storage传递
- 不使用传统适配器模式
- 需要特殊的跨标签页通信机制

## 🔧 统一基类架构

### 架构文件结构

```
content-scripts/
├── shared/                     # 共享基类和工具
│   ├── PlatformAdapter.js     # 核心适配器基类
│   ├── PlatformConfigBase.js  # 配置管理基类
│   └── AdapterInitializer.js  # 适配器初始化工具
├── adapters/                   # 平台适配器实现
│   ├── common/                # 共享基类
│   │   ├── BaseClassLoader.js # 基类加载器
│   │   ├── BaseConfigManager.js # 基础配置管理
│   │   └── MutationObserverBase.js # DOM监听基类
│   ├── weibo.js               # 微博适配器
│   ├── jike.js                # 即刻适配器
│   ├── x.js                   # X平台适配器
│   ├── bilibili.js            # Bilibili适配器
│   ├── weixinchannels.js      # 微信视频号适配器
│   ├── xiaohongshu.js         # 小红书适配器
│   ├── douyin.js              # 抖音适配器
│   ├── weixin-home.js         # 微信公众号首页
│   └── weixin-edit.js         # 微信公众号编辑页
└── enhanced/                   # 增强功能（可选）
```

### PlatformAdapter 基类

所有A类和B类平台的核心基类，提供统一的接口和通用功能。

**文件位置**: `content-scripts/shared/PlatformAdapter.js`

```javascript
class PlatformAdapter {
  constructor(platformId) {
    this.platformId = platformId;
    this.isInitialized = false;
  }

  // 抽象方法 - 子类必须实现
  async publishContent(data) {
    throw new Error('子类必须实现 publishContent 方法');
  }

  // 统一的元素查找方法 - 子类可重写
  findTitleInput() {
    return document.querySelector('input[placeholder*="标题"]');
  }

  findFileInput() {
    return document.querySelector('input[type="file"]');
  }

  findContentArea() {
    return document.querySelector('.input-editor, [contenteditable="true"]');
  }

  // 统一的内容注入方法
  async injectTitle(title) {
    // 统一的标题注入逻辑
  }

  async injectContent(content) {
    // 统一的内容注入逻辑
  }

  async uploadFiles(data) {
    // 统一的文件上传逻辑
  }
}
```

### PlatformConfigBase 配置基类

提供统一的配置管理机制，消除各平台配置管理器中的重复代码。

**文件位置**: `content-scripts/shared/PlatformConfigBase.js`

```javascript
class PlatformConfigBase extends BaseConfigManager {
  constructor(platform) {
    super(platform);
    this.platform = platform;
  }

  /**
   * 统一的配置加载模式
   * @param {Object} platformSpecificConfig - 平台特定配置
   * @returns {Object} 合并后的配置对象
   */
  loadPlatformConfig(platformSpecificConfig) {
    const baseConfig = super.loadConfig();
    return this.mergeConfig(baseConfig, platformSpecificConfig);
  }

  /**
   * 创建标准的延迟配置
   * @param {Object} overrides - 覆盖的延迟配置
   * @returns {Object} 延迟配置对象
   */
  createDelayConfig(overrides = {}) {
    const defaultDelays = {
      FAST_CHECK: 100,
      NORMAL_WAIT: 300,
      UPLOAD_WAIT: 1000,
      ELEMENT_WAIT: 2000
    };
    return { ...defaultDelays, ...overrides };
  }

  /**
   * 创建标准的限制配置
   * @param {Object} overrides - 覆盖的限制配置
   * @returns {Object} 限制配置对象
   */
  createLimitsConfig(overrides = {}) {
    const defaultLimits = {
      maxContentLength: 2000,
      maxTitleLength: 100,
      maxMediaFiles: 9,
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],
      maxFileSize: 10 * 1024 * 1024 // 10MB
    };
    return { ...defaultLimits, ...overrides };
  }
}
```

### MutationObserverBase 监听基类

提供统一的DOM变化监听机制，用于检测页面元素的加载状态。

**文件位置**: `content-scripts/adapters/common/MutationObserverBase.js`

```javascript
class MutationObserverBase {
  constructor(platformId) {
    this.platformId = platformId;
    this.observer = null;
    this.isObserving = false;
  }

  /**
   * 启动DOM监听
   * @param {Function} callback - 元素变化时的回调函数
   */
  startObserving(callback) {
    if (this.isObserving) return;

    this.observer = new MutationObserver((mutations) => {
      const checkResult = this.checkElements();
      if (checkResult.ready && callback) {
        callback(checkResult);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    this.isObserving = true;
  }

  /**
   * 停止DOM监听
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.isObserving = false;
    }
  }

  /**
   * 检查关键元素是否就绪 - 子类必须实现
   * @returns {Object} { ready: boolean, reason?: string, elements?: Object }
   */
  checkElements() {
    throw new Error('子类必须实现 checkElements 方法');
  }

  /**
   * 检查是否为目标页面 - 子类必须实现
   * @returns {boolean}
   */
  isTargetPage() {
    throw new Error('子类必须实现 isTargetPage 方法');
  }
}
```

### AdapterInitializer 初始化工具

统一处理适配器的依赖检查、初始化和消息监听逻辑，消除重复代码。

**文件位置**: `content-scripts/shared/AdapterInitializer.js`

```javascript
class AdapterInitializer {
  static initializedPlatforms = new Set();
  static messageListeners = new Map();

  /**
   * 初始化平台适配器
   * @param {string} platform - 平台名称
   * @param {string} adapterClassName - 适配器类名
   * @param {Function} legacyInitializer - 旧版本初始化函数
   */
  static async initialize(platform, adapterClassName, legacyInitializer) {
    const initKey = `${platform}-${adapterClassName}`;
    if (this.initializedPlatforms.has(initKey)) {
      console.log(`${platform}适配器已经初始化过，跳过重复初始化`);
      return;
    }

    this.initializedPlatforms.add(initKey);

    try {
      const dependencyType = await this.waitForDependencies(platform, adapterClassName);

      if (dependencyType === 'new') {
        this.initializeNewAdapter(platform, adapterClassName);
      } else if (legacyInitializer) {
        legacyInitializer();
      }
    } catch (error) {
      console.error(`${platform}适配器初始化失败:`, error);
      if (legacyInitializer) {
        legacyInitializer();
      }
    }
  }

  /**
   * 等待依赖加载
   */
  static async waitForDependencies(platform, adapterClassName) {
    // 检查新技术方案的依赖
    if (window.PlatformAdapter && window.PlatformConfigBase && window[adapterClassName]) {
      return 'new';
    }

    // 等待依赖加载
    const maxAttempts = 50;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      if (window.PlatformAdapter && window.PlatformConfigBase && window[adapterClassName]) {
        return 'new';
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return 'legacy';
  }
}
```

## 🎯 A类平台实现详解

### 实现模式

A类平台使用**直接注入模式**，操作流程简单直接：

```
打开页面 → 等待元素加载 → 注入标题 → 上传文件 → 注入内容 → 发布完成
```

### 标准实现模板

```javascript
class StandardPlatformAdapter extends PlatformAdapter {
  constructor() {
    super('platform-id');
    this.configManager = new PlatformConfigManager();
    this.config = this.configManager.loadConfig();
  }

  async publishContent(data) {
    try {
      // 等待页面加载
      await this.waitForElements();

      // 按顺序执行发布步骤
      if (data.title) await this.injectTitle(data.title);
      if (data.files?.length) await this.uploadFiles(data);
      if (data.content) await this.injectContent(data.content);

      return { success: true, message: '发布成功' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

### 微信视频号特殊实现

微信视频号作为A类平台的特殊实现，需要处理Shadow DOM和点击激活：

```javascript
class WeixinChannelsPlatformAdapter extends PlatformAdapter {
  // 重写元素查找方法 - 支持Shadow DOM
  findTitleInput() {
    return this.findElementInShadow(this.config.selectors.titleInput);
  }

  // 重写激活方法 - 支持点击激活
  async activateEditingArea() {
    const shadowRoot = this.getShadowRoot();
    const triggerElement = Array.from(shadowRoot.querySelectorAll('*'))
      .find(el => el.textContent?.includes('添加描述'));

    if (triggerElement) {
      triggerElement.click();
      await this.delay(this.config.delays.NORMAL_WAIT);
    }
    return true;
  }

  // Shadow DOM处理方法
  getShadowRoot() {
    const wujieApp = document.querySelector('wujie-app');
    return wujieApp?.shadowRoot || null;
  }

  findElementInShadow(selector, fallbackSelectors = []) {
    const shadowRoot = this.getShadowRoot();
    if (!shadowRoot) return null;

    let element = shadowRoot.querySelector(selector);
    if (element) return element;

    for (const fallbackSelector of fallbackSelectors) {
      element = shadowRoot.querySelector(fallbackSelector);
      if (element) return element;
    }
    return null;
  }
}
```

## 🔄 B类平台实现详解

### 实现模式

B类平台使用**多步骤操作模式**，需要模拟用户交互：

```
打开首页 → 点击发布按钮 → 上传文件 → 等待页面跳转 → 注入标题和内容 → 发布完成
```

### 状态管理机制

```javascript
class MultiStepPlatformAdapter extends PlatformAdapter {
  constructor() {
    super('platform-id');
    this.currentStep = 'initial';
    this.stateManager = new StateManager();
  }

  async publishContent(data) {
    try {
      await this.executeStep('clickPublishButton');
      await this.executeStep('uploadFiles', data.files);
      await this.executeStep('waitForNavigation');
      await this.executeStep('injectContent', data);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async executeStep(stepName, stepData = null) {
    switch (stepName) {
      case 'clickPublishButton':
        return await this.clickPublishButton();
      case 'uploadFiles':
        return await this.uploadFiles(stepData);
      case 'waitForNavigation':
        return await this.waitForNavigation();
      case 'injectContent':
        return await this.injectContentAfterNavigation(stepData);
    }
  }
}
```

## 🔗 跨标签页平台实现

### 实现架构

跨标签页平台使用Background Script协调多个标签页：

```
主页面 → Background Script → 新标签页
         ↓
      数据存储 → 内容注入
```

### 通信机制

```javascript
// Background Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openNewTab') {
    chrome.tabs.create({
      url: message.url,
      active: true
    }, (tab) => {
      // 存储数据供新标签页使用
      chrome.storage.local.set({
        [`publishData_${tab.id}`]: message.data
      });
    });
  }
});

// Content Script (新标签页)
chrome.storage.local.get([`publishData_${tabId}`], (result) => {
  const publishData = result[`publishData_${tabId}`];
  if (publishData) {
    // 执行内容注入
    injectContent(publishData);
  }
});
```

## 📋 配置管理体系

### 平台配置结构

```javascript
// shared/config/platforms.js
const SUPPORTED_PLATFORMS = [
  {
    id: 'weixinchannels',
    name: '微信视频号',
    publishUrl: 'https://channels.weixin.qq.com/platform/post/finderNewLifeCreate',
    color: 'bg-green-500',
    logoUrl: 'https://favicon.im/channels.weixin.qq.com',
    domain: 'channels.weixin.qq.com',
    // 平台分类标识
    platformType: 'direct-injection',
    // 特殊技术特征
    specialFeatures: {
      shadowDOMAccess: true,
      requiresActivation: true
    }
  }
];
```

### 适配器配置管理

```javascript
class WeixinChannelsConfigManager extends PlatformConfigBase {
  loadConfig() {
    return {
      delays: this.createDelayConfig({
        FAST_CHECK: 200,
        NORMAL_WAIT: 500,
        UPLOAD_WAIT: 1500,
        ELEMENT_WAIT: 3000
      }),
      limits: this.createLimitsConfig({
        maxContentLength: 1000,
        maxTitleLength: 22,
        maxMediaFiles: 18,
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxFileSize: 20 * 1024 * 1024
      }),
      selectors: {
        shadowHost: 'wujie-app',
        titleInput: 'input[placeholder="填写标题, 22个字符内"]',
        contentArea: '.input-editor',
        fileInput: 'input[type="file"][accept="image/*"]'
      }
    };
  }
}
```

## 🏭 工厂模式集成

### PlatformAdapterFactory

统一的平台适配器工厂，负责创建和管理所有平台适配器实例。

**文件位置**: `content-scripts/shared/PlatformAdapter.js`

```javascript
class PlatformAdapterFactory {
  /**
   * 创建平台适配器实例
   * @param {string} platform - 平台标识符
   * @returns {PlatformAdapter} 适配器实例
   */
  static create(platform) {
    // A类标准平台
    if (platform === 'jike') {
      if (window.JikeAdapter) {
        return new window.JikeAdapter();
      } else {
        throw new Error('即刻适配器未加载，请确保 jike.js 已正确加载');
      }
    }

    if (platform === 'weibo') {
      if (window.WeiboAdapter) {
        return new window.WeiboAdapter();
      } else {
        throw new Error('微博适配器未加载，请确保 weibo.js 已正确加载');
      }
    }

    if (platform === 'x') {
      if (window.XAdapter) {
        return new window.XAdapter();
      } else {
        throw new Error('X平台适配器未加载，请确保 x.js 已正确加载');
      }
    }

    if (platform === 'bilibili') {
      if (window.BilibiliAdapter) {
        return new window.BilibiliAdapter();
      } else {
        throw new Error('Bilibili适配器未加载，请确保 bilibili.js 已正确加载');
      }
    }

    // A类特殊平台（Shadow DOM处理）
    if (platform === 'weixinchannels') {
      if (window.WeixinChannelsPlatformAdapter) {
        return new window.WeixinChannelsPlatformAdapter();
      } else {
        throw new Error('微信视频号适配器未加载，请确保 weixinchannels.js 已正确加载');
      }
    }

    // B类平台（多步骤操作）
    if (platform === 'douyin') {
      if (window.DouyinAdapter) {
        return new window.DouyinAdapter();
      } else {
        throw new Error('抖音适配器未加载，请确保 douyin.js 已正确加载');
      }
    }

    if (platform === 'xiaohongshu') {
      if (window.XiaohongshuAdapter) {
        return new window.XiaohongshuAdapter();
      } else {
        throw new Error('小红书适配器未加载，请确保 xiaohongshu.js 已正确加载');
      }
    }

    // 跨标签页平台
    if (platform === 'weixin') {
      throw new Error('微信公众号平台使用跨标签页机制，请通过Background Script处理');
    }

    throw new Error(`不支持的平台: ${platform}`);
  }

  /**
   * 获取所有支持的平台列表
   * @returns {string[]} 平台标识符数组
   */
  static getSupportedPlatforms() {
    return ['jike', 'weibo', 'douyin', 'xiaohongshu', 'x', 'bilibili', 'weixinchannels', 'weixin'];
  }

  /**
   * 检查平台是否支持
   * @param {string} platform - 平台标识符
   * @returns {boolean} 是否支持
   */
  static isSupported(platform) {
    return this.getSupportedPlatforms().includes(platform);
  }

  /**
   * 获取平台分类信息
   * @param {string} platform - 平台标识符
   * @returns {Object} 平台分类信息
   */
  static getPlatformType(platform) {
    const platformTypes = {
      // A类标准平台
      'jike': { type: 'A', subtype: 'standard', description: '直接注入型' },
      'weibo': { type: 'A', subtype: 'standard', description: '直接注入型' },
      'x': { type: 'A', subtype: 'standard', description: '直接注入型' },
      'bilibili': { type: 'A', subtype: 'standard', description: '直接注入型' },

      // A类特殊平台
      'weixinchannels': { type: 'A', subtype: 'special', description: '直接注入型（Shadow DOM）' },

      // B类平台
      'douyin': { type: 'B', subtype: 'multi-step', description: '多步骤操作型' },
      'xiaohongshu': { type: 'B', subtype: 'multi-step', description: '多步骤操作型' },

      // 跨标签页平台
      'weixin': { type: 'CrossTab', subtype: 'cross-tab', description: '跨标签页通信型' }
    };

    return platformTypes[platform] || { type: 'Unknown', subtype: 'unknown', description: '未知类型' };
  }
}
```

## ⚡ 性能优化策略

### 统一抽象层优化

```javascript
// 优化前：重复的事件触发代码
titleInput.dispatchEvent(new Event('input', { bubbles: true }));
titleInput.dispatchEvent(new Event('change', { bubbles: true }));

// 优化后：统一的事件触发方法
_triggerInputEvents(element) {
  const events = ['input', 'change'];
  events.forEach(eventType => {
    element.dispatchEvent(new Event(eventType, { bubbles: true }));
  });
}
```

### 批量处理优化

```javascript
// 优化前：逐个处理文件
for (const file of filesToUpload) {
  dataTransfer.items.add(file);
  this.log(`添加文件: ${file.name}`);
}

// 优化后：批量处理文件
filesToUpload.forEach(file => dataTransfer.items.add(file));
this.log(`批量添加 ${filesToUpload.length} 个文件`);
```

### 性能监控

```javascript
class PerformanceMonitor {
  static measureOperation(operationName, operation) {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();

    console.log(`${operationName} 执行时间: ${endTime - startTime}ms`);
    return result;
  }
}
```

---

## 📚 文档更新记录

### v2.1 (2025-01-21)
- ✅ 更新了实际的文件结构和架构信息
- ✅ 完善了PlatformConfigBase和MutationObserverBase基类说明
- ✅ 添加了AdapterInitializer初始化工具文档
- ✅ 更新了工厂模式集成的实际实现
- ✅ 补充了平台分类和类型检查功能
- ✅ 与实际代码结构保持100%一致

### v2.0 (2025-01-08)
- 初始版本，建立了完整的平台架构体系
- 定义了A类、B类、跨标签页三大平台分类
- 建立了统一基类架构设计

---

**文档版本：** v2.1
**最后更新：** 2025-01-21
**维护者：** MomentDots 开发团队

## 📞 技术支持

- **架构问题**: 在项目仓库提交Issue并标记为`architecture`
- **开发指导**: 参考[新平台开发指南](./new-platform-development-guide.md)
- **代码示例**: 查看`content-scripts/adapters/`目录下的实际实现
- **紧急问题**: 联系架构负责人

> 💡 **提示**: 本文档与实际代码结构保持同步更新，建议开发时对照实际代码文件进行理解。
