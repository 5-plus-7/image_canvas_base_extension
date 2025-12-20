import { IMAGE_EXTENSIONS, IMAGE_MIME_PREFIX, PDF_MIME_TYPE } from '../constants';

/**
 * 检查附件是否为图片
 */
export const isImageAttachment = (attachment: { type?: string; name?: string } | null | undefined): boolean => {
  if (!attachment) return false;
  return (
    attachment.type?.startsWith(IMAGE_MIME_PREFIX) ||
    (attachment.name?.match(IMAGE_EXTENSIONS) !== null)
  );
};

/**
 * 检查附件是否为 PDF
 */
export const isPdfAttachment = (attachment: { type?: string; name?: string } | null | undefined): boolean => {
  if (!attachment) return false;
  return (
    attachment.type === PDF_MIME_TYPE ||
    attachment.name?.toLowerCase().endsWith('.pdf') === true
  );
};

/**
 * 检查附件是否支持预览
 */
export const isSupportedAttachment = (attachment: { type?: string; name?: string } | null | undefined): boolean => {
  return isImageAttachment(attachment) || isPdfAttachment(attachment);
};

