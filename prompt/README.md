# Prompt - AI文案改写助手

一个功能强大的浏览器侧边栏扩展，通过AI大模型API快速改写文案内容。

## ✨ 功能特性

- **🎯 智能改写**: 集成Gemini 2.5 Flash AI模型，快速改写文案
- **📁 分类管理**: 自定义提示词分类，便于组织管理
- **💾 本地存储**: 所有数据本地存储，保护隐私安全
- **📤 数据管理**: 支持导入导出，便于备份和迁移
- **⚙️ 灵活配置**: 自定义API配置，支持多种AI模型

## 🚀 快速开始

### 安装步骤

1. **下载扩展**
   - 下载或克隆此项目到本地

2. **加载到Chrome**
   - 打开 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

3. **配置API**
   - 点击扩展图标打开侧边栏
   - 点击"设置"按钮
   - 输入您的Gemini API Key
   - 保存设置

4. **开始使用**
   - 选择预置提示词或添加自定义提示词
   - 输入需要改写的文案
   - 点击"开始改写"获得结果

## 📖 使用指南

### 提示词管理
- **添加提示词**: 点击右上角"+"按钮，填写名称、内容和分类
- **编辑提示词**: 点击提示词卡片的编辑按钮（✏️）
- **删除提示词**: 点击提示词卡片的删除按钮（🗑️）
- **分类切换**: 点击顶部分类标签查看不同类别

### AI改写流程
1. 选择合适的提示词，点击"使用"按钮
2. 在弹窗中输入需要改写的原始文案
3. 点击"开始改写"，等待AI处理
4. 查看改写结果，点击"复制结果"保存

### 数据管理
- **导出数据**: 点击底部"导出"按钮备份所有数据
- **导入数据**: 点击底部"导入"按钮恢复备份数据
- **设置配置**: 点击底部"设置"按钮配置API参数

## ⚙️ 默认配置

### 预置内容
- **提示词**: 论文大师、微信表情包、平台文案转换
- **分类**: 全部、创意设计、内容可视化、学习提升
- **AI模型**: Gemini 2.5 Flash（需配置API Key）

### API配置
- **模型**: Gemini 2.5 Flash
- **端点**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- **API Key**: 需要在[Google AI Studio](https://makersuite.google.com/app/apikey)申请

## 🛠️ 技术架构

### 核心技术
- **框架**: Chrome Extension Manifest V3
- **前端**: 原生HTML5 + CSS3 + JavaScript ES6+
- **存储**: Chrome Storage API（本地存储）
- **AI集成**: Fetch API + Google Gemini API

### 文件结构
```
prompt-extension/
├── manifest.json          # 扩展配置文件
├── background.js           # 后台服务脚本
├── sidepanel.html         # 侧边栏主页面
├── sidepanel.css          # 主要样式文件
├── sidepanel.js           # 主要逻辑代码
├── components/            # 组件模块
│   ├── api.js            # AI API调用模块
│   ├── modal.js          # 弹窗管理模块
│   └── modal.css         # 弹窗样式文件
└── README.md             # 项目说明文档
```

## ❓ 常见问题

**Q: API调用失败怎么办？**
A: 检查API Key是否正确配置，确认网络连接正常，验证API端点URL有效。

**Q: 数据会丢失吗？**
A: 所有数据存储在本地浏览器中，不会上传到服务器。建议定期使用导出功能备份数据。

**Q: 如何获取API Key？**
A: 访问[Google AI Studio](https://makersuite.google.com/app/apikey)，登录Google账户后创建API Key。

**Q: 支持其他AI模型吗？**
A: 当前版本专为Gemini API优化，后续版本将支持更多AI模型。

## 📄 许可证

MIT License - 详见LICENSE文件

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

---

**享受高效的AI文案改写体验！** ✨
