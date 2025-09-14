// 微博平台适配器
console.log('微博内容脚本已加载');

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

class WeiboAdapter {
  constructor() {
    this.platform = 'weibo';
    // 基于实际测试的准确选择器
    this.selectors = {
      // 文本输入
      contentTextarea: 'textarea[placeholder*="有什么新鲜事想分享给大家"]',

      // 图片上传
      imageUpload: 'input[type="file"]',
      imagePreview: 'img[src*="sinaimg"]', // 图片预览
      imageDeleteBtn: 'generic:has-text("删除")', // 删除图片按钮

      // 发布按钮 - 基于实际测试更新
      publishButton: 'button:has-text("发送"):not([disabled])',
      publishButtonFallback: 'button[action-type="submit"]',

      // 状态检测
      characterCount: 'span:has-text(/^\\d+$/)', // 字符计数

      // 登录状态检测
      loginIndicators: [
        'textarea[placeholder*="有什么新鲜事想分享给大家"]',
        'button:has-text("发送")'
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
    console.log('检查微博登录状态...');

    for (const selector of this.selectors.loginIndicators) {
      try {
        await this.waitForElement(selector, 3000);
        console.log('用户已登录微博');
        return true;
      } catch (e) {
        continue;
      }
    }

    throw new Error('用户未登录微博或页面加载异常');
  }

  // 等待页面完全加载
  async waitForPageReady() {
    console.log('等待微博页面加载完成...');

    // 等待关键元素加载
    await this.waitForElement(this.selectors.contentTextarea, 15000);

    // 等待页面稳定
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('微博页面加载完成');
  }

  // 模拟真实用户输入文本
  async fillTextContent(data) {
    console.log('开始填充文本内容...');

    const textArea = await this.waitForElement(this.selectors.contentTextarea);

    // 清空现有内容
    textArea.value = '';
    textArea.focus();

    // 构建完整内容
    const fullContent = data.title ? `${data.title}\n${data.content}` : data.content;

    // 模拟真实用户逐字符输入
    await this.typeText(textArea, fullContent);

    console.log('文本内容填充完成:', fullContent);
  }

  // 逐字符输入模拟真实用户行为
  async typeText(element, text, options = {}) {
    const { delay = 50, randomDelay = true } = options;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // 模拟按键事件
      element.dispatchEvent(new KeyboardEvent('keydown', {
        key: char,
        bubbles: true
      }));

      // 更新值
      element.value = element.value + char;

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
      // 等待图片预览出现
      await this.waitForElement(this.selectors.imagePreview, 10000);
      console.log('图片预览已显示');
    } catch (error) {
      throw new Error('图片上传失败或超时');
    }
  }

  // 等待发布按钮可用
  async waitForPublishReady() {
    console.log('等待发布按钮变为可用状态...');

    try {
      await this.waitForElement(this.selectors.publishButton, 5000);
    } catch (error) {
      // 尝试备用选择器
      await this.waitForElement(this.selectors.publishButtonFallback, 5000);
    }

    // 额外等待确保状态稳定
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('发布按钮已准备就绪');
  }

  // 点击发布按钮
  async clickPublishButton() {
    console.log('点击发布按钮...');

    let publishButton;
    try {
      publishButton = await this.waitForElement(this.selectors.publishButton, 3000);
    } catch (error) {
      // 尝试备用选择器
      publishButton = await this.waitForElement(this.selectors.publishButtonFallback, 3000);
    }

    // 模拟真实点击
    publishButton.click();

    console.log('发布按钮已点击');
  }

  // 验证发布结果
  async verifyPublishResult() {
    console.log('验证发布结果...');

    // 等待发布完成
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查是否有错误提示
    const errorSelectors = [
      '.layer_error',
      '.W_error',
      '[node-type="error"]',
      '.woo-box-error'
    ];

    for (const selector of errorSelectors) {
      const errorElement = document.querySelector(selector);
      if (errorElement && errorElement.offsetParent !== null) {
        throw new Error(`发布失败: ${errorElement.textContent}`);
      }
    }

    console.log('发布验证通过');

    return {
      publishTime: new Date().toISOString(),
      platform: 'weibo'
    };
  }

  // 主发布方法
  async publish(data) {
    console.log('开始微博发布流程:', data);

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

      // 5. 验证发布按钮状态
      await this.waitForPublishReady();

      // 6. 执行发布
      await this.clickPublishButton();

      // 7. 验证发布结果
      const result = await this.verifyPublishResult();

      return {
        success: true,
        message: '发布成功',
        url: window.location.href,
        ...result
      };

    } catch (error) {
      console.error('微博发布失败:', error);
      return {
        success: false,
        message: error.message || '发布失败'
      };
    }
  }
}

// 创建适配器实例
const weiboAdapter = new WeiboAdapter();

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('微博内容脚本收到消息:', message);
  
  if (message.action === 'publish') {
    weiboAdapter.publish(message.data)
      .then(result => {
        console.log('微博发布结果:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('微博发布错误:', error);
        sendResponse({
          success: false,
          message: error.message || '发布失败'
        });
      });
    
    return true; // 保持消息通道开放
  }
});

console.log('微博适配器初始化完成');
