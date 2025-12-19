/**
 * 项目常量定义
 */

// 批改结果存放的字段名称
export const GRADE_FIELD_NAME = '自动批改结果参考';
// 批改结果JSON链接字段名称（优先使用）
export const GRADE_FIELD_LINK_NAME = '自动批改结果json链接';

// 图片相关常量
export const IMAGE_CONFIG = {
  MAX_DISPLAY_WIDTH: 1440, // 图片直接编辑的最大显示宽度
  MAX_DISPLAY_HEIGHT: 1440, // 图片直接编辑的最大显示高度
  COMPRESS_THRESHOLD: 2000, // 超过此尺寸才压缩
  COMPRESS_MAX_WIDTH: 1920, // 压缩后的最大宽度
  COMPRESS_MAX_HEIGHT: 1920, // 压缩后的最大高度
  COMPRESS_QUALITY: 0.85, // 压缩质量
} as const;

// PDF 相关常量
export const PDF_CONFIG = {
  INITIAL_SCALE: 1.0, // 初始缩放比例
  DEFAULT_SCALE: 1.5, // 默认缩放比例，已弃用？
  MIN_SCALE: 0.5, // 最小缩放比例
  MAX_SCALE: 3.0, // 最大缩放比例
  SCALE_STEP: 0.25, // 缩放步长
} as const;

// 文本相关常量
export const TEXT_CONFIG = {
  // 旧配置（保留兼容性，但已弃用）
  ANALYSIS_MAX_WIDTH: 400, // 批改分析文本最大宽度，像素（已弃用，使用比例配置）
  ANALYSIS_FONT_SIZE: 20, // 批改分析文本字体大小（已弃用，使用比例配置）
  QUESTION_FONT_SIZE: 24, // 题号文本字体大小（已弃用，使用比例配置）
  // LINE_HEIGHT_RATIO: 1.25, // 行高比例（已弃用，使用比例配置）
  
  // 新配置（基于图片宽度的百分比）
  QUESTION_FONT_SIZE_RATIO: 0.024, // 题号字体大小 = 图片宽度 * 0.024
  ANALYSIS_FONT_SIZE_RATIO: 0.020, // 批注字体大小 = 图片宽度 * 0.02
  ANALYSIS_MAX_WIDTH_RATIO: 0.5,   // 批注区域宽度 = 图片宽度 * 0.5
  LINE_HEIGHT_RATIO: 1.5,          // 行高系数 = 字体大小 * 1.5
  QUESTION_SPACING_RATIO: 0.015,    // 题号间距 = 图片宽度 * 0.015
  ANALYSIS_SPACING_RATIO: 0.02,     // 批注间距 = 图片宽度 * 0.02
} as const;

// 颜色常量
export const COLORS = {
  CORRECT: 'green', // 正确颜色
  ERROR: 'red', // 错误颜色
  WARNING: 'orange', // 警告颜色
  TEXT_PRIMARY: '#333', // 主文本颜色
  TEXT_SECONDARY: '#666', // 副文本颜色
} as const;

// 超时时间（毫秒）
export const TIMEOUT = {
  EXPORT: 10000, // 导出按钮超时时间，毫秒
  PDF_LOAD: 30000, // PDF 加载超时时间，毫秒
} as const;

// 导出文件名前缀
export const EXPORT_FILE_PREFIX = {
  EXCALIDRAW: 'excalidraw', // 画布导出文件名前缀
  GRADE: 'grade', // 批改文件名前缀
} as const;

// 图片文件扩展名
export const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;

// 支持的图片 MIME 类型前缀
export const IMAGE_MIME_PREFIX = 'image/';

// PDF MIME 类型
export const PDF_MIME_TYPE = 'application/pdf';

// 批改预览相关配置
export const GRADE_PREVIEW_CONFIG = {
  TOOLTIP_MESSAGE: '需要校验算法批改为错误的所有内容，详细规则详见此链接：',
  TOOLTIP_LINK_URL: 'https://gaotuedu.feishu.cn/wiki/AWDZwRKQRi6GZZkabO7cIcR8nLc', // 配置为完整的公网链接地址，例如：https://example.com/rules
} as const;

