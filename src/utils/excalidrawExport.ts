import { bitable, IAttachmentField } from '@lark-base-open/js-sdk';
import type { ExcalidrawImperativeAPI } from '../types/excalidraw';

interface ExportOptions {
  excalidrawAPI: ExcalidrawImperativeAPI;
  selectedFieldId: string;
  fileNamePrefix?: string; // 文件名前缀，默认为 'excalidraw'
  timeout?: number; // 超时时间（毫秒），默认为 10000
}

interface ExportResult {
  success: boolean;
  message: string;
  error?: any;
}

/**
 * 导出 Excalidraw 画布内容到附件字段
 * @param options 导出选项
 * @returns 导出结果
 */
export const exportExcalidrawToAttachment = async (
  options: ExportOptions
): Promise<ExportResult> => {
  const {
    excalidrawAPI,
    selectedFieldId,
    fileNamePrefix = 'excalidraw',
    timeout = 10000
  } = options;

  if (!excalidrawAPI || !selectedFieldId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  // 创建超时 Promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('导出超时'));
    }, timeout);
  });

  // 导出任务 Promise
  const exportTask = async () => {
    const selection = await bitable.base.getSelection();
    if (!selection.recordId || !selection.tableId) {
      throw new Error('请先选择一个记录');
    }

    // 使用 exportToBlob 导出
    const { exportToBlob } = await import('@excalidraw/excalidraw');
    const blob = await exportToBlob({
      elements: excalidrawAPI.getSceneElements(),
      mimeType: 'image/png',
      appState: excalidrawAPI.getAppState(),
      files: excalidrawAPI.getFiles(),
    });

    // 转换为File对象
    const fileName = `${fileNamePrefix}-${Date.now()}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    // 获取目标附件字段
    const table = await bitable.base.getTableById(selection.tableId);
    const targetField = await table.getField<IAttachmentField>(selectedFieldId);

    // 获取现有附件列表
    const existingAttachments = await targetField.getValue(selection.recordId) || [];

    // 上传新文件获取token
    const [newToken] = await bitable.base.batchUploadFile([file]);

    // 创建新附件对象
    const newAttachment = {
      name: fileName,
      size: blob.size,
      type: 'image/png',
      token: newToken,
      timeStamp: Date.now(),
    };

    // 追加到现有附件列表
    const updatedAttachments = [...existingAttachments, newAttachment];

    // 设置完整的附件列表
    await targetField.setValue(selection.recordId, updatedAttachments);
  };

  try {
    // 使用 Promise.race 实现超时控制
    await Promise.race([exportTask(), timeoutPromise]);
    
    return {
      success: true,
      message: '导出成功！已追加到所选字段'
    };
  } catch (error: any) {
    console.error('导出失败:', error);
    
    // 判断错误类型
    let message = '导出失败，请重试';
    if (error?.message === '导出超时') {
      message = '导出失败，请重试或者手动导出';
    } else if (error?.message === '请先选择一个记录') {
      message = '请先选择一个记录';
    }
    
    return {
      success: false,
      message,
      error
    };
  }
};

