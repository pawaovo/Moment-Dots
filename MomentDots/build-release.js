#!/usr/bin/env node

/**
 * MomentDots Chrome扩展程序发布包构建脚本
 * 创建适合Chrome Web Store上传的压缩包
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始构建MomentDots发布包...\n');

// 读取版本信息
const manifestPath = path.join(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version;
const name = manifest.name;

console.log(`📦 扩展程序: ${name}`);
console.log(`🏷️  版本: v${version}\n`);

// 定义需要包含的文件和目录
const includePatterns = [
  'manifest.json',
  'icons/',
  'background/',
  'content-scripts/',
  'main/',
  'sidepanel/',
  'shared/',
  'styles/',
  'libs/',
  'prompt/',
  'assets/platform-icons/',
  'README.md'
];

// 定义需要排除的文件和目录
const excludePatterns = [
  'node_modules/',
  'docs/',
  'test/',
  'tests/',
  '.git/',
  '.gitignore',
  '.vscode/',
  'package.json',
  'package-lock.json',
  'tailwind.config.js',
  'tsconfig.json',
  'build-release.js',
  'CHROME_STORE_DESCRIPTION.md',
  'RELEASE_CHECKLIST.md',
  'DOCUMENTATION_UPDATE_REPORT.md',
  'assets/create-simple-icon.js',
  'assets/icon.svg',
  'assets/icon*.png',
  '*.log',
  '*.tmp',
  '.DS_Store',
  'Thumbs.db'
];

// 创建发布目录
const releaseDir = path.join(__dirname, '..', 'MomentDots-Release');
const buildDir = path.join(releaseDir, 'MomentDots');

console.log('📁 创建发布目录...');
if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true, force: true });
}
fs.mkdirSync(releaseDir, { recursive: true });
fs.mkdirSync(buildDir, { recursive: true });

// 复制文件函数
function copyFileOrDir(src, dest) {
  const srcPath = path.join(__dirname, src);
  const destPath = path.join(buildDir, src);
  
  if (!fs.existsSync(srcPath)) {
    console.log(`⚠️  跳过不存在的文件: ${src}`);
    return;
  }
  
  const stat = fs.statSync(srcPath);
  
  if (stat.isDirectory()) {
    // 复制目录
    fs.mkdirSync(destPath, { recursive: true });
    const files = fs.readdirSync(srcPath);
    
    files.forEach(file => {
      const fileSrc = path.join(src, file);
      const fileSrcPath = path.join(__dirname, fileSrc);
      const fileDestPath = path.join(destPath, file);
      
      // 检查是否应该排除
      const shouldExclude = excludePatterns.some(pattern => {
        if (pattern.endsWith('/')) {
          return fileSrc.startsWith(pattern) || fileSrc.includes('/' + pattern);
        }
        return fileSrc === pattern || fileSrc.endsWith('/' + pattern);
      });
      
      if (shouldExclude) {
        return;
      }
      
      const fileStat = fs.statSync(fileSrcPath);
      if (fileStat.isDirectory()) {
        copyFileOrDir(fileSrc, '');
      } else {
        fs.mkdirSync(path.dirname(fileDestPath), { recursive: true });
        fs.copyFileSync(fileSrcPath, fileDestPath);
      }
    });
  } else {
    // 复制文件
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
  }
}

// 复制包含的文件和目录
console.log('📋 复制文件...');
includePatterns.forEach(pattern => {
  console.log(`  ✅ ${pattern}`);
  copyFileOrDir(pattern, '');
});

// 验证关键文件
console.log('\n🔍 验证关键文件...');
const criticalFiles = [
  'manifest.json',
  'icons/icon16.png',
  'icons/icon128.png',
  'background/background.js',
  'main/main.html',
  'main/main.js',
  'sidepanel/sidepanel.html',
  'sidepanel/sidepanel.js'
];

let allCriticalFilesExist = true;
criticalFiles.forEach(file => {
  const filePath = path.join(buildDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - 缺失！`);
    allCriticalFilesExist = false;
  }
});

if (!allCriticalFilesExist) {
  console.error('\n❌ 关键文件缺失，构建失败！');
  process.exit(1);
}

// 创建压缩包
const zipFileName = `MomentDots-v${version}.zip`;
const zipPath = path.join(releaseDir, zipFileName);

console.log(`\n📦 创建压缩包: ${zipFileName}`);

try {
  // 使用系统的zip命令或PowerShell
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    // Windows PowerShell命令
    const powershellCmd = `Compress-Archive -Path "${buildDir}\\*" -DestinationPath "${zipPath}" -Force`;
    execSync(`powershell -Command "${powershellCmd}"`, { stdio: 'inherit' });
  } else {
    // Unix/Linux/Mac zip命令
    execSync(`cd "${buildDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
  }
  
  console.log('✅ 压缩包创建成功！');
} catch (error) {
  console.error('❌ 创建压缩包失败:', error.message);
  process.exit(1);
}

// 显示文件信息
const zipStats = fs.statSync(zipPath);
const zipSizeMB = (zipStats.size / 1024 / 1024).toFixed(2);

console.log(`\n📊 发布包信息:`);
console.log(`  📁 位置: ${zipPath}`);
console.log(`  📏 大小: ${zipSizeMB} MB`);
console.log(`  🏷️  版本: v${version}`);

// 显示下一步操作
console.log(`\n🎉 发布包构建完成！`);
console.log(`\n📋 下一步操作:`);
console.log(`1. 打开 Chrome Web Store Developer Dashboard`);
console.log(`2. 点击 "Add new item" 或更新现有扩展`);
console.log(`3. 上传文件: ${zipFileName}`);
console.log(`4. 填写商店信息（参考 CHROME_STORE_DESCRIPTION.md）`);
console.log(`5. 提交审核`);

console.log(`\n🔗 有用链接:`);
console.log(`- Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/devconsole`);
console.log(`- 发布指南: https://developer.chrome.com/docs/webstore/publish/`);

// 清理构建目录（保留压缩包）
fs.rmSync(buildDir, { recursive: true, force: true });
console.log(`\n🧹 清理临时文件完成`);
