import { bitable, ITextField, FieldType } from '@lark-base-open/js-sdk';
import { GRADE_FIELD_NAME, GRADE_FIELD_LINK_NAME } from '../constants';
import { hasTextFieldValue } from './textField';

/**
 * 检查记录是否有有效的批改字段值
 * 优先检查链接字段，如果链接字段有值则返回true；否则检查参考字段
 */
export const checkGradeField = async (tableId: string, recordId: string): Promise<boolean> => {
  try {
    const table = await bitable.base.getTableById(tableId);
    const fieldMetaList = await table.getFieldMetaList();
    
    // 优先检查链接字段
    const linkField = fieldMetaList.find(field => field.name === GRADE_FIELD_LINK_NAME);
    if (linkField && linkField.type === FieldType.Text) {
      const linkTextField = await table.getField<ITextField>(linkField.id);
      const linkValue = await linkTextField.getValue(recordId);
      if (hasTextFieldValue(linkValue)) {
        return true;
      }
    }
    
    // 如果没有链接字段或链接字段为空，检查参考字段
    const gradeField = fieldMetaList.find(field => field.name === GRADE_FIELD_NAME);
    if (!gradeField) {
      return false;
    }

    // 检查字段类型是否为文本类型
    if (gradeField.type !== FieldType.Text) {
      return false;
    }

    const textField = await table.getField<ITextField>(gradeField.id);
    const value = await textField.getValue(recordId);
    
    return hasTextFieldValue(value);
  } catch (error) {
    console.error('Error checking grade field:', error);
    return false;
  }
};

/**
 * 加载批改数据
 * 优先从「自动批改结果json链接」字段获取链接并fetch JSON
 * 如果没有链接字段或链接字段为空，则从「自动批改结果参考」字段直接读取JSON
 */
export const loadGradeData = async (tableId: string, recordId: string): Promise<string> => {
  try {
    const table = await bitable.base.getTableById(tableId);
    const fieldMetaList = await table.getFieldMetaList();
    
    // 优先检查链接字段
    const linkField = fieldMetaList.find(field => field.name === GRADE_FIELD_LINK_NAME);
    if (linkField && linkField.type === FieldType.Text) {
      const linkTextField = await table.getField<ITextField>(linkField.id);
      const linkValue = await linkTextField.getValue(recordId);
      
      // ITextField.getValue returns IOpenSegment[], need to convert to string
      const linkValueStr = (Array.isArray(linkValue) 
        ? linkValue.map(seg => seg.text || '').join('') 
        : String(linkValue || '')).trim();
      
      // 如果链接字段有值，优先使用链接字段
      if (linkValueStr) {
        try {
          const resp = await fetch(linkValueStr, { method: 'GET' });
          if (!resp.ok) {
            throw new Error(`批改数据链接请求失败，状态码 ${resp.status}`);
          }
          const text = await resp.text();
          if (!text || text.trim() === '') {
            throw new Error('批改数据链接返回空内容');
          }
          return text;
        } catch (fetchError: any) {
          console.error('Error fetching from link field:', fetchError);
          // 如果链接字段获取失败，继续尝试参考字段
          // 不在这里抛出错误，而是继续执行后续逻辑
        }
      }
    }
    
    // 如果没有链接字段或链接字段为空，使用参考字段
    const gradeField = fieldMetaList.find(field => field.name === GRADE_FIELD_NAME);
    if (!gradeField) {
      throw new Error(`未找到"${GRADE_FIELD_NAME}"或"${GRADE_FIELD_LINK_NAME}"字段`);
    }

    if (gradeField.type !== FieldType.Text) {
      throw new Error(`"${GRADE_FIELD_NAME}"字段类型不是文本类型`);
    }

    const textField = await table.getField<ITextField>(gradeField.id);
    const value = await textField.getValue(recordId);
    
    // ITextField.getValue returns IOpenSegment[], need to convert to string
    const valueStr = (Array.isArray(value) 
      ? value.map(seg => seg.text || '').join('') 
      : String(value || '')).trim();
    
    if (!valueStr) {
      throw new Error(`当前记录的"${GRADE_FIELD_NAME}"字段为空`);
    }

    // 参考字段直接返回JSON字符串
    return valueStr;
  } catch (error) {
    console.error('Error loading grade data:', error);
    throw error;
  }
};

