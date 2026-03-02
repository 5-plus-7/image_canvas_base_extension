/**
 * Excalidraw 标记元素构建工具
 * 用于在批改预览中生成对勾、叉号、椭圆、题号和分析文本等标记元素
 */

import { TEXT_CONFIG } from '../constants';
import { wrapTextByWidth } from './textWrap';

interface AnswerStep {
  step_id: number;
  student_answer: string;
  analysis: string;
  is_correct: boolean;
  answer_location: [number, number, number, number];
  models_consistent: boolean;
  qwen_result: {
    student_answer: string;
    analysis: string;
    is_correct: boolean;
  };
}

interface QuestionInfo {
  question_number: string;
  question_type: string;
  question_text: string;
  answer_steps: AnswerStep[];
}

/** 创建对勾标记元素 */
function createCheckmark(centerX: number, centerY: number, checkSize: number): any {
  return {
    type: 'line',
    x: centerX - checkSize,
    y: centerY - checkSize,
    points: [
      [0, 0],
      [checkSize * 0.20, checkSize * 0.30],
      [checkSize * 0.45, checkSize * 0.60],
      [checkSize * 0.65, checkSize * 0.80],
      [checkSize * 0.90, checkSize * 0.95],
      [checkSize * 1.10, checkSize * 0.85],
      [checkSize * 1.30, checkSize * 0.70],
      [checkSize * 1.60, checkSize * 0.45],
      [checkSize * 1.95, checkSize * 0.05],
      [checkSize * 2.40, -checkSize * 0.70],
      [checkSize * 3.20, -checkSize * 2.40],
    ],
    strokeColor: 'red',
    strokeWidth: 4,
    roughness: 1.4,
  };
}

/** 创建椭圆标记元素 */
function createEllipseMarker(
  scaledX1: number, scaledY1: number,
  width: number, height: number,
  displayWidth: number, baseScale: number
): any {
  const maxWidthForScale = 0.7 * displayWidth;
  const scaleFactor = 1 + (baseScale - 1) * Math.max(0, (maxWidthForScale - width) / maxWidthForScale);
  // 缩小为 80%，保持中心点不变（原始中心偏移 0.3，80% 后偏移 0.1）
  return {
    type: 'ellipse',
    x: scaledX1 - width * scaleFactor * 0.1,
    y: scaledY1 - height * scaleFactor * 0.1,
    width: width * scaleFactor * 0.8,
    height: height * scaleFactor * 0.8,
    strokeColor: 'red',
    backgroundColor: 'transparent',
    strokeWidth: 3,
    roughness: 1.4,
  };
}

/** 创建叉号标记元素（返回 2 个 line 元素） */
function createXMark(
  scaledX1: number, scaledY1: number,
  width: number, height: number,
  displayWidth: number
): any[] {
  const baseScale = 1.2;
  const maxWidthForScale = 0.7 * displayWidth;
  const scaleFactor = 1 + (baseScale - 1) * Math.max(0, (maxWidthForScale - width) / maxWidthForScale);
  const boxWidth = Math.min(0.1 * displayWidth, width * scaleFactor);
  const boxHeight = Math.min(0.1 * displayWidth, height * scaleFactor);
  const boxX = scaledX1 + width * scaleFactor * 0.1;
  const boxY = scaledY1 - boxHeight * 0.2;

  return [
    {
      type: 'line',
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      points: [[0, 0], [boxWidth, boxHeight]],
      strokeColor: 'red',
      backgroundColor: 'transparent',
      strokeWidth: 3,
      roughness: 1.4,
    },
    {
      type: 'line',
      x: boxX + boxWidth,
      y: boxY,
      width: -boxWidth,
      height: boxHeight,
      points: [[0, 0], [-boxWidth, boxHeight]],
      strokeColor: 'red',
      backgroundColor: 'transparent',
      strokeWidth: 3,
      roughness: 1.4,
    },
  ];
}

/** 创建题号文本元素 */
function createQuestionTitle(
  questionNumber: string, displayWidth: number,
  rightMargin: number, y: number,
  analysisMaxWidth: number, questionFontSize: number
): any {
  return {
    type: 'text',
    x: displayWidth + rightMargin,
    y,
    width: analysisMaxWidth,
    height: questionFontSize * 1.5,
    text: `题号: ${questionNumber} `,
    fontSize: questionFontSize,
    fontFamily: 0,
    textAlign: 'left',
    verticalAlign: 'top',
    strokeColor: '#333',
    fillStyle: 'solid',
  };
}

/** 创建分析文本矩形框元素 */
function createAnalysisBox(
  id: string, displayWidth: number, rightMargin: number,
  y: number, analysisMaxWidth: number,
  textHeight: number, analysisText: string,
  analysisFontSize: number, analysisSpacing: number
): any {
  return {
    id,
    type: 'rectangle',
    x: displayWidth + rightMargin,
    y: y + analysisSpacing,
    width: analysisMaxWidth,
    height: textHeight,
    strokeColor: 'transparent',
    backgroundColor: 'transparent',
    label: {
      text: analysisText,
      strokeColor: 'red',
      fontSize: analysisFontSize,
      textAlign: 'left',
      verticalAlign: 'top',
    },
  };
}

/**
 * 根据批改数据生成 Excalidraw 标记元素
 * @param questions 题目信息列表
 * @param scaleX X轴缩放比例（显示宽度/原图宽度）
 * @param scaleY Y轴缩放比例（显示高度/原图高度）
 * @param displayWidth 显示区域宽度
 * @returns Excalidraw 元素数组
 */
export function addMarkingElements(
  questions: QuestionInfo[],
  scaleX: number,
  scaleY: number,
  displayWidth: number
): any[] {
  const elements: any[] = [];

  const questionFontSize = displayWidth * TEXT_CONFIG.QUESTION_FONT_SIZE_RATIO;
  const analysisFontSize = displayWidth * TEXT_CONFIG.ANALYSIS_FONT_SIZE_RATIO;
  const analysisMaxWidth = displayWidth * TEXT_CONFIG.ANALYSIS_MAX_WIDTH_RATIO;
  const questionSpacing = displayWidth * TEXT_CONFIG.QUESTION_SPACING_RATIO;
  const analysisSpacing = displayWidth * TEXT_CONFIG.ANALYSIS_SPACING_RATIO;
  const rightMargin = displayWidth * 0.025;

  let subjectiveY = 20;
  const addedQuestionTitles = new Set<string>();

  questions.forEach((question, qIndex) => {
    let hasAnalysisText = false;

    if (question.question_type && question.answer_steps.length > 0) {
      question.answer_steps.forEach((step) => {
        const [x1, y1, x2, y2] = step.answer_location;
        const scaledX1 = x1 * scaleX;
        const scaledY1 = y1 * scaleY;
        const scaledX2 = x2 * scaleX;
        const scaledY2 = y2 * scaleY;
        const width = scaledX2 - scaledX1;
        const height = scaledY2 - scaledY1;

        // 两个模型都判对 → 只添加对勾，无需分析文本
        if (step.is_correct && step.models_consistent) {
          const centerX = scaledX1 + width / 2;
          const centerY = scaledY1 + height;
          const checkSize = 0.75 * Math.min(
            0.12 * displayWidth,
            Math.max(0.2 * (width + height), 0.6 * Math.min(width, height), 0.04 * displayWidth)
          );
          elements.push(createCheckmark(centerX, centerY, checkSize * 0.8));
          return;
        }

        // 其他情况：需要标记形状 + 题号 + 分析文本
        // 选择题/填空题：两模型都判错 → 叉号；仅一个判对 → 圈号
        // 其他题型：统一使用圈号
        const isObjective = question.question_type === '选择题' || question.question_type === '填空题';
        const needsXMark = isObjective && !step.is_correct && step.models_consistent;

        // 1. 添加标记形状
        if (needsXMark) {
          elements.push(...createXMark(scaledX1, scaledY1, width, height, displayWidth));
        } else {
          elements.push(createEllipseMarker(scaledX1, scaledY1, width, height, displayWidth, 2.0));
        }

        // 2. 添加题号文本（每题只添加一次）
        if (!addedQuestionTitles.has(question.question_number)) {
          elements.push(createQuestionTitle(
            question.question_number, displayWidth, rightMargin,
            subjectiveY, analysisMaxWidth, questionFontSize
          ));
          subjectiveY += questionSpacing;
          addedQuestionTitles.add(question.question_number);
        }

        // 3. 添加分析文本
        // 模型不一致且判对时使用 qwen 结果，其他情况使用默认分析
        const analysis = (step.is_correct && !step.models_consistent)
          ? (step.qwen_result?.analysis || step.analysis || '')
          : (step.analysis || '');

        const hasMultipleSteps = question.answer_steps.length > 1;
        const analysisText = hasMultipleSteps
          ? `(${step.step_id}) ${analysis}`
          : analysis;

        const newlineCount = (analysisText.match(/\n/g) || []).length;
        const lines = wrapTextByWidth(analysisText, analysisMaxWidth, analysisFontSize);
        const textHeight = (lines.length + newlineCount) * analysisFontSize * TEXT_CONFIG.LINE_HEIGHT_RATIO;

        elements.push(createAnalysisBox(
          `analysis_box_${qIndex}_${step.step_id}_red`,
          displayWidth, rightMargin, subjectiveY,
          analysisMaxWidth, textHeight, analysisText,
          analysisFontSize, analysisSpacing
        ));

        subjectiveY += textHeight + analysisSpacing;
        hasAnalysisText = true;
      });
    }

    if (hasAnalysisText) {
      subjectiveY += analysisSpacing;
    }
  });

  return elements;
}
