# 腾讯云SCF部署指南

本指南介绍如何将批改结果查询API部署到腾讯云Serverless Cloud Function (SCF)。

## 前置要求

1. 腾讯云账号
2. 已创建飞书应用并获取App ID和App Secret
3. 已准备好测试环境和线上环境的多维表格app_token和table_id

## 方式一：通过腾讯云控制台部署（推荐）

### 1. 准备部署包

```bash
cd backend

# 安装依赖到当前目录
pip install -r requirements.txt -t .

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
    -x "deploy.sh" \
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

### 4. 创建API网关触发器

1. 在函数详情页面，点击"触发管理" → "创建触发器"
2. 选择**API Gateway**
3. 配置触发器：
   - **API服务类型**：新建API服务
   - **请求方法**：ANY（支持所有HTTP方法）
   - **发布环境**：发布
   - **鉴权方式**：免鉴权（或根据需要选择）
   - **路径**：`/{proxy+}`（支持所有路径）
   - **启用CORS**：是
4. 点击"提交"

### 5. 获取访问地址

创建触发器后，会生成一个API Gateway访问地址，例如：
```
https://service-xxxxx-xxxxx.ap-guangzhou.apigateway.myqcloud.com/release/
```

## 方式二：使用Serverless Framework部署

### 1. 安装Serverless Framework

```bash
npm install -g serverless
```

### 2. 配置腾讯云凭证

```bash
# 配置腾讯云账号信息
serverless config credentials \
  --provider tencent \
  --key YOUR_SECRET_ID \
  --secret YOUR_SECRET_KEY
```

### 3. 部署

```bash
cd backend

# 使用部署脚本
./deploy.sh

# 或手动部署
serverless deploy
```

## 配置前端API地址

部署完成后，在前端项目的环境变量或配置文件中设置API地址：

### 方式1：使用环境变量（推荐）

创建`.env`文件或配置Vite环境变量：

```bash
VITE_API_BASE_URL=https://your-api-gateway-url
```

### 方式2：直接修改代码

在`src/components/GradeQueryPage.tsx`中修改API地址：

```typescript
const apiUrl = 'https://your-api-gateway-url';
```

## 测试API

### 使用curl测试

```bash
curl -X POST https://your-api-gateway-url/api/grade-data \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "test",
    "record_id": "recXXXXXXXXXX"
  }'
```

### 使用Postman测试

1. 创建POST请求
2. URL: `https://your-api-gateway-url/api/grade-data`
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

或

```
https://your-frontend-url/query
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

在API Gateway触发器配置中启用CORS，或在代码中配置正确的CORS设置。

## 监控和日志

1. 在腾讯云控制台查看函数执行日志
2. 查看API Gateway的访问日志
3. 监控函数的调用次数和错误率

## 更新部署

### 更新代码

```bash
# 修改代码后，重新打包
zip -r function.zip . -x "*.git*" "*__pycache__*" "*.pyc" "env/*" "venv/*" "*.md"

# 在控制台上传新的zip包
# 或使用Serverless Framework
serverless deploy
```

## 安全建议

1. 生产环境建议启用API Gateway的鉴权
2. 限制CORS的允许来源
3. 使用环境变量存储敏感信息
4. 定期更新依赖包
5. 监控异常访问

