import React, { useEffect } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { ConfirmDialog } from './ConfirmDialog';
import { useExcalidrawEditor } from '../hooks/useExcalidrawEditor';
import { blobToDataURL, getImageSize, calculateDisplaySize } from '../utils/imageLoader';
import { IMAGE_CONFIG, EXPORT_FILE_PREFIX, COLORS } from '../constants';
import type { ExcalidrawImperativeAPI, BinaryFileData } from '../types/excalidraw';
import './ExcalidrawEditor.scss';

interface ExcalidrawEditorProps {
  initialImageUrl: string;
  onBack: () => void;
  attachmentFieldId?: string;
}

export const ExcalidrawEditor: React.FC<ExcalidrawEditorProps> = ({
  initialImageUrl,
  onBack,
  attachmentFieldId
}) => {
  const editor = useExcalidrawEditor({
    initialFieldId: attachmentFieldId,
    fileNamePrefix: EXPORT_FILE_PREFIX.EXCALIDRAW,
    onBack,
  });

  // 加载初始图片到 Excalidraw 画布
  useEffect(() => {
    if (!editor.excalidrawAPI || !initialImageUrl) return;

    const loadImage = async () => {
      try {
        const response = await fetch(initialImageUrl);
        const imageBlob = await response.blob();
        const dataURL = await blobToDataURL(imageBlob);
        const { width: imageWidth, height: imageHeight } = await getImageSize(dataURL);
        const { width: displayWidth, height: displayHeight } = calculateDisplaySize(
          imageWidth, imageHeight,
          IMAGE_CONFIG.MAX_DISPLAY_WIDTH, IMAGE_CONFIG.MAX_DISPLAY_HEIGHT
        );

        const fileId = `image_${Date.now()}`;
        const { convertToExcalidrawElements, MIME_TYPES } = await import('@excalidraw/excalidraw');

        const imageFile: BinaryFileData = {
          id: fileId as any,
          dataURL: dataURL as any,
          mimeType: imageBlob.type || MIME_TYPES.jpg,
          created: Date.now(),
          lastRetrieved: Date.now(),
        };

        editor.excalidrawAPI.addFiles([imageFile]);

        const imageElement = convertToExcalidrawElements([
          {
            type: 'image',
            x: 50,
            y: 50,
            width: displayWidth,
            height: displayHeight,
            fileId: fileId,
            status: 'saved',
            scale: [1, 1],
          }
        ] as any);

        editor.excalidrawAPI.updateScene({ elements: imageElement });
        editor.setInitialElementCount(imageElement.length);

        setTimeout(() => {
          editor.excalidrawAPI!.setActiveTool({ type: 'freedraw' });
          editor.excalidrawAPI!.updateScene({
            appState: { currentItemStrokeColor: '#ff0000' }
          });
          editor.excalidrawAPI!.scrollToContent(imageElement[0], { fitToViewport: true });
        }, 100);
      } catch (error) {
        console.error('加载图片失败:', error);
      }
    };

    loadImage();
  }, [editor.excalidrawAPI, initialImageUrl]);

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
