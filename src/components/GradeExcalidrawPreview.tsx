import React, { useState, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { bitable } from '@lark-base-open/js-sdk';
import { exportExcalidrawToAttachment } from '../utils/excalidrawExport';
import { loadAttachmentFieldsWithPriority } from '../utils/attachmentFields';
import { loadGradeData as loadGradeDataFromField } from '../utils/gradeField';
import { initializeExcalidrawLibrary } from '../utils/excalidrawLibrary';
import { getRecordTitle } from '../utils/recordTitle';
import { showToast } from '../utils/toast';
import { ConfirmDialog } from './ConfirmDialog';
import { IMAGE_CONFIG, TEXT_CONFIG, COLORS, EXPORT_FILE_PREFIX, TIMEOUT, GRADE_PREVIEW_CONFIG } from '../constants';
import type { ExcalidrawImperativeAPI, ExcalidrawElement, BinaryFiles, BinaryFileData } from '../types/excalidraw';
import './GradeExcalidrawPreview.scss';

interface AnswerStep {
  step_id: number;
  student_answer: string;
  analysis: string;
  is_correct: boolean;
  answer_location: [number, number, number, number]; // [x1, y1, x2, y2]
}

interface QuestionInfo {
  question_number: string;
  question_type: 'objective' | 'subjective';
  question_text: string;
  answer_steps: AnswerStep[];
}

interface GradeData {
  image_url: string;
  markup_status: string;
  questions_info: QuestionInfo[];
}

interface GradeExcalidrawPreviewProps {
  onBack: () => void;
}

export const GradeExcalidrawPreview: React.FC<GradeExcalidrawPreviewProps> = ({ onBack }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [attachmentFields, setAttachmentFields] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [initialElementCount, setInitialElementCount] = useState<number>(0);
  const [hasExported, setHasExported] = useState<boolean>(false);
  const [gradeDataList, setGradeDataList] = useState<GradeData[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [recordTitle, setRecordTitle] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const tooltipTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    loadGradeData();
    loadAttachmentFields();
    loadRecordTitle();
    
    // 清理定时器
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
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

  const loadAttachmentFields = async () => {
    const sortedFields = await loadAttachmentFieldsWithPriority();
    setAttachmentFields(sortedFields);
    if (sortedFields.length > 0) {
      setSelectedFieldId(sortedFields[0].id);
    }
  };

  const loadGradeData = async () => {
    try {
      setLoading(true);
      const selection = await bitable.base.getSelection();
      if (!selection.recordId || !selection.tableId) {
        setError('请先选择一个记录');
        setLoading(false);
        return;
      }

      // 使用工具函数加载批改数据
      const valueStr = await loadGradeDataFromField(selection.tableId, selection.recordId);

      // 解析JSON数据
      let parsedData: GradeData[];
      try {
        parsedData = JSON.parse(valueStr);
        if (!Array.isArray(parsedData)) {
          parsedData = [parsedData];
        }
      } catch (parseError) {
        setError('数据格式错误，无法解析JSON');
        setLoading(false);
        return;
      }

      setGradeDataList(parsedData);
      setCurrentImageIndex(0);
      setError('');
    } catch (err: any) {
      console.error('Error loading grade data:', err);
      setError(err.message || '加载批改数据时出错');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (excalidrawAPI && gradeDataList.length > 0) {
      loadCurrentImageAndMarkings();
    }
  }, [excalidrawAPI, gradeDataList, currentImageIndex]);

  useEffect(() => {
    if (excalidrawAPI) {
      initializeExcalidrawLibrary(excalidrawAPI);
    }
  }, [excalidrawAPI]);

  const loadCurrentImageAndMarkings = async () => {
    const currentData = gradeDataList[currentImageIndex];
    if (!currentData || !currentData.image_url) return;

    try {
      const response = await fetch(currentData.image_url);
      const imageBlob = await response.blob();
      
      const reader = new FileReader();
      reader.onload = function() {
        const dataURL = reader.result as string;
        
        const img = new Image();
        img.onload = function() {
          const imageWidth = img.width;
          const imageHeight = img.height;
          
          const maxWidth = IMAGE_CONFIG.MAX_DISPLAY_WIDTH;
          const maxHeight = IMAGE_CONFIG.MAX_DISPLAY_HEIGHT;
          let displayWidth = imageWidth;
          let displayHeight = imageHeight;
          
          if (imageWidth > maxWidth || imageHeight > maxHeight) {
            const widthRatio = maxWidth / imageWidth;
            const heightRatio = maxHeight / imageHeight;
            const scale = Math.min(widthRatio, heightRatio);
            
            displayWidth = imageWidth * scale;
            displayHeight = imageHeight * scale;
          }
          
          const fileId = `image_${Date.now()}`;
          
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
                x: 0,
                y: 0,
                width: displayWidth,
                height: displayHeight,
                fileId: fileId,
                status: 'saved',
                scale: [1, 1],
              }
            ] as any);

            // 添加标记元素，传递 displayWidth
            const markingElementsRaw = addMarkingElements(currentData.questions_info, displayWidth / imageWidth, displayHeight / imageHeight, displayWidth);
            
            // 使用 convertToExcalidrawElements 转换标记元素
            const markingElements = convertToExcalidrawElements(markingElementsRaw as any);

            // 确保所有元素都是可编辑的（未锁定），并修复可能的属性问题
            const allElements = [...imageElement, ...markingElements].map((el: any) => {
              const fixedEl = {
                ...el,
                locked: false,
                // 确保所有必需属性都存在
                points: el.points || (el.type === 'arrow' ? [[0, 0], [el.width || 0, el.height || 0]] : []),
                strokeStyle: el.strokeStyle || 'solid',
                fillStyle: el.fillStyle || 'solid',
              };
              
              // 对于箭头类型，确保points格式正确
              if (fixedEl.type === 'arrow' && Array.isArray(fixedEl.points)) {
                fixedEl.points = fixedEl.points.map((p: any) => Array.isArray(p) ? p : [0, 0]);
              }
              
              return fixedEl;
            });

            excalidrawAPI.updateScene({
              elements: allElements,
            });

            // 记录初始元素数量（图片 + 标记元素）
            setInitialElementCount(allElements.length);
            
            // 重置hasChanges，因为这是初始加载
            setHasChanges(false);

            setTimeout(() => {
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

  /**
   * 根据固定宽度自动换行文本
   * @param text 原始文本
   * @param maxWidth 最大宽度（像素）
   * @param fontSize 字体大小
   * @returns 换行后的文本行数组
   */
  const wrapTextByWidth = (text: string, maxWidth: number, fontSize: number): string[] => {
    const lines: string[] = [];
    const chineseCharWidth = fontSize; // 中文字符宽度约等于字体大小
    const englishCharWidth = fontSize * 0.6; // 英文字符宽度约为字体大小的0.6倍
    
    let currentLine = '';
    let currentLineWidth = 0;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      // 判断是否为中文字符（包括中文标点）
      const isChinese = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char);
      const charWidth = isChinese ? chineseCharWidth : englishCharWidth;
      
      // 如果当前行加上这个字符会超过最大宽度，则换行
      if (currentLineWidth + charWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
        currentLineWidth = charWidth;
      } else {
        currentLine += char;
        currentLineWidth += charWidth;
      }
    }
    
    // 添加最后一行
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  const addMarkingElements = (questions: QuestionInfo[], scaleX: number, scaleY: number, displayWidth: number) => {
    const elements: any[] = [];
    let subjectiveY = 20; // 用于定位右侧批注信息的y轴位置

    questions.forEach((question, qIndex) => {
      // 针对客观题，添加所有题目的正确错误标记，以及错误题目的文字批注
      if (question.question_type === 'objective') {
        question.answer_steps.forEach((step) => {
          const [x1, y1, x2, y2] = step.answer_location;
          const scaledX1 = x1 * scaleX;
          const scaledY1 = y1 * scaleY;
          const scaledX2 = x2 * scaleX;
          const scaledY2 = y2 * scaleY;
          const width = scaledX2 - scaledX1;
          const height = scaledY2 - scaledY1;

          // 针对正确题目添加绿色对勾标记
          if (step.is_correct) {
            const centerX = scaledX1 + width / 2;
            const centerY = scaledY1 + height ;
            const checkSize = Math.min(width, height) * 0.5;
            // 生成唯一 groupId，用于对钩的line的合并操作
            // const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`; 
            /*
            elements.push(...[
              {
                type: 'line',
                x: centerX - checkSize * 0.6,
                y: centerY - checkSize * 0.6,
                points: [[0, 0], [checkSize * 0.6, checkSize * 0.6],[checkSize * 1.8, checkSize * -0.6]],
                strokeColor: COLORS.CORRECT,
                strokeWidth: 4,
                groupIds: [groupId],
              },
              {
                type: 'line',
                x: centerX,
                y: centerY - checkSize * 0.0,
                points: [[0, 0], [checkSize * 1.0, -checkSize * 1.0]],
                strokeColor: COLORS.CORRECT,
                strokeWidth: 4,
                groupIds: [groupId],
              }
            ]);

            */

            
            // 绿色对勾
            elements.push({
              type: 'line',
              x: centerX - checkSize * 0.8,
              y: centerY - checkSize * 0.6,
              points: [[0, 0], [checkSize * 0.6, checkSize * 0.6],[checkSize * 1.8, checkSize * -0.6]],
              strokeColor: 'green',
              strokeWidth: 4,
            });
            /*
            // 对勾的第二段（中间到右上）
            elements.push({
              type: 'line',
              x: centerX,
              y: centerY - checkSize * 0.0,
              // width: checkSize * 0.4,
              // height: -checkSize * 0.2,
              points: [[0, 0], [checkSize * 1.0, -checkSize * 1.0]],
              strokeColor: 'green',
              strokeWidth: 4,
              // roughness: 0,
              // fillStyle: 'solid'
            });
            */

            
          } else {
            // 针对错误题目添加红色圆圈
            elements.push({
              type: 'ellipse',
              x: scaledX1,
              y: scaledY1,
              width: width,
              height: height,
              strokeColor: 'red',
              backgroundColor: 'transparent',
              strokeWidth: 3,
              // fillStyle: 'solid',
              // roughness: 0
            });

            // 添加错误客观题的题号文本
            elements.push({
                type: 'text',
                x: displayWidth + 20,  // 放置在图片右侧
                y: subjectiveY,
                width: 300,
                height: 30,
                text: `题号: ${question.question_number} (客观题)`,
                fontSize: TEXT_CONFIG.QUESTION_FONT_SIZE,
                fontFamily: 0,
                textAlign: 'left',
                verticalAlign: 'top',
                strokeColor: '#333',
                
                fillStyle: 'solid'
              });
              subjectiveY += 20;


            // 添加错误客观题的批改分析文本（按固定宽度自动换行）
            const analysisText = step.analysis;
            const newlineCount = (analysisText.match(/\n/g) || []).length; // 统计\n数量
            const fontSizeNumber = TEXT_CONFIG.ANALYSIS_FONT_SIZE;
            const maxWidth = TEXT_CONFIG.ANALYSIS_MAX_WIDTH;
            
            // 根据固定宽度自动换行
            const lines = wrapTextByWidth(analysisText, maxWidth, fontSizeNumber);
            
            const textHeight = (lines.length + newlineCount)* fontSizeNumber * 1.25;
            const textContent = lines.join('\n');
            
            elements.push({
              type: 'text',
              x: displayWidth + 20, //scaledX1,
              y: subjectiveY + 20, //scaledY1 - textHeight - 5,
              width: maxWidth,
              height: textHeight,
              text: textContent,
              fontSize: fontSizeNumber,
              fontFamily: 0,
              textAlign: 'left',
              verticalAlign: 'top',
              strokeColor: 'red',
              backgroundColor: 'rgba(255,255,255,0.9)',
              fillStyle: 'solid'
            });

            subjectiveY += textHeight + 40;
          }

          
        });
      } else if (question.question_type === 'subjective') {
        // 添加主观题的题号文本
        elements.push({
          type: 'text',
          x: displayWidth + 20,  // 放置在图片右侧
          y: subjectiveY,
          width: 300,
          height: 30,
                text: `题号: ${question.question_number} (主观题)`,
                fontSize: TEXT_CONFIG.QUESTION_FONT_SIZE,
          fontFamily: 0,
          textAlign: 'left',
          verticalAlign: 'top',
          strokeColor: '#333',
          fillStyle: 'solid'
        });
        subjectiveY += 20;

        // 针对每个步骤添加批改结果文本和标记
        question.answer_steps.forEach((step) => {

            const [x1, y1, x2, y2] = step.answer_location;
            const scaledX1 = x1 * scaleX;
            const scaledY1 = y1 * scaleY;
            const scaledX2 = x2 * scaleX;
            const scaledY2 = y2 * scaleY;
            const width = scaledX2 - scaledX1;
            const height = scaledY2 - scaledY1;

            if (step.is_correct) {
              // 增加步骤序号
              elements.push({
                type: 'text',
                x: scaledX1,
                y: scaledY1 + height - 30,
                text: `(${step.step_id})`,
                strokeColor: COLORS.WARNING,
                fontSize: TEXT_CONFIG.QUESTION_FONT_SIZE,
                fontFamily: 0,
              });
            //  针对正确步骤添加绿色下划线
            elements.push({
                type: 'line',
                x: scaledX1 ,
                y: scaledY1 + height,
                points: [[0, 0], [width, 0]],
                strokeColor: COLORS.WARNING,
                strokeWidth: 4,
                
                // fillStyle: 'solid',
                // roughness: 0
              });

            } else  {
                // 增加步骤序号
                elements.push({
                  type: 'text',
                  x: scaledX1,
                  y: scaledY1 + height - 30,
                  text: `(${step.step_id}) `,
                  strokeColor: COLORS.ERROR,
                  fontSize: TEXT_CONFIG.QUESTION_FONT_SIZE,
                  fontFamily: 0,
                });

              // 针对错误步骤添加红色下划线
                elements.push({
                    type: 'line',
                    x: scaledX1 ,
                    y: scaledY1 + height,
                    points: [[0, 0], [width, 0]],
                    strokeColor: COLORS.ERROR,
                    strokeWidth: 4,
                    
                    // fillStyle: 'solid',
                    // roughness: 0
                  });
            }

            // 添加错误步骤的批改分析文本（按固定宽度自动换行）
            const analysisText = `(${step.step_id}) ` + step.analysis;
            const newlineCount = (analysisText.match(/\n/g) || []).length; // 统计\n数量
            const fontSizeNumber = TEXT_CONFIG.ANALYSIS_FONT_SIZE;
            const maxWidth = TEXT_CONFIG.ANALYSIS_MAX_WIDTH;

            // 根据固定宽度自动换行
            const lines = wrapTextByWidth(analysisText, maxWidth, fontSizeNumber);

            const textHeight = (lines.length + newlineCount)* fontSizeNumber * 1.25;
            const textContent = lines.join('\n');

          elements.push({
            type: 'text',
            x: displayWidth + 20,
            y: subjectiveY + 20 ,
            width: maxWidth,
            height: textHeight,
            text: textContent,
            fontSize: fontSizeNumber,
            fontFamily: 0,
            textAlign: 'left',
            verticalAlign: 'top',
            strokeColor: step.is_correct ? COLORS.WARNING : COLORS.ERROR,
            fillStyle: 'solid'
          });
          // 更新Y坐标：为下一个文本元素预留位置
          subjectiveY += textHeight + 10;
        });

        subjectiveY += 40; // 题间间距
      }
    });

    return elements;
  };

  const handlePrevious = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      // 切换图片时重置状态
      setHasChanges(false);
      setHasExported(false);
      setInitialElementCount(0);
    }
  };

  const handleNext = () => {
    if (currentImageIndex < gradeDataList.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      // 切换图片时重置状态
      setHasChanges(false);
      setHasExported(false);
      setInitialElementCount(0);
    }
  };

  const handleExport = async () => {
    if (!excalidrawAPI || !selectedFieldId) return;

    setIsExporting(true);
    
    const result = await exportExcalidrawToAttachment({
      excalidrawAPI,
      selectedFieldId,
      fileNamePrefix: EXPORT_FILE_PREFIX.GRADE,
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
    // 如果元素数量大于初始数量（图片+标记），说明用户添加了新内容
    if (initialElementCount > 0 && elements && elements.length > initialElementCount) {
      setHasChanges(true);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return (
      <div className="error-message">{error}</div>
    );
  }

  if (gradeDataList.length === 0) {
    return (
      <div className="empty-message">没有批改数据</div>
    );
  }

  return (
    <div className="grade-excalidraw-preview">
      <div className="preview-header">
        <div className="header-left">
          <button className="btn btn-sm btn-outline-secondary" onClick={handleBack}>
            ← 返回
          </button>
          {recordTitle && (
            <div className="record-title-wrapper ms-2">
              <span className="record-title">{recordTitle}</span>
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
                  }, 500); // 延迟 0.5 秒隐藏
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
          <select 
            className="form-select form-select-sm me-2"
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            {attachmentFields.map(field => (
              <option key={field.id} value={field.id}>{field.name}</option>
            ))}
          </select>
          <button 
            className="btn btn-sm btn-primary"
            onClick={handleExport}
            disabled={isExporting || !selectedFieldId}
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
