/**
 * 平台适配器单元测试
 * 测试各平台适配器的功能
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  JikeAdapter, 
  WeiboAdapter, 
  DouyinAdapter, 
  XiaohongshuAdapter,
  PlatformAdapterFactory 
} from '../src/adapters/PlatformAdapter.js';

describe('PlatformAdapterFactory', () => {
  test('应该能够创建即刻适配器', () => {
    const adapter = PlatformAdapterFactory.create('jike');
    expect(adapter).toBeInstanceOf(JikeAdapter);
  });

  test('应该能够创建微博适配器', () => {
    const adapter = PlatformAdapterFactory.create('weibo');
    expect(adapter).toBeInstanceOf(WeiboAdapter);
  });

  test('应该能够创建抖音适配器', () => {
    const adapter = PlatformAdapterFactory.create('douyin');
    expect(adapter).toBeInstanceOf(DouyinAdapter);
  });

  test('应该能够创建小红书适配器', () => {
    const adapter = PlatformAdapterFactory.create('xiaohongshu');
    expect(adapter).toBeInstanceOf(XiaohongshuAdapter);
  });

  test('应该拒绝不支持的平台', () => {
    expect(() => {
      PlatformAdapterFactory.create('unknown');
    }).toThrow('不支持的平台: unknown');
  });

  test('应该返回支持的平台列表', () => {
    const platforms = PlatformAdapterFactory.getSupportedPlatforms();
    expect(platforms).toContain('jike');
    expect(platforms).toContain('weibo');
    expect(platforms).toContain('douyin');
    expect(platforms).toContain('xiaohongshu');
  });
});

describe('JikeAdapter', () => {
  let adapter;
  let mockInjector;

  beforeEach(() => {
    adapter = new JikeAdapter();
    
    // 模拟注入器
    mockInjector = {
      findElement: vi.fn(),
      waitForElement: vi.fn(),
      injectContent: vi.fn(),
      uploadFiles: vi.fn()
    };
    
    adapter.injector = mockInjector;
    
    // 模拟DOM
    global.document = {
      readyState: 'complete'
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('应该成功发布内容到即刻', async () => {
    const data = {
      content: '测试内容',
      files: []
    };

    const mockEditor = { tagName: 'DIV', contentEditable: 'true' };
    mockInjector.findElement.mockReturnValue(mockEditor);
    mockInjector.injectContent.mockResolvedValue(true);

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(true);
    expect(result.platform).toBe('jike');
    expect(mockInjector.injectContent).toHaveBeenCalledWith(mockEditor, data.content);
  });

  test('应该处理内容注入失败', async () => {
    const data = {
      content: '测试内容'
    };

    mockInjector.findElement.mockReturnValue(null);
    mockInjector.waitForElement.mockResolvedValue(null);

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(false);
    expect(result.error).toContain('未找到即刻编辑器');
  });

  test('应该能够上传文件', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const data = {
      content: '测试内容',
      files: [mockFile]
    };

    const mockEditor = { tagName: 'DIV' };
    const mockFileInput = { tagName: 'INPUT', type: 'file' };
    
    mockInjector.findElement.mockImplementation((platform, type) => {
      if (type === 'content') return mockEditor;
      if (type === 'file') return mockFileInput;
      return null;
    });
    
    mockInjector.injectContent.mockResolvedValue(true);
    mockInjector.uploadFiles.mockResolvedValue(true);

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(true);
    expect(mockInjector.uploadFiles).toHaveBeenCalledWith(mockFileInput, data.files);
  });
});

describe('WeiboAdapter', () => {
  let adapter;
  let mockInjector;

  beforeEach(() => {
    adapter = new WeiboAdapter();
    
    mockInjector = {
      findElement: vi.fn(),
      injectContent: vi.fn(),
      uploadFiles: vi.fn(),
      validateAndCleanContent: vi.fn()
    };
    
    adapter.injector = mockInjector;
    
    global.document = {
      readyState: 'complete'
    };
  });

  test('应该成功发布内容到微博', async () => {
    const data = {
      content: '测试微博内容'
    };

    const mockTextarea = { tagName: 'TEXTAREA' };
    const cleanContent = '清理后的内容';
    
    mockInjector.findElement.mockReturnValue(mockTextarea);
    mockInjector.validateAndCleanContent.mockReturnValue(cleanContent);
    mockInjector.injectContent.mockResolvedValue(true);

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(true);
    expect(mockInjector.validateAndCleanContent).toHaveBeenCalledWith(data.content, 'weibo');
    expect(mockInjector.injectContent).toHaveBeenCalledWith(mockTextarea, cleanContent);
  });

  test('应该处理找不到输入框的情况', async () => {
    const data = {
      content: '测试内容'
    };

    mockInjector.findElement.mockReturnValue(null);

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(false);
    expect(result.error).toContain('未找到微博输入框');
  });
});

describe('DouyinAdapter', () => {
  let adapter;
  let mockInjector;

  beforeEach(() => {
    adapter = new DouyinAdapter();
    
    mockInjector = {
      findElement: vi.fn(),
      injectContent: vi.fn(),
      uploadFiles: vi.fn()
    };
    
    adapter.injector = mockInjector;
    
    global.document = {
      readyState: 'complete'
    };
  });

  test('应该成功发布标题和内容到抖音', async () => {
    const data = {
      title: '测试标题',
      content: '测试内容'
    };

    const mockTitleInput = { tagName: 'INPUT' };
    const mockContentDiv = { tagName: 'DIV', contentEditable: 'true' };
    
    mockInjector.findElement.mockImplementation((platform, type) => {
      if (type === 'title') return mockTitleInput;
      if (type === 'content') return mockContentDiv;
      return null;
    });
    
    mockInjector.injectContent.mockResolvedValue(true);

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(true);
    expect(mockInjector.injectContent).toHaveBeenCalledWith(mockTitleInput, data.title);
    expect(mockInjector.injectContent).toHaveBeenCalledWith(mockContentDiv, data.content);
  });

  test('应该处理标题注入失败', async () => {
    const data = {
      title: '测试标题'
    };

    mockInjector.findElement.mockReturnValue(null);

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(false);
    expect(result.error).toContain('标题注入失败');
  });

  test('应该处理内容注入失败', async () => {
    const data = {
      title: '测试标题',
      content: '测试内容'
    };

    const mockTitleInput = { tagName: 'INPUT' };
    
    mockInjector.findElement.mockImplementation((platform, type) => {
      if (type === 'title') return mockTitleInput;
      if (type === 'content') return null;
      return null;
    });
    
    mockInjector.injectContent.mockResolvedValue(true);

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(false);
    expect(result.error).toContain('内容注入失败');
  });
});

describe('XiaohongshuAdapter', () => {
  let adapter;
  let mockInjector;

  beforeEach(() => {
    adapter = new XiaohongshuAdapter();
    
    mockInjector = {
      findElement: vi.fn(),
      injectContent: vi.fn(),
      uploadFiles: vi.fn()
    };
    
    adapter.injector = mockInjector;
    
    global.document = {
      readyState: 'complete'
    };
  });

  test('应该要求至少一张图片', async () => {
    const data = {
      title: '测试标题',
      content: '测试内容',
      files: []
    };

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(false);
    expect(result.error).toContain('小红书发布需要至少一张图片');
  });

  test('应该成功发布到小红书', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const data = {
      title: '测试标题',
      content: '测试内容',
      files: [mockFile]
    };

    const mockFileInput = { tagName: 'INPUT', type: 'file' };
    const mockTitleInput = { tagName: 'INPUT' };
    const mockContentDiv = { tagName: 'DIV' };
    
    mockInjector.findElement.mockImplementation((platform, type) => {
      if (type === 'file') return mockFileInput;
      if (type === 'title') return mockTitleInput;
      if (type === 'content') return mockContentDiv;
      return null;
    });
    
    mockInjector.uploadFiles.mockResolvedValue(true);
    mockInjector.injectContent.mockResolvedValue(true);

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(true);
    expect(mockInjector.uploadFiles).toHaveBeenCalledWith(mockFileInput, data.files);
  });

  test('应该处理文件上传失败', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const data = {
      files: [mockFile]
    };

    const mockFileInput = { tagName: 'INPUT', type: 'file' };
    mockInjector.findElement.mockReturnValue(mockFileInput);
    mockInjector.uploadFiles.mockResolvedValue(false);

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(false);
    expect(result.error).toContain('文件上传失败');
  });

  test('应该处理标题注入失败但继续执行', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const data = {
      title: '测试标题',
      content: '测试内容',
      files: [mockFile]
    };

    const mockFileInput = { tagName: 'INPUT', type: 'file' };
    const mockContentDiv = { tagName: 'DIV' };
    
    mockInjector.findElement.mockImplementation((platform, type) => {
      if (type === 'file') return mockFileInput;
      if (type === 'title') return null; // 标题输入框未找到
      if (type === 'content') return mockContentDiv;
      return null;
    });
    
    mockInjector.uploadFiles.mockResolvedValue(true);
    mockInjector.injectContent.mockResolvedValue(true);

    const result = await adapter.publishContent(data);

    expect(result.success).toBe(true); // 即使标题失败，整体仍然成功
  });
});
