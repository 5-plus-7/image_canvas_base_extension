/**
 * 图片加载相关工具函数
 */

import { IMAGE_CONFIG } from '../constants';

/** 将 Blob 转换为 DataURL */
export const blobToDataURL = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('图片读取失败，请检查图片格式'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

/** 获取图片的原始尺寸 */
export const getImageSize = (dataURL: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('图片格式无效或已损坏'));
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = dataURL;
  });

/** 根据 URL 后缀猜测 MIME 类型 */
export const guessMimeFromUrl = (url: string): string | undefined => {
  const lower = url.split('?')[0].toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return undefined;
};

/** 计算适配显示尺寸（保持宽高比） */
export const calculateDisplaySize = (
  imageWidth: number,
  imageHeight: number,
  maxWidth: number = IMAGE_CONFIG.MAX_DISPLAY_WIDTH,
  maxHeight: number = IMAGE_CONFIG.MAX_DISPLAY_HEIGHT
): { width: number; height: number } => {
  let displayWidth = imageWidth;
  let displayHeight = imageHeight;
  if (imageWidth > maxWidth || imageHeight > maxHeight) {
    const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
    displayWidth = imageWidth * scale;
    displayHeight = imageHeight * scale;
  }
  return { width: displayWidth, height: displayHeight };
};
