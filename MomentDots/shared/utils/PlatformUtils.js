/**
 * 平台工具类 - 统一管理平台相关的工具函数
 * 避免在多个文件中重复定义相同的函数
 */

// 平台名称映射表
const PLATFORM_NAMES = {
  'weibo': '微博',
  'xiaohongshu': '小红书',
  'douyin': '抖音',
  'jike': '即刻',
  'bilibili': 'B站',
  'weixinchannels': '微信视频号',
  'weixin': '微信公众号',
  'weixin-article': '微信公众号(文章)',
  'x': 'X(Twitter)'
};

/**
 * 根据平台ID获取平台名称
 * @param {string} platformId - 平台ID
 * @returns {string} 平台名称
 */
function getPlatformNameById(platformId) {
  return PLATFORM_NAMES[platformId] || platformId;
}

/**
 * 获取所有支持的平台列表
 * @returns {Array} 平台列表
 */
function getAllPlatforms() {
  return Object.keys(PLATFORM_NAMES).map(id => ({
    id,
    name: PLATFORM_NAMES[id]
  }));
}

/**
 * 验证平台ID是否有效
 * @param {string} platformId - 平台ID
 * @returns {boolean} 是否有效
 */
function isValidPlatformId(platformId) {
  return platformId && PLATFORM_NAMES.hasOwnProperty(platformId);
}

/**
 * 格式化平台显示信息
 * @param {string|Object} platform - 平台ID或平台对象
 * @returns {Object} 格式化后的平台信息
 */
function formatPlatformInfo(platform) {
  if (typeof platform === 'string') {
    return {
      id: platform,
      name: getPlatformNameById(platform)
    };
  }
  
  if (platform && typeof platform === 'object') {
    return {
      id: platform.id || 'unknown',
      name: platform.name || getPlatformNameById(platform.id) || 'unknown'
    };
  }
  
  return {
    id: 'unknown',
    name: 'unknown'
  };
}

// 导出函数（支持多种模块系统）
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/CommonJS
  module.exports = {
    getPlatformNameById,
    getAllPlatforms,
    isValidPlatformId,
    formatPlatformInfo,
    PLATFORM_NAMES
  };
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  window.PlatformUtils = {
    getPlatformNameById,
    getAllPlatforms,
    isValidPlatformId,
    formatPlatformInfo,
    PLATFORM_NAMES
  };
}
