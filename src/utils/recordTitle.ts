import { bitable } from '@lark-base-open/js-sdk';

/**
 * 获取记录的索引列值（主字段值）
 * @param tableId 表ID
 * @param recordId 记录ID
 * @returns 索引列的值，如果获取失败则返回空字符串
 */
export const getRecordTitle = async (tableId: string, recordId: string): Promise<string> => {
  try {
    const table = await bitable.base.getTableById(tableId);
    const fieldMetaList = await table.getFieldMetaList();
    
    // 找到主字段（索引列）
    const primaryField = fieldMetaList.find(f => f.isPrimary);
    
    if (!primaryField) {
      return '';
    }
    
    // 使用 getCellString 获取索引列的值，这样可以正确处理自动编号等格式
    const recordTitle = await table.getCellString(primaryField.id, recordId);
    return recordTitle || '';
  } catch (error) {
    console.error('Error getting record title:', error);
    return '';
  }
};

