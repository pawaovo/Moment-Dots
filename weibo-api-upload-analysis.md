# 微博视频上传API分析与实现方案

## 🔍 **发现的关键API**

### 1. **文件上传初始化API**
```
POST https://fileplatform-cn1.api.weibo.com/2/fileplatform/init.json
```

**参数分析：**
- `source=339644097` - 应用来源ID
- `size=34` - 文件大小（字节）
- `name=test-video.mp4` - 文件名
- `type=video` - 文件类型
- `client=web` - 客户端类型
- `session_id=559869957fbca6cc72aaf4dbaeead7e4` - 会话ID

### 2. **多媒体调度API**
```
POST https://weibo.com/ajax/multimedia/dispatch?
```

### 3. **媒体组初始化API**
```
GET https://weibo.com/ajax/multimedia/mediaGroupInit
```

## 💡 **扩展程序API上传实现方案**

### **方案优势**
✅ **绕过文件大小限制**：不需要在扩展程序中处理大文件
✅ **直接服务器上传**：文件直接从用户本地上传到微博服务器
✅ **真实用户行为**：完全模拟用户的正常上传流程
✅ **支持大文件**：理论上支持GB级别的视频文件
✅ **断点续传**：可以实现分片上传和断点续传

### **技术实现架构**

```javascript
class WeiboAPIUploader {
  constructor() {
    this.baseURL = 'https://fileplatform-cn1.api.weibo.com';
    this.webURL = 'https://weibo.com';
    this.sessionId = this.generateSessionId();
  }

  // 1. 获取上传凭证
  async getUploadCredentials(file) {
    const response = await fetch(`${this.webURL}/ajax/multimedia/dispatch?`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include' // 包含cookies
    });
    return response.json();
  }

  // 2. 初始化文件上传
  async initFileUpload(file) {
    const params = new URLSearchParams({
      source: '339644097',
      size: file.size,
      name: file.name,
      type: 'video',
      client: 'web',
      session_id: this.sessionId
    });

    const response = await fetch(`${this.baseURL}/2/fileplatform/init.json?${params}`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include'
    });
    
    return response.json();
  }

  // 3. 分片上传文件
  async uploadFileChunks(file, uploadInfo) {
    const chunkSize = 1024 * 1024 * 5; // 5MB per chunk
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      await this.uploadChunk(chunk, i, totalChunks, uploadInfo);
    }
  }

  // 4. 上传单个分片
  async uploadChunk(chunk, index, total, uploadInfo) {
    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('chunk', index);
    formData.append('chunks', total);
    formData.append('upload_id', uploadInfo.upload_id);
    
    const response = await fetch(uploadInfo.upload_url, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    return response.json();
  }

  // 5. 完成上传
  async completeUpload(uploadInfo) {
    const response = await fetch(`${this.baseURL}/2/fileplatform/complete.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        upload_id: uploadInfo.upload_id,
        session_id: this.sessionId
      }),
      credentials: 'include'
    });
    
    return response.json();
  }

  // 主上传方法
  async uploadVideo(file) {
    try {
      // 1. 获取上传凭证
      const credentials = await this.getUploadCredentials(file);
      
      // 2. 初始化上传
      const uploadInfo = await this.initFileUpload(file);
      
      // 3. 分片上传
      await this.uploadFileChunks(file, uploadInfo);
      
      // 4. 完成上传
      const result = await this.completeUpload(uploadInfo);
      
      return {
        success: true,
        fileId: result.file_id,
        url: result.url
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

## 🚀 **在扩展程序中的集成方案**

### **1. 修改微博适配器**

```javascript
// 在 weibo.js 中添加
class WeiboAdapter extends PlatformAdapter {
  async publishVideoContent(data) {
    const files = data.files || [];
    
    for (const file of files) {
      if (this.isVideoFile(file)) {
        // 使用API上传而不是拖拽上传
        const uploadResult = await this.uploadVideoViaAPI(file);
        
        if (uploadResult.success) {
          // 上传成功后，将文件ID注入到页面
          await this.injectUploadedVideo(uploadResult.fileId);
        }
      }
    }
  }

  async uploadVideoViaAPI(file) {
    const uploader = new WeiboAPIUploader();
    return await uploader.uploadVideo(file);
  }

  async injectUploadedVideo(fileId) {
    // 将已上传的视频ID注入到页面的隐藏字段中
    // 这样页面就知道视频已经上传完成
  }
}
```

### **2. 权限配置**

在 `manifest.json` 中添加：
```json
{
  "permissions": [
    "https://fileplatform-cn1.api.weibo.com/*",
    "https://weibo.com/*"
  ]
}
```

## 🎯 **实现优势对比**

| 方案 | 文件大小限制 | 上传速度 | 实现复杂度 | 稳定性 |
|------|-------------|----------|------------|--------|
| **DataTransfer API** | ❌ 受扩展程序内存限制 | ⚠️ 中等 | ✅ 简单 | ✅ 高 |
| **拖拽上传** | ❌ 受扩展程序内存限制 | ⚠️ 中等 | ⚠️ 中等 | ⚠️ 中等 |
| **直接API调用** | ✅ 无限制 | ✅ 最快 | ❌ 复杂 | ✅ 最高 |

## 🔧 **下一步实现计划**

1. **API逆向工程**：完整分析微博的上传API流程
2. **认证机制**：处理cookies、CSRF token等认证
3. **错误处理**：实现重试、断点续传等机制
4. **进度监控**：实现上传进度显示
5. **兼容性测试**：确保在不同浏览器中正常工作

这种方案确实可以实现GB级别大文件的高效上传，是最理想的解决方案！
