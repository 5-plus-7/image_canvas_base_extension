import React, { useState, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { bitable } from '@lark-base-open/js-sdk';
import { loadGradeData as loadGradeDataFromField } from '../utils/gradeField';
import { ConfirmDialog } from './ConfirmDialog';
import { useExcalidrawEditor } from '../hooks/useExcalidrawEditor';
import { blobToDataURL, getImageSize, guessMimeFromUrl, calculateDisplaySize } from '../utils/imageLoader';
import { addMarkingElements } from '../utils/markingElements';
import { IMAGE_CONFIG, COLORS, EXPORT_FILE_PREFIX, GRADE_PREVIEW_CONFIG, IMAGE_EXTENSIONS } from '../constants';
import type { ExcalidrawImperativeAPI, BinaryFileData } from '../types/excalidraw';
import './GradeExcalidrawPreview.scss';

interface GradeData {
  image_url: string;
  markup_status: string;
  questions_info: any[];
}

interface GradeExcalidrawPreviewProps {
  onBack: () => void;
  initialGradeData?: GradeData[];
  initialRecordTitle?: string;
  isStandalone?: boolean;
}

/** 判断 URL 是否指向图片资源 */
const isImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (IMAGE_EXTENSIONS.test(pathname)) return true;
  } catch {
    if (IMAGE_EXTENSIONS.test(url.toLowerCase())) return true;
  }
  return false;
};

/** 带重试的图片加载，校验 Content-Type */
const loadImageWithRetry = async (url: string, retries = 3): Promise<Blob> => {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache',
        headers: { Accept: 'image/*' },
      });
      if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);

      const contentType = resp.headers.get('content-type') || '';
      const disposition = (resp.headers.get('content-disposition') || '').toLowerCase();
      const isImage =
        contentType.startsWith('image/') ||
        contentType === 'application/octet-stream' ||
        contentType === 'binary/octet-stream' ||
        contentType.includes('octet-stream') ||
        contentType === '';

      if (!isImage) {
        throw new Error(
          `不支持预览的响应头: Content-Type=${contentType || '无'}, Content-Disposition=${disposition || '无'}`
        );
      }

      const blob = await resp.blob();
      if (blob.size === 0) throw new Error('空的图片数据');
      return blob;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('所有重试均失败');
};

export const GradeExcalidrawPreview: React.FC<GradeExcalidrawPreviewProps> = ({
  onBack,
  initialGradeData,
  initialRecordTitle,
  isStandalone = false,
}) => {
  const editor = useExcalidrawEditor({
    fileNamePrefix: EXPORT_FILE_PREFIX.GRADE,
    skipLoadFields: isStandalone,
    onBack,
    hasUnsavedContent: () => {
      if (isStandalone) return false;
      if (!editor.excalidrawAPI || editor.initialElementCount <= 0) return false;
      const currentElements = editor.excalidrawAPI.getSceneElements();
      return currentElements && currentElements.length > editor.initialElementCount && !editor.hasExported;
    },
  });

  const [gradeDataList, setGradeDataList] = useState<GradeData[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const tooltipTimeoutRef = useRef<number | null>(null);

  // 初始化数据
  useEffect(() => {
    if (isStandalone && initialGradeData) {
      const imageOnlyData = initialGradeData.filter((item) => item.image_url && isImageUrl(item.image_url));
      if (imageOnlyData.length > 0) {
        setGradeDataList(imageOnlyData);
        setCurrentImageIndex(0);
        setLoading(false);
        if (initialRecordTitle) {
          editor.setRecordTitle(initialRecordTitle);
        }
      } else {
        setError('未找到有效的图片数据');
        setLoading(false);
      }
    } else {
      loadGradeData();
    }

    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const loadGradeData = async () => {
    try {
      setLoading(true);
      const selection = await bitable.base.getSelection();
      if (!selection.recordId || !selection.tableId) {
        setError('请先选择一个记录');
        setLoading(false);
        return;
      }

      const valueStr = await loadGradeDataFromField(selection.tableId, selection.recordId);
      let parsedData: GradeData[];
      try {
        parsedData = JSON.parse(valueStr);
        if (!Array.isArray(parsedData)) parsedData = [parsedData];
      } catch {
        setError('数据格式错误，无法解析JSON');
        setLoading(false);
        return;
      }

      const imageOnlyData = parsedData.filter((item) => item.image_url && isImageUrl(item.image_url));
      if (imageOnlyData.length === 0) {
        setError('未找到有效的图片数据');
        setGradeDataList([]);
        setLoading(false);
        return;
      }

      setGradeDataList(imageOnlyData);
      setCurrentImageIndex(0);
      setError('');
    } catch (err: any) {
      console.error('Error loading grade data:', err);
      setError(err.message || '加载批改数据时出错');
    } finally {
      setLoading(false);
    }
  };

  // 加载当前图片和标记
  useEffect(() => {
    if (editor.excalidrawAPI && gradeDataList.length > 0) {
      loadCurrentImageAndMarkings();
    }
  }, [editor.excalidrawAPI, gradeDataList, currentImageIndex]);

  const loadCurrentImageAndMarkings = async () => {
    const currentData = gradeDataList[currentImageIndex];
    if (!currentData || !currentData.image_url || !editor.excalidrawAPI) return;

    try {
      const imageBlob = await loadImageWithRetry(currentData.image_url);
      const dataURL = await blobToDataURL(imageBlob);
      const { width: imageWidth, height: imageHeight } = await getImageSize(dataURL);
      const { width: displayWidth, height: displayHeight } = calculateDisplaySize(
        imageWidth, imageHeight,
        IMAGE_CONFIG.MAX_DISPLAY_WIDTH, IMAGE_CONFIG.MAX_DISPLAY_HEIGHT
      );

      const fileId = `image_${Date.now()}`;
      const { convertToExcalidrawElements, MIME_TYPES } = await import('@excalidraw/excalidraw');

      const guessedMime = guessMimeFromUrl(currentData.image_url);
      const resolvedMime =
        imageBlob.type && imageBlob.type !== 'application/octet-stream'
          ? imageBlob.type
          : guessedMime || MIME_TYPES.jpg;

      const imageFile: BinaryFileData = {
        id: fileId as any,
        dataURL: dataURL as any,
        mimeType: resolvedMime,
        created: Date.now(),
        lastRetrieved: Date.now(),
      };

      editor.excalidrawAPI.addFiles([imageFile]);

      const imageElement = convertToExcalidrawElements([
        {
          type: 'image',
          x: 0, y: 0,
          width: displayWidth, height: displayHeight,
          fileId, status: 'saved', scale: [1, 1],
          locked: true,
        },
      ] as any);

      const markingElementsRaw = addMarkingElements(
        currentData.questions_info,
        displayWidth / imageWidth,
        displayHeight / imageHeight,
        displayWidth
      );
      const markingElements = convertToExcalidrawElements(markingElementsRaw as any);

      const allElements = [...imageElement, ...markingElements].map((el: any) => {
        const isImageElement = el.type === 'image';
        const fixedEl = {
          ...el,
          locked: isImageElement,
          points: el.points || (el.type === 'arrow' ? [[0, 0], [el.width || 0, el.height || 0]] : []),
          strokeStyle: el.strokeStyle || 'solid',
          fillStyle: el.fillStyle || 'solid',
        };
        if (fixedEl.type === 'arrow' && Array.isArray(fixedEl.points)) {
          fixedEl.points = fixedEl.points.map((p: any) => (Array.isArray(p) ? p : [0, 0]));
        }
        return fixedEl;
      });

      editor.excalidrawAPI.updateScene({ elements: allElements });
      editor.setInitialElementCount(allElements.length);

      setTimeout(() => {
        editor.excalidrawAPI!.scrollToContent(imageElement[0], { fitToViewport: true });
      }, 100);
    } catch (err: any) {
      console.error('加载图片失败:', err);
      const msg = err?.message || '加载图片时出错';
      if (msg.includes('CORS')) {
        setError('图片加载失败：跨域访问被阻止，请联系管理员');
      } else if (msg.includes('HTTP error')) {
        setError(`图片加载失败：服务器返回错误 (${msg})`);
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setError('图片加载失败：网络连接问题，请检查网络后重试');
      } else {
        setError(`图片加载失败：${msg}`);
      }
    }
  };

  const handlePrevious = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      editor.setHasExported(false);
      editor.setInitialElementCount(0);
    }
  };

  const handleNext = () => {
    if (currentImageIndex < gradeDataList.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      editor.setHasExported(false);
      editor.setInitialElementCount(0);
    }
  };

  const handleClearMarks = () => {
    if (!editor.excalidrawAPI) return;
    const elements = editor.excalidrawAPI.getSceneElements();
    const imageOnly = elements.filter((el: any) => el.type === 'image');
    editor.excalidrawAPI.updateScene({ elements: imageOnly });
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return (
      <div className="grade-excalidraw-preview">
        <div className="status-message error">
          <div className="status-text">{error}</div>
          <button className="status-action-btn" onClick={onBack}>← 返回</button>
        </div>
      </div>
    );
  }

  if (gradeDataList.length === 0) {
    return (
      <div className="grade-excalidraw-preview">
        <div className="status-message empty">
          <div className="status-text">没有批改数据</div>
          <button className="status-action-btn" onClick={onBack}>← 返回</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grade-excalidraw-preview">
      <div className="preview-header">
        <div className="header-left">
          <button className="btn btn-sm btn-outline-secondary" onClick={editor.handleBack}>
            ← 返回
          </button>
          {editor.recordTitle && (
            <div className="record-title-wrapper ms-2">
              <span className="record-title">{editor.recordTitle}</span>
              <div
                className="tooltip-wrapper"
                onMouseEnter={() => {
                  if (tooltipTimeoutRef.current) {
                    clearTimeout(tooltipTimeoutRef.current);
                    tooltipTimeoutRef.current = null;
                  }
                  setShowTooltip(true);
                }}
                onMouseLeave={() => {
                  tooltipTimeoutRef.current = setTimeout(() => {
                    setShowTooltip(false);
                    tooltipTimeoutRef.current = null;
                  }, 500);
                }}
              >
                <span className="help-icon">?</span>
                <div className={`tooltip-content ${showTooltip ? 'show' : ''}`}>
                  {GRADE_PREVIEW_CONFIG.TOOLTIP_MESSAGE}
                  {GRADE_PREVIEW_CONFIG.TOOLTIP_LINK_URL && (
                    <a
                      href={GRADE_PREVIEW_CONFIG.TOOLTIP_LINK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tooltip-link"
                    >
                      详细规则
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="header-actions">
          <button
            className="clear-marks-btn me-3"
            onClick={handleClearMarks}
            title="一键清除标记"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 3H11V2.5C11 1.67 10.33 1 9.5 1H6.5C5.67 1 5 1.67 5 2.5V3H2.5C2.22 3 2 3.22 2 3.5S2.22 4 2.5 4H3V13.5C3 14.33 3.67 15 4.5 15H11.5C12.33 15 13 14.33 13 13.5V4H13.5C13.78 4 14 3.78 14 3.5S13.78 3 13.5 3ZM6 2.5C6 2.22 6.22 2 6.5 2H9.5C9.78 2 10 2.22 10 2.5V3H6V2.5ZM12 13.5C12 13.78 11.78 14 11.5 14H4.5C4.22 14 4 13.78 4 13.5V4H12V13.5ZM6.5 6.5V11.5C6.5 11.78 6.28 12 6 12S5.5 11.78 5.5 11.5V6.5C5.5 6.22 5.72 6 6 6S6.5 6.22 6.5 6.5ZM8.5 6.5V11.5C8.5 11.78 8.28 12 8 12S7.5 11.78 7.5 11.5V6.5C7.5 6.22 7.72 6 8 6S8.5 6.22 8.5 6.5ZM10.5 6.5V11.5C10.5 11.78 10.28 12 10 12S9.5 11.78 9.5 11.5V6.5C9.5 6.22 9.72 6 10 6S10.5 6.22 10.5 6.5Z" fill="currentColor"/>
            </svg>
          </button>
          {gradeDataList.length > 1 && (
            <div className="attachment-nav-inline me-3">
              <button
                className="nav-btn prev"
                onClick={handlePrevious}
                disabled={currentImageIndex === 0}
                title="上一张"
              >
                ‹
              </button>
              <span className="nav-indicator">
                {currentImageIndex + 1} / {gradeDataList.length}
              </span>
              <button
                className="nav-btn next"
                onClick={handleNext}
                disabled={currentImageIndex === gradeDataList.length - 1}
                title="下一张"
              >
                ›
              </button>
            </div>
          )}
          {!isStandalone && (
            <>
              <select
                className="form-select form-select-sm me-2"
                value={editor.selectedFieldId}
                onChange={(e) => editor.setSelectedFieldId(e.target.value)}
                style={{ width: 'auto', minWidth: '150px' }}
              >
                {editor.attachmentFields.map(field => (
                  <option key={field.id} value={field.id}>{field.name}</option>
                ))}
              </select>
              <button
                className="btn btn-sm btn-primary"
                onClick={editor.handleExport}
                disabled={editor.isExporting || !editor.selectedFieldId}
              >
                {editor.isExporting ? '导出中...' : '导出'}
              </button>
            </>
          )}
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
