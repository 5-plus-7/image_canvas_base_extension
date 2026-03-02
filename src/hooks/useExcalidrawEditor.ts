/**
 * 共享 Excalidraw 编辑器状态和逻辑的自定义 Hook
 * 用于 BlankCanvasEditor、ExcalidrawEditor、GradeExcalidrawPreview 三个组件
 */

import { useState, useEffect } from 'react';
import { bitable } from '@lark-base-open/js-sdk';
import { exportExcalidrawToAttachment } from '../utils/excalidrawExport';
import { loadAttachmentFieldsWithPriority } from '../utils/attachmentFields';
import { initializeExcalidrawLibrary } from '../utils/excalidrawLibrary';
import { getRecordTitle } from '../utils/recordTitle';
import { showToast } from '../utils/toast';
import { TIMEOUT } from '../constants';
import type { ExcalidrawImperativeAPI, ExcalidrawElement, BinaryFiles } from '../types/excalidraw';

interface UseExcalidrawEditorOptions {
  /** 初始附件字段 ID */
  initialFieldId?: string;
  /** 导出文件名前缀 */
  fileNamePrefix: string;
  /** 导出超时时间（毫秒） */
  exportTimeout?: number;
  /** 是否跳过加载附件字段（独立模式） */
  skipLoadFields?: boolean;
  /** 返回回调 */
  onBack: () => void;
  /** 自定义未保存内容判断 */
  hasUnsavedContent?: () => boolean;
}

interface UseExcalidrawEditorReturn {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  attachmentFields: Array<{ id: string; name: string }>;
  selectedFieldId: string;
  setSelectedFieldId: (id: string) => void;
  isExporting: boolean;
  showConfirmDialog: boolean;
  setShowConfirmDialog: (show: boolean) => void;
  hasExported: boolean;
  setHasExported: (v: boolean) => void;
  recordTitle: string;
  setRecordTitle: (title: string) => void;
  initialElementCount: number;
  setInitialElementCount: (count: number) => void;
  handleExport: () => Promise<void>;
  handleBack: () => void;
  handleConfirmBack: () => void;
  handleChange: (elements: readonly ExcalidrawElement[], appState: any, files: BinaryFiles) => void;
  onExcalidrawAPI: (api: ExcalidrawImperativeAPI) => void;
}

export const useExcalidrawEditor = (options: UseExcalidrawEditorOptions): UseExcalidrawEditorReturn => {
  const {
    initialFieldId = '',
    fileNamePrefix,
    exportTimeout = TIMEOUT.EXPORT,
    skipLoadFields = false,
    onBack,
    hasUnsavedContent,
  } = options;

  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [attachmentFields, setAttachmentFields] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(initialFieldId);
  const [isExporting, setIsExporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasExported, setHasExported] = useState(false);
  const [recordTitle, setRecordTitle] = useState('');
  const [initialElementCount, setInitialElementCount] = useState(0);

  // 加载附件字段
  useEffect(() => {
    if (skipLoadFields) return;
    loadAttachmentFieldsWithPriority().then((sortedFields) => {
      setAttachmentFields(sortedFields);
      if (sortedFields.length > 0 && !initialFieldId) {
        setSelectedFieldId(sortedFields[0].id);
      }
    });
  }, [skipLoadFields, initialFieldId]);

  // 加载记录标题
  useEffect(() => {
    if (skipLoadFields) return;
    (async () => {
      try {
        const selection = await bitable.base.getSelection();
        if (selection.recordId && selection.tableId) {
          const title = await getRecordTitle(selection.tableId, selection.recordId);
          setRecordTitle(title);
        }
      } catch (error) {
        console.error('Error loading record title:', error);
      }
    })();
  }, [skipLoadFields]);

  // 初始化 Excalidraw 库
  useEffect(() => {
    if (excalidrawAPI) {
      initializeExcalidrawLibrary(excalidrawAPI);
    }
  }, [excalidrawAPI]);

  const handleExport = async () => {
    if (!excalidrawAPI || !selectedFieldId) return;
    setIsExporting(true);
    const result = await exportExcalidrawToAttachment({
      excalidrawAPI,
      selectedFieldId,
      fileNamePrefix,
      timeout: exportTimeout,
    });
    setIsExporting(false);
    await showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      setHasExported(true);
    }
  };

  const handleBack = () => {
    const defaultCheck = () => {
      if (!excalidrawAPI || initialElementCount <= 0) return false;
      const currentElements = excalidrawAPI.getSceneElements();
      return currentElements && currentElements.length > initialElementCount && !hasExported;
    };

    const checkFn = hasUnsavedContent || defaultCheck;
    if (checkFn()) {
      setShowConfirmDialog(true);
      return;
    }
    onBack();
  };

  const handleConfirmBack = () => {
    setShowConfirmDialog(false);
    onBack();
  };

  const handleChange = (
    _elements: readonly ExcalidrawElement[],
    _appState: any,
    _files: BinaryFiles
  ) => {
    // 预留给组件扩展
  };

  const onExcalidrawAPI = (api: ExcalidrawImperativeAPI) => {
    if (api) setExcalidrawAPI(api);
  };

  return {
    excalidrawAPI,
    attachmentFields,
    selectedFieldId,
    setSelectedFieldId,
    isExporting,
    showConfirmDialog,
    setShowConfirmDialog,
    hasExported,
    setHasExported,
    recordTitle,
    setRecordTitle,
    initialElementCount,
    setInitialElementCount,
    handleExport,
    handleBack,
    handleConfirmBack,
    handleChange,
    onExcalidrawAPI,
  };
};
