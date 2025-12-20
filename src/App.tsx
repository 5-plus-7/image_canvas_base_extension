import React, { useState, useEffect } from 'react';
import { bitable } from '@lark-base-open/js-sdk';
import { AttachmentPreview } from './components/AttachmentPreview';
import { ExcalidrawEditor } from './components/ExcalidrawEditor';
import { BlankCanvasEditor } from './components/BlankCanvasEditor';
import { GradeExcalidrawPreview } from './components/GradeExcalidrawPreview';
import { GradeQueryPage } from './components/GradeQueryPage';
import { checkGradeField as checkGradeFieldUtil } from './utils/gradeField';
import './App.scss';

type ViewMode = 'preview' | 'editor' | 'blankCanvas' | 'grade' | 'query' | 'standalonePreview';

export const App: React.FC = () => {
  // 检查是否是独立查询模式（通过URL参数判断）
  const isQueryMode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'query' || window.location.pathname.includes('/query');
  };

  const [isStandaloneMode, setIsStandaloneMode] = useState<boolean>(isQueryMode());
  const [viewMode, setViewMode] = useState<ViewMode>(isStandaloneMode ? 'query' : 'preview');
  const [editImageUrl, setEditImageUrl] = useState<string>('');
  const [attachmentFieldId, setAttachmentFieldId] = useState<string>('');
  const [showGradeButton, setShowGradeButton] = useState<boolean>(false);
  
  // 独立模式下的数据
  const [standaloneGradeData, setStandaloneGradeData] = useState<any>(null);
  const [standaloneRecordTitle, setStandaloneRecordTitle] = useState<string>('');

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
    // 独立模式不需要检查bitable
    if (isStandaloneMode) {
      return;
    }

    // 尝试初始化bitable
    const initBitable = async () => {
      try {
        await bitable.base.getSelection();
        checkGradeField();
        const unsubscribe = bitable.base.onSelectionChange(() => {
          checkGradeField();
        });
        return () => {
          unsubscribe();
        };
      } catch (error) {
        // 如果不在bitable环境中，且是查询模式，保持查询模式
        // 否则不进行任何操作（保持原有的preview模式，但不会显示内容）
        console.warn('Not in bitable environment:', error);
      }
    };

    initBitable();
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
    if (isStandaloneMode) {
      // 独立模式下返回查询页面
      setViewMode('query');
      setStandaloneGradeData(null);
      setStandaloneRecordTitle('');
    } else {
      setViewMode('preview');
      setEditImageUrl('');
      setAttachmentFieldId('');
    }
  };

  const handleViewResult = (environment: string, recordId: string, gradeData: any) => {
    setStandaloneGradeData(gradeData);
    setStandaloneRecordTitle(`环境: ${environment === 'test' ? '测试' : '线上'} | ID: ${recordId}`);
    setViewMode('standalonePreview');
  };

  return (
    <div className="app">
      {viewMode === 'query' && (
        <GradeQueryPage onViewResult={handleViewResult} />
      )}
      {viewMode === 'standalonePreview' && standaloneGradeData && (
        <GradeExcalidrawPreview 
          onBack={handleBackToPreview}
          initialGradeData={standaloneGradeData}
          initialRecordTitle={standaloneRecordTitle}
          isStandalone={true}
        />
      )}
      {!isStandaloneMode && viewMode === 'preview' && (
        <AttachmentPreview
          onEditClick={handleEditClick}
          onGradeClick={handleGradeClick}
          onBlankCanvasClick={handleBlankCanvasClick}
          showGradeButton={showGradeButton}
        />
      )}
      {!isStandaloneMode && viewMode === 'editor' && editImageUrl && (
        <ExcalidrawEditor
          initialImageUrl={editImageUrl}
          onBack={handleBackToPreview}
          attachmentFieldId={attachmentFieldId}
        />
      )}
      {!isStandaloneMode && viewMode === 'blankCanvas' && (
        <BlankCanvasEditor
          onBack={handleBackToPreview}
          attachmentFieldId={attachmentFieldId}
        />
      )}
      {!isStandaloneMode && viewMode === 'grade' && (
        <GradeExcalidrawPreview onBack={handleBackToPreview} />
      )}
    </div>
  );
};

