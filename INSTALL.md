# 安装和运行说明

## 📦 环境要求

- **Node.js**: >= 16.19.0 (推荐 18.x 或更高版本)
- **包管理器**: yarn 或 npm
- **浏览器**: Chrome、Edge、Safari、Firefox (推荐Chrome)

## 🔧 安装步骤

### 1. 检查环境

```bash
# 检查 Node.js 版本
node --version
# 应该显示 v16.x 或更高

# 检查 yarn 版本（如果使用 yarn）
yarn --version

# 检查 npm 版本（如果使用 npm）
npm --version
```

### 2. 安装依赖

在项目根目录下运行：

**使用 yarn（推荐）：**
```bash
yarn install
```

**使用 npm：**
```bash
npm install
```

**安装过程可能需要几分钟，请耐心等待...**

### 3. 启动开发服务器

**使用 yarn：**
```bash
yarn start
```

**使用 npm：**
```bash
npm start
```

服务器启动后，会自动在浏览器中打开 http://localhost:3001

### 4. 验证安装

如果看到以下内容，说明安装成功：
```
VITE v5.0.12  ready in XXX ms

➜  Local:   http://localhost:3001/
➜  Network: http://192.168.x.x:3001/
➜  press h to show help
```

## 🚀 在多维表格中使用

### 方法一：使用本地开发地址（推荐用于开发）

1. 确保开发服务器正在运行（yarn start）
2. 打开飞书多维表格
3. 点击右侧的"插件"按钮
4. 点击"自定义插件" → "+新增插件"
5. 在输入框中填入：**http://localhost:3001**
6. 点击"确定"

插件将在右侧面板中加载。

### 方法二：构建并部署（推荐用于生产）

#### 步骤 1: 构建项目

```bash
yarn build
```

构建产物将在 `dist/` 目录下生成。

#### 步骤 2: 部署到服务器

**选项 A: 使用 Vercel（推荐）**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

部署完成后，Vercel 会提供一个 HTTPS 地址，例如：
```
https://your-project.vercel.app
```

**选项 B: 使用其他平台**

将 `dist/` 目录的内容上传到：
- Netlify
- GitHub Pages
- 阿里云OSS
- 自己的服务器

**⚠️ 注意：生产环境必须使用 HTTPS 协议！**

#### 步骤 3: 在多维表格中使用部署地址

1. 打开飞书多维表格
2. 点击"插件" → "自定义插件" → "+新增插件"
3. 输入部署后的 HTTPS 地址
4. 点击"确定"

## 🛠️ 常见问题

### 问题 1: 依赖安装失败

**错误信息**：
```
error An unexpected error occurred: "...ECONNREFUSED..."
```

**解决方案**：
```bash
# 清理缓存
yarn cache clean
# 或
npm cache clean --force

# 重新安装
rm -rf node_modules
yarn install
# 或
npm install
```

### 问题 2: 端口被占用

**错误信息**：
```
Port 3001 is in use
```

**解决方案**：

方法 1 - 杀掉占用端口的进程：
```bash
# macOS/Linux
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

方法 2 - 修改端口：

编辑 `vite.config.mts`：
```typescript
server: {
  port: 3002, // 改为其他端口
}
```

### 问题 3: TypeScript 类型错误

**错误信息**：
```
Cannot find module '@lark-base-open/js-sdk'
```

**解决方案**：
```bash
# 确保依赖已正确安装
yarn install

# 如果还有问题，尝试重启 IDE
# VSCode: 按 Cmd+Shift+P，输入 "Reload Window"
```

### 问题 4: 插件在多维表格中加载失败

**可能原因和解决方案**：

1. **开发服务器未运行**
   ```bash
   # 检查服务器是否运行
   yarn start
   ```

2. **地址输入错误**
   - 确认使用 `http://localhost:3001`
   - 注意末尾不要加 `/`

3. **浏览器缓存问题**
   - 清除浏览器缓存
   - 使用无痕模式测试

4. **网络问题**
   - 确保可以访问 localhost
   - 检查防火墙设置

### 问题 5: 看不到附件预览

**检查清单**：

- [ ] 已选中多维表格中的单元格
- [ ] 选中的字段类型是"附件"
- [ ] 单元格中有文件内容
- [ ] 插件已正确加载（无错误提示）

### 问题 6: 构建失败

**错误信息**：
```
Build failed with errors
```

**解决方案**：
```bash
# 清理旧的构建文件
rm -rf dist

# 重新构建
yarn build

# 如果还有问题，检查是否有 TypeScript 错误
yarn tsc --noEmit
```

## 📚 其他命令

### 预览构建结果
```bash
yarn preview
```

### 类型检查
```bash
yarn tsc --noEmit
```

### 清理项目
```bash
# 删除 node_modules 和构建产物
rm -rf node_modules dist

# 重新安装
yarn install
```

## 🔍 调试技巧

### 1. 使用浏览器开发者工具

在多维表格中：
1. 右键点击插件区域
2. 选择"检查"或按 F12
3. 查看 Console 面板的错误信息

### 2. 查看网络请求

在 DevTools 的 Network 面板中：
- 检查附件 URL 的请求状态
- 确认 API 调用是否成功

### 3. 本地调试

在代码中添加 console.log：
```typescript
console.log('当前选中:', selection);
console.log('附件列表:', attachments);
```

## 📞 获取帮助

如果遇到无法解决的问题：

1. 查看 [使用指南.md](./使用指南.md) 的常见问题部分
2. 查看 [项目说明.md](./项目说明.md) 了解技术细节
3. 联系开发团队获取支持

## ✅ 安装检查清单

完成以下检查，确保一切就绪：

- [ ] Node.js 版本 >= 16.19.0
- [ ] 依赖安装成功（node_modules 目录存在）
- [ ] 开发服务器可以启动
- [ ] 浏览器可以访问 http://localhost:3001
- [ ] 在多维表格中成功加载插件
- [ ] 选中附件单元格后可以看到预览

全部完成？**恭喜！开始使用吧！** 🎉

---

**最后更新**：2025-01-16

