# 动态发布助手

一键发布动态到微博、小红书、即刻、抖音等多个平台的Chrome浏览器扩展程序。

## 功能特点

- 🚀 **一键发布**: 支持同时向多个平台发布内容
- 📱 **多平台支持**: 微博、小红书、即刻、抖音
- 🎯 **智能适配**: 自动适配各平台的发布界面
- 📊 **状态监控**: 实时显示发布进度和结果
- 🔄 **失败重试**: 支持单独重试失败的平台
- 💾 **数据保存**: 自动保存输入内容，防止丢失

## 安装方法

### 开发者模式安装

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `MomentDots` 文件夹
6. 扩展程序安装完成

### 生成图标文件

1. 在浏览器中打开 `create-icons.html` 文件
2. 点击"生成图标"按钮
3. 下载生成的图标文件到 `assets` 目录

## 使用方法

### 第一步：输入内容
1. 点击浏览器工具栏中的扩展图标
2. 在弹出的主页面中输入标题和内容
3. 可选择上传图片
4. 选择要发布的平台

### 第二步：开始发布
1. 点击"开始同步"按钮
2. 扩展会自动打开侧边栏显示发布状态
3. 系统会依次打开各平台页面进行自动发布

### 第三步：监控状态
1. 在侧边栏中查看各平台的发布进度
2. 发布成功的平台会显示绿色状态
3. 发布失败的平台可以点击"重试"按钮

## 支持的平台

| 平台 | 状态 | 发布URL |
|------|------|---------|
| 微博 | ✅ 支持 | https://weibo.com/compose |
| 小红书 | ✅ 支持 | https://creator.xiaohongshu.com/new/home |
| 即刻 | ✅ 支持 | https://web.okjike.com |
| 抖音 | ✅ 支持 | https://creator.douyin.com/creator-micro/content/upload |

## 注意事项

1. **登录状态**: 使用前请确保已登录各个平台
2. **网络环境**: 确保网络连接稳定
3. **页面保持**: 发布过程中请保持浏览器页面打开
4. **内容规范**: 请遵守各平台的内容发布规范

## 开发信息

- **技术栈**: Chrome Extension Manifest V3, React, TypeScript
- **开发模式**: 原生Chrome扩展开发
- **构建工具**: 手动编译 + Plasmo (仅用于最终打包)

## 项目结构

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
├── content-scripts/       # 内容脚本
│   └── adapters/
│       ├── weibo.js
│       ├── xiaohongshu.js
│       ├── jike.js
│       ├── douyin.js
│       ├── weixinchannels.js
│       └── ...
├── shared/               # 共享组件和工具
├── styles/               # 样式文件
├── assets/               # 静态资源
├── docs/                 # 技术文档
└── README.md
```

## 版本历史

### v1.0.0 (当前版本)
- 基础发布功能
- 支持四个主要平台
- 状态监控和重试机制
- 数据持久化保存

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 项目地址: [GitHub Repository]
- 邮箱: [Your Email]
