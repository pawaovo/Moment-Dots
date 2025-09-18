/**
 * ChunkTransferService - 分块传输服务
 * 
 * 功能：
 * - 大文件分块处理（16MB per chunk）
 * - 分块传输状态管理和错误重试
 * - 平台端高效分块重组算法
 * - 传输进度监控和性能统计
 * 
 * @author MomentDots Team
 * @version 1.0.0
 */

class ChunkTransferService {
  constructor() {
    this.CHUNK_SIZE = 16 * 1024 * 1024; // 16MB
    this.LARGE_FILE_THRESHOLD = 32 * 1024 * 1024; // 32MB
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 1000; // 1秒
    
    // 传输状态管理
    this.activeTransfers = new Map();
    this.transferStats = new Map();
  }

  /**
   * 检查文件是否需要分块传输
   * @param {number} fileSize - 文件大小
   * @returns {boolean} 是否需要分块
   */
  needsChunking(fileSize) {
    return fileSize >= this.LARGE_FILE_THRESHOLD;
  }

  /**
   * 创建文件分块信息
   * @param {File|Blob} file - 文件对象
   * @returns {Object} 分块信息
   */
  createChunkInfo(file) {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    
    return {
      fileSize: file.size,
      fileName: file.name || 'unknown',
      fileType: file.type || 'application/octet-stream',
      chunkSize: this.CHUNK_SIZE,
      totalChunks: totalChunks,
      chunks: Array.from({ length: totalChunks }, (_, index) => ({
        index: index,
        start: index * this.CHUNK_SIZE,
        end: Math.min((index + 1) * this.CHUNK_SIZE, file.size),
        size: Math.min(this.CHUNK_SIZE, file.size - index * this.CHUNK_SIZE),
        status: 'pending' // pending, transferring, completed, failed
      }))
    };
  }

  /**
   * 从文件中提取指定分块
   * @param {File|Blob} file - 文件对象
   * @param {number} chunkIndex - 分块索引
   * @param {Object} chunkInfo - 分块信息
   * @returns {Promise<Object>} 分块数据
   */
  async extractChunk(file, chunkIndex, chunkInfo) {
    if (chunkIndex >= chunkInfo.totalChunks) {
      throw new Error(`Invalid chunk index: ${chunkIndex}`);
    }

    const chunk = chunkInfo.chunks[chunkIndex];
    const blob = file.slice(chunk.start, chunk.end);
    
    // 转换为ArrayBuffer以便传输
    const arrayBuffer = await blob.arrayBuffer();
    
    return {
      index: chunkIndex,
      data: new Uint8Array(arrayBuffer),
      size: chunk.size,
      totalChunks: chunkInfo.totalChunks,
      checksum: await this.calculateChecksum(arrayBuffer)
    };
  }

  /**
   * 重组文件分块
   * @param {Array} chunks - 分块数组
   * @param {Object} metadata - 文件元数据
   * @returns {Promise<File>} 重组后的文件
   */
  async reconstructFile(chunks, metadata) {
    // 验证分块完整性
    if (!this.validateChunks(chunks)) {
      throw new Error('Chunk validation failed');
    }

    // 按索引排序
    chunks.sort((a, b) => a.index - b.index);

    // 合并分块数据
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const mergedData = new Uint8Array(totalSize);
    
    let offset = 0;
    for (const chunk of chunks) {
      mergedData.set(chunk.data, offset);
      offset += chunk.size;
    }

    // 创建文件对象
    const blob = new Blob([mergedData], { type: metadata.fileType });
    return new File([blob], metadata.fileName, {
      type: metadata.fileType,
      lastModified: metadata.lastModified || Date.now()
    });
  }

  /**
   * 验证分块完整性
   * @param {Array} chunks - 分块数组
   * @returns {boolean} 验证结果
   */
  validateChunks(chunks) {
    if (!chunks || chunks.length === 0) {
      return false;
    }

    const totalChunks = chunks[0].totalChunks;
    
    // 检查分块数量
    if (chunks.length !== totalChunks) {
      console.error(`Chunk count mismatch: expected ${totalChunks}, got ${chunks.length}`);
      return false;
    }

    // 检查分块索引连续性
    const indices = chunks.map(chunk => chunk.index).sort((a, b) => a - b);
    for (let i = 0; i < indices.length; i++) {
      if (indices[i] !== i) {
        console.error(`Missing chunk at index: ${i}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 计算数据校验和
   * @param {ArrayBuffer} data - 数据
   * @returns {Promise<string>} 校验和
   */
  async calculateChecksum(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 开始分块传输
   * @param {string} transferId - 传输ID
   * @param {Object} chunkInfo - 分块信息
   */
  startTransfer(transferId, chunkInfo) {
    this.activeTransfers.set(transferId, {
      chunkInfo: chunkInfo,
      startTime: Date.now(),
      completedChunks: 0,
      failedChunks: 0,
      status: 'active'
    });

    this.transferStats.set(transferId, {
      totalBytes: chunkInfo.fileSize,
      transferredBytes: 0,
      speed: 0,
      estimatedTimeRemaining: 0
    });
  }

  /**
   * 更新传输进度
   * @param {string} transferId - 传输ID
   * @param {number} chunkIndex - 分块索引
   * @param {string} status - 状态
   */
  updateChunkStatus(transferId, chunkIndex, status) {
    const transfer = this.activeTransfers.get(transferId);
    if (!transfer) return;

    const chunk = transfer.chunkInfo.chunks[chunkIndex];
    if (chunk) {
      const oldStatus = chunk.status;
      chunk.status = status;

      // 更新统计
      if (oldStatus !== 'completed' && status === 'completed') {
        transfer.completedChunks++;
        this.updateTransferStats(transferId, chunk.size);
      } else if (oldStatus !== 'failed' && status === 'failed') {
        transfer.failedChunks++;
      }

      // 检查传输是否完成
      if (transfer.completedChunks === transfer.chunkInfo.totalChunks) {
        transfer.status = 'completed';
        transfer.endTime = Date.now();
      }
    }
  }

  /**
   * 更新传输统计
   * @param {string} transferId - 传输ID
   * @param {number} bytesTransferred - 传输字节数
   */
  updateTransferStats(transferId, bytesTransferred) {
    const stats = this.transferStats.get(transferId);
    const transfer = this.activeTransfers.get(transferId);
    
    if (!stats || !transfer) return;

    stats.transferredBytes += bytesTransferred;
    
    const elapsed = Date.now() - transfer.startTime;
    stats.speed = stats.transferredBytes / (elapsed / 1000); // bytes per second
    
    const remaining = stats.totalBytes - stats.transferredBytes;
    stats.estimatedTimeRemaining = remaining / stats.speed;
  }

  /**
   * 获取传输进度
   * @param {string} transferId - 传输ID
   * @returns {Object|null} 进度信息
   */
  getTransferProgress(transferId) {
    const transfer = this.activeTransfers.get(transferId);
    const stats = this.transferStats.get(transferId);
    
    if (!transfer || !stats) return null;

    return {
      status: transfer.status,
      completedChunks: transfer.completedChunks,
      totalChunks: transfer.chunkInfo.totalChunks,
      failedChunks: transfer.failedChunks,
      progress: (transfer.completedChunks / transfer.chunkInfo.totalChunks) * 100,
      transferredBytes: stats.transferredBytes,
      totalBytes: stats.totalBytes,
      speed: stats.speed,
      estimatedTimeRemaining: stats.estimatedTimeRemaining
    };
  }

  /**
   * 完成传输
   * @param {string} transferId - 传输ID
   */
  completeTransfer(transferId) {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer) {
      transfer.status = 'completed';
      transfer.endTime = Date.now();
    }
  }

  /**
   * 清理传输记录
   * @param {string} transferId - 传输ID
   */
  cleanupTransfer(transferId) {
    this.activeTransfers.delete(transferId);
    this.transferStats.delete(transferId);
  }

  /**
   * 生成传输ID
   * @returns {string} 传输ID
   */
  generateTransferId() {
    return `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出服务
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChunkTransferService;
} else if (typeof window !== 'undefined') {
  window.ChunkTransferService = ChunkTransferService;
}
