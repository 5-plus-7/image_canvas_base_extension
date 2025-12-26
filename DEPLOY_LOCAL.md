# 本地部署指南

本文档提供完整的本地部署步骤。

## 前置要求

- ✅ Python 3.9+ （已检测到：Python 3.9.6）
- ✅ Node.js 和 npm （已检测到：Node.js v20.10.0, npm 10.2.3）
- 飞书应用凭证（App ID 和 App Secret）
- 测试环境和生产环境的 app_token 和 table_id

## 第一步：配置后端

### 1.1 创建虚拟环境（推荐）

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# Windows: venv\Scripts\activate
```

### 1.2 安装Python依赖

```bash
# 在激活虚拟环境后
pip install -r requirements.txt
```

**注意**：如果后端目录下已经有依赖包，可以跳过此步骤，但建议使用虚拟环境。

### 1.3 配置环境变量

复制环境变量模板并编辑：

```bash
cd backend
cp .env.example .env
```

然后编辑 `.env` 文件，填入你的配置：

```bash
# 飞书应用凭证
FEISHU_APP_ID=你的应用ID
FEISHU_APP_SECRET=你的应用密钥

# 测试环境配置
TEST_APP_TOKEN=测试环境的app_token
TEST_TABLE_ID=测试环境的table_id
TEST_INDEX_FIELD_NAME=索引

# 生产环境配置
PROD_APP_TOKEN=生产环境的app_token
PROD_TABLE_ID=生产环境的table_id
PROD_INDEX_FIELD_NAME=索引
```

### 1.4 启动后端服务

```bash
# 在backend目录下，确保虚拟环境已激活
python main.py
```

或者使用 uvicorn：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

后端服务将在 `http://localhost:8000` 启动。

**验证后端**：在浏览器中访问 `http://localhost:8000/`，应该看到：
```json
{"message": "批改结果查询API服务运行中"}
```

## 第二步：配置前端

### 2.1 安装依赖（已完成）

前端依赖已经安装完成。如果以后需要重新安装：

```bash
# 在项目根目录
npm install
```

### 2.2 配置API地址

前端环境变量文件 `.env.local` 已创建，内容为：

```
VITE_API_BASE_URL=http://localhost:8000
```

如果需要修改API地址，编辑 `.env.local` 文件即可。

### 2.3 启动前端开发服务器

```bash
# 在项目根目录
npm run dev
```

前端将在 `http://localhost:3001` 启动。

## 第三步：测试

### 3.1 访问应用

在浏览器中打开：
- 主应用：`http://localhost:3001`
- 查询页面：`http://localhost:3001/?mode=query`

### 3.2 测试查询功能

1. 选择环境（测试环境或线上环境）
2. 输入一个有效的记录ID（索引值）
3. 点击"查看结果"按钮
4. 应该能看到批改结果的预览页面

## 快速启动脚本

### 启动后端（终端1）

```bash
cd backend
source venv/bin/activate  # 如果使用虚拟环境
python main.py
```

### 启动前端（终端2）

```bash
cd /Users/mac/Desktop/image_canvas_base_extension-main
npm run dev
```

## 常见问题

### 后端启动失败

**问题**：`ModuleNotFoundError: No module named 'fastapi'`

**解决**：
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### 前端无法连接后端

**问题**：`Failed to fetch` 或 CORS 错误

**解决**：
1. 确保后端服务正在运行（访问 `http://localhost:8000/` 验证）
2. 检查 `.env.local` 中的 `VITE_API_BASE_URL` 是否正确
3. 检查后端CORS配置（后端默认允许所有来源）

### 获取数据失败

**问题**：`获取批改结果失败` 或 `404 Not Found`

**解决**：
1. 检查后端 `.env` 文件中的配置是否正确
2. 检查记录ID（索引值）是否正确
3. 检查飞书应用是否有权限访问表格
4. 查看后端终端日志，检查具体错误信息

### 字段找不到

**问题**：`字段为空` 或 `404`

**解决**：
1. 确保表格中存在以下字段之一：
   - "自动批改结果参考"
   - "自动批改结果json链接"
2. 字段名称必须完全匹配（区分大小写）
3. 检查 `.env` 中的 `TEST_INDEX_FIELD_NAME` 或 `PROD_INDEX_FIELD_NAME` 是否正确

## 项目结构

```
项目根目录/
├── backend/              # 后端服务
│   ├── main.py          # FastAPI主文件
│   ├── requirements.txt # Python依赖
│   ├── .env.example     # 环境变量模板
│   └── .env             # 环境变量配置（需要创建）
├── src/                 # 前端源码
├── dist/                # 构建输出
├── .env.local           # 前端环境变量（已创建）
├── package.json         # 前端依赖配置
└── vite.config.js       # Vite配置
```

## 下一步

- 查看 `LOCAL_TEST.md` 了解详细的测试指南
- 查看 `SCF_DEPLOY.md` 了解如何部署到腾讯云SCF
- 查看 `README.md` 了解项目功能特性

