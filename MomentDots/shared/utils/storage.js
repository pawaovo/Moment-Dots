// 统一的Chrome Storage管理模块
// 避免在多个文件中重复实现存储逻辑

/**
 * 保存发布数据到Chrome Storage
 * @param {Object} data - 要保存的数据
 * @param {string} data.title - 标题
 * @param {string} data.content - 内容
 * @param {Array} data.selectedPlatforms - 选中的平台列表
 */
async function savePublishData(data) {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('Chrome storage not available');
    return;
  }

  try {
    const storageData = {
      title: data.title || '',
      content: data.content || '',
      selectedPlatforms: data.selectedPlatforms ? data.selectedPlatforms.map(p => p.id) : [],
      imagePreviews: data.imagePreviews || [] // 支持多图片数据
    };

    await chrome.storage.local.set({
      publishData: storageData
    });

    console.log('Data saved to storage successfully');
  } catch (error) {
    console.error('Failed to save to storage:', error);
    throw error;
  }
}

/**
 * 从Chrome Storage加载发布数据
 * @returns {Promise<Object>} 加载的数据
 */
async function loadPublishData() {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('Chrome storage not available');
    return getDefaultData();
  }

  try {
    const result = await chrome.storage.local.get(['publishData']);

    if (result.publishData) {
      const { title, content, selectedPlatforms: platformIds, imagePreviews } = result.publishData;
      const platforms = getPlatformsByIds(platformIds || []);

      return {
        title: title || '',
        content: content || '',
        selectedPlatforms: platforms,
        imagePreviews: imagePreviews || [] // 支持多图片数据
      };
    }

    return getDefaultData();
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return getDefaultData();
  }
}

/**
 * 保存发布状态到Chrome Storage
 * @param {Object} status - 发布状态
 */
async function savePublishStatus(status) {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('Chrome storage not available');
    return;
  }

  try {
    await chrome.storage.local.set({
      publishStatus: status
    });
  } catch (error) {
    console.error('Failed to save publish status:', error);
  }
}

/**
 * 从Chrome Storage加载发布状态
 * @returns {Promise<Object>} 发布状态
 */
async function loadPublishStatus() {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('Chrome storage not available');
    return { isPublishing: false, publishResults: [] };
  }

  try {
    const result = await chrome.storage.local.get(['publishStatus', 'publishResults']);
    return {
      isPublishing: result.publishStatus?.isPublishing || false,
      publishResults: result.publishResults || []
    };
  } catch (error) {
    console.error('Failed to load publish status:', error);
    return { isPublishing: false, publishResults: [] };
  }
}

/**
 * 保存发布结果到Chrome Storage
 * @param {Array} results - 发布结果列表
 */
async function savePublishResults(results) {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('Chrome storage not available');
    return;
  }

  try {
    await chrome.storage.local.set({
      publishResults: results
    });
  } catch (error) {
    console.error('Failed to save publish results:', error);
  }
}

/**
 * 清除临时发布数据（保留配置数据）
 */
async function clearTemporaryData() {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('Chrome storage not available');
    return;
  }

  try {
    // 只清除临时数据，保留配置和其他持久化数据
    await chrome.storage.local.remove(['publishData', 'publishResults']);
    console.log('Temporary data cleared');
  } catch (error) {
    console.error('Failed to clear temporary data:', error);
  }
}

/**
 * 清除所有存储数据
 */
async function clearAllData() {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('Chrome storage not available');
    return;
  }

  try {
    await chrome.storage.local.clear();
    console.log('All storage data cleared');
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}

/**
 * 获取默认数据
 * @returns {Object} 默认数据结构
 */
function getDefaultData() {
  return {
    title: '',
    content: '',
    selectedPlatforms: [],
    imagePreviews: [] // 支持多图片数据
  };
}
