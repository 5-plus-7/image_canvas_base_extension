# 批改结果查询API后端服务

FastAPI后端服务，用于独立查询页面读取飞书多维表格数据。

## 功能

1. 支持测试环境和线上环境的配置
2. 通过记录ID查询批改结果JSON数据
3. 优先从"自动批改结果json链接"字段获取数据，否则从"自动批改结果参考"字段获取

## 环境变量配置

在部署前需要配置以下环境变量：

```bash
# 飞书应用配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# 测试环境配置
TEST_APP_TOKEN=test_base_app_token
TEST_TABLE_ID=test_table_id
TEST_INDEX_FIELD_NAME=索引  # 索引列字段名称（可选，默认为"索引"）

# 线上环境配置
PROD_APP_TOKEN=prod_base_app_token
PROD_TABLE_ID=prod_table_id
PROD_INDEX_FIELD_NAME=索引  # 索引列字段名称（可选，默认为"索引"）
```

## 本地开发

```bash
# 安装依赖
pip install -r requirements.txt

# 运行服务
python main.py

# 或使用uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 腾讯云SCF部署

### 1. 准备部署包

```bash
# 安装依赖到本地目录
pip install -r requirements.txt -t .

# 打包（不要包含虚拟环境）
zip -r function.zip . -x "*.git*" -x "*__pycache__*" -x "*.pyc" -x "env/*" -x "venv/*"
```

### 2. 创建云函数

1. 登录腾讯云控制台
2. 进入云函数SCF服务
3. 创建新函数
4. 选择"事件函数"
5. 运行环境：Python 3.9
6. 入口文件：`scf_handler.main_handler`
7. 上传zip包

### 3. 配置环境变量

在云函数配置中添加环境变量（见上方环境变量配置）

### 4. 配置API网关触发器

1. 在云函数中添加API网关触发器
2. 选择"API Gateway"
3. 配置路径和方法（如：POST `/api/grade-data`）
4. 启用集成响应

### 5. 测试

使用API Gateway提供的URL测试接口：

```bash
curl -X POST https://your-api-gateway-url/api/grade-data \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "test",
    "record_id": "your_record_id"
  }'
```

## API接口

### POST /api/grade-data

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

## 注意事项

1. 确保飞书应用有权限访问指定的多维表格
2. 字段名称必须匹配："自动批改结果参考" 或 "自动批改结果json链接"
3. 生产环境建议限制CORS的allow_origins为具体域名

