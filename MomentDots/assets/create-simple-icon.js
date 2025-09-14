// 创建简单的PNG图标文件
// 这个脚本可以在浏览器控制台中运行来生成图标

function createIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // 绘制背景圆形
  ctx.fillStyle = '#3B82F6';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 4, 0, 2 * Math.PI);
  ctx.fill();
  
  // 绘制发送图标
  ctx.fillStyle = 'white';
  ctx.beginPath();
  const centerX = size/2;
  const centerY = size/2;
  const iconSize = size * 0.4;
  
  ctx.moveTo(centerX - iconSize/2, centerY);
  ctx.lineTo(centerX + iconSize/2, centerY - iconSize/2);
  ctx.lineTo(centerX + iconSize/4, centerY);
  ctx.lineTo(centerX + iconSize/2, centerY + iconSize/2);
  ctx.lineTo(centerX - iconSize/2, centerY);
  ctx.closePath();
  ctx.fill();
  
  // 绘制边框
  ctx.strokeStyle = '#1E40AF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 4, 0, 2 * Math.PI);
  ctx.stroke();
  
  return canvas.toDataURL('image/png');
}

// 生成不同尺寸的图标
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const dataURL = createIcon(size);
  console.log(`Icon ${size}x${size}:`, dataURL);
  
  // 创建下载链接
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `icon${size}.png`;
  link.textContent = `Download icon${size}.png`;
  link.style.display = 'block';
  document.body.appendChild(link);
});

console.log('图标生成完成，请点击页面上的链接下载图标文件到 assets 目录');
