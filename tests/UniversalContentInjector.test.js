/**
 * UniversalContentInjector 单元测试
 * 测试跨平台内容注入的核心功能
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { UniversalContentInjector } from '../src/utils/UniversalContentInjector.js';

describe('UniversalContentInjector', () => {
  let injector;
  let mockElement;

  beforeEach(() => {
    injector = new UniversalContentInjector();
    
    // 模拟DOM环境
    global.document = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(),
      createElement: vi.fn(),
      addEventListener: vi.fn(),
      contains: vi.fn(),
      execCommand: vi.fn(),
      readyState: 'complete'
    };
    
    global.window = {
      addEventListener: vi.fn()
    };
    
    // 创建模拟元素
    mockElement = {
      tagName: 'TEXTAREA',
      value: '',
      textContent: '',
      contentEditable: 'false',
      focus: vi.fn(),
      dispatchEvent: vi.fn(),
      getAttribute: vi.fn(),
      className: '',
      id: ''
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('injectContent', () => {
    test('应该能够注入内容到textarea元素', async () => {
      const content = '测试内容';
      mockElement.tagName = 'TEXTAREA';
      
      const result = await injector.injectContent(mockElement, content);
      
      expect(mockElement.focus).toHaveBeenCalled();
      expect(mockElement.value).toBe(content);
      expect(mockElement.dispatchEvent).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
    });

    test('应该能够注入内容到input元素', async () => {
      const content = '测试内容';
      mockElement.tagName = 'INPUT';
      
      const result = await injector.injectContent(mockElement, content);
      
      expect(mockElement.focus).toHaveBeenCalled();
      expect(mockElement.value).toBe(content);
      expect(result).toBe(true);
    });

    test('应该能够注入内容到contenteditable元素', async () => {
      const content = '测试内容';
      mockElement.tagName = 'DIV';
      mockElement.contentEditable = 'true';
      mockElement.textContent = content; // 模拟注入成功
      
      const result = await injector.injectContent(mockElement, content);
      
      expect(mockElement.focus).toHaveBeenCalled();
      expect(mockElement.textContent).toBe(content);
      expect(result).toBe(true);
    });

    test('应该使用execCommand作为备用方案', async () => {
      const content = '测试内容';
      mockElement.tagName = 'SPAN'; // 不支持的元素类型
      mockElement.contentEditable = 'false';
      
      global.document.execCommand.mockReturnValue(true);
      
      const result = await injector.injectContent(mockElement, content);
      
      expect(global.document.execCommand).toHaveBeenCalledWith('selectAll');
      expect(global.document.execCommand).toHaveBeenCalledWith('insertText', false, content);
      expect(result).toBe(true);
    });

    test('应该处理注入失败的情况', async () => {
      const content = '测试内容';
      mockElement.focus = vi.fn(() => {
        throw new Error('Focus failed');
      });
      
      const result = await injector.injectContent(mockElement, content);
      
      expect(result).toBe(false);
    });
  });

  describe('uploadFiles', () => {
    test('应该能够上传文件', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const files = [mockFile];
      
      const mockFileInput = {
        files: null,
        dispatchEvent: vi.fn()
      };
      
      // 模拟DataTransfer
      global.DataTransfer = vi.fn().mockImplementation(() => ({
        items: {
          add: vi.fn()
        },
        files: [mockFile]
      }));
      
      const result = await injector.uploadFiles(mockFileInput, files);
      
      expect(result).toBe(true);
      expect(mockFileInput.dispatchEvent).toHaveBeenCalled();
    });

    test('应该处理文件上传失败的情况', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const files = [mockFile];
      
      const mockFileInput = {
        files: null,
        dispatchEvent: vi.fn(() => {
          throw new Error('Upload failed');
        })
      };
      
      const result = await injector.uploadFiles(mockFileInput, files);
      
      expect(result).toBe(false);
    });
  });

  describe('findElement', () => {
    test('应该能够找到即刻平台的内容编辑器', () => {
      const mockEditor = { tagName: 'DIV', contentEditable: 'true' };
      global.document.querySelector.mockReturnValue(mockEditor);
      
      const result = injector.findElement('jike', 'content');
      
      expect(result).toBe(mockEditor);
      expect(global.document.querySelector).toHaveBeenCalled();
    });

    test('应该能够找到微博平台的textarea', () => {
      const mockTextarea = { tagName: 'TEXTAREA' };
      global.document.querySelector.mockReturnValue(mockTextarea);
      
      const result = injector.findElement('weibo', 'content');
      
      expect(result).toBe(mockTextarea);
    });

    test('应该缓存找到的元素', () => {
      const mockElement = { tagName: 'DIV' };
      global.document.querySelector.mockReturnValue(mockElement);
      global.document.contains.mockReturnValue(true);
      
      // 第一次查找
      const result1 = injector.findElement('jike', 'content');
      // 第二次查找（应该使用缓存）
      const result2 = injector.findElement('jike', 'content');
      
      expect(result1).toBe(mockElement);
      expect(result2).toBe(mockElement);
      expect(global.document.querySelector).toHaveBeenCalledTimes(1);
    });

    test('应该在元素不存在时清理缓存', () => {
      const mockElement = { tagName: 'DIV' };
      global.document.querySelector.mockReturnValue(mockElement);
      global.document.contains.mockReturnValue(false); // 元素已不在DOM中
      
      // 第一次查找
      injector.findElement('jike', 'content');
      // 第二次查找（缓存应该被清理）
      injector.findElement('jike', 'content');
      
      expect(global.document.querySelector).toHaveBeenCalledTimes(2);
    });
  });

  describe('waitForElement', () => {
    test('应该立即返回已存在的元素', async () => {
      const mockElement = { tagName: 'DIV' };
      global.document.querySelector.mockReturnValue(mockElement);
      
      const result = await injector.waitForElement('div', 1000);
      
      expect(result).toBe(mockElement);
    });

    test('应该等待元素出现', async () => {
      let callCount = 0;
      global.document.querySelector.mockImplementation(() => {
        callCount++;
        return callCount > 1 ? { tagName: 'DIV' } : null;
      });
      
      // 模拟MutationObserver
      global.MutationObserver = vi.fn().mockImplementation((callback) => ({
        observe: vi.fn(() => {
          // 模拟异步DOM变化
          setTimeout(callback, 100);
        }),
        disconnect: vi.fn()
      }));
      
      const result = await injector.waitForElement('div', 1000);
      
      expect(result).toBeTruthy();
    });

    test('应该在超时后返回null', async () => {
      global.document.querySelector.mockReturnValue(null);
      
      global.MutationObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: vi.fn()
      }));
      
      const result = await injector.waitForElement('div', 100);
      
      expect(result).toBeNull();
    });
  });

  describe('validateAndCleanContent', () => {
    test('应该截断过长的微博内容', () => {
      const longContent = 'a'.repeat(200);
      const result = injector.validateAndCleanContent(longContent, 'weibo');
      
      expect(result.length).toBeLessThanOrEqual(140);
      expect(result.endsWith('...')).toBe(true);
    });

    test('应该清理HTML标签', () => {
      const htmlContent = '<p>测试内容</p><script>alert("xss")</script>';
      const result = injector.validateAndCleanContent(htmlContent, 'jike');
      
      expect(result).toBe('测试内容alert("xss")');
    });

    test('应该保持短内容不变', () => {
      const shortContent = '短内容测试';
      const result = injector.validateAndCleanContent(shortContent, 'weibo');
      
      expect(result).toBe(shortContent);
    });
  });

  describe('getInjectionStats', () => {
    test('应该返回正确的统计信息', () => {
      // 模拟一些注入历史
      injector.injectionHistory = [
        { success: true, timestamp: Date.now() },
        { success: false, timestamp: Date.now() },
        { success: true, timestamp: Date.now() }
      ];
      
      const stats = injector.getInjectionStats();
      
      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.successRate).toBe('66.67%');
    });

    test('应该处理空历史记录', () => {
      const stats = injector.getInjectionStats();
      
      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.successRate).toBe('0%');
    });
  });

  describe('createTestImage', () => {
    test('应该创建测试图片文件', async () => {
      // 模拟Canvas API
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          fillStyle: '',
          fillRect: vi.fn(),
          font: '',
          textAlign: '',
          fillText: vi.fn()
        }),
        toBlob: vi.fn((callback) => {
          const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
          callback(mockBlob);
        })
      };
      
      global.document.createElement.mockReturnValue(mockCanvas);
      global.File = vi.fn().mockImplementation((parts, name, options) => ({
        name,
        type: options.type,
        size: parts[0].length
      }));
      
      const result = await injector.createTestImage('测试文字');
      
      expect(result.name).toBe('test-image.jpg');
      expect(result.type).toBe('image/jpeg');
    });
  });

  describe('getSelectors', () => {
    test('应该返回即刻平台的选择器', () => {
      const selectors = injector.getSelectors('jike', 'content');
      
      expect(selectors).toContain('div[contenteditable="true"]');
      expect(selectors).toContain('.editor-content');
    });

    test('应该返回微博平台的选择器', () => {
      const selectors = injector.getSelectors('weibo', 'content');
      
      expect(selectors).toContain('textarea[placeholder*="新鲜事"]');
      expect(selectors).toContain('textarea');
    });

    test('应该返回抖音平台的选择器', () => {
      const titleSelectors = injector.getSelectors('douyin', 'title');
      const contentSelectors = injector.getSelectors('douyin', 'content');
      
      expect(titleSelectors).toContain('input[placeholder*="标题"]');
      expect(contentSelectors).toContain('div[contenteditable="true"]');
    });

    test('应该处理不支持的平台', () => {
      const selectors = injector.getSelectors('unknown', 'content');
      
      expect(selectors).toEqual([]);
    });
  });
});
