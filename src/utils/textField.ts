import { ITextField } from '@lark-base-open/js-sdk';

/**
 * 将文本字段值转换为字符串
 * ITextField.getValue 返回 IOpenSegment[]，需要转换为字符串
 */
export const convertTextFieldValueToString = (value: any): string => {
  if (Array.isArray(value)) {
    return value.map(seg => seg.text || '').join('');
  }
  return String(value || '');
};

/**
 * 检查文本字段是否有有效值
 */
export const hasTextFieldValue = (value: any): boolean => {
  const valueStr = convertTextFieldValueToString(value);
  return !!valueStr && valueStr.trim() !== '';
};

