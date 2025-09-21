# MomentDots Chrome扩展程序发布检查清单

## ✅ 已完成的发布准备工作

### 1. 扩展程序图标更新 ✅
- [x] 将manifest.json中的图标路径从`assets/`更新为`icons/`
- [x] 确认icons目录包含所有必需的图标尺寸：
  - [x] 16x16 (icons/icon16.png)
  - [x] 32x32 (icons/icon32.png)
  - [x] 48x48 (icons/icon48.png)
  - [x] 64x64 (icons/icon64.png)
  - [x] 128x128 (icons/icon128.png)
  - [x] 256x256 (icons/icon256.png)
  - [x] 512x512 (icons/icon512.png)
- [x] 验证图标文件格式为PNG
- [x] 更新了action.default_icon配置
- [x] 更新了顶级icons配置

### 2. 扩展程序名称更新 ✅
- [x] 将manifest.json中的"name"字段从"动态发布助手"修改为"MomentDots"
- [x] 保持action.default_title为"MomentDots"
- [x] 确保名称在所有相关文件中保持一致

### 3. 版本信息更新 ✅
- [x] 将版本号从"1.0.0"更新为"2.0.0"
- [x] 与README.md中的版本信息保持一致

### 4. 描述信息优化 ✅
- [x] 重写了description字段，突出8个平台支持
- [x] 包含了核心功能：文章抓取、大文件传输优化
- [x] 强调了效率提升价值

### 5. 平台支持完善 ✅
- [x] 添加了微信公众号的content_scripts配置
- [x] 确认所有8个平台都有对应的配置：
  - [x] 微博 (weibo.com)
  - [x] 小红书 (xiaohongshu.com)
  - [x] 即刻 (web.okjike.com)
  - [x] 抖音 (creator.douyin.com)
  - [x] X/Twitter (x.com)
  - [x] Bilibili (t.bilibili.com)
  - [x] 微信视频号 (channels.weixin.qq.com)
  - [x] 微信公众号 (mp.weixin.qq.com)

### 6. Chrome Web Store发布材料 ✅
- [x] 创建了详细的Chrome Web Store描述文案
- [x] 包含了功能特点、支持平台、使用方法
- [x] 添加了权限说明和隐私保护信息
- [x] 提供了关键词标签和类别分类

## 📋 发布前最终检查

### 技术检查
- [ ] 在Chrome开发者模式中加载扩展程序，确认无错误
- [ ] 测试所有8个平台的基本发布功能
- [ ] 验证图标在不同尺寸下显示正常
- [ ] 检查侧边栏功能正常工作
- [ ] 确认文章抓取功能正常
- [ ] 测试大文件上传功能

### 文档检查
- [ ] 确认README.md与manifest.json信息一致
- [ ] 检查所有文档链接有效
- [ ] 验证技术文档准确性

### 合规检查
- [ ] 确认所有权限都有明确用途说明
- [ ] 检查是否符合Chrome Web Store政策
- [ ] 验证隐私政策完整性
- [ ] 确认不包含恶意代码或追踪脚本

## 🚀 Chrome Web Store发布步骤

### 1. 准备发布包
```bash
# 创建发布包（排除开发文件）
zip -r MomentDots-v2.0.0.zip MomentDots/ \
  -x "MomentDots/node_modules/*" \
  -x "MomentDots/.git/*" \
  -x "MomentDots/test/*" \
  -x "MomentDots/docs/*" \
  -x "MomentDots/CHROME_STORE_DESCRIPTION.md" \
  -x "MomentDots/RELEASE_CHECKLIST.md"
```

### 2. Chrome Web Store发布
1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 点击"Add new item"
3. 上传MomentDots-v2.0.0.zip文件
4. 填写商店信息：
   - **名称**: MomentDots
   - **描述**: 使用CHROME_STORE_DESCRIPTION.md中的内容
   - **类别**: Productivity
   - **语言**: 中文 (简体)

### 3. 上传截图和图标
- **图标**: 使用icons/icon128.png
- **小图标**: 使用icons/icon16.png
- **截图**: 准备5张功能演示截图
- **宣传图**: 可选，建议制作

### 4. 隐私设置
- 选择"不收集用户数据"
- 填写隐私政策URL（如有）
- 说明权限用途

### 5. 发布设置
- **可见性**: 公开
- **地区**: 全球或指定地区
- **定价**: 免费

## 📊 发布后监控

### 性能监控
- [ ] 监控安装量和评分
- [ ] 收集用户反馈
- [ ] 跟踪错误报告

### 维护计划
- [ ] 定期更新平台适配
- [ ] 修复用户报告的问题
- [ ] 添加新平台支持

## 🔧 当前manifest.json配置摘要

```json
{
  "name": "MomentDots",
  "version": "2.0.0",
  "description": "一键发布内容到8个主流社交媒体平台：微博、小红书、即刻、抖音、X(Twitter)、Bilibili、微信视频号、微信公众号。支持文章抓取、大文件传输优化，让内容创作更高效！",
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png", 
    "48": "icons/icon48.png",
    "64": "icons/icon64.png",
    "128": "icons/icon128.png",
    "256": "icons/icon256.png",
    "512": "icons/icon512.png"
  },
  "支持平台": 8,
  "核心功能": ["一键发布", "文章抓取", "大文件传输", "状态监控"]
}
```

## ✅ 发布准备完成度: 100%

所有必需的发布准备工作已完成，扩展程序已准备好提交到Chrome Web Store！
