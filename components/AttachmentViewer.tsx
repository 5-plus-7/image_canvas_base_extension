import React, { useEffect, useState } from 'react';
import { bitable, FieldType, IAttachmentField } from '@lark-base-open/js-sdk';
import './AttachmentViewer.scss';

interface AttachmentInfo {
  name: string;
  size: number;
  type: string;
  token: string;
  url?: string;
  isImage: boolean;
}

interface AttachmentViewerProps {
  onEdit: (imageUrl: string, recordId: string, tableId: string, currentFieldId: string) => void;
}

const AttachmentViewer: React.FC<AttachmentViewerProps> = ({ onEdit }) => {
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAttachmentCell, setIsAttachmentCell] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [fieldName, setFieldName] = useState<string>('附件预览');
  const [currentRecordId, setCurrentRecordId] = useState<string>('');
  const [currentTableId, setCurrentTableId] = useState<string>('');
  const [currentFieldId, setCurrentFieldId] = useState<string>('');

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 检查是否为图片类型
  const isImageType = (type: string): boolean => {
    return type.startsWith('image/');
  };

  // 加载附件数据
  const loadAttachments = async () => {
    try {
      setLoading(true);
      setError('');
      
      const selection = await bitable.base.getSelection();
      
      if (!selection.fieldId || !selection.recordId || !selection.tableId) {
        setIsAttachmentCell(false);
        setLoading(false);
        return;
      }

      const table = await bitable.base.getTable(selection.tableId);
      const field = await table.getField(selection.fieldId);
      const fieldType = await field.getType();

      if (fieldType !== FieldType.Attachment) {
        setIsAttachmentCell(false);
        setLoading(false);
        return;
      }

      setIsAttachmentCell(true);
      setCurrentRecordId(selection.recordId);
      setCurrentTableId(selection.tableId);
      setCurrentFieldId(selection.fieldId);

      const attachmentField = await table.getField<IAttachmentField>(selection.fieldId);
      const fieldNameValue = await attachmentField.getName();
      setFieldName(fieldNameValue);
      
      const attachmentList = await attachmentField.getValue(selection.recordId);

      if (!attachmentList || attachmentList.length === 0) {
        setAttachments([]);
        setLoading(false);
        return;
      }

      // 获取附件URL
      const urls = await attachmentField.getAttachmentUrls(selection.recordId);
      
      const attachmentInfoList: AttachmentInfo[] = attachmentList.map((att, index) => ({
        name: att.name,
        size: att.size,
        type: att.type,
        token: att.token,
        url: urls[index],
        isImage: isImageType(att.type)
      }));

      setAttachments(attachmentInfoList);
      setCurrentIndex(0);
      setLoading(false);

    } catch (err) {
      console.error('加载附件失败:', err);
      setError('加载附件失败，请重试');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();

    // 监听选中单元格变化
    const off = bitable.base.onSelectionChange(() => {
      loadAttachments();
    });

    return () => {
      off();
    };
  }, []);

  // 切换到上一个附件
  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
  };

  // 切换到下一个附件
  const handleNext = () => {
    setCurrentIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
  };

  // 处理编辑按钮点击
  const handleEdit = () => {
    const currentAttachment = attachments[currentIndex];
    if (currentAttachment && currentAttachment.url && currentRecordId && currentTableId && currentFieldId) {
      onEdit(currentAttachment.url, currentRecordId, currentTableId, currentFieldId);
    }
  };

  if (loading) {
    return (
      <div className="attachment-viewer">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attachment-viewer">
        <div className="empty-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={loadAttachments} className="retry-button">重试</button>
        </div>
      </div>
    );
  }

  if (!isAttachmentCell) {
    return (
      <div className="attachment-viewer">
        <div className="empty-state">
          <div className="info-icon">ℹ️</div>
          <p className="hint-text">请选中附件字段的单元格</p>
          <p className="hint-subtext">在多维表格中选择一个包含附件的单元格以预览文件</p>
        </div>
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="attachment-viewer">
        <div className="empty-state">
          <div className="info-icon">📎</div>
          <p className="hint-text">当前单元格没有附件</p>
        </div>
      </div>
    );
  }

  const currentAttachment = attachments[currentIndex];

  return (
    <div className="attachment-viewer">
      <div className="viewer-header">
        <div className="header-top">
          <h3 className="viewer-title">{fieldName}</h3>
          <span className="attachment-counter">
            {currentIndex + 1} / {attachments.length}
          </span>
        </div>
        
        <div className="header-info">
          <div className="file-info-compact">
            <span className="info-item" title={currentAttachment.name}>
              📄 {currentAttachment.name}
            </span>
            <span className="info-item">
              {formatFileSize(currentAttachment.size)}
            </span>
          </div>
          
          <div className="header-actions">
            {attachments.length > 1 && (
              <>
                <button 
                  onClick={handlePrevious}
                  className="header-nav-button"
                  title="上一个"
                >
                  ←
                </button>
                <button 
                  onClick={handleNext}
                  className="header-nav-button"
                  title="下一个"
                >
                  →
                </button>
              </>
            )}
            {currentAttachment.isImage && (
              <button 
                onClick={handleEdit}
                className="header-edit-button"
                title="编辑图片"
              >
                ✏️ 编辑
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="viewer-content">
        {currentAttachment.isImage ? (
          <div className="image-container">
            <img 
              src={currentAttachment.url} 
              alt={currentAttachment.name}
              className="preview-image"
            />
          </div>
        ) : (
          <div className="file-info-container">
            <div className="file-icon">📄</div>
            <div className="file-details">
              <p className="file-name">{currentAttachment.name}</p>
              <p className="file-meta">
                <span className="file-size">{formatFileSize(currentAttachment.size)}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttachmentViewer;

