import React, { useEffect, useRef, useState } from 'react';
import { Tldraw, Editor, TLUiOverrides, DefaultColorStyle } from 'tldraw';
import { bitable, FieldType } from '@lark-base-open/js-sdk';
import 'tldraw/tldraw.css';

// 添加CSS动画
const modalStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = modalStyles;
  document.head.appendChild(styleSheet);
}

interface CanvasProps {
  imageUrl: string;
  imageName: string;
  onClose: () => void;
  onExportToField?: (imageDataUrl: string, fieldName: string) => Promise<void>;
}

const Canvas: React.FC<CanvasProps> = ({ imageUrl, imageName, onClose, onExportToField }) => {
  const [app, setApp] = useState<Editor | null>(null);
  const [attachmentFields, setAttachmentFields] = useState<Array<{id: string, name: string}>>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 检测画板中是否有除了图片以外的元素
  const hasNonImageElements = (): boolean => {
    if (!app) return false;
    
    const shapes = app.getCurrentPageShapes();
    console.log('当前页面所有元素:', shapes);
    
    // 过滤出非图片元素
    const nonImageShapes = shapes.filter(shape => {
      // 图片元素的类型通常是 'image'，其他都是非图片元素
      return shape.type !== 'image';
    });
    
    console.log('非图片元素:', nonImageShapes);
    console.log('非图片元素数量:', nonImageShapes.length);
    
    return nonImageShapes.length > 0;
  };

  // 处理关闭按钮点击
  const handleClose = () => {
    if (hasNonImageElements()) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // 确认关闭
  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  // 取消关闭
  const handleCancelClose = () => {
    setShowCloseConfirm(false);
  };

  // 初始化画板并插入图片
  useEffect(() => {
    if (app && imageUrl) {
      console.log('tldraw 编辑器已准备就绪，准备插入图片');
      
      // 延迟插入图片，确保编辑器完全初始化
      setTimeout(async () => {
        try {
          console.log('开始插入图片:', imageUrl);
          
          // 先获取图片的原始尺寸
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            try {
              const originalWidth = img.width;
              const originalHeight = img.height;
              
              console.log('图片原始尺寸:', originalWidth, 'x', originalHeight);
              
              // 创建图片资源，使用原始尺寸
              const imageAsset = {
                id: `asset:${Date.now()}` as any, // 资产ID必须以"asset:"开头
                type: 'image' as const,
                typeName: 'asset' as const,
                meta: {},
                props: {
                  fileSize: originalWidth * originalHeight * 3, // 估算文件大小 (宽 * 高 * 3字节)
                  h: originalHeight,
                  isAnimated: false,
                  mimeType: 'image/png',
                  name: imageName,
                  src: imageUrl,
                  w: originalWidth,
                },
              };

              console.log('创建图片资源:', imageAsset);
              
              // 使用 createAssets 创建资源
              app.createAssets([imageAsset]);
              const assetId = imageAsset.id;
              
              if (assetId) {
                // 创建引用该资源的图片形状，使用原始尺寸
                const imageShape = {
                  type: 'image' as const,
                  x: 100,
                  y: 100,
                  props: {
                    assetId: assetId,
                    w: originalWidth,
                    h: originalHeight,
                    playing: true,
                  },
                };

                console.log('创建图片形状:', imageShape);
                app.createShapes([imageShape]);
                
                // 选中并居中显示
                setTimeout(() => {
                  app.zoomToFit();
                }, 100);
                
                console.log('图片插入成功，保持原始尺寸:', originalWidth, 'x', originalHeight);
              } else {
                console.error('创建图片资源失败');
              }
            } catch (error) {
              console.error('处理图片尺寸失败:', error);
            }
          };
          
          img.onerror = () => {
            console.error('图片加载失败:', imageUrl);
          };
          
          img.src = imageUrl;
          
        } catch (error) {
          console.error('图片插入失败:', error);
        }
      }, 1000);
    }
  }, [app, imageUrl, imageName]);

  // 获取附件字段列表
  const fetchAttachmentFields = async () => {
    try {
      console.log('开始获取附件字段列表...');
      
      // 调用多维表格API获取当前表格的所有字段
      const table = await bitable.base.getActiveTable();
      const fieldList = await table.getFieldList();
      
      console.log('获取到字段列表:', fieldList);
      
      // 过滤出附件类型的字段，排除包含「需求附件」关键词的字段
      const attachmentFields = [];
      for (const field of fieldList) {
        try {
          const fieldType = await field.getType();
          if (fieldType === FieldType.Attachment) {
            const fieldName = await field.getName();
            
            // 排除字段名包含「需求附件」的字段
            if (!fieldName.includes('需求附件')) {
              attachmentFields.push({
                id: field.id,
                name: fieldName
              });
            } else {
              console.log('跳过包含「需求附件」的字段:', fieldName);
            }
          }
        } catch (fieldError) {
          console.warn('获取字段类型失败:', fieldError);
        }
      }
      
      console.log('过滤后的附件字段:', attachmentFields);
      
      setAttachmentFields(attachmentFields);
      if (attachmentFields.length > 0) {
        setSelectedFieldId(attachmentFields[0].id);
      } else {
        console.warn('未找到任何附件字段');
      }
    } catch (error) {
      console.error('获取附件字段失败:', error);
      // 如果API调用失败，使用空数组
      setAttachmentFields([]);
    }
  };

  // 导出画板为图片
  const exportCanvasToImage = async () => {
    if (!app || !selectedFieldId || isExporting) return;
    
    try {
      setIsExporting(true);
      console.log('开始导出画板为图片...');
      
      // 使用 toImageDataUrl 方法导出画板
      const imageDataUrl = await app.toImageDataUrl(app.getCurrentPageShapes());
      
      console.log('画板导出成功');
      console.log('导出的图片数据:', imageDataUrl);
      console.log('图片URL:', imageDataUrl.url);
      console.log('图片尺寸:', imageDataUrl.width, 'x', imageDataUrl.height);
      
      // 找到选中的字段名称
      const selectedField = attachmentFields.find(field => field.id === selectedFieldId);
      const fieldName = selectedField?.name || '未知字段';
      
      // 调用回调函数将图片插入到字段中
      if (onExportToField && imageDataUrl.url) {
        await onExportToField(imageDataUrl.url, fieldName);
        
        // 成功插入后自动关闭画板
        console.log('图片已插入到字段:', fieldName, '，准备关闭画板');
        onClose();
      }
      
      console.log('图片已插入到字段:', fieldName);
    } catch (error) {
      console.error('导出画板失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // 组件挂载时获取附件字段
  useEffect(() => {
    fetchAttachmentFields();
  }, []);

  // 自定义UI覆盖
  const uiOverrides: TLUiOverrides = {
    tools(editor, tools) {
      // 添加自定义工具
      return {
        ...tools,
        // 可以在这里添加自定义工具
      };
    },
    actions(editor, actions) {
      return {
        ...actions,
        // 添加关闭按钮
        'close-canvas': {
          id: 'close-canvas',
          label: '关闭画板',
          kbd: 'Escape',
          onSelect() {
            onClose();
          },
        },
      };
    },
  };

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: 'white',
      }}
    >
      {/* 画板头部 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 1001,
        backdropFilter: 'blur(8px)',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            编辑图片
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          {imageName}
          </p>
        </div>
        
        {/* 导出控制区域 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* 字段选择下拉菜单 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
              导出到字段:
            </label>
            <select
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                background: 'white',
                fontSize: '12px',
                minWidth: '120px',
              }}
            >
              {attachmentFields.map(field => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 插入按钮 */}
          <button
            onClick={exportCanvasToImage}
            disabled={isExporting || !selectedFieldId}
            className="canvas-btn"
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.6 : 1,
              borderRadius: '6px',
            }}
          >
            {isExporting ? '导出中...' : '插入'}
          </button>
          
          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            style={{
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              background: 'white',
              color: '#666',
              cursor: 'pointer',
              fontSize: '16px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="关闭画板"
          >
            ×
          </button>
        </div>
      </div>

      {/* tldraw 画板 */}
      <div style={{
        position: 'absolute',
        top: '80px',
        left: 0,
        right: 0,
        bottom: 0,
      }}>
        <Tldraw
          onMount={(app) => {
            console.log('tldraw 编辑器已挂载');
            
            // 设置默认颜色为红色
            try {
              app.setStyleForNextShapes(DefaultColorStyle, 'red');
              console.log('已设置默认颜色为红色');
            } catch (error) {
              console.warn('设置默认颜色失败:', error);
            }
            
            
           
            
            setApp(app);
          }}
          overrides={uiOverrides}
          // 禁用一些不必要的功能以简化界面
          hideUi={false}
        />
      </div>

      {/* 自定义确认弹窗 */}
      {showCloseConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '12px',
              color: '#333',
            }}>
              确认关闭
            </div>
            
            <div style={{
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.5',
              marginBottom: '20px',
            }}>
              请确认图片编辑结果已经导出。是否确认关闭？
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}>
              <button
                onClick={handleCancelClose}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  background: 'white',
                  color: '#666',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                取消
              </button>
              
              <button
                onClick={handleConfirmClose}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ff4d4f',
                  borderRadius: '4px',
                  background: '#ff4d4f',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#ff7875';
                  e.currentTarget.style.borderColor = '#ff7875';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#ff4d4f';
                  e.currentTarget.style.borderColor = '#ff4d4f';
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
