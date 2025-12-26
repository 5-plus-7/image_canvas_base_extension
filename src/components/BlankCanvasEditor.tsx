import React, { useState, useEffect } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { bitable } from '@lark-base-open/js-sdk';
import { exportExcalidrawToAttachment } from '../utils/excalidrawExport';
import { loadAttachmentFieldsWithPriority } from '../utils/attachmentFields';
import { initializeExcalidrawLibrary } from '../utils/excalidrawLibrary';
import { getRecordTitle } from '../utils/recordTitle';
import { showToast } from '../utils/toast';
import { ConfirmDialog } from './ConfirmDialog';
import { EXPORT_FILE_PREFIX, TIMEOUT, COLORS } from '../constants';
import type { ExcalidrawImperativeAPI, ExcalidrawElement, BinaryFiles } from '../types/excalidraw';
import './ExcalidrawEditor.scss';

interface BlankCanvasEditorProps {
  onBack: () => void;
  attachmentFieldId?: string;
}

export const BlankCanvasEditor: React.FC<BlankCanvasEditorProps> = ({
  onBack,
  attachmentFieldId
}) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [attachmentFields, setAttachmentFields] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(attachmentFieldId || '');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [hasExported, setHasExported] = useState<boolean>(false);
  const [recordTitle, setRecordTitle] = useState<string>('');

  useEffect(() => {
    loadAttachmentFields();
    loadRecordTitle();
  }, []);

  const loadRecordTitle = async () => {
    try {
      const selection = await bitable.base.getSelection();
      if (selection.recordId && selection.tableId) {
        const title = await getRecordTitle(selection.tableId, selection.recordId);
        setRecordTitle(title);
      }
    } catch (error) {
      console.error('Error loading record title:', error);
    }
  };

  useEffect(() => {
    if (excalidrawAPI) {
      initializeExcalidrawLibrary(excalidrawAPI);
    }
  }, [excalidrawAPI]);

  const loadAttachmentFields = async () => {
    const sortedFields = await loadAttachmentFieldsWithPriority();
    setAttachmentFields(sortedFields);
    // 默认选中排序后的第一个字段（优先选择包含「结果」的字段）
    if (sortedFields.length > 0) {
      // 优先选择排序后的第一个字段（包含「结果」的字段会排在前面）
      setSelectedFieldId(sortedFields[0].id);
    }
  };

  const handleExport = async () => {
    if (!excalidrawAPI || !selectedFieldId) return;

    setIsExporting(true);
    
    const result = await exportExcalidrawToAttachment({
      excalidrawAPI,
      selectedFieldId,
      fileNamePrefix: EXPORT_FILE_PREFIX.EXCALIDRAW,
      timeout: TIMEOUT.EXPORT
    });

    setIsExporting(false);
    
    // 使用 toast 提示，根据成功/失败状态选择不同的类型
    await showToast(result.message, result.success ? 'success' : 'error');

    if (result.success) {
      setHasChanges(false);
      setHasExported(true);
    }
  };

  const handleBack = () => {
    // 只有当有内容且未导出时，才需要二次确认
    if (excalidrawAPI) {
      const currentElements = excalidrawAPI.getSceneElements();
      const hasContent = currentElements && currentElements.length > 0;
      
      if (hasContent && !hasExported) {
        setShowConfirmDialog(true);
        return;
      }
    }
    
    // 其他情况直接返回
    onBack();
  };

  const handleConfirmBack = () => {
    setShowConfirmDialog(false);
    onBack();
  };

  const handleChange = (
    elements: readonly ExcalidrawElement[], 
    appState: any, 
    files: BinaryFiles
  ) => {
    // 监听画板内容变化
    if (elements && elements.length > 0) {
      setHasChanges(true);
    }
  };

  return (
    <div className="excalidraw-editor">
      <div className="editor-header">
        <div className="header-left">
          <button className="btn btn-sm btn-outline-secondary" onClick={handleBack}>
            ← 返回
          </button>
          {recordTitle && (
            <span className="record-title ms-2">{recordTitle}</span>
          )}
        </div>
        <div className="header-actions">
          <div style={{ position: 'relative', zIndex: 102 }}>
            <select 
              className="form-select form-select-sm me-2"
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              style={{ width: 'auto', minWidth: '150px', position: 'relative', zIndex: 102 }}
            >
              {attachmentFields.map(field => (
                <option key={field.id} value={field.id}>{field.name}</option>
              ))}
            </select>
          </div>
          <button 
            className="btn btn-sm btn-primary"
            onClick={handleExport}
            disabled={isExporting || !selectedFieldId}
            style={{ position: 'relative', zIndex: 101 }}
          >
            {isExporting ? '导出中...' : '导出'}
          </button>
        </div>
      </div>

      <div className="editor-content">
        <Excalidraw
          initialData={{
            appState: {
              currentItemStrokeColor: COLORS.ERROR, // 默认画笔/椭圆描边颜色：红色
            },
          }}
          excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
            if (api) {
              setExcalidrawAPI(api);
            }
          }}
          onChange={handleChange}
        />
      </div>

      <ConfirmDialog
        show={showConfirmDialog}
        message="检测到未导出的编辑内容，是否确定放弃并返回？"
        onConfirm={handleConfirmBack}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
};

