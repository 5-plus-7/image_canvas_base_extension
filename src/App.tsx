import React, { useState, useEffect } from 'react';
import { bitable } from '@lark-base-open/js-sdk';
import { AttachmentPreview } from './components/AttachmentPreview';
import { ExcalidrawEditor } from './components/ExcalidrawEditor';
import { BlankCanvasEditor } from './components/BlankCanvasEditor';
import { GradeExcalidrawPreview } from './components/GradeExcalidrawPreview';
import { checkGradeField as checkGradeFieldUtil } from './utils/gradeField';
import './App.scss';

type ViewMode = 'preview' | 'editor' | 'blankCanvas' | 'grade';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [editImageUrl, setEditImageUrl] = useState<string>('');
  const [attachmentFieldId, setAttachmentFieldId] = useState<string>('');
  const [showGradeButton, setShowGradeButton] = useState<boolean>(false);

  const checkGradeField = async () => {
    try {
      const selection = await bitable.base.getSelection();
      if (!selection.recordId || !selection.tableId) {
        setShowGradeButton(false);
        return;
      }

      const hasValue = await checkGradeFieldUtil(selection.tableId, selection.recordId);
      setShowGradeButton(hasValue);
    } catch (error) {
      console.error('Error checking grade field:', error);
      setShowGradeButton(false);
    }
  };

  useEffect(() => {
    checkGradeField();
    const unsubscribe = bitable.base.onSelectionChange(() => {
      checkGradeField();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleEditClick = async (imageToken: string, imageUrl: string) => {
    try {
      const selection = await bitable.base.getSelection();
      if (!selection.fieldId || !selection.recordId) return;

      setEditImageUrl(imageUrl);
      setAttachmentFieldId(selection.fieldId);
      setViewMode('editor');
    } catch (error) {
      console.error('Error opening editor:', error);
      alert('打开编辑器失败，请重试');
    }
  };

  const handleGradeClick = () => {
    setViewMode('grade');
  };

  const handleBlankCanvasClick = async () => {
    try {
      const selection = await bitable.base.getSelection();
      if (!selection.fieldId) return;

      setAttachmentFieldId(selection.fieldId);
      setViewMode('blankCanvas');
    } catch (error) {
      console.error('Error opening blank canvas:', error);
      alert('打开空白画布失败，请重试');
    }
  };

  const handleBackToPreview = () => {
    setViewMode('preview');
    setEditImageUrl('');
    setAttachmentFieldId('');
  };

  return (
    <div className="app">
      {viewMode === 'preview' && (
        <AttachmentPreview
          onEditClick={handleEditClick}
          onGradeClick={handleGradeClick}
          onBlankCanvasClick={handleBlankCanvasClick}
          showGradeButton={showGradeButton}
        />
      )}
      {viewMode === 'editor' && editImageUrl && (
        <ExcalidrawEditor
          initialImageUrl={editImageUrl}
          onBack={handleBackToPreview}
          attachmentFieldId={attachmentFieldId}
        />
      )}
      {viewMode === 'blankCanvas' && (
        <BlankCanvasEditor
          onBack={handleBackToPreview}
          attachmentFieldId={attachmentFieldId}
        />
      )}
      {viewMode === 'grade' && (
        <GradeExcalidrawPreview onBack={handleBackToPreview} />
      )}
    </div>
  );
};

