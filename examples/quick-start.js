/**
 * 快速开始示例
 * 展示如何快速使用跨平台内容注入方案
 */

import { publishManager } from '../src/managers/PublishManager.js';
import { UniversalContentInjector } from '../src/utils/UniversalContentInjector.js';

/**
 * 快速开始 - 基础用法
 */
async function quickStart() {
  console.log('🚀 跨平台内容注入 - 快速开始');
  
  // 1. 准备发布数据
  const publishData = {
    title: '跨平台技术验证',
    content: '这是使用新技术方案的第一次发布！支持即刻、微博、抖音等多个平台。#技术创新 #跨平台发布',
    files: [] // 稍后添加图片
  };
  
  // 2. 创建测试图片（可选）
  const injector = new UniversalContentInjector();
  const testImage = await injector.createTestImage('快速开始测试');
  publishData.files = [testImage];
  
  // 3. 发布到单个平台
  console.log('📝 发布到即刻平台...');
  const jikeResult = await publishManager.publishToSinglePlatform('jike', publishData);
  console.log('即刻发布结果:', jikeResult);
  
  // 4. 发布到多个平台
  console.log('📝 发布到多个平台...');
  const multiResult = await publishManager.publishToMultiplePlatforms(
    ['weibo', 'douyin'], 
    publishData,
    { concurrent: true }
  );
  console.log('多平台发布结果:', multiResult);
  
  // 5. 查看统计信息
  const stats = publishManager.getPublishStats();
  console.log('📊 发布统计:', stats);
  
  return {
    jikeResult,
    multiResult,
    stats
  };
}

/**
 * 智能发布示例
 */
async function smartPublishExample() {
  console.log('🧠 智能发布示例');
  
  const data = {
    title: '智能发布测试',
    content: '系统会根据内容特征自动推荐最适合的平台',
    files: []
  };
  
  // 创建图片（触发图片平台推荐）
  const injector = new UniversalContentInjector();
  const image = await injector.createTestImage('智能发布');
  data.files = [image];
  
  // 智能发布
  const result = await publishManager.smartPublish(data, {
    preferredPlatforms: ['jike'], // 用户偏好
    maxPlatforms: 3
  });
  
  console.log('智能发布结果:', result);
  return result;
}

/**
 * 错误处理示例
 */
async function errorHandlingExample() {
  console.log('⚠️ 错误处理示例');
  
  try {
    // 尝试发布到不存在的平台
    const result = await publishManager.publishToSinglePlatform('unknown_platform', {
      content: '测试内容'
    });
    console.log('错误处理结果:', result);
  } catch (error) {
    console.log('捕获到错误:', error.message);
  }
  
  // 多平台发布中的错误处理
  const multiResult = await publishManager.publishToMultiplePlatforms(
    ['jike', 'unknown_platform', 'weibo'],
    { content: '测试内容' },
    { stopOnError: false } // 不因错误停止
  );
  
  console.log('多平台错误处理结果:', multiResult);
  return multiResult;
}

/**
 * 性能测试示例
 */
async function performanceTest() {
  console.log('⚡ 性能测试示例');
  
  const startTime = Date.now();
  
  // 并发发布测试
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(
      publishManager.publishToSinglePlatform('jike', {
        content: `性能测试内容 ${i + 1}`
      })
    );
  }
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  console.log('性能测试结果:', {
    duration: `${endTime - startTime}ms`,
    results: results.map(r => ({ success: r.success, platform: r.platform }))
  });
  
  return results;
}

/**
 * 自定义配置示例
 */
async function customConfigExample() {
  console.log('⚙️ 自定义配置示例');
  
  // 创建自定义注入器
  const customInjector = new UniversalContentInjector();
  
  // 自定义内容清理
  const originalContent = '<p>包含HTML的内容</p>';
  const cleanContent = customInjector.validateAndCleanContent(originalContent, 'weibo');
  console.log('内容清理结果:', { originalContent, cleanContent });
  
  // 自定义元素查找
  const jikeEditor = customInjector.findElement('jike', 'content');
  console.log('即刻编辑器元素:', jikeEditor);
  
  // 查看注入统计
  const injectionStats = customInjector.getInjectionStats();
  console.log('注入统计:', injectionStats);
  
  return {
    cleanContent,
    jikeEditor,
    injectionStats
  };
}

/**
 * 批量发布示例
 */
async function batchPublishExample() {
  console.log('📦 批量发布示例');
  
  const contentList = [
    {
      title: '内容1',
      content: '第一条批量发布内容',
      platforms: ['jike']
    },
    {
      title: '内容2', 
      content: '第二条批量发布内容',
      platforms: ['weibo']
    },
    {
      title: '内容3',
      content: '第三条批量发布内容',
      platforms: ['douyin']
    }
  ];
  
  const results = [];
  
  for (const item of contentList) {
    console.log(`发布: ${item.title}`);
    
    const result = await publishManager.publishToMultiplePlatforms(
      item.platforms,
      { title: item.title, content: item.content }
    );
    
    results.push({
      title: item.title,
      platforms: item.platforms,
      success: result.success,
      successCount: result.successCount
    });
    
    // 批量发布间隔
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('批量发布完成:', results);
  return results;
}

/**
 * 实时监控示例
 */
async function monitoringExample() {
  console.log('📊 实时监控示例');
  
  // 执行一些发布操作
  await publishManager.publishToSinglePlatform('jike', { content: '监控测试1' });
  await publishManager.publishToSinglePlatform('weibo', { content: '监控测试2' });
  await publishManager.publishToSinglePlatform('douyin', { 
    title: '监控测试',
    content: '监控测试3' 
  });
  
  // 获取详细统计
  const stats = publishManager.getPublishStats(1); // 最近1天
  console.log('📈 发布统计:', {
    总发布次数: stats.totalPublishes,
    成功次数: stats.successfulPublishes,
    失败次数: stats.failedPublishes,
    成功率: stats.successRate,
    平均耗时: `${stats.averageDuration}ms`,
    平台统计: stats.platformStats
  });
  
  // 获取支持的平台
  const supportedPlatforms = publishManager.getSupportedPlatforms();
  console.log('🎯 支持的平台:', supportedPlatforms);
  
  return stats;
}

/**
 * 运行所有快速开始示例
 */
export async function runQuickStartExamples() {
  console.log('🎉 开始运行快速开始示例...\n');
  
  const results = {};
  
  try {
    // 基础快速开始
    console.log('='.repeat(50));
    results.quickStart = await quickStart();
    
    console.log('\n' + '='.repeat(50));
    results.smartPublish = await smartPublishExample();
    
    console.log('\n' + '='.repeat(50));
    results.errorHandling = await errorHandlingExample();
    
    console.log('\n' + '='.repeat(50));
    results.performance = await performanceTest();
    
    console.log('\n' + '='.repeat(50));
    results.customConfig = await customConfigExample();
    
    console.log('\n' + '='.repeat(50));
    results.batchPublish = await batchPublishExample();
    
    console.log('\n' + '='.repeat(50));
    results.monitoring = await monitoringExample();
    
    console.log('\n🎉 所有快速开始示例运行完成！');
    console.log('📋 完整结果摘要:', {
      quickStart: results.quickStart ? '✅ 成功' : '❌ 失败',
      smartPublish: results.smartPublish?.success ? '✅ 成功' : '❌ 失败',
      errorHandling: results.errorHandling ? '✅ 成功' : '❌ 失败',
      performance: results.performance?.length > 0 ? '✅ 成功' : '❌ 失败',
      customConfig: results.customConfig ? '✅ 成功' : '❌ 失败',
      batchPublish: results.batchPublish?.length > 0 ? '✅ 成功' : '❌ 失败',
      monitoring: results.monitoring ? '✅ 成功' : '❌ 失败'
    });
    
  } catch (error) {
    console.error('❌ 快速开始示例运行失败:', error);
  }
  
  return results;
}

/**
 * 选择性运行示例
 */
export function runExample(exampleName) {
  const examples = {
    'quick': quickStart,
    'smart': smartPublishExample,
    'error': errorHandlingExample,
    'performance': performanceTest,
    'config': customConfigExample,
    'batch': batchPublishExample,
    'monitor': monitoringExample,
    'all': runQuickStartExamples
  };
  
  const example = examples[exampleName];
  if (!example) {
    console.error('❌ 未找到示例:', exampleName);
    console.log('📋 可用示例:', Object.keys(examples));
    return;
  }
  
  console.log(`🚀 运行示例: ${exampleName}`);
  return example();
}

// 如果直接运行此文件
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  const exampleName = process.argv[2] || 'all';
  runExample(exampleName);
}

// 导出便捷方法
export {
  quickStart,
  smartPublishExample,
  errorHandlingExample,
  performanceTest,
  customConfigExample,
  batchPublishExample,
  monitoringExample
};
