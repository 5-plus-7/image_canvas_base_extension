import React, { useState, useEffect } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { bitable } from '@lark-base-open/js-sdk';
import { exportExcalidrawToAttachment } from '../utils/excalidrawExport';
import { loadAttachmentFieldsWithPriority } from '../utils/attachmentFields';
import { initializeExcalidrawLibrary } from '../utils/excalidrawLibrary';
import { getRecordTitle } from '../utils/recordTitle';
import { showToast } from '../utils/toast';
import { ConfirmDialog } from './ConfirmDialog';
import { IMAGE_CONFIG, EXPORT_FILE_PREFIX, TIMEOUT } from '../constants';
import type { ExcalidrawImperativeAPI, ExcalidrawElement, BinaryFiles, BinaryFileData } from '../types/excalidraw';
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
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [attachmentFields, setAttachmentFields] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(attachmentFieldId || '');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [initialElementCount, setInitialElementCount] = useState<number>(0);
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

  useEffect(() => {
    if (excalidrawAPI && initialImageUrl) {
      const loadImage = async () => {
        try {
          const response = await fetch(initialImageUrl);
          const imageBlob = await response.blob();
          
          const reader = new FileReader();
          reader.onload = function() {
            const dataURL = reader.result as string;
            
            const img = new Image();
            img.onload = function() {
              const imageWidth = img.width;
              const imageHeight = img.height;
              
              // 计算合适的显示尺寸，保持长宽比
              const maxWidth = IMAGE_CONFIG.MAX_DISPLAY_WIDTH;
              const maxHeight = IMAGE_CONFIG.MAX_DISPLAY_HEIGHT;
              let displayWidth = imageWidth;
              let displayHeight = imageHeight;
              
              // 如果图片太大，等比例缩小
              if (imageWidth > maxWidth || imageHeight > maxHeight) {
                const widthRatio = maxWidth / imageWidth;
                const heightRatio = maxHeight / imageHeight;
                const scale = Math.min(widthRatio, heightRatio);
                
                displayWidth = imageWidth * scale;
                displayHeight = imageHeight * scale;
              }
              
              const fileId = `image_${Date.now()}`;
              
              // 动态导入 MIME_TYPES 和 convertToExcalidrawElements
              import('@excalidraw/excalidraw').then((module: any) => {
                const { convertToExcalidrawElements, MIME_TYPES } = module;
                
                const imageFile: BinaryFileData = {
                  id: fileId as any,
                  dataURL: dataURL as any,
                  mimeType: imageBlob.type || MIME_TYPES.jpg,
                  created: Date.now(),
                  lastRetrieved: Date.now(),
                };

                excalidrawAPI.addFiles([imageFile]);

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

                excalidrawAPI.updateScene({
                  elements: imageElement,
                });

                // 记录初始元素数量（只有图片本身）
                setInitialElementCount(imageElement.length);

                // 设置默认工具为铅笔，颜色为红色
                setTimeout(() => {
                  excalidrawAPI.setActiveTool({ type: 'freedraw' });
                  excalidrawAPI.updateScene({
                    appState: {
                      currentItemStrokeColor: '#ff0000', // 红色
                    }
                  });
                  excalidrawAPI.scrollToContent(imageElement[0], {
                    fitToViewport: true,
                  });
                }, 100);
              }).catch((err) => {
                console.error('Error loading Excalidraw module:', err);
              });
            };
            img.src = dataURL;
          };
          reader.readAsDataURL(imageBlob);
        } catch (error) {
          console.error('加载图片失败:', error);
        }
      };
      
      loadImage();
    }
  }, [excalidrawAPI, initialImageUrl]);

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
      setHasExported(true); // 标记已导出
    }
  };

  const handleBack = () => {
    // 只有当有新增元素操作且未导出时，才需要二次确认
    if (excalidrawAPI && initialElementCount > 0) {
      const currentElements = excalidrawAPI.getSceneElements();
      const hasNewElements = currentElements && currentElements.length > initialElementCount;
      
      if (hasNewElements && !hasExported) {
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
    // 如果元素数量大于初始数量（图片本身），说明用户添加了新内容
    if (initialElementCount > 0 && elements && elements.length > initialElementCount) {
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

