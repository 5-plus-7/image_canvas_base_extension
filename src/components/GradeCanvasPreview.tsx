import React, { useState, useEffect, useRef } from 'react';
import { bitable, ITextField, FieldType } from '@lark-base-open/js-sdk';
import './GradeCanvasPreview.scss';

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

export const GradeCanvasPreview: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [gradeDataList, setGradeDataList] = useState<GradeData[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageScale, setImageScale] = useState<number>(1);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  useEffect(() => {
    loadGradeData();
  }, []);

  useEffect(() => {
    if (imageLoaded && gradeDataList.length > 0) {
      drawMarkings();
    }
  }, [currentImageIndex, imageLoaded, gradeDataList]);

  const loadGradeData = async () => {
    try {
      setLoading(true);
      const selection = await bitable.base.getSelection();
      if (!selection.recordId || !selection.tableId) {
        setError('请先选择一个记录');
        setLoading(false);
        return;
      }

      const table = await bitable.base.getTableById(selection.tableId);
      
      // 查找"自动批改结果参考"字段
      const fieldMetaList = await table.getFieldMetaList();
      const gradeField = fieldMetaList.find(field => field.name === '自动批改结果参考');
      
      if (!gradeField) {
        setError('未找到"自动批改结果参考"字段');
        setLoading(false);
        return;
      }

      const textField = await table.getField<ITextField>(gradeField.id);
      const value = await textField.getValue(selection.recordId);
      
      // ITextField.getValue returns IOpenSegment[], need to convert to string
      const valueStr = Array.isArray(value) 
        ? value.map(seg => seg.text || '').join('') 
        : String(value || '');
      
      if (!valueStr || valueStr.trim() === '') {
        setError('当前记录的"自动批改结果参考"字段为空');
        setLoading(false);
        return;
      }

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
    } catch (err) {
      console.error('Error loading grade data:', err);
      setError('加载批改数据时出错');
    } finally {
      setLoading(false);
    }
  };

  const drawMarkings = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || gradeDataList.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentData = gradeDataList[currentImageIndex];
    if (!currentData) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 计算缩放比例
    const scaleX = canvas.width / image.naturalWidth;
    const scaleY = canvas.height / image.naturalHeight;
    const scale = Math.min(scaleX, scaleY);

    // 绘制标记
    currentData.questions_info.forEach(question => {
      if (question.question_type === 'objective') {
        question.answer_steps.forEach(step => {
          const [x1, y1, x2, y2] = step.answer_location;
          const scaledX1 = x1 * scale;
          const scaledY1 = y1 * scale;
          const scaledX2 = x2 * scale;
          const scaledY2 = y2 * scale;
          const width = scaledX2 - scaledX1;
          const height = scaledY2 - scaledY1;

          // 绘制标记
          ctx.save();
          if (step.is_correct) {
            // 绿色对勾
            ctx.strokeStyle = '#52c41a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(scaledX1 + width * 0.2, scaledY1 + height * 0.5);
            ctx.lineTo(scaledX1 + width * 0.45, scaledY1 + height * 0.8);
            ctx.lineTo(scaledX1 + width * 0.8, scaledY1 + height * 0.2);
            ctx.stroke();
          } else {
            // 红色圆圈
            ctx.strokeStyle = '#ff4d4f';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
              scaledX1 + width / 2,
              scaledY1 + height / 2,
              Math.min(width, height) / 2 - 5,
              0,
              Math.PI * 2
            );
            ctx.stroke();
          }
          ctx.restore();

          // 绘制批注文本背景
          const textY = scaledY1 - 10;
          if (textY > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(scaledX1, textY - 20, Math.max(width, 200), 20);
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.fillText(step.analysis.substring(0, 30) + '...', scaledX1 + 5, textY - 5);
            ctx.restore();
          }
        });
      }
    });
  };

  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    // 设置画布尺寸
    const maxWidth = 1200;
    const maxHeight = 800;
    const scaleX = maxWidth / image.naturalWidth;
    const scaleY = maxHeight / image.naturalHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    canvas.width = image.naturalWidth * scale;
    canvas.height = image.naturalHeight * scale;
    setImageScale(scale);
    setImageLoaded(true);
  };

  const handlePrevious = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setImageLoaded(false);
    }
  };

  const handleNext = () => {
    if (currentImageIndex < gradeDataList.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setImageLoaded(false);
    }
  };

  const handleExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const selection = await bitable.base.getSelection();
        if (!selection.recordId || !selection.tableId) {
          alert('请先选择一个记录');
          return;
        }

        const table = await bitable.base.getTableById(selection.tableId);
        const fieldMetaList = await table.getFieldMetaList();
        const attachmentFields = fieldMetaList.filter(f => f.type === FieldType.Attachment);
        
        if (attachmentFields.length === 0) {
          alert('未找到附件字段');
          return;
        }

        // 使用第一个附件字段
        const attachmentField = await table.getField(attachmentFields[0].id);
        const file = new File([blob], `grade-${Date.now()}.png`, { type: 'image/png' });
        const currentAttachments = await attachmentField.getValue(selection.recordId) || [];
        await attachmentField.setValue(selection.recordId, [...currentAttachments, file]);
        
        alert('导出成功');
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('导出失败，请重试');
    }
  };

  const currentData = gradeDataList[currentImageIndex];
  const subjectiveQuestions = currentData?.questions_info.filter(q => q.question_type === 'subjective') || [];

  if (loading) {
    return (
      <div className="grade-canvas-preview">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grade-canvas-preview">
        <div className="error-message">{error}</div>
        <button className="btn btn-primary mt-3" onClick={onBack}>返回</button>
      </div>
    );
  }

  if (gradeDataList.length === 0) {
    return (
      <div className="grade-canvas-preview">
        <div className="empty-message">没有批改数据</div>
        <button className="btn btn-primary mt-3" onClick={onBack}>返回</button>
      </div>
    );
  }

  return (
    <div className="grade-canvas-preview">
      <div className="preview-header">
        <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>
          ← 返回
        </button>
        <div className="header-actions">
          {gradeDataList.length > 1 && (
            <div className="image-nav me-3">
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={handlePrevious}
                disabled={currentImageIndex === 0}
              >
                ‹ 上一张
              </button>
              <span className="nav-indicator mx-2">
                {currentImageIndex + 1} / {gradeDataList.length}
              </span>
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={handleNext}
                disabled={currentImageIndex === gradeDataList.length - 1}
              >
                下一张 ›
              </button>
            </div>
          )}
          <button className="btn btn-sm btn-primary" onClick={handleExport}>
            导出
          </button>
        </div>
      </div>

      <div className="preview-content">
        <div className="canvas-container">
          <div className="image-wrapper">
            <img
              ref={imageRef}
              src={currentData?.image_url}
              alt="Grade preview"
              onLoad={handleImageLoad}
              style={{ display: imageLoaded ? 'block' : 'none' }}
            />
            {!imageLoaded && <div className="loading">加载图片中...</div>}
            <canvas
              ref={canvasRef}
              className="marking-canvas"
              style={{ display: imageLoaded ? 'block' : 'none' }}
            />
          </div>

          {subjectiveQuestions.length > 0 && (
            <div className="subjective-panel">
              <div className="panel-title">主观题批注</div>
              {subjectiveQuestions.map((question, index) => (
                <div key={index} className="question-item">
                  <div className="question-number">题号: {question.question_number}</div>
                  {question.answer_steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="step-item">
                      <div className={`step-status ${step.is_correct ? 'correct' : 'incorrect'}`}>
                        {step.is_correct ? '✓' : '✗'}
                      </div>
                      <div className="step-analysis">{step.analysis}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

