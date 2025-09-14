# MomentDots 平台架构指南

**版本：** v2.0  
**更新日期：** 2025-01-08  
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

MomentDots是一个Chrome浏览器扩展程序，旨在实现**一键发布动态到多个社交媒体平台**。项目采用统一的架构模式，支持微博、小红书、即刻、抖音、X、Bilibili、微信公众号和微信视频号等多个平台。

### 核心设计原则

- **统一架构**：所有平台适配器遵循统一的基类架构
- **模块化设计**：每个平台独立适配器，便于维护和扩展
- **代码复用**：最大化代码复用，最小化重复实现
- **性能优化**：高效的DOM操作和异步处理机制

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

### PlatformAdapter 基类

所有A类和B类平台的核心基类，提供统一的接口和通用功能。

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

提供统一的配置管理机制。

```javascript
class PlatformConfigBase {
  constructor(platformId) {
    this.platformId = platformId;
  }

  createDelayConfig(delays) {
    return {
      FAST_CHECK: delays.FAST_CHECK || 200,
      NORMAL_WAIT: delays.NORMAL_WAIT || 500,
      UPLOAD_WAIT: delays.UPLOAD_WAIT || 1500,
      ELEMENT_WAIT: delays.ELEMENT_WAIT || 3000
    };
  }

  createLimitsConfig(limits) {
    return {
      maxContentLength: limits.maxContentLength || 2000,
      maxTitleLength: limits.maxTitleLength || 100,
      maxMediaFiles: limits.maxMediaFiles || 9,
      allowedImageTypes: limits.allowedImageTypes || ['image/jpeg', 'image/png'],
      maxFileSize: limits.maxFileSize || 10 * 1024 * 1024
    };
  }
}
```

### MutationObserverBase 监听基类

提供统一的DOM变化监听机制。

```javascript
class MutationObserverBase {
  constructor(platformId) {
    this.platformId = platformId;
    this.observer = null;
  }

  startObserving() {
    // 启动DOM监听
  }

  stopObserving() {
    // 停止DOM监听
  }

  checkElements() {
    // 检查关键元素是否就绪
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

```javascript
class PlatformAdapterFactory {
  static createAdapter(platform) {
    // A类平台
    if (['jike', 'weibo', 'x', 'bilibili'].includes(platform)) {
      return new window[`${platform.charAt(0).toUpperCase() + platform.slice(1)}PlatformAdapter`]();
    }

    // 微信视频号（A类特殊实现）
    if (platform === 'weixinchannels') {
      if (window.WeixinChannelsPlatformAdapter) {
        return new window.WeixinChannelsPlatformAdapter();
      }
    }

    // B类平台
    if (['xiaohongshu', 'douyin'].includes(platform)) {
      return new window[`${platform.charAt(0).toUpperCase() + platform.slice(1)}PlatformAdapter`]();
    }

    // 跨标签页平台
    if (platform === 'weixin') {
      throw new Error('微信公众号平台使用跨标签页机制，请通过Background Script处理');
    }

    throw new Error(`不支持的平台: ${platform}`);
  }

  static getSupportedPlatforms() {
    return ['jike', 'weibo', 'douyin', 'xiaohongshu', 'x', 'bilibili', 'weixinchannels', 'weixin'];
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

**文档版本：** v2.0
**最后更新：** 2025-01-08
**维护者：** MomentDots 开发团队
