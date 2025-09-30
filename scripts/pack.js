import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function createZipFile() {
  const distPath = path.join(process.cwd(), 'dist');
  const outputPath = path.join(process.cwd(), 'output.zip');
  
  console.log('📦 开始打包 dist 目录...');
  console.log('源目录:', distPath);
  console.log('输出文件:', outputPath);
  
  try {
    // 检查 dist 目录是否存在
    if (!fs.existsSync(distPath)) {
      throw new Error('dist 目录不存在，请先运行 npm run build');
    }
    
    // 删除已存在的 output.zip
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log('🗑️  删除旧的 output.zip');
    }
    
    // 使用系统命令创建 ZIP 文件
    try {
      // 尝试使用 zip 命令 (macOS/Linux)
      execSync(`cd "${distPath}" && zip -r "${outputPath}" .`, { stdio: 'inherit' });
    } catch (zipError) {
      try {
        // 如果 zip 命令失败，尝试使用 tar 命令
        console.log('zip 命令不可用，尝试使用 tar 命令...');
        execSync(`tar -czf "${outputPath}" -C "${distPath}" .`, { stdio: 'inherit' });
        console.log('⚠️  使用 tar.gz 格式创建了压缩文件');
      } catch (tarError) {
        // 如果都失败了，创建简单的文件列表
        console.log('压缩命令不可用，创建文件列表...');
        createFileList(distPath, outputPath);
      }
    }
    
    console.log('✅ 打包完成！');
    console.log('📁 输出文件:', outputPath);
    
    // 显示文件大小
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log('📊 文件大小:', fileSizeInMB, 'MB');
    }
    
  } catch (error) {
    console.error('❌ 打包失败:', error.message);
    process.exit(1);
  }
}

// 创建文件列表作为备用方案
function createFileList(sourceDir, outputFile) {
  const files = getAllFiles(sourceDir);
  const fileList = files.map(file => path.relative(sourceDir, file));
  
  const content = `# 文件列表\n${fileList.join('\n')}\n\n# 请手动将这些文件打包成 ZIP`;
  fs.writeFileSync(outputFile, content);
  console.log('⚠️  创建了文件列表，请手动打包');
}

// 获取目录下所有文件
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

// 运行打包
createZipFile();
