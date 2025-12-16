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
  models_consistent: boolean;
  qwen_result: {
    student_answer: string;
    analysis: string;
    is_correct: boolean;
  };

}

interface QuestionInfo {
  question_number: string;
  question_type:
    | '选择题'
    | '判断题'
    | '填空题'
    | '解答题'
    | '应用题'
    | '作文题'
    | '连线题'
    | '作图题'
    | '其他';
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

  // 根据 URL 后缀猜测 MIME
  const guessMimeFromUrl = (url: string): string | undefined => {
    const lower = url.split('?')[0].toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.bmp')) return 'image/bmp';
    return undefined;
  };

  // 带重试的图片加载，校验 Content-Type
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

  const blobToDataURL = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('图片读取失败，请检查图片格式'));
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

  const getImageSize = (dataURL: string) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片格式无效或已损坏'));
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = dataURL;
    });

  const loadCurrentImageAndMarkings = async () => {
    const currentData = gradeDataList[currentImageIndex];
    if (!currentData || !currentData.image_url) return;

    try {
      const imageBlob = await loadImageWithRetry(currentData.image_url);
      const dataURL = await blobToDataURL(imageBlob);
      const { width: imageWidth, height: imageHeight } = await getImageSize(dataURL);

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

      import('@excalidraw/excalidraw')
        .then((module: any) => {
          const { convertToExcalidrawElements, MIME_TYPES } = module;
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
            const fixedEl = {
              ...el,
              locked: false,
              points:
                el.points || (el.type === 'arrow' ? [[0, 0], [el.width || 0, el.height || 0]] : []),
              strokeStyle: el.strokeStyle || 'solid',
              fillStyle: el.fillStyle || 'solid',
            };

            if (fixedEl.type === 'arrow' && Array.isArray(fixedEl.points)) {
              fixedEl.points = fixedEl.points.map((p: any) => (Array.isArray(p) ? p : [0, 0]));
            }

            return fixedEl;
          });

          excalidrawAPI.updateScene({
            elements: allElements,
          });

          setInitialElementCount(allElements.length);
          setHasChanges(false);

          setTimeout(() => {
            excalidrawAPI.scrollToContent(imageElement[0], {
              fitToViewport: true,
            });
          }, 100);
        })
        .catch((err) => {
          console.error('Error loading Excalidraw module:', err);
          setError('加载画布模块失败');
        });
    } catch (error: any) {
      console.error('加载图片失败:', error);
      const errorMessage = error?.message || '加载图片时出错';
      if (errorMessage.includes('CORS')) {
        setError('图片加载失败：跨域访问被阻止，请联系管理员');
      } else if (errorMessage.includes('HTTP error')) {
        setError(`图片加载失败：服务器返回错误 (${errorMessage})`);
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError('图片加载失败：网络连接问题，请检查网络后重试');
      } else {
        setError(`图片加载失败：${errorMessage}`);
      }
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
    const spaceWidth = englishCharWidth * 0.5;
    const punctuationPattern = /[，。、“”‘’：《》＜＞<>（）()、；;：:，,.!?！？”“]/;
    const operatorPattern = /[+\-*/=^%]/;

    // 按中文单字、英文单词、空白、单个符号切分，保留所有字符
    const tokens = text.match(/([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]|[A-Za-z0-9]+|\s+|.)/g) || [];

    let currentLine = '';
    let currentLineWidth = 0;

    const getTokenWidth = (token: string) => {
      if (/^\s+$/.test(token)) return spaceWidth * token.length;
      if (/^[A-Za-z0-9]+$/.test(token)) return englishCharWidth * token.length;
      if (/^[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]$/.test(token)) return chineseCharWidth;
      return englishCharWidth; // 符号等
    };

    tokens.forEach((token) => {
      const isPunct = punctuationPattern.test(token) || operatorPattern.test(token);
      const isSpace = /^\s+$/.test(token);
      const tokenWidth = getTokenWidth(token);

      // 不让行首出现空白
      if (isSpace && currentLineWidth === 0) {
        return;
      }

      // 如果行首遇到标点/运算符且已有上一行，则附加到上一行末尾
      if (isPunct && currentLineWidth === 0 && lines.length > 0) {
        lines[lines.length - 1] += token;
        return;
      }

      const wouldExceed = currentLineWidth + tokenWidth > maxWidth;

      if (wouldExceed && currentLineWidth > 0) {
        lines.push(currentLine);
        currentLine = '';
        currentLineWidth = 0;
      }

      currentLine += token;
      currentLineWidth += tokenWidth;
    });

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  };

  const addMarkingElements = (questions: QuestionInfo[], scaleX: number, scaleY: number, displayWidth: number) => {
    const elements: any[] = [];
    let subjectiveY = 20; // 用于定位右侧批注信息的y轴位置
    const addedQuestionTitles = new Set<string>(); // 记录已添加题号文本的题目，避免重复

    questions.forEach((question, qIndex) => {
      let hasAnalysisText = false; // 标记本题是否添加过批改分析文本
      // 针对所有题目的正确错误标记，以及错误题目的文字批注
      if (question.question_type ) {
        question.answer_steps.forEach((step) => {
          const [x1, y1, x2, y2] = step.answer_location;
          const scaledX1 = x1 * scaleX;
          const scaledY1 = y1 * scaleY;
          const scaledX2 = x2 * scaleX;
          const scaledY2 = y2 * scaleY;
          const width = scaledX2 - scaledX1;
          const height = scaledY2 - scaledY1;

          // 针对正确题目添加绿色对勾标记 [两个模型都判对才展示对钩]
          if (step.is_correct && step.models_consistent) {
            const centerX = scaledX1 + width / 2;
            const centerY = scaledY1 + height ;
            const checkSize = 0.75 * Math.min(0.12 * displayWidth, Math.max(0.2 * (width+height),0.6 * Math.min(width,height),0.04 * displayWidth));
            /* 动态对钩尺寸：width<30 放大到 2x，width>400 缩到 0.5x
            const baseSize = (width + height) / 2;
            const t = Math.min(Math.max((width - 25) / (400 - 25), 0), 1); // 0~1 线性
            const scaleFactor = 0.7 - t * (0.7 - 0.2); // 2 -> 0.5
            const checkSize = baseSize * scaleFactor;
            */
            
            // 红色对勾
            elements.push({
              type: 'line',
              x: centerX - checkSize ,
              y: centerY - checkSize ,
              points: [
                [0, 0],
                [checkSize * 0.20,  checkSize * 0.30],
                [checkSize * 0.45,  checkSize * 0.60],
                [checkSize * 0.65,  checkSize * 0.80],
                [checkSize * 0.90,  checkSize * 0.95],
                [checkSize * 1.10,  checkSize * 0.85],  // 轻微回落
                [checkSize * 1.30,  checkSize * 0.70],
                [checkSize * 1.60,  checkSize * 0.45],
                [checkSize * 1.95,  checkSize * 0.05],
                [checkSize * 2.40, -checkSize * 0.70],
                [checkSize * 3.20, -checkSize * 2.40] 
              ],
              strokeColor: 'red',//'#52c41a', //'green',
              strokeWidth: 4,
              roughness: 1.4, // 略微抖动，模拟手写
            });
        
          } else if(step.is_correct && !step.models_consistent){
            
              // 豆包判对，qwen判错，用豆包结果
              const baseScale = 2.0;              // 原先最大放大倍数
              const maxWidthForScale = 0.7 * displayWidth;       // 低于此宽度才逐步放大
              const scaleFactor =
                1 + (baseScale - 1) * Math.max(0, (maxWidthForScale - width) / maxWidthForScale);
              // 宽度 >= 400 时系数收敛到 1，宽度越小系数越接近 1.5（可按需调整 400/1.5）

              elements.push({
                type: 'ellipse',
                x: scaledX1 - width  * scaleFactor * 0.2,
                y: scaledY1 - height  * scaleFactor * 0.2,
                width: width * scaleFactor,
                height: height * scaleFactor,
                strokeColor: 'purple',
                backgroundColor: 'transparent',
                strokeWidth: 3,
                roughness: 1.4,
              });

          

            // 添加错误的题号文本
            if (!addedQuestionTitles.has(question.question_number)) {
              elements.push({
                  type: 'text',
                  x: displayWidth + 20,  // 放置在图片右侧
                  y: subjectiveY,
                  width: 300,
                  height: 30,
                  text: `题号: ${question.question_number} `,
                  fontSize: TEXT_CONFIG.QUESTION_FONT_SIZE,
                  fontFamily: 0,
                  textAlign: 'left',
                  verticalAlign: 'top',
                  strokeColor: '#333',
                  
                  fillStyle: 'solid'
                });
                subjectiveY += 12;
                addedQuestionTitles.add(question.question_number);
            }


            // 添加错误客观题的批改分析文本（按固定宽度自动换行）
            // const analysisText = '(' + step.step_id + ') '  + step.analysis;
            const hasMultipleSteps = question.answer_steps.length > 1;
            const analysisText = hasMultipleSteps
            ? `(${step.step_id}) ${step.qwen_result.analysis}`
            : step.qwen_result.analysis;

            const newlineCount = (analysisText.match(/\n/g) || []).length; // 统计\n数量
            const fontSizeNumber = TEXT_CONFIG.ANALYSIS_FONT_SIZE; // 字体大小
            const maxWidth = TEXT_CONFIG.ANALYSIS_MAX_WIDTH; // 矩形框最大宽度
            const lines = wrapTextByWidth(analysisText, maxWidth, fontSizeNumber); // 按固定宽度自动换行，返回行数
            const textHeight = (lines.length + newlineCount) * fontSizeNumber * 1.25;  // 矩形框高度 = (行数 + 换行符 + 1) * 字体大小 * 行高系数1.25  行数+1是为了兼容一些自动换行导致的行数统计不准
            
            // 添加包含分析文本的矩形框
            elements.push({
              id: `analysis_box_${qIndex}_${step.step_id}_red`,
              type: 'rectangle',
              x: displayWidth + 20,
              y: subjectiveY + 20,
              width: maxWidth,
              height: textHeight,
              strokeColor: 'white',
              backgroundColor: 'transparent',
              label: {
                text: analysisText,
                strokeColor: "purple",
                fontSize: fontSizeNumber,
                textAlign: 'left',
                verticalAlign: 'top',
              },
            });

            subjectiveY += textHeight + 12;
            hasAnalysisText = true;


          }
            else if(!step.is_correct && !step.models_consistent){
               // 豆包判错，qwen判对，用豆包结果
               const baseScale = 2.0;              // 原先最大放大倍数
               const maxWidthForScale = 0.7 * displayWidth;       // 低于此宽度才逐步放大
               const scaleFactor =
                 1 + (baseScale - 1) * Math.max(0, (maxWidthForScale - width) / maxWidthForScale);
               // 宽度 >= 400 时系数收敛到 1，宽度越小系数越接近 1.5（可按需调整 400/1.5）
               
               elements.push({
                 type: 'ellipse',
                 x: scaledX1 - width  * scaleFactor * 0.2,
                 y: scaledY1 - height  * scaleFactor * 0.2,
                 width: width * scaleFactor,
                 height: height * scaleFactor,
                 strokeColor: 'orange',
                 backgroundColor: 'transparent',
                 strokeWidth: 3,
                 roughness: 1.4,
               });
   
               // 添加错误的题号文本
               if (!addedQuestionTitles.has(question.question_number)) {
                 elements.push({
                     type: 'text',
                     x: displayWidth + 20,  // 放置在图片右侧
                     y: subjectiveY,
                     width: 300,
                     height: 30,
                     text: `题号: ${question.question_number} `,
                     fontSize: TEXT_CONFIG.QUESTION_FONT_SIZE,
                     fontFamily: 0,
                     textAlign: 'left',
                     verticalAlign: 'top',
                     strokeColor: '#333',
                     
                     fillStyle: 'solid'
                   });
                   subjectiveY += 12;
                   addedQuestionTitles.add(question.question_number);
               }
   
   
               // 添加错误客观题的批改分析文本（按固定宽度自动换行）
               // const analysisText = '(' + step.step_id + ') '  + step.analysis;
               const hasMultipleSteps = question.answer_steps.length > 1;
               const analysisText = hasMultipleSteps
               ? `(${step.step_id}) ${step.analysis}`
               : step.analysis;
   
               const newlineCount = (analysisText.match(/\n/g) || []).length; // 统计\n数量
                const fontSizeNumber = TEXT_CONFIG.ANALYSIS_FONT_SIZE; // 字体大小
                const maxWidth = TEXT_CONFIG.ANALYSIS_MAX_WIDTH; // 矩形框最大宽度
                const lines = wrapTextByWidth(analysisText, maxWidth, fontSizeNumber); // 按固定宽度自动换行，返回行数
                const textHeight = (lines.length + newlineCount  ) * fontSizeNumber * 1.25;  // 矩形框高度 = (行数 + 换行符 + 1) * 字体大小 * 行高系数1.25  行数+1是为了兼容一些自动换行导致的行数统计不准
                
                // 添加包含分析文本的矩形框
                elements.push({
                  id: `analysis_box_${qIndex}_${step.step_id}_red`,
                  type: 'rectangle',
                  x: displayWidth + 20,
                  y: subjectiveY + 20,
                  width: maxWidth,
                  height: textHeight,
                  strokeColor: 'white',
                  backgroundColor: 'transparent',
                  label: {
                    text: analysisText,
                    strokeColor: "orange",
                    fontSize: fontSizeNumber,
                    textAlign: 'left',
                    verticalAlign: 'top',
                  },
                });
   
               subjectiveY += textHeight + 12;
               hasAnalysisText = true;
             
            }

            else {
            // 针对错误题目添加红色圆圈

            const baseScale = 2.0;              // 原先最大放大倍数
            const maxWidthForScale = 0.7 * displayWidth;       // 低于此宽度才逐步放大
            const scaleFactor =
              1 + (baseScale - 1) * Math.max(0, (maxWidthForScale - width) / maxWidthForScale);
            // 宽度 >= 400 时系数收敛到 1，宽度越小系数越接近 1.5（可按需调整 400/1.5）
            
            elements.push({
              type: 'ellipse',
              x: scaledX1 - width  * scaleFactor * 0.2,
              y: scaledY1 - height  * scaleFactor * 0.2,
              width: width * scaleFactor,
              height: height * scaleFactor,
              strokeColor: 'red',
              backgroundColor: 'transparent',
              strokeWidth: 3,
              roughness: 1.4,
            });

            // 添加错误的题号文本
            if (!addedQuestionTitles.has(question.question_number)) {
              elements.push({
                  type: 'text',
                  x: displayWidth + 20,  // 放置在图片右侧
                  y: subjectiveY,
                  width: 300,
                  height: 30,
                  text: `题号: ${question.question_number} `,
                  fontSize: TEXT_CONFIG.QUESTION_FONT_SIZE,
                  fontFamily: 0,
                  textAlign: 'left',
                  verticalAlign: 'top',
                  strokeColor: '#333',
                  
                  fillStyle: 'solid'
                });
                subjectiveY += 12;
                addedQuestionTitles.add(question.question_number);
            }


            // 添加批改分析文本

             // 是否有多步，多步骤前面加上步骤序号
            const hasMultipleSteps = question.answer_steps.length > 1;
            const analysisText = hasMultipleSteps
            ? `(${step.step_id}) ${step.analysis}`
            : step.analysis;

            const newlineCount = (analysisText.match(/\n/g) || []).length; // 统计\n数量
            const fontSizeNumber = TEXT_CONFIG.ANALYSIS_FONT_SIZE; // 字体大小
            const maxWidth = TEXT_CONFIG.ANALYSIS_MAX_WIDTH; // 矩形框最大宽度
            const lines = wrapTextByWidth(analysisText, maxWidth, fontSizeNumber); // 按固定宽度自动换行，返回行数
            const textHeight = (lines.length + newlineCount ) * fontSizeNumber * 1.25;  // 矩形框高度 = (行数 + 换行符 + 1) * 字体大小 * 行高系数1.25  行数+1是为了兼容一些自动换行导致的行数统计不准
            
            // 添加包含分析文本的矩形框
            elements.push({
              id: `analysis_box_${qIndex}_${step.step_id}_red`,
              type: 'rectangle',
              x: displayWidth + 20,
              y: subjectiveY + 20,
              width: maxWidth,
              height: textHeight,
              strokeColor: 'white',
              backgroundColor: 'transparent',
              label: {
                text: analysisText,
                strokeColor: "red",
                fontSize: fontSizeNumber,
                textAlign: 'left',
                verticalAlign: 'top',
              },
            });
            
            /*
            elements.push({
                type: 'text',
                // containerId: `analysis_box_${qIndex}_${step.step_id}_red`,
                x: displayWidth + 20, //scaledX1,
                y: subjectiveY + 20, //scaledY1 - textHeight - 5,
                width: maxWidth,
                height: textHeight,
                text: textContent,
                fontSize: fontSizeNumber,
                fontFamily: 0,
                textAlign: 'left',
                autoResize: true,
                verticalAlign: 'top',
                strokeColor: 'red',
                backgroundColor: 'rgba(255,255,255,0.9)',
                fillStyle: 'solid'
              });
              */

            // 增加间距，包含矩形框高度再加12像素
            
            subjectiveY += textHeight + 12;
            hasAnalysisText = true;

            
          }

          
        });
        // 
      } 
      
      if (hasAnalysisText) {
        subjectiveY += 20;  // 仅当本题有分析文本时增加题间间距
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
      <div className="grade-excalidraw-preview">
        <div className="status-message error">
          <div className="status-text">{error}</div>
          <button className="status-action-btn" onClick={onBack}>
            ← 返回
          </button>
        </div>
      </div>
    );
  }

  if (gradeDataList.length === 0) {
    return (
      <div className="grade-excalidraw-preview">
        <div className="status-message empty">
          <div className="status-text">没有批改数据</div>
          <button className="status-action-btn" onClick={onBack}>
            ← 返回
          </button>
        </div>
      </div>
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
          initialData={{
            appState: {
              currentItemStrokeColor: COLORS.ERROR, // 默认画笔/椭圆描边颜色：红色
            },
          }}
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
