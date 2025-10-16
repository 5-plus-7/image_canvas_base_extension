import React, { useEffect, useState } from 'react';
import type * as TExcalidraw from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, BinaryFileData } from "@excalidraw/excalidraw/types";
import { bitable, FieldType, IAttachmentField, IAttachmentFieldMeta } from '@lark-base-open/js-sdk';
import './ImageEditor.scss';

interface ImageEditorProps {
  excalidrawLib: typeof TExcalidraw;
  imageUrl: string;
  recordId: string;
  tableId: string;
  currentFieldId: string;
  onBack: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ 
  excalidrawLib, 
  imageUrl, 
  recordId, 
  tableId, 
  currentFieldId,
  onBack 
}) => {
  const { Excalidraw, convertToExcalidrawElements, MIME_TYPES, exportToBlob } = excalidrawLib;
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [attachmentFields, setAttachmentFields] = useState<IAttachmentFieldMeta[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hasExported, setHasExported] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const [initialElementCount, setInitialElementCount] = useState(0);

  // 获取所有附件字段（排除当前字段）
  useEffect(() => {
    const fetchAttachmentFields = async () => {
      try {
        const table = await bitable.base.getTable(tableId);
        const fieldMetaList = await table.getFieldMetaListByType<IAttachmentFieldMeta>(FieldType.Attachment);
        
        // 过滤掉当前字段
        const filteredFields = fieldMetaList.filter(field => field.id !== currentFieldId);
        
        setAttachmentFields(filteredFields);
        if (filteredFields.length > 0) {
          setSelectedFieldId(filteredFields[0].id);
        }
      } catch (error) {
        console.error('获取附件字段失败:', error);
      }
    };

    if (tableId) {
      fetchAttachmentFields();
    }
  }, [tableId, currentFieldId]);

  // 加载图片到画布并设置默认工具
  useEffect(() => {
    if (excalidrawAPI && imageUrl) {
      const loadImage = async () => {
        try {
          const response = await fetch(imageUrl);
          const imageBlob = await response.blob();
          
          const reader = new FileReader();
          reader.onload = function() {
            const dataURL = reader.result as string;
            
            const img = new Image();
            img.onload = function() {
              const imageWidth = img.width;
              const imageHeight = img.height;
              
              // 计算合适的显示尺寸，保持长宽比
              const maxWidth = 1440;
              const maxHeight = 1440;
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
              const imageFile: BinaryFileData = {
                id: fileId as any,
                dataURL: dataURL as any,
                mimeType: imageBlob.type as any || MIME_TYPES.jpg,
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
              ]);

              excalidrawAPI.updateScene({
                elements: imageElement,
              });

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
                
                // 记录初始元素数量（只有图片本身）
                setInitialElementCount(1);
              }, 100);
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
  }, [excalidrawAPI, imageUrl, convertToExcalidrawElements, MIME_TYPES]);

  // 显示Toast提示
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // 导出到多维表格
  const handleExport = async () => {
    if (!excalidrawAPI || !selectedFieldId || !recordId || !tableId) {
      showToast('请选择目标附件字段', 'error');
      return;
    }

    try {
      setExporting(true);

      // 导出画布为PNG
      const blob = await exportToBlob({
        elements: excalidrawAPI.getSceneElements(),
        mimeType: 'image/png',
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
      });

      // 转换为File对象
      const fileName = `edited_${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // 获取目标附件字段
      const table = await bitable.base.getTable(tableId);
      const targetField = await table.getField<IAttachmentField>(selectedFieldId);

      // 获取现有附件列表
      const existingAttachments = await targetField.getValue(recordId);

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
      const updatedAttachments = existingAttachments 
        ? [...existingAttachments, newAttachment]
        : [newAttachment];

      // 设置完整的附件列表
      await targetField.setValue(recordId, updatedAttachments);

      showToast('✅ 导出成功！已追加到所选字段', 'success');
      setExporting(false);
      setHasExported(true); // 标记已导出
      setHasEdited(false); // 重置编辑状态
    } catch (error) {
      console.error('导出失败:', error);
      showToast('❌ 导出失败，请重试', 'error');
      setExporting(false);
    }
  };

  // 处理返回按钮点击
  const handleBack = () => {
    // 如果有编辑内容且未导出，提示用户
    if (hasEdited && !hasExported) {
      const confirmed = window.confirm('返回后，当前已编辑内容会丢失，是否继续？');
      if (!confirmed) {
        return;
      }
    }
    onBack();
  };

  return (
    <div className="image-editor">
      {/* Toast 提示 */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* 顶栏：返回按钮、标题、导出工具 */}
      <div className="editor-header">
        <div className="header-left">
          <button onClick={handleBack} className="back-button">
            ← 返回
          </button>
          <h3 className="editor-title">图片编辑器</h3>
        </div>
        
        <div className="header-right">
          <span className="export-label">导出到：</span>
          <select 
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(e.target.value)}
            className="field-select"
            disabled={attachmentFields.length === 0}
          >
            {attachmentFields.length === 0 ? (
              <option value="">暂无其他附件字段</option>
            ) : (
              attachmentFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))
            )}
          </select>
          <button 
            onClick={handleExport}
            disabled={exporting || !selectedFieldId || attachmentFields.length === 0}
            className="export-button"
          >
            {exporting ? '导出中...' : '📤 导出'}
          </button>
        </div>
      </div>

      {/* Excalidraw 画板 */}
      <div className="canvas-container">
        <Excalidraw 
          excalidrawAPI={(api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api)}
          theme="light"
          name="图片编辑器"
          onChange={(elements, appState) => {
            // 监听画板内容变化，标记为已编辑
            // 如果元素数量大于初始数量（图片本身），说明用户添加了新内容
            if (initialElementCount > 0 && elements && elements.length > initialElementCount) {
              setHasEdited(true);
            }
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
            }
          }}
        />
      </div>
    </div>
  );
};

export default ImageEditor;

