import { bitable, ITextField, FieldType } from '@lark-base-open/js-sdk';
import { GRADE_FIELD_NAME } from '../constants';
import { hasTextFieldValue } from './textField';

/**
 * 检查记录是否有有效的批改字段值
 */
export const checkGradeField = async (tableId: string, recordId: string): Promise<boolean> => {
  try {
    const table = await bitable.base.getTableById(tableId);
    const fieldMetaList = await table.getFieldMetaList();
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
 */
export const loadGradeData = async (tableId: string, recordId: string): Promise<string> => {
  try {
    const table = await bitable.base.getTableById(tableId);
    const fieldMetaList = await table.getFieldMetaList();
    const gradeField = fieldMetaList.find(field => field.name === GRADE_FIELD_NAME);
    
    if (!gradeField) {
      throw new Error('未找到"自动批改结果参考"字段');
    }

    const textField = await table.getField<ITextField>(gradeField.id);
    const value = await textField.getValue(recordId);
    
    // ITextField.getValue returns IOpenSegment[], need to convert to string
    const valueStr = Array.isArray(value) 
      ? value.map(seg => seg.text || '').join('') 
      : String(value || '');
    
    if (!valueStr || valueStr.trim() === '') {
      throw new Error('当前记录的"自动批改结果参考"字段为空');
    }

    return valueStr;
  } catch (error) {
    console.error('Error loading grade data:', error);
    throw error;
  }
};

