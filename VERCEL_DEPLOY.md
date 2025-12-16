# Vercel 部署指南

本项目已配置好 Vercel 部署，可以通过以下几种方式部署：

## 方法一：通过 Vercel CLI 部署（推荐用于测试）

1. **安装 Vercel CLI**（如果还没有安装）：
```bash
npm i -g vercel
```

2. **登录 Vercel**：
```bash
vercel login
```

3. **在项目根目录运行部署命令**：
```bash
vercel
```

4. **生产环境部署**：
```bash
vercel --prod
```

## 方法二：通过 Vercel 网站部署（推荐用于生产）

1. **访问 [Vercel 网站](https://vercel.com)** 并登录（可以使用 GitHub 账号）

2. **导入项目**：
   - 点击 "New Project"
   - 如果项目在 GitHub/GitLab/Bitbucket，可以直接选择仓库
   - 如果是本地项目，可以先推送到 Git 仓库

3. **配置项目**（通常会自动检测）：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **部署**：
   - 点击 "Deploy" 按钮
   - 等待构建完成

## 方法三：通过 GitHub 集成（推荐用于持续集成）

1. **将项目推送到 GitHub**

2. **在 Vercel 中连接 GitHub**：
   - 进入 Vercel Dashboard
   - 点击 "New Project"
   - 选择你的 GitHub 仓库
   - Vercel 会自动检测配置

3. **自动部署**：
   - 每次推送到主分支会自动触发部署
   - 可以通过 Pull Request 预览部署

## 部署后的使用

1. **获取部署 URL**：
   - 部署完成后，Vercel 会提供一个 URL，例如：`https://your-project.vercel.app`

2. **在多维表格中使用**：
   - 打开多维表格
   - 点击 `插件` → `自定义插件` → `+新增插件`
   - 输入你的 Vercel URL：`https://your-project.vercel.app`
   - 点击确定即可使用

## 环境变量（如果需要）

如果需要配置环境变量：
1. 在 Vercel Dashboard 中选择项目
2. 进入 Settings → Environment Variables
3. 添加环境变量（例如 `VITE_APP_URL`）

## 注意事项

1. **HTTPS**：Vercel 自动提供 HTTPS，满足 Base 插件的要求
2. **自动构建**：每次推送代码到 Git 仓库会自动触发新的部署
3. **预览部署**：每个 Pull Request 都会创建一个预览 URL，方便测试
4. **域名**：可以配置自定义域名（Settings → Domains）

## 故障排查

如果部署遇到问题：

1. **构建失败**：
   - 检查 `package.json` 中的依赖是否都正确
   - 查看 Vercel 的构建日志

2. **404 错误**：
   - 确保 `vercel.json` 配置正确
   - 检查 `vite.config.js` 中的 `base` 配置

3. **资源加载失败**：
   - 检查控制台错误信息
   - 确保所有资源路径正确

## 本地测试构建

在部署前，可以在本地测试构建：

```bash
# 构建项目
npm run build

# 预览构建结果
npm run preview
```

这可以帮助你在部署前发现问题。

