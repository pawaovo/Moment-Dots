// SortableJS本地加载器
// 用于图片拖拽排序功能，从本地文件加载避免CSP限制

(function() {
  'use strict';

  // 从本地加载SortableJS，避免CSP限制
  const script = document.createElement('script');
  script.src = './Sortable.min.js';  // 本地文件路径
  script.async = true;

  script.onerror = function() {
    console.warn('SortableJS加载失败，拖拽功能不可用');
  };

  script.onload = function() {
    console.log('✅ SortableJS加载成功');
  };

  document.head.appendChild(script);
})();
