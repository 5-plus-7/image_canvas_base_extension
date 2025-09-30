# HTML Template - 飞书多维表格插件

这是一个基于HTML、TypeScript和React的飞书多维表格插件模板，集成了tldraw画板功能，支持图片编辑和标注。

## ✨ 功能特性

- 🖼️ **图片预览**：支持多种图片格式的预览和导航
- 🎨 **画板编辑**：集成tldraw画板，支持图片标注和编辑
- 📤 **一键导出**：编辑完成后可直接导出到多维表格字段
- 🌐 **国际化**：支持中英文界面切换
- 📱 **响应式设计**：适配不同屏幕尺寸
- 🎯 **用户友好**：现代化的UI设计和交互体验

## 🛠️ 技术栈

- **前端框架**：React 19 + TypeScript
- **构建工具**：Vite 3
- **样式处理**：Sass + CSS Modules
- **画板功能**：tldraw
- **UI组件**：Bootstrap 5
- **国际化**：i18next
- **API集成**：飞书多维表格 OpenAPI

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 打包部署

```bash
npm run pack
```

## 📁 项目结构

```
src/
├── index.ts          # 主入口文件
├── index.scss        # 主样式文件
├── canvas.tsx        # 画板组件
├── locales/          # 国际化文件
│   ├── zh.ts         # 中文语言包
│   ├── en.ts         # 英文语言包
│   └── i18n.ts       # i18n配置
└── global.d.ts       # TypeScript全局类型定义

scripts/
└── pack.js           # 打包脚本

dist/                 # 构建输出目录
output.zip           # 打包后的部署文件
```

## 🎨 主要功能

### 图片预览
- 支持 JPG、PNG、GIF、WebP 等格式
- 图片导航（上一个/下一个）
- 文件信息显示
- 响应式布局

### 画板编辑
- 基于 tldraw 的专业画板
- 支持文字、图形、箭头等标注工具
- 图片导入和编辑
- 实时保存和导出

### 多维表格集成
- 自动获取附件字段列表
- 一键插入编辑后的图片
- 支持追加到现有附件
- 错误处理和用户提示

## 🔧 配置说明

### 环境配置
项目使用飞书多维表格的 OpenAPI，需要在飞书开放平台配置相应的应用信息。

### 样式定制
可以通过修改 `src/index.scss` 文件来自定义样式主题。

### 国际化
在 `src/locales/` 目录下添加新的语言文件来支持更多语言。

## 📦 部署

1. 运行 `npm run pack` 生成 `output.zip`
2. 将 `output.zip` 上传到飞书开放平台
3. 配置相应的权限和回调地址

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目。

## 📄 许可证

ISC License

## 📞 联系方式

如有问题或建议，请通过 Issue 联系。