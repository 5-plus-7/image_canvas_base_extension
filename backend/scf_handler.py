"""
腾讯云SCF入口函数
直接处理API Gateway事件，不使用Mangum适配器
此文件需要复制到scf_package目录中用于部署
"""
import json
import os
import sys
import asyncio
import traceback
from urllib.parse import parse_qs, urlencode

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(__file__))

from main import app

def main_handler(event, context):
    """
    腾讯云SCF入口函数
    直接处理API Gateway事件
    """
    try:
        # 打印事件信息用于调试
        print(f"Received event: {json.dumps(event, ensure_ascii=False)}")
        
        # 解析API Gateway事件
        path = event.get("path", "/")
        http_method = event.get("httpMethod", "GET").upper()
        headers = event.get("headers", {})
        query_params = event.get("queryStringParameters", {})
        
        # 处理查询参数
        query_string = ""
        if query_params:
            query_string = urlencode(query_params)
        
        # 解析请求体
        body = event.get("body", "")
        is_base64_encoded = event.get("isBase64Encoded", False)
        
        if body and is_base64_encoded:
            import base64
            body = base64.b64decode(body).decode('utf-8')
        
        # 尝试解析JSON body
        try:
            if body and headers.get("content-type", "").startswith("application/json"):
                body = json.loads(body)
        except:
            pass  # 保持原始字符串
        
        # 构建ASGI scope
        scope = {
            "type": "http",
            "method": http_method,
            "path": path,
            "query_string": query_string.encode(),
            "headers": [[k.lower().encode(), str(v).encode()] for k, v in headers.items()],
            "server": ("localhost", 80),
            "client": (headers.get("x-forwarded-for", "127.0.0.1"), 0),
        }
        
        # 创建异步任务
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            return loop.run_until_complete(handle_asgi_request(scope, body))
        finally:
            loop.close()
            
    except Exception as e:
        # 打印详细的错误信息
        error_info = {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "event": event
        }
        print(f"Error occurred: {json.dumps(error_info, ensure_ascii=False)}")
        
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "error": str(e),
                "message": "Internal server error"
            }, ensure_ascii=False)
        }

async def handle_asgi_request(scope, body):
    """处理ASGI请求"""
    # 创建接收和发送函数
    async def receive():
        return {
            "type": "http.request",
            "body": (json.dumps(body).encode() if isinstance(body, dict) else str(body).encode()) if body else b"",
            "more_body": False
        }
    
    response_parts = []
    
    async def send(message):
        response_parts.append(message)
    
    # 调用FastAPI应用
    await app(scope, receive, send)
    
    # 解析响应
    status_code = 200
    response_headers = {}
    response_body = b""
    
    for part in response_parts:
        if part.get("type") == "http.response.start":
            status_code = part.get("status", 200)
            response_headers = {k.decode(): v.decode() if isinstance(v, bytes) else v 
                              for k, v in part.get("headers", [])}
        elif part.get("type") == "http.response.body":
            response_body += part.get("body", b"")
    
    # 转换响应体为JSON字符串，确保编码一致
    try:
        # 尝试解析为JSON
        body_json = json.loads(response_body.decode())
        body_str = json.dumps(body_json, ensure_ascii=False)
    except:
        # 如果不是JSON，直接解码
        body_str = response_body.decode('utf-8')
    
    # 计算准确的内容长度（基于UTF-8编码）
    content_length = len(body_str.encode('utf-8'))
    
    # 构建响应头，只保留必要的头
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": str(content_length),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
    
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": body_str,
        "isBase64Encoded": False
    }

# 导出处理函数，确保SCF可以正确识别
handler = main_handler