import React from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { ConfirmDialog } from './ConfirmDialog';
import { useExcalidrawEditor } from '../hooks/useExcalidrawEditor';
import { EXPORT_FILE_PREFIX, COLORS } from '../constants';
import type { ExcalidrawImperativeAPI } from '../types/excalidraw';
import './ExcalidrawEditor.scss';

interface BlankCanvasEditorProps {
  onBack: () => void;
  attachmentFieldId?: string;
}

export const BlankCanvasEditor: React.FC<BlankCanvasEditorProps> = ({
  onBack,
  attachmentFieldId
}) => {
  const editor = useExcalidrawEditor({
    initialFieldId: attachmentFieldId,
    fileNamePrefix: EXPORT_FILE_PREFIX.EXCALIDRAW,
    onBack,
    hasUnsavedContent: () => {
      if (!editor.excalidrawAPI) return false;
      const elements = editor.excalidrawAPI.getSceneElements();
      return elements && elements.length > 0 && !editor.hasExported;
    },
  });

  return (
    <div className="excalidraw-editor">
      <div className="editor-header">
        <div className="header-left">
          <button className="btn btn-sm btn-outline-secondary" onClick={editor.handleBack}>
            ← 返回
          </button>
          {editor.recordTitle && (
            <span className="record-title ms-2">{editor.recordTitle}</span>
          )}
        </div>
        <div className="header-actions">
          <div style={{ position: 'relative', zIndex: 102 }}>
            <select
              className="form-select form-select-sm me-2"
              value={editor.selectedFieldId}
              onChange={(e) => editor.setSelectedFieldId(e.target.value)}
              style={{ width: 'auto', minWidth: '150px', position: 'relative', zIndex: 102 }}
            >
              {editor.attachmentFields.map(field => (
                <option key={field.id} value={field.id}>{field.name}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-sm btn-primary"
            onClick={editor.handleExport}
            disabled={editor.isExporting || !editor.selectedFieldId}
            style={{ position: 'relative', zIndex: 101 }}
          >
            {editor.isExporting ? '导出中...' : '导出'}
          </button>
        </div>
      </div>

      <div className="editor-content">
        <Excalidraw
          initialData={{
            appState: {
              currentItemStrokeColor: COLORS.ERROR,
            },
          }}
          excalidrawAPI={(api: ExcalidrawImperativeAPI) => editor.onExcalidrawAPI(api)}
          onChange={editor.handleChange}
        />
      </div>

      <ConfirmDialog
        show={editor.showConfirmDialog}
        message="检测到未导出的编辑内容，是否确定放弃并返回？"
        onConfirm={editor.handleConfirmBack}
        onCancel={() => editor.setShowConfirmDialog(false)}
      />
    </div>
  );
};
