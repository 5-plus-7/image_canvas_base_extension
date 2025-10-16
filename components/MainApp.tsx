import React, { useState } from 'react';
import AttachmentViewer from './AttachmentViewer';
import ImageEditor from './ImageEditor';
import './MainApp.scss';

type ViewMode = 'viewer' | 'editor';

const MainApp: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('viewer');
  const [editingImageUrl, setEditingImageUrl] = useState<string>('');
  const [editingRecordId, setEditingRecordId] = useState<string>('');
  const [editingTableId, setEditingTableId] = useState<string>('');
  const [editingFieldId, setEditingFieldId] = useState<string>('');

  const handleEdit = (imageUrl: string, recordId: string, tableId: string, currentFieldId: string) => {
    setEditingImageUrl(imageUrl);
    setEditingRecordId(recordId);
    setEditingTableId(tableId);
    setEditingFieldId(currentFieldId);
    setViewMode('editor');
  };

  const handleBackToViewer = () => {
    setViewMode('viewer');
    setEditingImageUrl('');
    setEditingRecordId('');
    setEditingTableId('');
    setEditingFieldId('');
  };

  return (
    <div className="main-app">
      {viewMode === 'viewer' ? (
        <AttachmentViewer onEdit={handleEdit} />
      ) : (
        <div className="editor-container">
          <ImageEditor 
            excalidrawLib={window.ExcalidrawLib}
            imageUrl={editingImageUrl}
            recordId={editingRecordId}
            tableId={editingTableId}
            currentFieldId={editingFieldId}
            onBack={handleBackToViewer}
          />
        </div>
      )}
    </div>
  );
};

export default MainApp;

