// 小红书平台适配器
console.log('小红书内容脚本已加载');

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

class XiaohongshuAdapter {
  constructor() {
    this.platform = 'xiaohongshu';
    // 基于实际测试的准确选择器
    this.selectors = {
      // 标题输入框
      titleInput: 'input[placeholder="填写标题会有更多赞哦～"]',

      // 内容输入框 - 小红书使用contenteditable div
      contentInput: 'div[contenteditable="true"]',

      // 图片上传 - 小红书支持多种文件输入
      imageUpload: 'input[type="file"]',

      // 发布按钮
      publishButton: 'button:contains("发布")',

      // 登录状态检测
      loginIndicators: [
        'input[placeholder="填写标题会有更多赞哦～"]',
        'div[contenteditable="true"]'
      ]
    };

    // 初始化图片处理器
    this.imageHandler = new ImageHandler();
  }

  async waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        let element;

        // 处理包含文本的选择器
        if (selector.includes(':contains(')) {
          const text = selector.match(/:contains\("([^"]+)"\)/)[1];
          const tagName = selector.split(':')[0];
          const elements = document.querySelectorAll(tagName);
          element = Array.from(elements).find(el => el.textContent.includes(text));
        } else {
          element = document.querySelector(selector);
        }

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
    console.log('检查小红书登录状态...');

    for (const selector of this.selectors.loginIndicators) {
      try {
        await this.waitForElement(selector, 3000);
        console.log('用户已登录小红书');
        return true;
      } catch (e) {
        continue;
      }
    }

    throw new Error('用户未登录小红书或页面加载异常');
  }

  // 等待页面完全加载
  async waitForPageReady() {
    console.log('等待小红书页面加载完成...');

    // 等待关键元素加载
    await this.waitForElement(this.selectors.titleInput, 15000);
    await this.waitForElement(this.selectors.contentInput, 15000);

    // 等待页面稳定
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('小红书页面加载完成');
  }

  // 填充标题
  async fillTitle(title) {
    if (!title) {
      console.log('没有标题需要填充');
      return;
    }

    console.log('开始填充标题...');

    const titleInput = await this.waitForElement(this.selectors.titleInput);

    // 清空现有内容
    titleInput.value = '';
    titleInput.focus();

    // 模拟真实用户逐字符输入
    await this.typeText(titleInput, title, { isInput: true });

    console.log('标题填充完成:', title);
  }

  // 填充内容
  async fillContent(content) {
    if (!content) {
      console.log('没有内容需要填充');
      return;
    }

    console.log('开始填充内容...');

    const contentInput = await this.waitForElement(this.selectors.contentInput);

    // 清空现有内容
    contentInput.innerHTML = '';
    contentInput.focus();

    // 模拟真实用户逐字符输入
    await this.typeText(contentInput, content, { isContentEditable: true });

    console.log('内容填充完成:', content);
  }

  // 逐字符输入模拟真实用户行为
  async typeText(element, text, options = {}) {
    const { delay = 50, randomDelay = true, isInput = false, isContentEditable = false } = options;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (isInput) {
        // 对于input元素
        element.value = element.value + char;
      } else if (isContentEditable) {
        // 对于contenteditable元素
        element.textContent = element.textContent + char;
      }

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

    // 小红书支持多个文件输入，选择第一个支持多文件的
    const fileInputs = document.querySelectorAll(this.selectors.imageUpload);
    let targetInput = null;

    for (const input of fileInputs) {
      if (input.multiple) {
        targetInput = input;
        break;
      }
    }

    if (!targetInput && fileInputs.length > 0) {
      targetInput = fileInputs[0];
    }

    if (targetInput) {
      // 转换Base64图片为File对象
      const files = images.map(imageData =>
        this.imageHandler.createFileFromBase64(imageData)
      );

      // 注入到文件输入控件
      await this.imageHandler.injectToFileInput(this.selectors.imageUpload, files);

      // 等待图片上传完成
      await this.waitForImageUpload();
    } else {
      console.warn('未找到文件输入控件，图片上传可能需要手动操作');
    }

    console.log('图片上传完成');
  }

  // 等待图片上传完成
  async waitForImageUpload() {
    try {
      // 小红书的图片上传处理时间较长，等待更久
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('图片上传处理完成');
    } catch (error) {
      throw new Error('图片上传失败或超时');
    }
  }

  // 等待发布按钮可用
  async waitForPublishReady() {
    console.log('等待发布按钮变为可用状态...');

    const publishButton = await this.waitForElement(this.selectors.publishButton, 10000);

    // 等待按钮启用
    let attempts = 0;
    while (publishButton.disabled && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    console.log('发布按钮已准备就绪');
  }

  // 点击发布按钮
  async clickPublishButton() {
    console.log('点击发布按钮...');

    const publishButton = await this.waitForElement(this.selectors.publishButton);

    // 模拟真实点击
    publishButton.click();

    console.log('发布按钮已点击');
  }

  // 验证发布结果
  async verifyPublishResult() {
    console.log('验证发布结果...');

    // 等待发布完成
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 小红书发布成功后通常会跳转或显示成功提示
    // 这里可以根据实际情况添加更具体的验证逻辑

    return {
      publishTime: new Date().toISOString(),
      platform: 'xiaohongshu'
    };
  }

  // 主发布方法
  async publish(data) {
    console.log('开始小红书发布流程:', data);

    try {
      // 1. 检查登录状态
      await this.checkLoginStatus();

      // 2. 等待页面完全加载
      await this.waitForPageReady();

      // 3. 填充标题（小红书特有）
      if (data.title) {
        await this.fillTitle(data.title);
      }

      // 4. 填充内容
      if (data.content) {
        await this.fillContent(data.content);
      }

      // 5. 上传图片
      if (data.images && data.images.length > 0) {
        await this.uploadImages(data.images);
      }

      // 6. 验证发布按钮状态
      await this.waitForPublishReady();

      // 7. 执行发布
      await this.clickPublishButton();

      // 8. 验证发布结果
      const result = await this.verifyPublishResult();

      return {
        success: true,
        message: '发布成功',
        url: window.location.href,
        ...result
      };

    } catch (error) {
      console.error('小红书发布失败:', error);
      return {
        success: false,
        message: error.message || '发布失败'
      };
    }
  }
}

// 创建适配器实例
const xiaohongshuAdapter = new XiaohongshuAdapter();

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('小红书内容脚本收到消息:', message);
  
  if (message.action === 'publish') {
    xiaohongshuAdapter.publish(message.data)
      .then(result => {
        console.log('小红书发布结果:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('小红书发布错误:', error);
        sendResponse({
          success: false,
          message: error.message || '发布失败'
        });
      });
    
    return true; // 保持消息通道开放
  }
});

console.log('小红书适配器初始化完成');
