# 多维表格附件预览插件

这是一个多维表格边栏插件，用于预览和编辑附件文件。

## 功能特性

1. **附件预览**
   - 选中多维表格中的附件单元格，即可在插件中预览文件
   - 图片文件支持直接预览
   - 其他格式文件显示文件名、类型、大小等信息
   - 支持多个附件之间的切换（左右按钮）

2. **图片编辑**
   - 预览图片时，点击"编辑"按钮
   - 在Excalidraw画板中进行图片标注和编辑
   - 支持返回预览界面

3. **智能提示**
   - 未选中单元格时，显示友好的提示信息
   - 选中非附件字段时，提示用户选择附件单元格
   - 支持深色模式自动适配

## 安装依赖

```bash
# 使用 yarn
yarn install

# 或使用 npm
npm install
```

## 开发运行

```bash
# 启动开发服务器
yarn start

# 或
npm start
```

开发服务器将在 http://localhost:3001 启动

## 构建部署

```bash
# 构建生产版本
yarn build

# 或
npm run build
```

构建产物将在 `dist` 目录下生成。

## 在多维表格中使用

1. 启动开发服务器后，访问 http://localhost:3001
2. 在多维表格中，点击"插件"按钮
3. 点击"自定义插件" -> "+新增插件"
4. 输入运行地址: `http://localhost:3001`
5. 点击确定，插件将在边栏中加载

## 使用说明

### 预览附件
1. 在多维表格中选中包含附件的单元格
2. 插件会自动显示附件内容
3. 如果有多个附件，使用底部的"上一个"/"下一个"按钮切换

### 编辑图片
1. 当预览图片时，点击"编辑"按钮
2. 在Excalidraw编辑器中进行标注和编辑
3. 点击"返回预览"按钮返回预览界面

## 技术栈

- **React 19** - 前端框架
- **TypeScript** - 类型安全
- **@lark-base-open/js-sdk** - 多维表格SDK
- **@excalidraw/excalidraw** - 画板编辑器
- **Vite** - 构建工具
- **SCSS** - 样式预处理

## 项目结构

```
.
├── components/
│   ├── AttachmentViewer.tsx      # 附件预览组件
│   ├── AttachmentViewer.scss     # 预览器样式
│   ├── ImageEditor.tsx            # 图片编辑器
│   ├── ImageEditor.scss           # 编辑器样式
│   ├── MainApp.tsx                # 主应用组件
│   └── MainApp.scss               # 主应用样式
├── index.tsx                       # 入口文件
├── index.html                      # HTML模板
├── vite.config.mts                # Vite配置
└── package.json                    # 项目配置
```

## 注意事项

1. 插件运行需要在多维表格环境中，直接浏览器访问可能无法正常获取附件数据
2. 附件URL有效期为10分钟，超时后需要重新选择单元格刷新
3. 建议在本地开发时使用 `http://localhost:3001`，部署时使用HTTPS协议

## License

MIT

