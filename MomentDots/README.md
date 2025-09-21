# MomentDots - 动态发布助手

一键发布动态到微博、小红书、即刻、抖音、X、Bilibili、微信视频号、微信公众号等多个平台的Chrome浏览器扩展程序。

## ✨ 功能特点

- 🚀 **一键发布**: 支持同时向多个平台发布内容
- 📱 **多平台支持**: 支持8个主流社交媒体平台
- 🎯 **智能适配**: 自动适配各平台的发布界面和特殊技术要求
- 📊 **状态监控**: 实时显示发布进度和结果
- 🔄 **失败重试**: 支持单独重试失败的平台
- 💾 **数据保存**: 自动保存输入内容，防止丢失
- 📖 **文章抓取**: 基于Mozilla Readability算法，支持抓取微信公众号、知乎等平台文章
- 🗂️ **大文件支持**: IndexedDB + Web Worker架构，支持大文件传输优化

## 🌐 支持的平台

### A类平台（直接注入型）
| 平台 | 状态 | 特殊技术 |
|------|------|----------|
| 微博 | ✅ 支持 | 标准DOM操作 |
| 即刻 | ✅ 支持 | 标准DOM操作 |
| X (Twitter) | ✅ 支持 | 标准DOM操作 |
| Bilibili | ✅ 支持 | 标准DOM操作 |
| 微信视频号 | ✅ 支持 | Shadow DOM处理 |

### B类平台（多步骤操作型）
| 平台 | 状态 | 特殊技术 |
|------|------|----------|
| 小红书 | ✅ 支持 | 多步骤页面跳转 |
| 抖音 | ✅ 支持 | 多步骤页面跳转 |

### 跨标签页平台
| 平台 | 状态 | 特殊技术 |
|------|------|----------|
| 微信公众号 | ✅ 支持 | 跨标签页通信 |

**总计：8个平台**

## 🚀 快速开始

### 安装方法

#### 开发者模式安装
1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `MomentDots` 文件夹
6. 扩展程序安装完成

### 使用方法

#### 基础发布流程
1. **输入内容**
   - 点击浏览器工具栏中的扩展图标
   - 在主页面中输入标题和内容
   - 可选择上传图片或视频
   - 选择要发布的平台

2. **开始发布**
   - 点击"开始同步"按钮
   - 扩展会自动打开侧边栏显示发布状态
   - 系统会依次打开各平台页面进行自动发布

3. **监控状态**
   - 在侧边栏中查看各平台的发布进度
   - 发布成功的平台会显示绿色状态
   - 发布失败的平台可以点击"重试"按钮

#### 文章抓取功能
1. 切换到"文章"标签页
2. 输入文章链接（支持微信公众号、知乎、即刻等）
3. 点击"获取文章"按钮
4. 系统自动抓取并解析文章内容
5. 一键填充到编辑器或复制使用

## 🛠️ 技术架构

### 技术栈
- **核心技术**: Chrome Extension Manifest V3
- **前端技术**: 原生JavaScript (ES6+)、HTML5、CSS3
- **样式框架**: Tailwind CSS
- **状态管理**: Zustand
- **构建工具**: TypeScript编译器、Tailwind CSS
- **开发工具**: Node.js、npm

### 架构设计
- **统一基类架构**: 所有平台适配器遵循统一的基类架构
- **平台分类体系**: A类/B类/跨标签页三大类平台
- **模块化设计**: 每个平台独立适配器，便于维护和扩展
- **性能优化**: 高效的DOM操作和异步处理机制

### 核心组件
- **主页面** (`main/`): 内容输入和文件管理
- **侧边栏** (`sidepanel/`): 状态监控和进度显示
- **后台脚本** (`background/`): 平台协调和文件传输
- **内容脚本** (`content-scripts/`): 平台适配器
- **共享组件** (`shared/`): 通用工具和服务

## 📁 项目结构

```
MomentDots/
├── manifest.json          # 扩展配置文件
├── main/                  # 主页面 (内容输入)
│   ├── main.html
│   └── main.js
├── sidepanel/             # 侧边栏 (状态监控)
│   ├── sidepanel.html
│   └── sidepanel.js
├── background/            # 后台脚本
│   └── background.js
├── content-scripts/       # 内容脚本和平台适配器
│   ├── shared/           # 共享基类和工具
│   └── adapters/         # 各平台适配器
│       ├── weibo.js
│       ├── xiaohongshu.js
│       ├── jike.js
│       ├── douyin.js
│       ├── x.js
│       ├── bilibili.js
│       ├── weixinchannels.js
│       ├── weixin-home.js
│       └── weixin-edit.js
├── shared/               # 共享组件和工具
│   ├── config/          # 平台配置
│   ├── services/        # 核心服务
│   ├── utils/           # 工具函数
│   └── workers/         # Web Worker
├── styles/               # 样式文件
├── assets/               # 静态资源
├── libs/                 # 第三方库
│   └── readability/     # Mozilla Readability
├── docs/                 # 技术文档
└── README.md
```

## 🔧 开发指南

### 环境要求
- Node.js v16.0+
- Chrome浏览器（开发者版本或Canary版本推荐）
- Git

### 开发命令
```bash
# 安装依赖
npm install

# 开发模式（TypeScript监听）
npm run dev

# 构建项目
npm run build

# 构建样式（Tailwind CSS监听）
npm run build:css

# 清理构建文件
npm run clean
```

### 开发流程
1. 克隆项目到本地
2. 安装依赖：`npm install`
3. 启动开发模式：`npm run dev`
4. 在Chrome中加载扩展程序
5. 修改代码后刷新扩展程序

## 📚 文档导航

### 技术文档
- [平台架构指南](./docs/platform-architecture-guide.md) - 完整的平台分类体系和架构设计
- [新平台开发指南](./docs/new-platform-development-guide.md) - 如何添加新平台支持
- [文章抓取功能](./docs/article-extraction-solution.md) - Mozilla Readability集成方案
- [大文件传输优化](./docs/large-file-transfer-optimization-plan.md) - IndexedDB + Web Worker方案

### 快速参考
- [文档中心](./docs/README.md) - 完整的文档导航和快速入门

## ⚠️ 注意事项

1. **登录状态**: 使用前请确保已登录各个平台
2. **网络环境**: 确保网络连接稳定
3. **页面保持**: 发布过程中请保持浏览器页面打开
4. **内容规范**: 请遵守各平台的内容发布规范
5. **文件大小**: 大文件（>100MB）会自动使用优化传输方案

## 🎯 版本信息

### v2.0 (当前版本) - 2025-01-08
- ✅ 支持8个主流平台
- ✅ 统一基类架构重构
- ✅ 文章抓取功能 (Mozilla Readability)
- ✅ 大文件传输优化 (IndexedDB + Web Worker)
- ✅ Shadow DOM处理支持 (微信视频号)
- ✅ 跨标签页通信 (微信公众号)
- ✅ 平台分类体系 (A类/B类/跨标签页)

### v1.0.0 - 初始版本
- 基础发布功能
- 支持4个主要平台
- 状态监控和重试机制
- 数据持久化保存

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

### 贡献指南
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📞 联系方式

- **项目地址**: [GitHub Repository]
- **技术问题**: 在项目仓库提交Issue
- **功能建议**: 联系开发团队
- **紧急问题**: 联系项目负责人

---

**MomentDots v2.0** - 让内容创作更高效 🚀
