# MomentDots 扩展程序功能测试系统

## 📋 概述

这是一个专为 MomentDots 浏览器扩展程序设计的综合功能测试系统，用于验证扩展程序的各个模块是否正常工作，并为即将开发的短视频动态同步功能做准备。

## 🎯 测试目标

- **基类加载测试**：验证 PlatformConfigBase、FileProcessorBase、BaseClassLoader 等基类是否正确加载
- **平台适配器测试**：测试各平台适配器的初始化和基本功能
- **文件处理测试**：验证图片文件的获取、转换、验证功能
- **DOM选择器测试**：验证各平台的DOM选择器是否有效
- **错误处理测试**：测试错误处理和日志系统
- **性能测试**：检查基类访问和操作的性能表现

## 📁 文件结构

```
test/
├── README.md              # 本文档
├── test.html               # 扩展程序测试页面
└── extension-test.js       # 测试逻辑脚本
```

## 🚀 使用方法

### 快速开始

1. **获取扩展程序ID**
   - 打开 `chrome://extensions/`
   - 找到 MomentDots 扩展程序
   - 复制扩展程序ID

2. **访问测试页面**
   ```
   chrome-extension://[扩展ID]/test/test.html
   ```

   页面会自动检测扩展程序状态并显示使用说明

### 测试功能

- **全部测试**：一键执行所有测试项目
- **单项测试**：单独测试特定组件或平台
- **实时日志**：查看详细的测试过程和结果
- **报告导出**：导出JSON格式的测试报告
- **快捷操作**：快速打开主页面、侧边栏等

## 🔧 测试功能详解

### 基类系统测试

测试以下核心基类的加载状态：
- `BaseClassLoader` - 基类加载器
- `PlatformConfigBase` - 平台配置基类
- `FileProcessorBase` - 文件处理基类
- `MutationObserverBase` - DOM监听基类
- `BaseConfigManager` - 配置管理基类
- `PlatformAdapter` - 平台适配器基类

### 平台适配器测试

支持的平台：
- 🐦 微博 (WeiboAdapter)
- 📱 小红书 (XiaohongshuAdapter)
- 🎵 抖音 (DouyinAdapter)
- 💬 即刻 (JikeAdapter)
- 🐦 X平台 (XAdapter)
- 📺 Bilibili (BilibiliAdapter)
- 📹 微信视频号 (WeixinChannelsPlatformAdapter)

每个平台测试包括：
- 适配器类加载状态
- 配置管理器可用性
- 选择器配置有效性
- 文件处理器功能

### 高级测试功能

- **文件处理测试**：模拟文件上传和验证流程
- **DOM选择器测试**：验证常用选择器的有效性
- **错误处理测试**：测试错误分类和处理机制
- **性能测试**：检查基类访问性能

## 📊 测试结果解读

### 状态指示器

- 🟢 **绿色**：测试通过，功能正常
- 🔴 **红色**：测试失败，存在问题
- 🟡 **黄色**：警告状态，部分功能可用
- ⚪ **灰色**：待测试状态

### 测试报告

测试完成后会生成详细报告，包含：
- 测试统计信息（通过率、失败数等）
- 基类加载状态详情
- 各平台适配器状态
- 环境信息和时间戳

## 🛠️ 开发者使用指南

### 添加新的测试项目

1. **扩展基类测试**
   ```javascript
   // 在 extension-test.js 中添加新的基类
   this.baseClasses.push('NewBaseClass');
   ```

2. **添加新平台测试**
   ```javascript
   // 在 supportedPlatforms 数组中添加新平台
   this.supportedPlatforms.push({
     id: 'newplatform',
     name: '新平台',
     adapterClass: 'NewPlatformAdapter'
   });
   ```

3. **自定义测试逻辑**
   ```javascript
   // 重写或扩展测试方法
   async testCustomFeature() {
     // 自定义测试逻辑
   }
   ```

### 调试和日志

- 所有测试日志会显示在右侧日志面板
- 同时输出到浏览器控制台
- 支持不同级别的日志（info、success、warning、error）

### 测试报告导出

- 点击"导出报告"按钮可下载 JSON 格式的测试报告
- 报告包含完整的测试结果和环境信息
- 可用于问题诊断和性能分析

## 🔍 故障排除

### 常见问题

1. **扩展程序未加载**
   - 确保 MomentDots 扩展程序已安装并启用
   - 检查扩展程序权限设置
   - 尝试重新加载页面

2. **基类加载失败**
   - 检查 manifest.json 中的脚本加载顺序
   - 确认基类文件路径正确
   - 查看浏览器控制台的错误信息

3. **平台适配器测试失败**
   - 确认适配器文件已正确加载
   - 检查适配器类名是否匹配
   - 验证依赖的基类是否已加载

### 调试技巧

1. **使用浏览器开发者工具**
   ```javascript
   // 在控制台中检查全局对象
   console.log(window.BaseClassLoader);
   console.log(window.MomentDots);
   ```

2. **查看详细日志**
   - 打开浏览器控制台查看详细错误信息
   - 使用测试页面的日志面板监控实时状态

3. **手动测试**
   ```javascript
   // 在控制台中手动执行测试
   window.extensionTester.testBaseClasses();
   window.extensionTester.testPlatform({id: 'weibo', name: '微博', adapterClass: 'WeiboAdapter'});
   ```

## 📈 性能优化建议

1. **测试执行优化**
   - 避免同时运行过多测试
   - 使用适当的延迟避免竞态条件
   - 合理设置超时时间

2. **内存管理**
   - 及时清理测试产生的临时对象
   - 避免内存泄漏
   - 定期清空日志缓存

## 🤝 贡献指南

欢迎为测试系统贡献代码：

1. 添加新的测试用例
2. 改进测试逻辑和算法
3. 优化用户界面和体验
4. 修复发现的问题

## 📝 更新日志

### v1.0.0 (2025-01-08)
- 初始版本发布
- 支持基类系统测试
- 支持7个主要平台的适配器测试
- 提供完整的测试报告功能
- 包含高级测试功能（文件处理、性能测试等）

---

**注意**：此测试系统仅用于开发和调试目的，不会影响扩展程序的正常运行。
