#!/bin/bash
# 启动前端服务脚本

cd "$(dirname "$0")"

# 检查node_modules是否存在
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

# 检查.env.local文件是否存在
if [ ! -f ".env.local" ]; then
    echo "创建 .env.local 文件..."
    echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
fi

# 启动开发服务器
echo "启动前端开发服务器..."
echo "服务地址: http://localhost:3001"
npm run dev

