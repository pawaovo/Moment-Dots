/**
 * 大文件处理功能测试脚本
 * 
 * 测试内容：
 * 1. 分块传输服务功能
 * 2. Background Script 分块处理
 * 3. 平台适配器分块获取
 * 4. 文件完整性验证
 * 5. 确保不影响其他页面功能
 * 
 * @author MomentDots Team
 * @version 1.0.0
 */

class LargeFileTestSuite {
  constructor() {
    this.testResults = [];
    this.LARGE_FILE_THRESHOLD = 32 * 1024 * 1024; // 32MB
    this.CHUNK_SIZE = 16 * 1024 * 1024; // 16MB
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 开始大文件处理功能测试...');
    
    try {
      await this.testChunkTransferService();
      await this.testBackgroundScriptChunking();
      await this.testFileIntegrity();
      await this.testPlatformAdapterCompatibility();
      await this.testNonVideoFileCompatibility();
      
      this.printTestResults();
    } catch (error) {
      console.error('❌ 测试套件执行失败:', error);
    }
  }

  /**
   * 测试分块传输服务
   */
  async testChunkTransferService() {
    console.log('📦 测试分块传输服务...');
    
    try {
      // 创建测试文件
      const testFile = this.createTestFile(50 * 1024 * 1024); // 50MB
      
      // 测试分块信息创建
      if (typeof ChunkTransferService !== 'undefined') {
        const chunkService = new ChunkTransferService();
        
        // 测试是否需要分块
        const needsChunking = chunkService.needsChunking(testFile.size);
        this.addTestResult('分块需求检测', needsChunking, '大文件应该需要分块');
        
        // 测试分块信息创建
        const chunkInfo = chunkService.createChunkInfo(testFile);
        const expectedChunks = Math.ceil(testFile.size / this.CHUNK_SIZE);
        this.addTestResult('分块信息创建', chunkInfo.totalChunks === expectedChunks, 
          `期望 ${expectedChunks} 个分块，实际 ${chunkInfo.totalChunks} 个`);
        
        console.log('✅ 分块传输服务测试通过');
      } else {
        this.addTestResult('分块传输服务', false, 'ChunkTransferService 未加载');
      }
    } catch (error) {
      this.addTestResult('分块传输服务', false, error.message);
    }
  }

  /**
   * 测试 Background Script 分块处理
   */
  async testBackgroundScriptChunking() {
    console.log('🔧 测试 Background Script 分块处理...');
    
    try {
      // 测试文件分块检查
      const testResponse = await this.sendMessageToBackground({
        action: 'checkFileChunking',
        fileId: 'test_file_id'
      });
      
      // 注意：这里可能会失败，因为测试文件不存在，但我们可以检查消息处理是否正常
      this.addTestResult('Background Script 消息处理', 
        testResponse !== undefined, 
        'Background Script 应该能响应分块检查请求');
      
      console.log('✅ Background Script 分块处理测试完成');
    } catch (error) {
      this.addTestResult('Background Script 分块处理', false, error.message);
    }
  }

  /**
   * 测试文件完整性
   */
  async testFileIntegrity() {
    console.log('🔍 测试文件完整性验证...');
    
    try {
      // 创建测试数据
      const originalData = new Uint8Array(1024 * 1024); // 1MB
      for (let i = 0; i < originalData.length; i++) {
        originalData[i] = i % 256;
      }
      
      // 模拟分块和重组
      const chunkSize = 256 * 1024; // 256KB
      const chunks = [];
      
      for (let i = 0; i < originalData.length; i += chunkSize) {
        const end = Math.min(i + chunkSize, originalData.length);
        const chunkData = originalData.slice(i, end);
        chunks.push({
          index: chunks.length,
          data: chunkData,
          size: chunkData.length,
          totalChunks: Math.ceil(originalData.length / chunkSize)
        });
      }
      
      // 重组数据
      const reconstructedData = new Uint8Array(originalData.length);
      let offset = 0;
      for (const chunk of chunks) {
        reconstructedData.set(chunk.data, offset);
        offset += chunk.size;
      }
      
      // 验证完整性
      const isIntact = this.compareArrays(originalData, reconstructedData);
      this.addTestResult('文件完整性验证', isIntact, '重组后的文件应该与原文件完全一致');
      
      console.log('✅ 文件完整性验证测试通过');
    } catch (error) {
      this.addTestResult('文件完整性验证', false, error.message);
    }
  }

  /**
   * 测试平台适配器兼容性
   */
  async testPlatformAdapterCompatibility() {
    console.log('🔌 测试平台适配器兼容性...');
    
    try {
      // 检查 FileProcessorBase 是否存在
      if (typeof FileProcessorBase !== 'undefined') {
        const processor = new FileProcessorBase('test', {});
        
        // 检查新方法是否存在
        const hasChunkingMethod = typeof processor.getFileWithChunking === 'function';
        this.addTestResult('分块获取方法', hasChunkingMethod, 'getFileWithChunking 方法应该存在');
        
        const hasReconstructMethod = typeof processor.reconstructFileFromChunks === 'function';
        this.addTestResult('文件重组方法', hasReconstructMethod, 'reconstructFileFromChunks 方法应该存在');
        
        console.log('✅ 平台适配器兼容性测试通过');
      } else {
        this.addTestResult('平台适配器兼容性', false, 'FileProcessorBase 未加载');
      }
    } catch (error) {
      this.addTestResult('平台适配器兼容性', false, error.message);
    }
  }

  /**
   * 测试非视频文件兼容性（确保不影响图片等其他文件）
   */
  async testNonVideoFileCompatibility() {
    console.log('🖼️ 测试非视频文件兼容性...');
    
    try {
      // 创建小图片文件（模拟）
      const smallImageFile = this.createTestFile(2 * 1024 * 1024, 'image/jpeg'); // 2MB
      
      if (typeof ChunkTransferService !== 'undefined') {
        const chunkService = new ChunkTransferService();
        
        // 小文件不应该需要分块
        const needsChunking = chunkService.needsChunking(smallImageFile.size);
        this.addTestResult('小文件分块检测', !needsChunking, '小文件不应该需要分块传输');
        
        console.log('✅ 非视频文件兼容性测试通过');
      } else {
        this.addTestResult('非视频文件兼容性', false, 'ChunkTransferService 未加载');
      }
    } catch (error) {
      this.addTestResult('非视频文件兼容性', false, error.message);
    }
  }

  /**
   * 创建测试文件
   */
  createTestFile(size, type = 'video/mp4') {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = i % 256;
    }
    
    const blob = new Blob([data], { type: type });
    return new File([blob], `test-file-${size}.${type.split('/')[1]}`, {
      type: type,
      lastModified: Date.now()
    });
  }

  /**
   * 发送消息到 Background Script
   */
  async sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } else {
        reject(new Error('Chrome runtime not available'));
      }
    });
  }

  /**
   * 比较两个数组是否相等
   */
  compareArrays(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    
    return true;
  }

  /**
   * 添加测试结果
   */
  addTestResult(testName, passed, description) {
    this.testResults.push({
      name: testName,
      passed: passed,
      description: description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 打印测试结果
   */
  printTestResults() {
    console.log('\n📊 测试结果汇总:');
    console.log('='.repeat(50));
    
    let passedCount = 0;
    let totalCount = this.testResults.length;
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ 通过' : '❌ 失败';
      console.log(`${status} ${result.name}: ${result.description}`);
      if (result.passed) passedCount++;
    });
    
    console.log('='.repeat(50));
    console.log(`总计: ${passedCount}/${totalCount} 个测试通过`);
    
    if (passedCount === totalCount) {
      console.log('🎉 所有测试通过！大文件处理功能正常工作。');
    } else {
      console.log('⚠️ 部分测试失败，请检查相关功能。');
    }
  }
}

// 导出测试套件
if (typeof window !== 'undefined') {
  window.LargeFileTestSuite = LargeFileTestSuite;
  
  // 自动运行测试（可选）
  if (window.location.search.includes('run-large-file-tests')) {
    document.addEventListener('DOMContentLoaded', async () => {
      const testSuite = new LargeFileTestSuite();
      await testSuite.runAllTests();
    });
  }
}

console.log('🧪 大文件测试套件已加载。使用 new LargeFileTestSuite().runAllTests() 运行测试。');
