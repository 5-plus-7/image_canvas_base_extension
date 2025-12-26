import React, { useState, useEffect } from 'react';
import './GradeQueryPage.scss';

interface GradeQueryPageProps {
  onViewResult: (environment: string, recordId: string, gradeData: any) => void;
}

export const GradeQueryPage: React.FC<GradeQueryPageProps> = ({ onViewResult }: GradeQueryPageProps) => {
  const [environment, setEnvironment] = useState<string>('test');
  const [recordId, setRecordId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 从URL参数中获取初始值
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const envParam = urlParams.get('env');
    const taskIdParam = urlParams.get('taskId');
    
    if (envParam && (envParam === 'test' || envParam === 'production')) {
      setEnvironment(envParam);
    }
    
    if (taskIdParam) {
      setRecordId(taskIdParam);
    }
  }, []);

  /**
   * 处理输入值：提取非零后缀并转换为数字
   * 例如：P00001259 -> 1259
   * 逻辑：找到从右往左第一个非零数字，然后从该位置往左找到连续的数字段（包括该非零数字及其后面的所有数字）
   */
  const processInputValue = (input: string): string => {
    // 只保留字母和数字
    const alphanumericOnly = input.replace(/[^a-zA-Z0-9]/g, '');
    
    // 如果输入为空，直接返回
    if (!alphanumericOnly) {
      return '';
    }

    // 从右往左查找第一个非零数字（1-9）的位置
    let firstNonZeroFromRight = -1;
    for (let i = alphanumericOnly.length - 1; i >= 0; i--) {
      const char = alphanumericOnly[i];
      if (char >= '1' && char <= '9') {
        firstNonZeroFromRight = i;
        break;
      }
    }

    // 如果没有找到非零数字，返回原值（可能是纯字母或全零）
    if (firstNonZeroFromRight === -1) {
      return alphanumericOnly;
    }

    // 从第一个非零数字位置往左查找连续的数字段开始位置
    // 找到第一个非数字字符或字符串开始的位置
    let suffixStart = firstNonZeroFromRight;
    for (let i = firstNonZeroFromRight - 1; i >= 0; i--) {
      const char = alphanumericOnly[i];
      if (char >= '0' && char <= '9') {
        suffixStart = i;
      } else {
        // 遇到非数字字符，停止
        break;
      }
    }

    // 提取从suffixStart到末尾的所有字符
    // 例如：P00001259 -> suffixStart=5（字符'1'），提取 "1259"
    const suffix = alphanumericOnly.substring(suffixStart);
    
    // 提取后缀中的纯数字部分（去掉所有字母）
    const numericSuffix = suffix.replace(/[^0-9]/g, '');
    if (numericSuffix) {
      // 将数字字符串转换为数字（自动去掉前导零），然后再转回字符串
      const numValue = parseInt(numericSuffix, 10);
      if (!isNaN(numValue) && numValue > 0) {
        return numValue.toString();
      }
    }

    // 如果无法提取数字，返回原始后缀（可能包含字母）
    return suffix;
  };

  /**
   * 处理输入变化：限制只能输入字母和数字
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // 只允许字母和数字
    const filteredValue = inputValue.replace(/[^a-zA-Z0-9]/g, '');
    setRecordId(filteredValue);
  };

  /**
   * 处理输入失去焦点：自动处理输入值
   */
  const handleInputBlur = () => {
    if (recordId) {
      const processed = processInputValue(recordId);
      if (processed !== recordId) {
        setRecordId(processed);
      }
    }
  };

  const handleViewResult = async () => {
    if (!recordId.trim()) {
      setError('请输入ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 处理输入值：提取非零后缀并转换为数字
      const processedRecordId = processInputValue(recordId.trim());
      
      // 调用后端API获取批改结果
      const apiUrl = (import.meta.env?.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/grade-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environment,
          record_id: processedRecordId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '请求失败' }));
        throw new Error(errorData.message || `请求失败: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.message || '获取批改结果失败');
      }

      // 解析JSON数据
      let gradeData;
      try {
        gradeData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      } catch (parseError) {
        throw new Error('批改结果数据格式错误，无法解析JSON');
      }

      // 使用处理后的recordId
      onViewResult(environment, processedRecordId, gradeData);
    } catch (err: any) {
      console.error('Error fetching grade data:', err);
      setError(err.message || '获取批改结果时出错，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleViewResult();
    }
  };

  return (
    <div className="grade-query-page">
      <div className="query-container">
        <div className="query-header">
          <h1>批改结果查询</h1>
        </div>
        
        <div className="query-form">
          <div className="form-group">
            <label htmlFor="environment">环境选择</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="environment"
                  value="test"
                  checked={environment === 'test'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnvironment(e.target.value)}
                />
                <span>测试环境</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="environment"
                  value="production"
                  checked={environment === 'production'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnvironment(e.target.value)}
                />
                <span>线上环境</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="recordId">任务ID</label>
            <input
              id="recordId"
              type="text"
              className="form-input"
              value={recordId}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyPress={handleKeyPress}
              placeholder="请输入批改任务ID"
              disabled={loading}
              pattern="[a-zA-Z0-9]*"
              inputMode="text"
            />
            <small style={{color: '#666', fontSize: '12px', marginTop: '4px', display: 'block'}}>
              请输入批改任务ID
            </small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            className="btn-view-result"
            onClick={handleViewResult}
            disabled={loading || !recordId.trim()}
          >
            {loading ? '加载中...' : '查看结果'}
          </button>
        </div>
      </div>
    </div>
  );
};

