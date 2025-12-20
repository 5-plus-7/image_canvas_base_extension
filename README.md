# 多维表格附件预览与画板编辑插件

这是一个功能丰富的多维表格插件，提供了附件预览、Excalidraw画板编辑和批改数据可视化等功能。

## 功能特性

### 1. 附件预览模块
- **自动预览**：选中附件类型单元格时自动加载并预览附件
- **多格式支持**：
  - 图片格式（JPG、PNG、GIF等）：支持鼠标滚轮缩放、拖拽移动
  - PDF格式：集成PDF预览器，支持翻页和缩放
- **多附件切换**：当单元格包含多个附件时，提供左右切换控件
- **状态提示**：完善的加载状态、错误提示和空状态处理

### 2. Excalidraw画板编辑
- **图片编辑**：在预览图片时，点击"编辑"按钮进入画板编辑页面
- **初始图片导入**：自动将当前预览的图片导入画板并居中显示
- **导出功能**：
  - 导出为PNG格式（透明背景）
  - 追加插入到指定附件列，不覆盖原有附件
- **返回确认**：检测未导出的编辑内容，提供二次确认

### 3. 批改数据画布预览
- **自动检测**：检测"自动批改结果参考"字段，自动显示"处理算法批改结果"按钮
- **数据解析**：解析JSON格式的批改数据
- **可视化标记**：
  - 客观题：正确步骤显示绿色对勾，错误步骤显示红色圆圈
  - 主观题：在右侧面板显示题号和批注信息
- **多图片支持**：支持左右切换查看不同图片的批改结果
- **导出功能**：导出包含所有批改标记的图片

## 技术栈

- **React 18**：UI框架
- **TypeScript**：类型安全
- **Excalidraw**：开源画板工具
- **Base JS SDK**：多维表格API
- **Bootstrap 5**：UI组件库
- **Vite**：构建工具

## 安装与运行

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式

```bash
npm run dev
```

### 3. 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

## 使用说明

### 基本使用

1. 在多维表格中打开插件
2. 选中一个包含附件的单元格
3. 插件会自动加载并预览附件内容

### 编辑图片

1. 预览图片附件时，右上角会显示"编辑"按钮
2. 点击"编辑"进入Excalidraw画板
3. 在画板中进行编辑操作
4. 选择目标附件列
5. 点击"导出"将编辑后的图片追加到附件列

### 处理批改结果

1. 确保表格中存在名为"自动批改结果参考"的文本字段
2. 选中包含批改数据的记录
3. 点击"处理算法批改结果"按钮
4. 查看批改标记和批注信息
5. 可以导出包含标记的图片

## 数据结构

### 批改数据JSON格式

```json
[
  {
    "image_url": "图片URL",
    "markup_status": "completed",
    "questions_info": [
      {
        "question_number": "题号",
        "question_type": "objective" | "subjective",
        "question_text": "题目文本",
        "answer_steps": [
          {
            "step_id": 1,
            "student_answer": "学生答案",
            "analysis": "批注内容",
            "is_correct": true | false,
            "answer_location": [x1, y1, x2, y2]
          }
        ]
      }
    ]
  }
]
```

## 开发规范

本项目遵循多维表格插件开发规范：

- **设计规范**：参考 `Base-extension-design-guidelines.md`
- **开发指南**：参考 `Base-extension-readme.md`
- **API文档**：参考 `Base-js-sdk-docs.md`

## 项目结构

```
src/
├── components/
│   ├── AttachmentPreview.tsx      # 附件预览组件
│   ├── AttachmentPreview.scss
│   ├── ExcalidrawEditor.tsx       # Excalidraw编辑器组件
│   ├── ExcalidrawEditor.scss
│   ├── GradeCanvasPreview.tsx      # 批改数据预览组件
│   └── GradeCanvasPreview.scss
├── locales/
│   ├── zh.ts                      # 中文翻译
│   ├── en.ts                      # 英文翻译
│   └── i18n.ts                    # 国际化配置
├── App.tsx                        # 主应用组件
├── App.scss
├── index.tsx                      # 入口文件
└── index.scss                     # 全局样式
```

## 注意事项

1. **附件URL有效期**：附件URL有效期为10分钟，过期后需要重新获取
2. **图片格式**：编辑功能仅支持图片格式附件
3. **批改数据格式**：确保"自动批改结果参考"字段的JSON格式正确
4. **浏览器兼容性**：支持Chrome、Firefox、Safari、Edge最新版本

## 许可证

ISC
