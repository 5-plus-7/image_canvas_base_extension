#!/bin/bash
# 启动后端服务脚本

cd "$(dirname "$0")/backend"

# 检查虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 检查是否已安装依赖
if ! python -c "import fastapi" 2>/dev/null; then
    echo "安装Python依赖..."
    pip install -r requirements.txt
fi

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在！"
    echo "请先复制 .env.example 为 .env 并填入配置："
    echo "  cp .env.example .env"
    echo "然后编辑 .env 文件填入你的飞书应用凭证"
    exit 1
fi

# 启动服务
echo "启动后端服务..."
echo "服务地址: http://localhost:8000"
python main.py

