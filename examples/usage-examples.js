/**
 * 跨平台内容注入使用示例
 * 展示如何使用新的通用技术方案
 */

import { publishManager, smartPublish } from '../src/managers/PublishManager.js';
import { UniversalContentInjector } from '../src/utils/UniversalContentInjector.js';

/**
 * 示例1: 基础单平台发布
 */
async function basicSinglePlatformExample() {
  console.log('=== 示例1: 基础单平台发布 ===');
  
  const data = {
    content: '这是一条测试内容，用于验证跨平台发布功能。#测试 #技术验证'
  };
  
  // 发布到即刻
  const result = await publishManager.publishToSinglePlatform('jike', data);
  console.log('即刻发布结果:', result);
  
  return result;
}

/**
 * 示例2: 多平台并发发布
 */
async function multiPlatformConcurrentExample() {
  console.log('=== 示例2: 多平台并发发布 ===');
  
  const data = {
    title: '跨平台技术验证',
    content: '这是一条跨平台发布的测试内容。我们正在验证新的通用内容注入技术方案，该方案支持即刻、微博、抖音等多个平台。#技术创新 #跨平台',
    files: [] // 稍后会添加测试图片
  };
  
  // 创建测试图片
  const injector = new UniversalContentInjector();
  const testImage = await injector.createTestImage('跨平台技术验证');
  data.files = [testImage];
  
  const platforms = ['jike', 'weibo', 'douyin'];
  const result = await publishManager.publishToMultiplePlatforms(platforms, data, {
    concurrent: true
  });
  
  console.log('多平台发布结果:', result);
  return result;
}

/**
 * 示例3: 智能发布（自动推荐平台）
 */
async function smartPublishExample() {
  console.log('=== 示例3: 智能发布 ===');
  
  const data = {
    title: '智能发布测试',
    content: '这是智能发布功能的测试。系统会根据内容特征自动推荐最适合的平台进行发布。',
    files: []
  };
  
  // 创建测试图片
  const injector = new UniversalContentInjector();
  const testImage = await injector.createTestImage('智能发布测试');
  data.files = [testImage];
  
  const preferences = {
    preferredPlatforms: ['jike'], // 用户偏好平台
    contentType: 'image_text',    // 内容类型
    maxPlatforms: 3               // 最大发布平台数
  };
  
  const result = await smartPublish(data, preferences);
  console.log('智能发布结果:', result);
  
  return result;
}

/**
 * 示例4: 错误处理和重试
 */
async function errorHandlingExample() {
  console.log('=== 示例4: 错误处理和重试 ===');
  
  const data = {
    content: '错误处理测试内容'
  };
  
  try {
    // 尝试发布到不存在的平台
    const result = await publishManager.publishToSinglePlatform('invalid_platform', data);
    console.log('错误处理结果:', result);
    
    // 发布到多个平台，其中包含无效平台
    const multiResult = await publishManager.publishToMultiplePlatforms(
      ['jike', 'invalid_platform', 'weibo'], 
      data,
      { stopOnError: false } // 不因错误停止
    );
    console.log('多平台错误处理结果:', multiResult);
    
  } catch (error) {
    console.error('发布过程中出现错误:', error);
  }
}

/**
 * 示例5: 内容验证和清理
 */
async function contentValidationExample() {
  console.log('=== 示例5: 内容验证和清理 ===');
  
  const injector = new UniversalContentInjector();
  
  // 测试不同平台的内容限制
  const longContent = '这是一段很长的内容，'.repeat(50) + '用于测试内容长度限制和自动截断功能。';
  
  const platforms = ['weibo', 'jike', 'douyin'];
  
  platforms.forEach(platform => {
    const cleanContent = injector.validateAndCleanContent(longContent, platform);
    console.log(`${platform} 清理后内容长度:`, cleanContent.length);
    console.log(`${platform} 清理后内容:`, cleanContent.substring(0, 100) + '...');
  });
}

/**
 * 示例6: 性能监控和统计
 */
async function performanceMonitoringExample() {
  console.log('=== 示例6: 性能监控和统计 ===');
  
  // 执行几次发布操作
  const testData = {
    content: '性能监控测试内容 #测试'
  };
  
  // 模拟多次发布
  for (let i = 0; i < 3; i++) {
    await publishManager.publishToSinglePlatform('jike', {
      ...testData,
      content: `${testData.content} - 第${i + 1}次`
    });
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 获取统计信息
  const stats = publishManager.getPublishStats(1); // 最近1天的统计
  console.log('发布统计信息:', stats);
  
  // 获取注入器统计
  const injector = new UniversalContentInjector();
  const injectionStats = injector.getInjectionStats();
  console.log('内容注入统计:', injectionStats);
}

/**
 * 示例7: 自定义平台适配器
 */
class CustomPlatformAdapter {
  constructor() {
    this.platform = 'custom';
    this.injector = new UniversalContentInjector();
  }
  
  async publishContent(data) {
    console.log('自定义平台发布:', data);
    
    // 模拟发布过程
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      platform: this.platform,
      message: '自定义平台发布成功'
    };
  }
}

async function customAdapterExample() {
  console.log('=== 示例7: 自定义平台适配器 ===');
  
  const customAdapter = new CustomPlatformAdapter();
  const result = await customAdapter.publishContent({
    content: '自定义平台测试内容'
  });
  
  console.log('自定义适配器结果:', result);
}

/**
 * 示例8: 批量发布不同内容
 */
async function batchPublishExample() {
  console.log('=== 示例8: 批量发布不同内容 ===');
  
  const contentList = [
    {
      title: '技术分享1',
      content: '第一条技术分享内容 #技术 #分享',
      platforms: ['jike', 'weibo']
    },
    {
      title: '技术分享2', 
      content: '第二条技术分享内容 #编程 #开发',
      platforms: ['douyin']
    },
    {
      title: '技术分享3',
      content: '第三条技术分享内容 #前端 #JavaScript',
      platforms: ['jike']
    }
  ];
  
  const results = [];
  
  for (const item of contentList) {
    const { platforms, ...data } = item;
    const result = await publishManager.publishToMultiplePlatforms(platforms, data);
    results.push({
      title: item.title,
      platforms,
      result
    });
    
    // 批量发布间隔
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('批量发布结果:', results);
  return results;
}

/**
 * 示例9: 实时监控和调试
 */
async function debuggingExample() {
  console.log('=== 示例9: 实时监控和调试 ===');
  
  // 启用调试模式
  const injector = new UniversalContentInjector();
  
  // 模拟在页面中查找元素
  console.log('查找即刻编辑器元素...');
  const jikeEditor = injector.findElement('jike', 'content');
  console.log('即刻编辑器:', jikeEditor);
  
  console.log('查找微博输入框...');
  const weiboTextarea = injector.findElement('weibo', 'content');
  console.log('微博输入框:', weiboTextarea);
  
  // 显示缓存状态
  console.log('元素缓存状态:', injector.elementCache);
  
  // 显示注入历史
  console.log('注入历史:', injector.injectionHistory);
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('🚀 开始运行跨平台内容注入示例...\n');
  
  try {
    // 基础示例
    await basicSinglePlatformExample();
    console.log('\n');
    
    // 内容验证示例
    await contentValidationExample();
    console.log('\n');
    
    // 错误处理示例
    await errorHandlingExample();
    console.log('\n');
    
    // 性能监控示例
    await performanceMonitoringExample();
    console.log('\n');
    
    // 自定义适配器示例
    await customAdapterExample();
    console.log('\n');
    
    // 调试示例
    await debuggingExample();
    console.log('\n');
    
    console.log('✅ 所有示例运行完成！');
    
  } catch (error) {
    console.error('❌ 示例运行过程中出现错误:', error);
  }
}

/**
 * 交互式示例选择器
 */
export function selectExample(exampleName) {
  const examples = {
    'basic': basicSinglePlatformExample,
    'multi': multiPlatformConcurrentExample,
    'smart': smartPublishExample,
    'error': errorHandlingExample,
    'validation': contentValidationExample,
    'performance': performanceMonitoringExample,
    'custom': customAdapterExample,
    'batch': batchPublishExample,
    'debug': debuggingExample,
    'all': runAllExamples
  };
  
  const example = examples[exampleName];
  if (!example) {
    console.error('未找到示例:', exampleName);
    console.log('可用示例:', Object.keys(examples));
    return;
  }
  
  return example();
}

// 如果直接运行此文件，执行所有示例
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
