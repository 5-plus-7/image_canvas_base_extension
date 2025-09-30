import { bitable, FieldType, IAttachmentField, IOpenAttachment } from '@lark-base-open/js-sdk';
import './index.scss';

// 动态导入 React 和画板组件
let React: any;
let ReactDOM: any;
let Canvas: any;

// 异步加载 React 和画板组件
async function loadReactComponents() {
  try {
    const react = await import('react');
    const reactDOM = await import('react-dom/client');
    const canvas = await import('./canvas');
    
    React = react.default;
    ReactDOM = reactDOM.createRoot;
    Canvas = canvas.default;
  } catch (error) {
    console.error('加载 React 组件失败:', error);
  }
}

// 支持的图片文件类型
const SUPPORTED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

// DOM 元素
const emptyState = document.getElementById('empty-state') as HTMLElement;
const previewContainer = document.getElementById('preview-container') as HTMLElement;
const unsupportedContainer = document.getElementById('unsupported-container') as HTMLElement;
const imagePreview = document.getElementById('image-preview') as HTMLElement;
const unsupportedPreview = document.getElementById('unsupported-preview') as HTMLElement;

// 文件信息元素
const fieldName = document.getElementById('field-name') as HTMLElement;
const fileName = document.getElementById('file-name') as HTMLElement;
const fileSize = document.getElementById('file-size') as HTMLElement;
const fileIndex = document.getElementById('file-index') as HTMLElement;

// 导航按钮
const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
const canvasBtn = document.getElementById('canvas-btn') as HTMLButtonElement;

// 全局状态
let currentAttachments: IOpenAttachment[] = [];
let currentIndex = 0;
let currentRecordId: string = '';
let currentFieldName: string = '';
let canvasRoot: any = null;

/**
 * 检查文件是否为支持的图片类型
 */
function isSupportedImageType(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? SUPPORTED_IMAGE_TYPES.includes(extension) : false;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}


/**
 * 更新文件信息显示
 */
function updateFileInfo(attachment: IOpenAttachment, index: number, total: number, fieldNameText: string): void {
  fieldName.textContent = fieldNameText;
  fileName.textContent = attachment.name;
  fileSize.textContent = formatFileSize(attachment.size);
  fileIndex.textContent = `${index + 1} / ${total}`;
}

/**
 * 更新导航按钮状态
 */
function updateNavigationButtons(): void {
  prevBtn.disabled = currentIndex <= 0;
  nextBtn.disabled = currentIndex >= currentAttachments.length - 1;
}

/**
 * 显示当前文件
 */
function showCurrentFile(): void {
  if (currentAttachments.length === 0) return;
  
  const currentFile = currentAttachments[currentIndex];
  updateFileInfo(currentFile, currentIndex, currentAttachments.length, currentFieldName);
  updateNavigationButtons();
  
  if (isSupportedImageType(currentFile.name)) {
    // 显示图片
    imagePreview.style.display = 'flex';
    unsupportedPreview.style.display = 'none';
    
    imagePreview.innerHTML = `
      <img src="${currentFile.token}" alt="${currentFile.name}" loading="lazy">
    `;
    
    // 添加图片加载事件
    const img = imagePreview.querySelector('img') as HTMLImageElement;
    if (img) {
      img.onload = () => {
        console.log(`图片加载成功: ${currentFile.name}`);
      };
      
      img.onerror = () => {
        console.error(`图片加载失败: ${currentFile.name}`);
        imagePreview.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: #999;">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor" style="margin-bottom: 16px;">
              <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm-2 30l-6-6 2.83-2.83L22 28.34l10.17-10.17L35 21 22 34z"/>
            </svg>
            <div style="font-size: 16px; margin-bottom: 8px;">图片加载失败</div>
            <div style="font-size: 14px; opacity: 0.7;">${currentFile.name}</div>
          </div>
        `;
      };
    }
  } else {
    // 显示不支持的文件类型
    imagePreview.style.display = 'none';
    unsupportedPreview.style.display = 'flex';
  }
}

/**
 * 切换到上一个文件
 */
function showPreviousFile(): void {
  if (currentIndex > 0) {
    currentIndex--;
    showCurrentFile();
  }
}

/**
 * 切换到下一个文件
 */
function showNextFile(): void {
  if (currentIndex < currentAttachments.length - 1) {
    currentIndex++;
    showCurrentFile();
  }
}

/**
 * 在画板中打开图片
 */
async function openInCanvas(imageUrl: string, imageName: string): Promise<void> {
  try {
    // 确保 React 组件已加载
    if (!React || !ReactDOM || !Canvas) {
      await loadReactComponents();
    }

    if (!React || !ReactDOM || !Canvas) {
      console.error('无法加载画板组件');
      return;
    }

    // 在打开画板时获取并保存当前的recordId
    let savedRecordId: string | null = null;
    try {
      const selection = await bitable.base.getSelection();
      savedRecordId = selection.recordId;
      console.log('打开画板时保存的recordId:', savedRecordId);
    } catch (error) {
      console.warn('获取当前recordId失败:', error);
    }

    // 创建画板容器
    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'tldraw-canvas-container';
    document.body.appendChild(canvasContainer);

    // 创建 React 根节点
    canvasRoot = ReactDOM(canvasContainer);

    // 渲染画板组件
    canvasRoot.render(
      React.createElement(Canvas, {
        imageUrl,
        imageName,
        onClose: closeCanvas,
        onExportToField: (imageDataUrl: string, fieldName: string) => 
          handleExportToField(imageDataUrl, fieldName, savedRecordId),
      })
    );

  } catch (error) {
    console.error('打开画板失败:', error);
  }
}

/**
 * 关闭画板
 */
function closeCanvas(): void {
  try {
    if (canvasRoot) {
      canvasRoot.unmount();
      canvasRoot = null;
    }

    const canvasContainer = document.getElementById('tldraw-canvas-container');
    if (canvasContainer) {
      document.body.removeChild(canvasContainer);
    }
  } catch (error) {
    console.error('关闭画板失败:', error);
  }
}

/**
 * 测试多维表格API连接
 */
async function testTableConnection(): Promise<void> {
  try {
    console.log('开始测试多维表格API连接...');
    
    const table = await bitable.base.getActiveTable();
    console.log('获取表格成功:', table);
    
    const fieldList = await table.getFieldList();
    console.log('获取字段列表成功，字段数量:', fieldList.length);
    
    const selection = await bitable.base.getSelection();
    console.log('获取选择状态成功:', selection);
    
    console.log('多维表格API连接测试通过');
    
  } catch (error) {
    console.error('多维表格API连接测试失败:', error);
  }
}

/**
 * 简单测试文件插入
 */
async function testSimpleFileInsert(): Promise<void> {
  try {
    console.log('开始简单文件插入测试...');
    
    const table = await bitable.base.getActiveTable();
    const selection = await bitable.base.getSelection();
    
    if (!selection.recordId) {
      console.error('没有选中的记录');
      return;
    }
    
    console.log('测试记录ID:', selection.recordId);
    
    // 创建一个简单的文本文件
    const textContent = '这是一个测试文件\n创建时间: ' + new Date().toLocaleString();
    const blob = new Blob([textContent], { type: 'text/plain' });
    const file = new File([blob], 'test-file.txt', { type: 'text/plain' });
    
    console.log('创建测试文件:', file);
    
    // 获取第一个附件字段进行测试
    const fieldList = await table.getFieldList();
    let testField = null;
    
    for (const field of fieldList) {
      const fieldType = await field.getType();
      if (fieldType === FieldType.Attachment) {
        testField = field;
        break;
      }
    }
    
    if (!testField) {
      console.error('没有找到附件字段进行测试');
      return;
    }
    
    const fieldName = await testField.getName();
    console.log('使用测试字段:', fieldName);
    
    // 优先更新当前选中的记录进行测试
    const attachmentField = testField as IAttachmentField;
    
    try {
      console.log('优先更新当前选中的记录进行测试');
      
      // 方法1: 先上传文件，再获取现有附件并追加（优先方法）
      console.log('方法1: 先上传文件，再获取现有附件并追加');
      
      // 先上传文件获取真实token
      const tokens = await bitable.base.batchUploadFile([file]);
      console.log('文件上传成功，返回的tokens:', tokens);
      
      if (!tokens || tokens.length === 0) {
        throw new Error('文件上传失败，没有返回token');
      }
      
      const fileToken = tokens[0];
      
      // 获取字段中现有的附件
      const existingAttachments = await attachmentField.getValue(selection.recordId);
      console.log('现有附件:', existingAttachments);
      
      // 确保 existingAttachments 是数组
      const existingArray = Array.isArray(existingAttachments) ? existingAttachments : [];
      console.log('现有附件数组:', existingArray);
      
      // 创建新的附件对象
      const newAttachment = {
        name: file.name,
        size: file.size,
        type: file.type,
        token: fileToken,
        timeStamp: Date.now(),
      };
      
      // 合并现有附件和新附件
      const allAttachments = [...existingArray, newAttachment];
      console.log('合并后的附件列表:', allAttachments);
      
      const result = await attachmentField.setValue(selection.recordId, allAttachments);
      console.log('setValue测试结果:', result);
      
      if (result) {
        console.log('✅ 字段setValue方法测试成功（追加文件）');
      } else {
        console.log('❌ setValue返回false');
      }
      
    } catch (setValueError) {
      console.warn('setValue方法失败，尝试上传后setValue:', setValueError);
      
      try {
        console.log('方法2: 先上传文件，再获取现有附件并追加');
        
        const tokens = await bitable.base.batchUploadFile([file]);
        console.log('文件上传成功，返回的tokens:', tokens);
        
        if (!tokens || tokens.length === 0) {
          throw new Error('文件上传失败，没有返回token');
        }
        
        const fileToken = tokens[0];
        
        // 获取现有附件
        const existingAttachments = await attachmentField.getValue(selection.recordId);
        console.log('现有附件:', existingAttachments);
        
        // 确保 existingAttachments 是数组
        const existingArray = Array.isArray(existingAttachments) ? existingAttachments : [];
        console.log('现有附件数组:', existingArray);
        
        // 创建新的附件对象
        const newAttachment = {
          name: file.name,
          size: file.size,
          type: file.type,
          token: fileToken,
          timeStamp: Date.now(),
        };
        
        // 合并现有附件和新附件
        const allAttachments = [...existingArray, newAttachment];
        console.log('合并后的附件列表:', allAttachments);
        
        const result = await attachmentField.setValue(selection.recordId, allAttachments);
        console.log('上传后setValue测试结果:', result);
        
        if (result) {
          console.log('✅ 先上传再setValue方法测试成功（追加文件）');
        } else {
          console.log('❌ 上传后setValue返回false');
        }
        
      } catch (uploadError) {
        console.warn('上传后setValue方法失败，尝试createCell + addRecord:', uploadError);
        
        try {
          console.log('方法3: 使用字段的createCell + addRecord创建新记录（最后备用）');
          const attachmentCell = await attachmentField.createCell([file]);
          console.log('创建附件单元格成功:', attachmentCell);
          
          const newRecordId = await table.addRecord([attachmentCell]);
          console.log('addRecord返回的新记录ID:', newRecordId);
          
          console.log('✅ 字段createCell + addRecord方法测试成功（创建新记录）');
          
        } catch (createCellError) {
          console.error('❌ 所有方法都失败:', createCellError);
        }
      }
    }
    
  } catch (error) {
    console.error('简单文件插入测试失败:', error);
  }
}

/**
 * 显示吐司提示
 */
function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  // 移除已存在的吐司
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  // 创建吐司元素
  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
    word-wrap: break-word;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  toast.textContent = message;

  // 添加到页面
  document.body.appendChild(toast);

  // 触发动画
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 10);

  // 3秒后自动消失
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

/**
 * 处理导出到字段
 */
async function handleExportToField(imageDataUrl: string, fieldName: string, savedRecordId?: string | null): Promise<void> {
  try {
    console.log('开始将图片插入到字段:', fieldName);
    console.log('图片数据URL长度:', imageDataUrl.length);
    
    // 注意：不在初始化时调用API，避免 "Not allowed to get config during initialization" 错误
    
    // 获取当前选中的记录和表格
    const table = await bitable.base.getActiveTable();
    
    // 优先使用保存的recordId，如果没有则尝试获取当前选中的记录ID
    let recordId = savedRecordId;
    
    if (!recordId) {
      try {
        const selection = await bitable.base.getSelection();
        recordId = selection.recordId;
        console.log('使用当前选中的记录ID:', recordId);
      } catch (error) {
        console.warn('获取当前选中记录失败:', error);
      }
    } else {
      console.log('使用保存的记录ID:', recordId);
    }
    
    if (!recordId) {
      throw new Error('无法确定目标记录，请确保在打开画板时已选中记录，或在插入时选中目标记录');
    }
    
    // 使用从tldraw传来的图片数据
    console.log('使用tldraw导出的图片数据');
    console.log('图片数据URL长度:', imageDataUrl.length);
    
    // 将base64数据转换为Blob
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    
    // 创建文件对象
    const file = new File([blob], `tldraw-export-${Date.now()}.png`, { type: 'image/png' });
    
    console.log('创建的文件:', file);
    
    // 获取字段列表找到对应的附件字段
    const fieldList = await table.getFieldList();
    console.log('获取到的字段列表:', fieldList);
    
    let targetField = null;
    
    for (const field of fieldList) {
      const fieldType = await field.getType();
      const currentFieldName = await field.getName();
      console.log(`检查字段: ${currentFieldName}, 类型: ${fieldType}, ID: ${field.id}`);
      
      if (fieldType === FieldType.Attachment) {
        console.log(`找到附件字段: ${currentFieldName}, 目标字段: ${fieldName}`);
        if (currentFieldName === fieldName) {
          targetField = field;
          console.log('匹配成功，找到目标字段');
          break;
        }
      }
    }
    
    if (!targetField) {
      console.error('未找到目标字段，可用字段列表:');
      for (const field of fieldList) {
        const fieldType = await field.getType();
        const fieldName = await field.getName();
        if (fieldType === FieldType.Attachment) {
          console.error(`- 附件字段: ${fieldName}`);
        }
      }
      throw new Error(`未找到字段: ${fieldName}`);
    }
    
    console.log('开始插入文件到字段:', fieldName, '记录ID:', recordId);
    console.log('文件信息:', { name: file.name, size: file.size, type: file.type });
    
    // 使用保存的recordId更新记录
    const attachmentField = targetField as IAttachmentField;
    
    // 先上传文件获取真实token
    const tokens = await bitable.base.batchUploadFile([file]);
    console.log('文件上传成功，返回的tokens:', tokens);
    
    if (!tokens || tokens.length === 0) {
      throw new Error('文件上传失败，没有返回token');
    }
    
    const fileToken = tokens[0];
    
    // 获取字段中现有的附件
    const existingAttachments = await attachmentField.getValue(recordId);
    console.log('现有附件:', existingAttachments);
    
    // 确保 existingAttachments 是数组
    const existingArray = Array.isArray(existingAttachments) ? existingAttachments : [];
    console.log('现有附件数组:', existingArray);
    
    // 创建新的附件对象
    const newAttachment = {
      name: file.name,
      size: file.size,
      type: file.type,
      token: fileToken,
      timeStamp: Date.now(),
    };
    
    // 合并现有附件和新附件
    const allAttachments = [...existingArray, newAttachment];
    console.log('合并后的附件列表:', allAttachments);
    
    const result = await attachmentField.setValue(recordId, allAttachments);
    console.log('setValue返回结果:', result);
    
    if (!result) {
      throw new Error('setValue返回false，插入失败');
    }
    
    console.log('✅ 成功追加文件到记录:', recordId);
    
    // 获取插入后的附件URL列表
    try {
      console.log('获取URL的目标记录ID:', recordId);
      
      const attachmentUrls = await attachmentField.getAttachmentUrls(recordId);
      console.log('插入成功后的附件URL列表:', attachmentUrls);
      
      if (attachmentUrls.length > 0) {
        console.log('最新插入的图片URL:', attachmentUrls[attachmentUrls.length - 1]);
      }
    } catch (urlError) {
      console.warn('获取附件URL失败:', urlError);
    }
    
    // 显示成功提示
    showToast(`图片已成功导出到字段: ${fieldName}`, 'success');
    
  } catch (error) {
    console.error('插入图片到字段失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    showToast(`插入图片到字段失败: ${errorMessage}`, 'error');
  }
}

/**
 * 处理画板按钮点击
 */
async function handleCanvasClick(): Promise<void> {
  if (currentAttachments.length === 0 || currentIndex >= currentAttachments.length) {
    console.warn('没有可用的图片');
    return;
  }

  const currentFile = currentAttachments[currentIndex];
  
  if (!isSupportedImageType(currentFile.name)) {
    console.warn('当前文件不是支持的图片格式');
    return;
  }

  try {
    // 直接打开画板
    await openInCanvas(currentFile.token, currentFile.name);
  } catch (error) {
    console.error('打开画板失败:', error);
  }
}

/**
 * 显示空状态
 */
function showEmptyState(): void {
  emptyState.style.display = 'block';
  previewContainer.style.display = 'none';
  unsupportedContainer.style.display = 'none';
}

/**
 * 显示不支持的文件类型提示
 */
function showUnsupportedState(): void {
  emptyState.style.display = 'none';
  previewContainer.style.display = 'none';
  unsupportedContainer.style.display = 'block';
}

/**
 * 显示加载状态
 */
function showLoadingState(): void {
  imagePreview.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
    </div>
  `;
}

/**
 * 显示图片预览
 */
async function showImagePreview(attachments: IOpenAttachment[], field: IAttachmentField, recordId: string): Promise<void> {
  emptyState.style.display = 'none';
  previewContainer.style.display = 'block';
  unsupportedContainer.style.display = 'none';
  
  try {
    console.log('开始获取附件URLs...');
    
    // 获取并保存字段名
    currentFieldName = await field.getName();
    console.log('当前字段名:', currentFieldName);
    
    // 保存当前记录ID
    currentRecordId = recordId;
    console.log('保存当前记录ID:', currentRecordId);
    
    // 获取附件URL列表
    const attachmentUrls = await field.getAttachmentUrls(recordId);
    console.log('获取到的附件URLs:', attachmentUrls);
    
    // 更新全局状态
    currentAttachments = attachments.map((attachment, index) => ({
      ...attachment,
      token: attachmentUrls[index] || attachment.token
    }));
    currentIndex = 0;
    
    // 显示第一个文件
    showCurrentFile();
    
  } catch (error) {
    console.error('获取附件URL失败:', error);
    
    // 如果获取URL失败，仍然尝试使用token
    currentAttachments = attachments;
    currentIndex = 0;
    showCurrentFile();
  }
}

/**
 * 处理选择变化
 */
async function handleSelectionChange(): Promise<void> {
  try {
    const selection = await bitable.base.getSelection();
    
    if (!selection.tableId || !selection.recordId || !selection.fieldId) {
      showEmptyState();
      return;
    }
    
    const table = await bitable.base.getTableById(selection.tableId);
    const field = await table.getField<IAttachmentField>(selection.fieldId);
    
    // 检查是否为附件字段
    const fieldType = await field.getType();
    if (fieldType !== FieldType.Attachment) {
      showEmptyState();
      return;
    }
    
    // 获取附件值
    const attachmentValue = await field.getValue(selection.recordId);
    
    if (!attachmentValue || attachmentValue.length === 0) {
      showEmptyState();
      return;
    }
    
    // 过滤出图片类型的附件
    const imageAttachments = attachmentValue.filter(attachment => 
      isSupportedImageType(attachment.name)
    );
    
    if (imageAttachments.length === 0) {
      showUnsupportedState();
      return;
    }
    
    await showImagePreview(imageAttachments, field, selection.recordId);
    
  } catch (error) {
    console.error('处理选择变化时出错:', error);
    showEmptyState();
  }
}

/**
 * 处理滚动事件
 */
function handleScroll(): void {
  const scrollTop = previewContainer.scrollTop;
  if (scrollTop > 10) {
    previewContainer.classList.add('scrolled');
  } else {
    previewContainer.classList.remove('scrolled');
  }
}

/**
 * 初始化插件
 */
async function initPlugin(): Promise<void> {
  try {
    // 预加载 React 组件
    loadReactComponents();
    
    // 添加导航按钮事件监听器
    prevBtn.addEventListener('click', showPreviousFile);
    nextBtn.addEventListener('click', showNextFile);
    canvasBtn.addEventListener('click', handleCanvasClick);
    
    // 添加滚动事件监听器
    previewContainer.addEventListener('scroll', handleScroll);
    
    // 添加键盘事件监听器
    document.addEventListener('keydown', (e) => {
      if (previewContainer.style.display !== 'block') return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          showPreviousFile();
          break;
        case 'ArrowRight':
          e.preventDefault();
          showNextFile();
          break;
        case 'Escape':
          // 可以添加关闭预览的功能
          break;
      }
    });
    
    // 监听选择变化
    bitable.base.onSelectionChange(handleSelectionChange);
    
    // 注意：不在初始化时调用 handleSelectionChange()，避免 "Not allowed to get config during initialization" 错误
    // 用户选择变化时会自动触发 handleSelectionChange()
    
  } catch (error) {
    console.error('初始化插件时出错:', error);
    showEmptyState();
  }
}

// 启动插件
document.addEventListener('DOMContentLoaded', initPlugin);