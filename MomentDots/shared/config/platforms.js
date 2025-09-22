// 统一的平台配置文件
// 避免在多个文件中重复定义平台信息

const SUPPORTED_PLATFORMS = [
  {
    id: 'weibo',
    name: '微博',
    publishUrl: 'https://weibo.com/',
    videoPublishUrl: 'https://weibo.com/upload/channel',
    color: 'bg-red-500',
    logoUrl: 'https://favicon.im/weibo.com',
    domain: 'weibo.com',
    supportsVideo: true
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    publishUrl: 'https://creator.xiaohongshu.com/new/home',
    videoPublishUrl: 'https://creator.xiaohongshu.com/publish/publish',
    color: 'bg-red-500',
    logoUrl: 'https://favicon.im/www.xiaohongshu.com',
    domain: 'xiaohongshu.com',
    supportsVideo: true
  },
  {
    id: 'jike',
    name: '即刻',
    publishUrl: 'https://web.okjike.com',
    color: 'bg-yellow-500',
    logoUrl: 'https://favicon.im/web.okjike.com',
    domain: 'okjike.com',
    supportsVideo: false
  },
  {
    id: 'douyin',
    name: '抖音',
    publishUrl: 'https://creator.douyin.com/creator-micro/home',
    videoPublishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
    color: 'bg-black',
    logoUrl: 'https://favicon.im/www.douyin.com',
    domain: 'douyin.com',
    supportsVideo: true
  },
  {
    id: 'x',
    name: 'X',
    publishUrl: 'https://x.com/home',
    color: 'bg-black',
    logoUrl: 'https://favicon.im/x.com',
    domain: 'x.com',
    supportsVideo: false
  },
  {
    id: 'bilibili',
    name: 'Bilibili',
    publishUrl: 'https://t.bilibili.com/',
    videoPublishUrl: 'https://member.bilibili.com/platform/upload/video/frame',
    color: 'bg-blue-500',
    logoUrl: 'https://favicon.im/www.bilibili.com',
    domain: 'bilibili.com',
    supportsVideo: true
  },
  {
    id: 'weixin',
    name: '微信公众号',
    publishUrl: 'https://mp.weixin.qq.com/',
    color: 'bg-green-500',
    logoUrl: 'https://favicon.im/mp.weixin.qq.com',
    domain: 'mp.weixin.qq.com',
    // 标记为跨标签页平台
    crossTab: true,
    editPagePattern: 'appmsg_edit_v2',
    supportsVideo: false
  },
  {
    id: 'weixinchannels',
    name: '微信视频号',
    publishUrl: 'https://channels.weixin.qq.com/platform/post/finderNewLifeCreate',
    videoPublishUrl: 'https://channels.weixin.qq.com/platform/post/create',
    color: 'bg-green-500',
    logoUrl: 'https://favicon.im/channels.weixin.qq.com',
    domain: 'channels.weixin.qq.com',
    // 明确标记为A类平台（直接注入型）
    platformType: 'direct-injection',
    // 标记特殊技术特征
    specialFeatures: {
      shadowDOMAccess: true,    // 需要Shadow DOM访问
      requiresActivation: true  // 需要点击激活内容区域
    },
    supportsVideo: true
  }
];

// 文章专用平台配置
const ARTICLE_PLATFORMS = [
  {
    id: 'weibo-article',
    name: '微博头条',
    publishUrl: 'https://card.weibo.com/article/v3/editor#/draft/create',
    color: 'bg-red-500',
    logoUrl: 'https://favicon.im/weibo.com',
    domain: 'weibo.com',
    supportsVideo: false,
    contentType: 'article'
  },
  {
    id: 'bilibili-article',
    name: 'Bilibili专栏',
    publishUrl: 'https://member.bilibili.com/read/editor/#/web',
    color: 'bg-blue-500',
    logoUrl: 'https://favicon.im/www.bilibili.com',
    domain: 'bilibili.com',
    supportsVideo: false,
    contentType: 'article'
  },
  {
    id: 'weixin-article',
    name: '微信公众号文章',
    publishUrl: 'https://mp.weixin.qq.com/',
    color: 'bg-green-500',
    logoUrl: 'https://favicon.im/mp.weixin.qq.com',
    domain: 'mp.weixin.qq.com',
    // 标记为跨标签页平台
    crossTab: true,
    editPagePattern: 'appmsg_edit_v2',
    supportsVideo: false,
    contentType: 'article'
  },
  {
    id: 'xiaohongshu-article',
    name: '小红书长文',
    publishUrl: 'https://creator.xiaohongshu.com/publish/publish?from=tab_switch&target=article',
    color: 'bg-red-500',
    logoUrl: 'https://favicon.im/www.xiaohongshu.com',
    domain: 'xiaohongshu.com',
    supportsVideo: false,
    contentType: 'article',
    parentPlatform: 'xiaohongshu'
  }
];

// 获取所有平台的统一函数（避免重复的数组合并操作）
function getAllPlatforms() {
  return [...SUPPORTED_PLATFORMS, ...ARTICLE_PLATFORMS];
}

// 根据ID获取平台信息（支持从所有平台列表中查找）
function getPlatformById(id) {
  return getAllPlatforms().find(platform => platform.id === id);
}

// 根据ID数组获取平台列表（支持从所有平台列表中查找）
function getPlatformsByIds(ids) {
  return getAllPlatforms().filter(platform => ids.includes(platform.id));
}

// 获取所有平台ID
function getAllPlatformIds() {
  return getAllPlatforms().map(platform => platform.id);
}

// 验证平台ID是否有效（支持从所有平台列表中验证）
function isValidPlatformId(id) {
  return getAllPlatforms().some(platform => platform.id === id);
}

// 获取支持视频的平台列表
function getVideoSupportedPlatforms() {
  return SUPPORTED_PLATFORMS.filter(platform => platform.supportsVideo !== false);
}

// 获取文章专用平台列表
function getArticlePlatforms() {
  return ARTICLE_PLATFORMS;
}

// 根据内容类型获取平台的发布URL
function getPlatformPublishUrl(platform, contentType) {
  if (contentType === '短视频' && platform.videoPublishUrl) {
    return platform.videoPublishUrl;
  }
  return platform.publishUrl;
}
