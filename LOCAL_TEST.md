# 本地测试指南

本文档说明如何在本地环境中测试批改结果查询功能。

## 前置准备

1. 确保已安装 Python 3.9+
2. 确保已安装 Node.js 和 npm
3. 准备飞书应用凭证（App ID 和 App Secret）
4. 准备测试环境和线上环境的 app_token 和 table_id

## 步骤1：设置后端服务

### 1.1 安装Python依赖

```bash
cd backend

# 创建虚拟环境（推荐）
python3 -m venv venv

# 激活虚拟环境
# macOS/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

### 1.2 配置环境变量

在 `backend` 目录下创建 `.env` 文件（或直接设置环境变量）：

```bash
# .env 文件内容
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
TEST_APP_TOKEN=test_base_app_token
TEST_TABLE_ID=test_table_id
PROD_APP_TOKEN=prod_base_app_token
PROD_TABLE_ID=prod_table_id
```

**注意**：`.env` 文件不会被提交到git（已在.gitignore中）。

### 1.3 运行后端服务

```bash
# 在backend目录下
python main.py
```

或者使用 uvicorn：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

后端服务将在 `http://localhost:8000` 启动。

### 1.4 测试后端API

打开新的终端窗口，测试后端是否正常运行：

```bash
# 健康检查
curl http://localhost:8000/

# 测试获取批改数据（替换为实际的record_id）
curl -X POST http://localhost:8000/api/grade-data \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "test",
    "record_id": "recXXXXXXXXXX"
  }'
```

如果返回JSON数据，说明后端正常工作。

## 步骤2：配置前端

### 2.1 安装前端依赖（如果还没有）

```bash
# 在项目根目录
npm install
```

### 2.2 配置API地址

有两种方式配置前端连接到本地后端：

**方式1：使用环境变量（推荐）**

在项目根目录创建 `.env.local` 文件：

```bash
VITE_API_BASE_URL=http://localhost:8000
```

**方式2：修改代码**

修改 `src/components/GradeQueryPage.tsx` 文件，找到这一行：

```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://your-api-url.com';
```

改为：

```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
```

### 2.3 启动前端开发服务器

```bash
# 在项目根目录
npm run dev
```

前端将在 `http://localhost:3001` 启动（或查看终端输出的端口）。

## 步骤3：测试查询功能

### 3.1 访问查询页面

在浏览器中打开：

```
http://localhost:3001/?mode=query
```

### 3.2 测试流程

1. 选择环境（测试环境或线上环境）
2. 输入一个有效的记录ID
3. 点击"查看结果"按钮
4. 应该能看到批改结果的预览页面

### 3.3 调试技巧

**如果遇到问题，请检查：**

1. **后端服务是否运行**
   - 访问 `http://localhost:8000/` 应该返回健康检查消息

2. **前端是否能连接到后端**
   - 打开浏览器开发者工具（F12）
   - 查看Network标签，检查API请求是否成功
   - 查看Console标签，检查是否有错误信息

3. **环境变量是否正确**
   - 检查后端的 `.env` 文件
   - 检查前端的 `.env.local` 文件

4. **CORS问题**
   - 如果看到CORS错误，检查后端代码中的CORS配置
   - 确保 `allow_origins` 包含了前端地址

5. **记录ID是否正确**
   - 确保输入的记录ID在多维表格中存在
   - 确保该记录有批改结果数据

## 常见问题

### Q1: 后端启动失败

**错误：** `ModuleNotFoundError: No module named 'fastapi'`

**解决：** 
```bash
cd backend
pip install -r requirements.txt
```

### Q2: 前端无法连接后端

**错误：** `Failed to fetch` 或 CORS 错误

**解决：**
1. 确保后端服务正在运行
2. 检查API地址配置是否正确
3. 检查后端CORS配置

### Q3: 获取数据失败

**错误：** `获取批改结果失败` 或 `404 Not Found`

**解决：**
1. 检查环境变量是否正确配置（特别是 app_token 和 table_id）
2. 检查记录ID是否正确
3. 检查飞书应用是否有权限访问表格
4. 查看后端日志，检查具体错误信息

### Q4: 字段找不到

**错误：** `字段为空` 或 `404`

**解决：**
1. 确保表格中存在以下字段之一：
   - "自动批改结果参考"
   - "自动批改结果json链接"
2. 字段名称必须完全匹配（区分大小写）

## 测试数据准备

为了测试，你需要：

1. **一个测试环境的记录ID**
   - 在多维表格中找到一条有批改结果的记录
   - 复制该记录的ID（格式通常是 `recXXXXXXXXXX`）

2. **确保该记录有数据**
   - 在"自动批改结果参考"字段中有JSON数据
   - 或者在"自动批改结果json链接"字段中有有效的URL

## 下一步

本地测试通过后，可以：
1. 部署后端到腾讯云SCF（参考 `SCF_DEPLOY.md`）
2. 部署前端到生产环境
3. 更新API地址配置

