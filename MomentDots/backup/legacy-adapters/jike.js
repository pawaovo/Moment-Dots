// 即刻平台适配器
console.log('即刻内容脚本已加载');

// 检查是否已经加载了基础适配器
if (typeof ImageHandler === 'undefined') {
  // 如果没有加载基础适配器，定义简化版ImageHandler
  class ImageHandler {
    // Base64转Blob
    base64ToBlob(base64Data) {
      const [header, data] = base64Data.split(',');
      const mimeType = header.match(/:(.*?);/)[1];
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    }

    // 创建File对象
    createFileFromBase64(imageData) {
      const blob = this.base64ToBlob(imageData.data);
      return new File([blob], imageData.name, {
        type: imageData.type,
        lastModified: imageData.lastModified || Date.now()
      });
    }

    // 注入到文件输入控件
    async injectToFileInput(selector, files) {
      const fileInput = document.querySelector(selector);

      if (!fileInput) {
        throw new Error('文件输入控件未找到');
      }

      // 使用DataTransfer API
      const dataTransfer = new DataTransfer();

      files.forEach(file => {
        dataTransfer.items.add(file);
      });

      // 设置files属性
      fileInput.files = dataTransfer.files;

      // 触发change事件
      fileInput.dispatchEvent(new Event('change', {
        bubbles: true,
        cancelable: true
      }));

      // 触发input事件
      fileInput.dispatchEvent(new Event('input', {
        bubbles: true,
        cancelable: true
      }));

      return true;
    }
  }
}

class JikeAdapter {
  constructor() {
    this.platform = 'jike';
    // 基于实际测试的准确选择器
    this.selectors = {
      // 文本输入 - 即刻使用contenteditable div
      contentInput: 'div[contenteditable="true"]',

      // 图片上传
      imageUpload: 'input[type="file"]',

      // 发布按钮
      publishButton: 'button', // 需要通过文本内容筛选

      // 圈子选择器
      circleSelector: 'input[placeholder*="圈子"]',

      // 登录状态检测
      loginIndicators: [
        'div[contenteditable="true"]',
        'button:contains("发送")'
      ]
    };

    // 初始化图片处理器
    this.imageHandler = new ImageHandler();
  }

  async waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
          return;
        }
        
        setTimeout(check, 100);
      };
      
      check();
    });
  }

  // 检查登录状态
  async checkLoginStatus() {
    console.log('检查即刻登录状态...');

    try {
      await this.waitForElement(this.selectors.contentInput, 3000);
      console.log('用户已登录即刻');
      return true;
    } catch (e) {
      throw new Error('用户未登录即刻或页面加载异常');
    }
  }

  // 等待页面完全加载
  async waitForPageReady() {
    console.log('等待即刻页面加载完成...');

    // 等待关键元素加载
    await this.waitForElement(this.selectors.contentInput, 15000);

    // 等待页面稳定
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('即刻页面加载完成');
  }

  // 填充文本内容 - 适配contenteditable div
  async fillTextContent(data) {
    console.log('开始填充文本内容...');

    const textInput = await this.waitForElement(this.selectors.contentInput);

    // 清空现有内容
    textInput.innerHTML = '';
    textInput.focus();

    // 构建完整内容 (即刻没有标题字段)
    const fullContent = data.content;

    // 模拟真实用户逐字符输入
    await this.typeText(textInput, fullContent);

    console.log('文本内容填充完成:', fullContent);
  }

  // 逐字符输入模拟真实用户行为 - 适配contenteditable
  async typeText(element, text, options = {}) {
    const { delay = 50, randomDelay = true } = options;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // 对于contenteditable，使用textContent
      element.textContent = element.textContent + char;

      // 触发输入事件
      element.dispatchEvent(new Event('input', { bubbles: true }));

      // 随机延迟模拟人类输入
      const currentDelay = randomDelay ?
        delay + Math.random() * 30 : delay;
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }

    // 触发change事件
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 上传图片
  async uploadImages(images) {
    if (!images || images.length === 0) {
      console.log('没有图片需要上传');
      return;
    }

    console.log('开始上传图片，数量:', images.length);

    const fileInput = await this.waitForElement(this.selectors.imageUpload);

    // 转换Base64图片为File对象
    const files = images.map(imageData =>
      this.imageHandler.createFileFromBase64(imageData)
    );

    // 注入到文件输入控件
    await this.imageHandler.injectToFileInput(this.selectors.imageUpload, files);

    // 等待图片上传完成
    await this.waitForImageUpload();

    console.log('图片上传完成');
  }

  // 等待图片上传完成
  async waitForImageUpload() {
    try {
      // 即刻的图片上传比较快，等待一下即可
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('图片上传处理完成');
    } catch (error) {
      throw new Error('图片上传失败或超时');
    }
  }

  // 等待发布按钮可用
  async waitForPublishReady() {
    console.log('等待发布按钮变为可用状态...');

    // 查找发送按钮
    const buttons = document.querySelectorAll('button');
    let sendButton = null;

    for (const btn of buttons) {
      if (btn.textContent.includes('发送')) {
        sendButton = btn;
        break;
      }
    }

    if (!sendButton) {
      throw new Error('未找到发送按钮');
    }

    // 等待按钮启用
    let attempts = 0;
    while (sendButton.disabled && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    console.log('发布按钮已准备就绪');
  }

  // 点击发布按钮
  async clickPublishButton() {
    console.log('点击发布按钮...');

    // 查找发送按钮
    const buttons = document.querySelectorAll('button');
    let sendButton = null;

    for (const btn of buttons) {
      if (btn.textContent.includes('发送')) {
        sendButton = btn;
        break;
      }
    }

    if (!sendButton) {
      throw new Error('未找到发送按钮');
    }

    // 模拟真实点击
    sendButton.click();

    console.log('发布按钮已点击');
  }

  // 验证发布结果
  async verifyPublishResult() {
    console.log('验证发布结果...');

    // 等待发布完成
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 即刻发布成功后通常会清空输入框
    const textInput = document.querySelector(this.selectors.contentInput);
    if (textInput && textInput.textContent.trim() === '') {
      console.log('发布验证通过 - 输入框已清空');
    }

    return {
      publishTime: new Date().toISOString(),
      platform: 'jike'
    };
  }

  // 主预填充方法（不执行发布）
  async publish(data) {
    console.log('开始即刻内容预填充流程:', data);

    try {
      // 1. 检查登录状态
      await this.checkLoginStatus();

      // 2. 等待页面完全加载
      await this.waitForPageReady();

      // 3. 填充文本内容
      if (data.content) {
        await this.fillTextContent(data);
      }

      // 4. 上传图片
      if (data.images && data.images.length > 0) {
        await this.uploadImages(data.images);
      }

      // 5. 验证发布按钮状态（但不点击）
      await this.waitForPublishReady();

      console.log('即刻内容预填充完成，等待用户手动发布');

      return {
        success: true,
        message: '内容预填充完成，请手动确认并发布',
        url: window.location.href,
        action: 'prefilled' // 标记为预填充完成
      };

    } catch (error) {
      console.error('即刻内容预填充失败:', error);
      return {
        success: false,
        message: error.message || '内容预填充失败'
      };
    }
  }
}

// 创建适配器实例
const jikeAdapter = new JikeAdapter();

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('即刻内容脚本收到消息:', message);
  
  if (message.action === 'publish') {
    jikeAdapter.publish(message.data)
      .then(result => {
        console.log('即刻发布结果:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('即刻发布错误:', error);
        sendResponse({
          success: false,
          message: error.message || '发布失败'
        });
      });
    
    return true; // 保持消息通道开放
  }
});

console.log('即刻适配器初始化完成');
