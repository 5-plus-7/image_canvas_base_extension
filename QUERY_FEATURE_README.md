# 批改结果查询功能说明

本文档说明新增的独立查询页面功能，该功能允许用户通过浏览器独立访问，查询并预览多维表格中的批改结果。

## 功能概述

新增了一个查询页面，用户可以：
1. 选择环境（测试环境/线上环境）
2. 输入记录ID
3. 查看对应记录的批改结果预览

## 文件结构

### 前端文件

- `src/components/GradeQueryPage.tsx` - 查询页面组件
- `src/components/GradeQueryPage.scss` - 查询页面样式
- `src/components/GradeExcalidrawPreview.tsx` - 已改造，支持独立模式
- `src/App.tsx` - 已更新，支持查询页面路由

### 后端文件

- `backend/main.py` - FastAPI后端服务主文件
- `backend/scf_handler.py` - 腾讯云SCF入口函数
- `backend/requirements.txt` - Python依赖包
- `backend/README.md` - 后端服务说明文档
- `backend/deploy.sh` - 部署脚本
- `backend/template.yaml` - Serverless部署模板

### 文档

- `SCF_DEPLOY.md` - 腾讯云SCF部署详细指南
- `QUERY_FEATURE_README.md` - 本文档

## 前端使用

### 访问查询页面

在浏览器中访问以下URL即可打开查询页面：

```
https://your-frontend-url/?mode=query
```

### 组件说明

#### GradeQueryPage

查询页面组件，包含：
- 环境选择（测试环境/线上环境）
- 记录ID输入框
- 查看结果按钮

#### GradeExcalidrawPreview（改造后）

原有的预览组件已改造，支持两种模式：

1. **原有模式**（在bitable插件中使用）：
   - 从bitable API读取数据
   - 显示导出功能

2. **独立模式**（在查询页面中使用）：
   - 通过props接收数据（`initialGradeData`）
   - 隐藏导出功能
   - 不依赖bitable API

### 环境变量配置

在前端项目中配置后端API地址：

**方式1：环境变量（推荐）**

创建`.env`文件：

```bash
VITE_API_BASE_URL=https://your-api-gateway-url
```

**方式2：代码中配置**

修改`src/components/GradeQueryPage.tsx`：

```typescript
const apiUrl = 'https://your-api-gateway-url';
```

## 后端使用

### 环境变量配置

部署后端服务前，需要配置以下环境变量：

```bash
# 飞书应用配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# 测试环境配置
TEST_APP_TOKEN=test_base_app_token
TEST_TABLE_ID=test_table_id

# 线上环境配置
PROD_APP_TOKEN=prod_base_app_token
PROD_TABLE_ID=prod_table_id
```

### API接口

#### POST /api/grade-data

获取批改结果数据

**请求体：**
```json
{
  "environment": "test",  // "test" 或 "production"
  "record_id": "recXXXXXXXXXX"
}
```

**响应：**
```json
{
  "success": true,
  "message": "获取成功",
  "data": "{...批改结果JSON字符串...}"
}
```

### 部署

详细部署步骤请参考 `SCF_DEPLOY.md`。

## 数据流程

1. 用户在查询页面选择环境和输入ID
2. 前端发送请求到后端API
3. 后端根据环境配置获取对应的app_token和table_id
4. 后端调用飞书API获取记录的字段数据
5. 后端优先从"自动批改结果json链接"字段获取数据，如果没有则从"自动批改结果参考"字段获取
6. 后端返回JSON数据给前端
7. 前端解析数据并显示在预览页面（使用改造后的GradeExcalidrawPreview组件）

## 字段要求

多维表格中需要包含以下字段之一：

- **"自动批改结果json链接"** - 存储JSON文件的URL链接（优先使用）
- **"自动批改结果参考"** - 直接存储JSON字符串

## 注意事项

1. **权限**：确保飞书应用有权限访问指定的多维表格
2. **字段名称**：字段名称必须完全匹配（区分大小写）
3. **数据格式**：批改结果数据必须是有效的JSON格式
4. **CORS**：确保后端API允许前端域名跨域访问
5. **安全性**：生产环境建议限制CORS来源和启用API鉴权

## 技术栈

### 前端
- React + TypeScript
- 基于现有GradeExcalidrawPreview组件改造

### 后端
- FastAPI
- Python 3.9
- httpx（HTTP客户端）
- Mangum（ASGI适配器，用于SCF）

### 部署
- 腾讯云SCF（Serverless Cloud Function）
- API Gateway（HTTP触发器）

## 故障排查

### 前端问题

1. **查询页面无法打开**
   - 检查URL参数是否正确（`?mode=query`）
   - 检查前端路由配置

2. **无法获取数据**
   - 检查后端API地址配置
   - 检查网络连接
   - 查看浏览器控制台错误信息

### 后端问题

1. **获取token失败**
   - 检查FEISHU_APP_ID和FEISHU_APP_SECRET是否正确
   - 检查飞书应用是否启用

2. **找不到记录**
   - 检查记录ID是否正确
   - 检查app_token和table_id配置是否正确

3. **字段为空**
   - 检查字段名称是否正确
   - 检查记录中该字段是否有值

## 更新日志

- 2024-XX-XX: 初始版本
  - 新增查询页面组件
  - 改造预览组件支持独立模式
  - 创建FastAPI后端服务
  - 配置腾讯云SCF部署

