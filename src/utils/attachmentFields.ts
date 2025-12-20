import { bitable, FieldType } from '@lark-base-open/js-sdk';

export interface AttachmentField {
  id: string;
  name: string;
}

/**
 * 加载附件字段列表，并优先显示包含「结果」的字段
 * @returns 排序后的附件字段列表
 */
export const loadAttachmentFieldsWithPriority = async (): Promise<AttachmentField[]> => {
  try {
    const table = await bitable.base.getActiveTable();
    const fieldMetaList = await table.getFieldMetaListByType(FieldType.Attachment);
    const fields = fieldMetaList.map(field => ({ id: field.id, name: field.name }));
    
    // 排序：包含"结果"的字段优先显示
    const sortedFields = fields.sort((a, b) => {
      const aHasResult = a.name.includes('结果');
      const bHasResult = b.name.includes('结果');
      
      if (aHasResult && !bHasResult) return -1;  // a包含"结果"，排在前面
      if (!aHasResult && bHasResult) return 1;   // b包含"结果"，排在前面
      return 0;  // 都包含或都不包含，保持原顺序
    });
    
    return sortedFields;
  } catch (error) {
    console.error('Error loading attachment fields:', error);
    return [];
  }
};

