import React from 'react';
import './ConfirmDialog.scss';

interface ConfirmDialogProps {
  show: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  show,
  title = '确认返回',
  message,
  confirmText = '放弃并返回',
  cancelText = '继续编辑',
  onConfirm,
  onCancel,
}) => {
  if (!show) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">{title}</div>
        <div className="dialog-content">{message}</div>
        <div className="dialog-actions">
          <button className="btn btn-outline-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

