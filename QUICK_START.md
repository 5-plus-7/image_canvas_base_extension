# 快速开始 - 本地测试

## 第一步：配置并启动后端

```bash
# 1. 进入后端目录
cd backend

# 2. 创建虚拟环境（首次运行）
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 复制并配置环境变量
cp .env.example .env
# 然后编辑 .env 文件，填入你的飞书应用凭证和表格信息

# 5. 启动后端服务
python main.py
# 或者使用: uvicorn main:app --reload
```

后端将在 `http://localhost:8000` 启动

## 第二步：配置并启动前端

```bash
# 1. 在项目根目录创建环境变量文件
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local

# 2. 安装依赖（如果还没有）
npm install

# 3. 启动前端开发服务器
npm run dev
```

前端将在 `http://localhost:3001` 启动

## 第三步：测试

1. 在浏览器中打开: `http://localhost:3001/?mode=query`
2. 选择环境（测试环境或线上环境）
3. 输入一个有效的记录ID
4. 点击"查看结果"按钮

## 需要帮助？

查看详细文档：`LOCAL_TEST.md`
