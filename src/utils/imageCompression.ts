/**
 * 图片压缩工具函数
 */

/**
 * 压缩图片：通过缩放尺寸和降低质量来减小图片大小
 * @param imageUrl 原始图片 URL
 * @param maxWidth 压缩后最大宽度
 * @param maxHeight 压缩后最大高度
 * @param quality JPEG 压缩质量 (0-1)
 * @returns 压缩后图片的 Blob URL
 */
export const compressImage = (
  imageUrl: string,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 canvas context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('图片压缩失败'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = imageUrl;
  });
};
