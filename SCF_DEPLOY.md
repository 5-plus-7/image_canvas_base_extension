# 腾讯云SCF部署指南

本指南介绍如何将批改结果查询API部署到腾讯云Serverless Cloud Function (SCF)。

## 前置要求

1. 腾讯云账号
2. 已创建飞书应用并获取App ID和App Secret
3. 已准备好测试环境和线上环境的多维表格app_token和table_id

## 方式一：通过腾讯云控制台部署（推荐）

### 1. 准备部署包

> **注意**：必须在 `backend/` 目录下执行以下命令，确保 `scf_handler.py` 位于 zip 根目录。

```bash
cd backend

# 安装依赖到当前目录（用于SCF部署，需指定Linux平台）
pip install -r requirements.txt -t . \
    --platform manylinux2014_x86_64 \
    --only-binary=:all: \
    --python-version 3.9

# 创建部署包（排除不必要的文件）
zip -r function.zip . \
    -x "*.git*" \
    -x "*__pycache__*" \
    -x "*.pyc" \
    -x "*.pyo" \
    -x "env/*" \
    -x "venv/*" \
    -x ".venv/*" \
    -x "*.egg-info/*" \
    -x "*.md" \
    -x "template.yaml"
```

### 2. 创建云函数

1. 登录[腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入[云函数SCF服务](https://console.cloud.tencent.com/scf)
3. 点击"新建" → "自定义创建"
4. 填写基本信息：
   - **函数名称**：`grade-query-api`
   - **运行环境**：Python 3.9
   - **部署方式**：本地上传zip包
   - **提交方法**：上传zip包
   - 上传刚才创建的`function.zip`

### 3. 配置函数

在函数配置页面：

1. **函数代码**：
   - 入口文件：`scf_handler.main_handler`

2. **环境变量**：
   ```
   FEISHU_APP_ID=your_app_id
   FEISHU_APP_SECRET=your_app_secret
   TEST_APP_TOKEN=test_base_app_token
   TEST_TABLE_ID=test_table_id
   PROD_APP_TOKEN=prod_base_app_token
   PROD_TABLE_ID=prod_table_id
   ```

3. **高级配置**：
   - **执行超时时间**：30秒
   - **内存**：256MB
   - **临时磁盘空间**：512MB（如果需要）

### 4. 启用函数URL

> **注意**：API 网关触发器已于2024年7月停止新建，请使用函数URL代替。

1. 在函数详情页面，进入"函数管理" → "函数URL"
2. 开启函数URL
3. 认证方式选择"不认证"（或根据需要选择）

开启后会生成访问地址，例如：
```
https://xxxxxxxxxx-xxxxxxxxxx.ap-beijing.tencentscf.com
```

### 5. 配置前端API地址

在前端项目根目录编辑 `.env.local` 文件：

```bash
VITE_API_BASE_URL=https://xxxxxxxxxx-xxxxxxxxxx.ap-beijing.tencentscf.com
```

然后重新构建前端：

```bash
npm run build
```

将更新后的 `dist/` 目录部署到飞书插件后台。

## 测试API

### 使用curl测试

```bash
curl -X POST https://your-function-url/api/grade-data \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "test",
    "record_id": "recXXXXXXXXXX"
  }'
```

### 使用Postman测试

1. 创建POST请求
2. URL: `https://your-function-url/api/grade-data`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "environment": "test",
  "record_id": "recXXXXXXXXXX"
}
```

## 访问独立查询页面

部署前端后，可以通过以下URL访问查询页面：

```
https://your-frontend-url/?mode=query
```

## 常见问题

### 1. 函数执行超时

如果遇到超时，可以：
- 增加超时时间（最大900秒）
- 检查网络连接
- 优化代码逻辑

### 2. 权限错误

确保：
- 飞书应用有权限访问指定的多维表格
- App ID和App Secret正确
- 环境变量配置正确

### 3. 字段找不到

确保多维表格中存在以下字段之一：
- "自动批改结果参考"
- "自动批改结果json链接"

### 4. CORS错误

函数URL默认支持CORS，后端代码中已配置 `Access-Control-Allow-Origin: *`。如需限制来源，修改后端 `.env` 中的 `CORS_ORIGINS` 配置。

### 5. pydantic版本冲突

如果部署后报错 `No module named 'pydantic_core._pydantic_core'`，说明 `backend/` 目录下残留了 pydantic v2 的文件。解决方法：
```bash
cd backend
rm -rf pydantic pydantic_core pydantic-2.* pydantic_core-*
pip install pydantic==1.10.12 -t . --platform manylinux2014_x86_64 --only-binary=:all: --python-version 3.9
```

## 监控和日志

1. 在腾讯云控制台查看函数执行日志
2. 监控函数的调用次数和错误率

## 更新部署

### 更新后端代码

```bash
cd backend

# 修改代码后，重新打包
zip -r function.zip . \
    -x "*.git*" "*__pycache__*" "*.pyc" "*.pyo" \
    -x "env/*" "venv/*" ".venv/*" "*.egg-info/*" \
    -x "*.md" "template.yaml"

# 在腾讯云控制台上传新的zip包
```

### 更新前端代码

```bash
# 重新构建
npm run build

# 将 dist/ 目录重新部署到飞书插件后台
```

## 安全建议

1. 生产环境建议限制CORS的允许来源
2. 使用环境变量存储敏感信息，不要将凭证提交到代码仓库
3. 定期更新依赖包
4. 监控异常访问
