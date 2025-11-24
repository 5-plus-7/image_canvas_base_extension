import React, { useEffect, useState, useRef, useCallback } from 'react';
import { bitable, IAttachmentField, FieldType, IOpenAttachment } from '@lark-base-open/js-sdk';
import * as pdfjsLib from 'pdfjs-dist';
import { isImageAttachment, isPdfAttachment } from '../utils/fileType';
import { checkGradeField } from '../utils/gradeField';
import { showToast } from '../utils/toast';
import { IMAGE_CONFIG, PDF_CONFIG, GRADE_FIELD_NAME, TIMEOUT } from '../constants';
import './AttachmentPreview.scss';

// 设置PDF.js worker - 使用本地worker文件
// 在 Vite 环境中，使用 CDN 或本地路径
try {
  // 尝试使用 Vite 的静态资源路径
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
  ).toString();
} catch (error) {
  // 如果失败，使用 CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface AttachmentWithUrl extends IOpenAttachment {
  url?: string;
}

interface AttachmentPreviewProps {
  onEditClick?: (imageToken: string, imageUrl: string) => void;
  onGradeClick?: () => void;
  onBlankCanvasClick?: () => void;
  showGradeButton?: boolean;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ 
  onEditClick, 
  onGradeClick,
  onBlankCanvasClick,
  showGradeButton = false 
}) => {
  const [title, setTitle] = useState<string>('');
  const [attachments, setAttachments] = useState<AttachmentWithUrl[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLoadingNewAttachment, setIsLoadingNewAttachment] = useState<boolean>(false); // 是否是切换附件导致的加载
  const [error, setError] = useState<string>('');
  const [fieldName, setFieldName] = useState<string>('');
  const [recordTitle, setRecordTitle] = useState<string>('');
  const [primaryFieldName, setPrimaryFieldName] = useState<string>(''); // 索引列名
  const [showGradeBtn, setShowGradeBtn] = useState<boolean>(false);
  const [hasGradeField, setHasGradeField] = useState<boolean>(false); // 是否存在批改字段
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(null); // 所选字段类型
  const [scale, setScale] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pdfPageNum, setPdfPageNum] = useState<number>(1);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(0);
  const [pdfScale, setPdfScale] = useState<number>(PDF_CONFIG.INITIAL_SCALE);
  const [compressedImageUrl, setCompressedImageUrl] = useState<string>('');
  const [useCompressed, setUseCompressed] = useState<boolean>(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfCanvasReady, setPdfCanvasReady] = useState<boolean>(false);
  const compressedImageUrlRef = useRef<string>('');
  const pdfDocumentRef = useRef<any>(null); // 缓存PDF文档对象
  const pdfUrlRef = useRef<string>(''); // 缓存当前PDF的URL
  const pdfRenderTaskRef = useRef<any>(null); // 存储当前的渲染任务，用于取消

  useEffect(() => {
    const checkSelection = async () => {
      try {
        const selection = await bitable.base.getSelection();
        if (!selection.recordId || !selection.fieldId || !selection.tableId) {
          setError('请选择一个单元格');
          setAttachments([]);
          setTitle('');
          setFieldName('');
          setRecordTitle('');
          setPrimaryFieldName('');
          setSelectedFieldType(null);
          return;
        }

        const table = await bitable.base.getTableById(selection.tableId);
        const field = await table.getFieldById(selection.fieldId);
        const fieldType = await field.getType();
        setSelectedFieldType(fieldType);
        
        // 获取字段名
        const fieldMeta = await field.getMeta();
        setFieldName(fieldMeta.name);

        // 获取索引列名（主字段名）
        try {
          const fieldMetaList = await table.getFieldMetaList();
          const primaryField = fieldMetaList.find(f => f.isPrimary);
          if (primaryField) {
            setPrimaryFieldName(primaryField.name);
            // 获取索引列的值
            const recordName = await table.getCellString(primaryField.id, selection.recordId);
            setRecordTitle(recordName);
          } else {
            setPrimaryFieldName('');
            setRecordTitle('');
          }
        } catch (err) {
          console.error('Error getting primary field:', err);
          setPrimaryFieldName('');
          setRecordTitle('');
        }

        // 检查是否存在批改字段
        try {
          const fieldMetaList = await table.getFieldMetaList();
          const gradeField = fieldMetaList.find(f => f.name === GRADE_FIELD_NAME);
          setHasGradeField(!!gradeField);
          
          if (gradeField) {
            const hasValue = await checkGradeField(selection.tableId, selection.recordId);
            setShowGradeBtn(hasValue);
          } else {
            setShowGradeBtn(false);
          }
        } catch (err) {
          console.error('Error checking grade field:', err);
          setHasGradeField(false);
          setShowGradeBtn(false);
        }
        
        // 只有附件类型才加载附件内容
        if (fieldType !== FieldType.Attachment) {
          setAttachments([]);
          setTitle(`${recordTitle || ''} - ${fieldMeta.name}`);
          setError('');
          return;
        }

        const attachmentField = await table.getField<IAttachmentField>(selection.fieldId);
        const cellValue = await attachmentField.getValue(selection.recordId);
        
        if (!cellValue || cellValue.length === 0) {
          setError('当前选中的单元格中没有附件内容');
          setAttachments([]);
          setTitle('');
          return;
        }

        // 获取附件URL
        const attachmentUrls = await attachmentField.getAttachmentUrls(selection.recordId);
        
        // 合并附件信息和URL
        const attachmentsWithUrl: AttachmentWithUrl[] = cellValue.map((att, index) => ({
          ...att,
          url: attachmentUrls[index]
        }));

        // 附件字段的字段名已在上面设置（第81行）
        setTitle(`${recordTitle || ''} - ${fieldName}`);
        setAttachments(attachmentsWithUrl);
        setCurrentIndex(0);
        setError('');
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setPdfPageNum(1); // 重置PDF页码
        // 清理PDF文档缓存
        if (pdfDocumentRef.current) {
          pdfDocumentRef.current.destroy();
          pdfDocumentRef.current = null;
        }
        pdfUrlRef.current = '';
        
        // 切换单元格时，只有图片或PDF才显示加载动效
        if (attachmentsWithUrl.length > 0) {
          const firstAttachment = attachmentsWithUrl[0];
          const firstIsImage = isImageAttachment(firstAttachment);
          const firstIsPdf = isPdfAttachment(firstAttachment);
          if (firstIsImage || firstIsPdf) {
            setLoading(true);
            setIsLoadingNewAttachment(true); // 标记为切换附件导致的加载
          } else {
            setLoading(false);
            setIsLoadingNewAttachment(false);
          }
        } else {
          setLoading(false);
          setIsLoadingNewAttachment(false);
        }
        setPdfPageNum(1);
        setPdfTotalPages(0);
        setPdfScale(PDF_CONFIG.INITIAL_SCALE);
      } catch (err) {
        console.error('Error loading attachment:', err);
        setError('加载附件时出错');
        setAttachments([]);
      }
    };

    checkSelection();
    
    // 监听选择变化
    const unsubscribe = bitable.base.onSelectionChange(() => {
      checkSelection();
    });

    return () => {
      unsubscribe();
    };
  }, []);


  const currentAttachment = attachments.length > 0 ? attachments[currentIndex] : null;
  const isImage = isImageAttachment(currentAttachment);
  const isPdf = isPdfAttachment(currentAttachment);
  const isUnsupported = currentAttachment && !isImage && !isPdf;

  // 无论什么情况都显示顶栏
  const renderHeader = () => (
    <div className="preview-header">
      <div className="title-section">
        <div className="field-info">
          {primaryFieldName && (
            <span className="field-label">
              {primaryFieldName}: <span className="field-value">{recordTitle || '-'}</span>
            </span>
          )}
          {fieldName && (
            <span className="field-label ms-3">
              所选列: <span className="field-value">{fieldName}</span>
            </span>
          )}
        </div>
        {attachments.length > 1 && (
          <div className="attachment-nav-inline">
            <button 
              className="nav-btn prev" 
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              title="上一个"
            >
              ‹
            </button>
            <span className="nav-indicator">
              {currentIndex + 1} / {attachments.length}
            </span>
            <button 
              className="nav-btn next" 
              onClick={handleNext}
              disabled={currentIndex === attachments.length - 1}
              title="下一个"
            >
              ›
            </button>
          </div>
        )}
      </div>
      <div className="header-actions">
        {selectedFieldType === FieldType.Attachment && isImage && (
          <button className="btn btn-sm btn-outline-primary me-2" onClick={handleEditClick}>
            编辑
          </button>
        )}
        {selectedFieldType !== null && selectedFieldType !== FieldType.Attachment && onBlankCanvasClick && (
          <button className="btn btn-sm btn-outline-primary me-2" onClick={onBlankCanvasClick}>
            空白画布
          </button>
        )}
        {selectedFieldType === FieldType.Attachment && !isImage && currentAttachment && onBlankCanvasClick && (
          <button className="btn btn-sm btn-outline-primary me-2" onClick={onBlankCanvasClick}>
            空白画布
          </button>
        )}
        {selectedFieldType !== null && hasGradeField && (showGradeButton || showGradeBtn) && (
          <button className="btn btn-sm btn-primary" onClick={onGradeClick}>
            处理算法结果
          </button>
        )}
      </div>
    </div>
  );

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevAttachment = attachments[prevIndex];
      const prevIsImage = isImageAttachment(prevAttachment);
      const prevIsPdf = isPdfAttachment(prevAttachment);
      
      // 立即显示加载动效
      if (prevIsImage || prevIsPdf) {
        setLoading(true);
        setIsLoadingNewAttachment(true); // 标记为切换附件导致的加载
      }
      
      // 先更新索引，触发重新渲染
      setCurrentIndex(prevIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      // 如果是PDF，重置页码
      if (prevIsPdf) {
        setPdfPageNum(1);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < attachments.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextAttachment = attachments[nextIndex];
      const nextIsImage = isImageAttachment(nextAttachment);
      const nextIsPdf = isPdfAttachment(nextAttachment);
      
      // 立即显示加载动效
      if (nextIsImage || nextIsPdf) {
        setLoading(true);
        setIsLoadingNewAttachment(true); // 标记为切换附件导致的加载
      }
      
      // 先更新索引，触发重新渲染
      setCurrentIndex(nextIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      // 如果是PDF，重置页码
      if (nextIsPdf) {
        setPdfPageNum(1);
      }
    }
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!isImage) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  }, [isImage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isImage || scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isImage || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleEditClick = () => {
    if (currentAttachment && isImage && onEditClick && currentAttachment.url) {
      onEditClick(currentAttachment.token, currentAttachment.url);
    }
  };

  const loadPdf = useCallback(async () => {
    if (!currentAttachment?.url || !pdfCanvasRef.current) {
      setLoading(false);
      setIsLoadingNewAttachment(false);
      return;
    }
    
    const pdfUrl = currentAttachment.url;
    
    let timeoutId: number | null = null;
    let isCancelled = false;
    
    // 创建带超时的 Promise 包装器
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return new Promise((resolve, reject) => {
        timeoutId = window.setTimeout(() => {
          isCancelled = true;
          reject(new Error('PDF加载超时'));
        }, timeoutMs);
        
        promise
          .then((result) => {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            if (!isCancelled) {
              resolve(result);
            }
          })
          .catch((error) => {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            if (!isCancelled) {
              reject(error);
            }
          });
      });
    };

    try {
      setLoading(true);
      
      // 如果PDF文档已缓存且URL相同，直接使用；否则重新加载
      let pdf = pdfDocumentRef.current;
      if (!pdf || pdfUrlRef.current !== pdfUrl) {
        // 清理旧的PDF文档
        if (pdfDocumentRef.current) {
          pdfDocumentRef.current.destroy();
        }
        
        // 检查 PDF.js worker 是否已设置
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          throw new Error('PDF.js worker 未初始化');
        }
        
        // 优化PDF.js配置以加快加载
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          // 禁用不必要的功能以加快加载
          disableAutoFetch: false,
          disableStream: false,
          disableRange: false,
          // 使用更快的渲染模式
          verbosity: 0, // 减少日志输出
        });
        
        pdf = await withTimeout(loadingTask.promise, TIMEOUT.PDF_LOAD);
        
        if (isCancelled) {
          return;
        }
        
        pdfDocumentRef.current = pdf;
        pdfUrlRef.current = pdfUrl;
        setPdfTotalPages(pdf.numPages);
      }
      
      // 渲染当前页面
      const page = await withTimeout(pdf.getPage(pdfPageNum), TIMEOUT.PDF_LOAD) as any;
      
      if (isCancelled) {
        return;
      }
      
      const viewport = page.getViewport({ scale: pdfScale });
      
      const canvas = pdfCanvasRef.current;
      if (!canvas) {
        throw new Error('Canvas 元素不存在');
      }
      
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('无法获取 Canvas 上下文');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // 取消之前的渲染任务（如果存在）
      if (pdfRenderTaskRef.current) {
        try {
          pdfRenderTaskRef.current.cancel();
        } catch (e) {
          // 忽略取消错误
        }
        pdfRenderTaskRef.current = null;
      }
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      const renderTask = page.render(renderContext);
      pdfRenderTaskRef.current = renderTask; // 存储渲染任务
      
      await withTimeout(renderTask.promise, TIMEOUT.PDF_LOAD);
      
      // 渲染完成后清除任务引用
      pdfRenderTaskRef.current = null;
      
      if (isCancelled) {
        return;
      }
      
      setLoading(false);
      setIsLoadingNewAttachment(false);
      setError(''); // 清除之前的错误
    } catch (error: any) {
      // 清除渲染任务引用
      pdfRenderTaskRef.current = null;
      
      setLoading(false);
      setIsLoadingNewAttachment(false);
      
      // 如果是渲染取消错误，不显示错误提示（这是正常的）
      if (error?.name === 'RenderingCancelledException' || error?.message?.includes('Rendering cancelled')) {
        return;
      }
      
      // 清理缓存以便重试（仅在非取消错误时）
      if (error?.name !== 'RenderingCancelledException' && !error?.message?.includes('Rendering cancelled')) {
        if (pdfDocumentRef.current) {
          try {
            pdfDocumentRef.current.destroy();
          } catch (e) {
            console.error('[PDF] 清理文档时出错:', e);
          }
          pdfDocumentRef.current = null;
        }
        pdfUrlRef.current = '';
      }
      
      // 显示错误提示（仅在非取消错误时）
      if (error?.name !== 'RenderingCancelledException' && !error?.message?.includes('Rendering cancelled')) {
        let errorMessage = '加载PDF失败';
        if (error?.message === 'PDF加载超时') {
          errorMessage = 'PDF加载超时，请检查网络连接或重试';
        } else if (error?.message) {
          errorMessage = `加载PDF失败: ${error.message}`;
        }
        
        await showToast(errorMessage, 'error');
        setError(errorMessage);
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, [currentAttachment?.url, pdfPageNum, pdfScale]);

  // Canvas 回调 ref，用于检测 Canvas 挂载
  const pdfCanvasCallbackRef = useCallback((node: HTMLCanvasElement | null) => {
    (pdfCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
    if (node) {
      setPdfCanvasReady(true);
    } else {
      setPdfCanvasReady(false);
    }
  }, []);

  // 监听 Canvas 元素挂载，当 Canvas 存在且是 PDF 时触发加载
  useEffect(() => {
    if (isPdf && currentAttachment?.url && pdfCanvasReady && pdfCanvasRef.current) {
      loadPdf();
    }
  }, [isPdf, currentAttachment?.url, pdfCanvasReady, loadPdf]);

  // 监听 PDF 页码和缩放变化，重新渲染（仅在文档已加载时）
  useEffect(() => {
    if (isPdf && currentAttachment?.url && pdfCanvasRef.current && pdfDocumentRef.current) {
      loadPdf();
    }
  }, [pdfPageNum, pdfScale, loadPdf]);

  // 清理函数：切换附件时清理PDF文档缓存
  useEffect(() => {
    return () => {
      // 取消正在进行的渲染任务
      if (pdfRenderTaskRef.current) {
        try {
          pdfRenderTaskRef.current.cancel();
        } catch (e) {
          // 忽略取消错误
        }
        pdfRenderTaskRef.current = null;
      }
      
      if (pdfDocumentRef.current) {
        try {
          pdfDocumentRef.current.destroy();
        } catch (e) {
          console.error('[PDF] 清理文档时出错:', e);
        }
        pdfDocumentRef.current = null;
      }
      pdfUrlRef.current = '';
    };
  }, [currentAttachment?.url]);

  const handlePdfPrevious = () => {
    if (pdfPageNum > 1) {
      setIsLoadingNewAttachment(false); // 切换PDF页码不是切换附件
      setPdfPageNum(pdfPageNum - 1);
    }
  };

  const handlePdfNext = () => {
    if (pdfPageNum < pdfTotalPages) {
      setIsLoadingNewAttachment(false); // 切换PDF页码不是切换附件
      setPdfPageNum(pdfPageNum + 1);
    }
  };

  const handlePdfZoomIn = () => {
    setPdfScale(prev => Math.min(PDF_CONFIG.MAX_SCALE, prev + PDF_CONFIG.SCALE_STEP));
  };

  const handlePdfZoomOut = () => {
    setPdfScale(prev => Math.max(PDF_CONFIG.MIN_SCALE, prev - PDF_CONFIG.SCALE_STEP));
  };

  // 图片压缩函数
  const compressImage = async (
    imageUrl: string, 
    maxWidth: number = 1920, 
    maxHeight: number = 1920, 
    quality: number = 0.85
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // 计算压缩后的尺寸
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 canvas context'));
          return;
        }
        
        // 使用高质量渲染
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 绘制压缩后的图片
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为 blob URL
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              reject(new Error('图片压缩失败'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = imageUrl;
    });
  };

  // 图片压缩处理 useEffect
  useEffect(() => {
    if (isImage && currentAttachment?.url) {
      let isCancelled = false;
      
      const loadAndCompressImage = async () => {
        setLoading(true);
        try {
          // 先加载原图获取尺寸
          const img = new Image();
          
          img.onload = async () => {
            if (isCancelled) return;
            
            // 判断是否需要压缩：尺寸超过阈值
            const isLargeImage = img.width > IMAGE_CONFIG.COMPRESS_THRESHOLD || img.height > IMAGE_CONFIG.COMPRESS_THRESHOLD;
            
            if (isLargeImage) {
              try {
                const compressed = await compressImage(
                  currentAttachment.url!, 
                  IMAGE_CONFIG.COMPRESS_MAX_WIDTH, 
                  IMAGE_CONFIG.COMPRESS_MAX_HEIGHT, 
                  IMAGE_CONFIG.COMPRESS_QUALITY
                );
                
                if (!isCancelled) {
                  // 先释放旧的 blob URL
                  if (compressedImageUrlRef.current) {
                    URL.revokeObjectURL(compressedImageUrlRef.current);
                  }
                  compressedImageUrlRef.current = compressed;
                  setCompressedImageUrl(compressed);
                  setUseCompressed(true);
                  setLoading(false);
                } else {
                  // 如果已取消，释放 blob URL
                  URL.revokeObjectURL(compressed);
                }
              } catch (error) {
                console.warn('图片压缩失败，使用原图:', error);
                if (!isCancelled) {
                  setUseCompressed(false);
                  setLoading(false);
                }
              }
            } else {
              // 小图片直接使用原图
              if (!isCancelled) {
                setUseCompressed(false);
                setLoading(false);
              }
            }
          };
          
          img.onerror = () => {
            if (!isCancelled) {
              setLoading(false);
            }
          };
          
          img.src = currentAttachment.url || '';
        } catch (error) {
          console.error('加载图片失败:', error);
          if (!isCancelled) {
            setLoading(false);
          }
        }
      };
      
      loadAndCompressImage();
      
      // 清理函数：释放 blob URL 和取消加载
      return () => {
        isCancelled = true;
        if (compressedImageUrlRef.current) {
          URL.revokeObjectURL(compressedImageUrlRef.current);
          compressedImageUrlRef.current = '';
        }
        setCompressedImageUrl('');
        setUseCompressed(false);
      };
    } else {
      // 不是图片时清理状态
      if (compressedImageUrlRef.current) {
        URL.revokeObjectURL(compressedImageUrlRef.current);
        compressedImageUrlRef.current = '';
      }
      setCompressedImageUrl('');
      setUseCompressed(false);
    }
  }, [isImage, currentAttachment?.url]);

  // 注册原生 wheel 事件监听器，设置 passive: false 以允许 preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);


  if (error) {
    return (
      <div className="attachment-preview">
        {renderHeader()}
        <div className="empty-state">
          <div className="empty-illustration">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" fill="#f0f0f0" stroke="#d9d9d9" strokeWidth="2"/>
              <path d="M40 50L60 30L80 50" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M60 30V70" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
              <rect x="35" y="75" width="50" height="8" rx="2" fill="#999"/>
              <rect x="35" y="88" width="40" height="8" rx="2" fill="#999"/>
            </svg>
          </div>
          <div className="empty-title">请选择单元格</div>
          <div className="empty-message">{error}</div>
        </div>
      </div>
    );
  }

  if (selectedFieldType !== FieldType.Attachment || attachments.length === 0) {
    return (
      <div className="attachment-preview">
        {renderHeader()}
        <div className="empty-state">
          <div className="empty-illustration">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" fill="#f0f0f0" stroke="#d9d9d9" strokeWidth="2"/>
              <path d="M40 50L60 30L80 50" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M60 30V70" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
              <rect x="35" y="75" width="50" height="8" rx="2" fill="#999"/>
              <rect x="35" y="88" width="40" height="8" rx="2" fill="#999"/>
            </svg>
          </div>
          <div className="empty-title">
            {selectedFieldType === FieldType.Attachment ? '当前单元格中没有附件内容' : '当前单元格不是附件类型'}
          </div>
          <div className="empty-message">
            {selectedFieldType === FieldType.Attachment 
              ? '请选择一个包含附件的单元格' 
              : '请选择一个附件类型的单元格以预览内容'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="attachment-preview">
      {renderHeader()}
      
      {isPdf && currentAttachment && currentAttachment.url && (
        <div className="pdf-controls-bar">
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={handlePdfPrevious}
            disabled={pdfPageNum <= 1}
          >
            ‹ 上一页
          </button>
          <span className="pdf-page-info">
            {pdfPageNum} / {pdfTotalPages || '...'}
          </span>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={handlePdfNext}
            disabled={pdfPageNum >= pdfTotalPages}
          >
            下一页 ›
          </button>
          <button 
            className="btn btn-sm btn-outline-secondary ms-2"
            onClick={handlePdfZoomOut}
            disabled={pdfScale <= PDF_CONFIG.MIN_SCALE}
          >
            −
          </button>
          <span className="pdf-zoom-info ms-2 me-2">
            {Math.round(pdfScale * 100)}%
          </span>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={handlePdfZoomIn}
            disabled={pdfScale >= PDF_CONFIG.MAX_SCALE}
          >
            +
          </button>
        </div>
      )}
      
      <div className="preview-content">

        <div 
          className="preview-container"
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {loading && !isUnsupported && (
            <div className="loading">
              <div className="loading-spinner"></div>
              <div className="loading-text">加载中...</div>
              {isLoadingNewAttachment && currentAttachment?.name && (
                <div className="loading-filename">{currentAttachment.name}</div>
              )}
            </div>
          )}
          
          {isImage && currentAttachment && currentAttachment.url && !loading && (
            <img
              ref={imageRef}
              src={useCompressed && compressedImageUrl ? compressedImageUrl : currentAttachment.url}
              alt={currentAttachment.name}
              className="preview-image"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              onLoad={() => {
                setLoading(false);
                setIsLoadingNewAttachment(false); // 图片加载完成后重置状态
              }}
              onError={() => {
                // 如果压缩图加载失败，回退到原图
                if (useCompressed) {
                  console.warn('压缩图加载失败，回退到原图');
                  setUseCompressed(false);
                  if (compressedImageUrlRef.current) {
                    URL.revokeObjectURL(compressedImageUrlRef.current);
                    compressedImageUrlRef.current = '';
                  }
                  setCompressedImageUrl('');
                } else {
                  setLoading(false);
                  setError('图片加载失败');
                }
              }}
            />
          )}

          {isPdf && currentAttachment && currentAttachment.url && (
            <div className="pdf-viewer" style={{ display: loading ? 'none' : 'block' }}>
              <canvas
                ref={pdfCanvasCallbackRef}
                className="preview-pdf-canvas"
              />
            </div>
          )}

          {isUnsupported && (
            <div className="unsupported-format">
              <div className="unsupported-filename">
                {currentAttachment?.name || '未知文件'}
              </div>
              <div className="unsupported-message">
                不支持预览此文件格式
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

