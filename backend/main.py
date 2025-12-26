"""
FastAPI后端服务 - 批改结果查询API
用于独立查询页面读取飞书多维表格数据
"""
import os
import sys

# 确保优先使用虚拟环境的包，避免导入backend目录下的本地包
# 获取当前文件所在目录（backend目录）
current_dir = os.path.dirname(os.path.abspath(__file__))
# 从sys.path中移除backend目录，避免导入本地包
if current_dir in sys.path:
    sys.path.remove(current_dir)

# 将虚拟环境的site-packages放在最前面
if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
    venv_site_packages = os.path.join(sys.prefix, 'lib', f'python{sys.version_info.major}.{sys.version_info.minor}', 'site-packages')
    if os.path.exists(venv_site_packages):
        # 如果存在，移除后重新插入到最前面
        if venv_site_packages in sys.path:
            sys.path.remove(venv_site_packages)
        sys.path.insert(0, venv_site_packages)

import json
import logging
import httpx
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 尝试加载.env文件（本地开发时使用）
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # 如果没有安装python-dotenv，忽略
    pass

app = FastAPI(title="批改结果查询API")

# 配置CORS，允许前端跨域访问
# 生产环境建议通过环境变量限制allow_origins为具体域名
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
cors_origins = cors_origins_env.split(",") if cors_origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# 环境配置：测试环境和线上环境对应的app_token和table_id
ENV_CONFIG = {
    "test": {
        "app_token": os.getenv("TEST_APP_TOKEN", ""),
        "table_id": os.getenv("TEST_TABLE_ID", ""),
        "index_field_name": os.getenv("TEST_INDEX_FIELD_NAME", "索引"),  # 索引列字段名称
    },
    "production": {
        "app_token": os.getenv("PROD_APP_TOKEN", ""),
        "table_id": os.getenv("PROD_TABLE_ID", ""),
        "index_field_name": os.getenv("PROD_INDEX_FIELD_NAME", "索引"),  # 索引列字段名称
    },
}

# 飞书开放平台配置
FEISHU_APP_ID = os.getenv("FEISHU_APP_ID", "")
FEISHU_APP_SECRET = os.getenv("FEISHU_APP_SECRET", "")


class GradeDataRequest(BaseModel):
    """批改数据查询请求模型"""
    environment: str  # "test" or "production"
    record_id: str  # 索引列的单元格值（可能是数字或字符串）


class GradeDataResponse(BaseModel):
    success: bool
    message: str
    data: Optional[str] = None


def find_record_by_index_value(
    app_token: str,
    table_id: str,
    index_value: str,
    tenant_access_token: str,
    index_field_name: str = "索引"
) -> Optional[str]:
    """
    根据索引列的单元格值查找对应的record_id
    使用飞书搜索记录API，根据字段值过滤查询
    文档: https://open.feishu.cn/document/docs/bitable-v1/app-table-record/search
    """
    # 使用搜索API，根据字段值过滤
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/search"
    headers = {
        "Authorization": f"Bearer {tenant_access_token}",
        "Content-Type": "application/json",
    }
    
    # 处理索引值：如果是数字字符串，尝试转换为数字
    # 飞书API中，数字字段的值应该是数字类型
    index_value_trimmed = index_value.strip()
    try:
        # 尝试转换为整数（适用于数字类型的索引字段）
        filter_value = int(index_value_trimmed)
    except ValueError:
        # 如果转换失败，使用字符串（适用于文本类型的索引字段）
        filter_value = index_value_trimmed
    
    # 构建搜索请求体
    # 参考文档：https://open.feishu.cn/document/docs/bitable-v1/app-table-record/search
    payload = {
        "field_names": [
            index_field_name,  # 索引列字段
            "自动批改结果参考",  # 批改结果字段
            "自动批改结果json链接"  # 批改结果链接字段
        ],
        "sort": [
            {
                "field_name": index_field_name,
                "desc": False  # 不需要排序，但API要求必须有sort
            }
        ],
        "filter": {
            "conjunction": "and",
            "conditions": [
                {
                    "field_name": index_field_name,
                    "operator": "is",
                    "value": [filter_value]  # 使用处理后的值（可能是数字或字符串）
                }
            ]
        },
        "automatic_fields": False
    }
    
    with httpx.Client() as client:
        try:
            response = client.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"飞书API HTTP错误: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail=f"无法连接到飞书服务: {str(e)}"
            )
        except httpx.RequestError as e:
            logger.error(f"网络请求错误: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail=f"网络请求失败: {str(e)}"
            )
        
        if result.get("code") != 0:
            error_msg = result.get('msg', '未知错误')
            error_code = result.get('code', 0)
            
            logger.warning(f"搜索记录失败 - code: {error_code}, msg: {error_msg}, 索引值: {index_value}")
            
            # 如果是记录不存在或查询无结果，返回None而不是抛出异常
            if 'not found' in error_msg.lower() or error_code == 1254047:
                return None
            
            raise HTTPException(
                status_code=400,
                detail=f"搜索记录失败: {error_msg}"
            )
        
        data = result.get("data", {})
        records = data.get("items", [])
        
        # 如果找到记录，返回第一条的record_id
        if records:
            record_id = records[0].get("record_id")
            if record_id:
                logger.info(f"找到记录 - 索引值: {index_value}, record_id: {record_id}")
                return record_id
    
    # 没有找到匹配的记录
    logger.info(f"未找到匹配的记录 - 索引值: {index_value}, 字段名: {index_field_name}")
    return None


def get_tenant_access_token() -> str:
    """
    获取飞书tenant_access_token
    文档: https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token_internal
    """
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = {
        "app_id": FEISHU_APP_ID,
        "app_secret": FEISHU_APP_SECRET,
    }
    
    try:
        with httpx.Client() as client:
            response = client.post(url, json=payload, timeout=10)
            response.raise_for_status()
            result = response.json()
            
            if result.get("code") != 0:
                error_msg = result.get('msg', '未知错误')
                logger.error(f"获取token失败: {error_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=f"获取飞书访问令牌失败: {error_msg}"
                )
            
            token = result.get("tenant_access_token", "")
            if not token:
                logger.error("获取到的token为空")
                raise HTTPException(
                    status_code=500,
                    detail="获取飞书访问令牌失败: token为空"
                )
            
            return token
    except httpx.HTTPError as e:
        logger.error(f"获取token时网络错误: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"无法连接到飞书服务: {str(e)}"
        )


def get_record_field_value(
    app_token: str,
    table_id: str,
    record_id: str,
    tenant_access_token: str,
    field_name: str = "自动批改结果参考"
) -> Optional[str]:
    """
    获取记录指定字段的值
    文档: https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/get
    
    优先查找"自动批改结果json链接"字段，如果没有则查找"自动批改结果参考"字段
    """
    # 首先获取记录的所有字段数据
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}"
    headers = {
        "Authorization": f"Bearer {tenant_access_token}",
    }
    
    with httpx.Client() as client:
        try:
            response = client.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            result = response.json()
        except httpx.HTTPStatusError as e:
            # HTTP状态码错误
            raise HTTPException(
                status_code=503,
                detail=f"无法连接到飞书服务: {str(e)}"
            )
        except httpx.RequestError as e:
            # 网络请求错误
            raise HTTPException(
                status_code=503,
                detail=f"网络请求失败: {str(e)}"
            )
        
        if result.get("code") != 0:
            error_msg = result.get('msg', '未知错误')
            error_code = result.get('code', 0)
            
            # 如果是记录不存在，返回更友好的错误信息
            if 'RecordIdNotFound' in error_msg or error_code == 1254047:
                raise HTTPException(
                    status_code=404,
                    detail=f"记录ID {record_id} 不存在，请检查ID是否正确"
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"获取记录失败: {error_msg}"
                )
        
        record_data = result.get("data", {}).get("record", {})
        fields = record_data.get("fields", {})
        
        # 优先查找"自动批改结果json链接"字段
        link_field_name = "自动批改结果json链接"
        if link_field_name in fields:
            link_value_raw = fields[link_field_name]
            link_value = ""
            
            # 处理不同类型的字段值
            if isinstance(link_value_raw, list):
                # 列表格式，通常是IOpenSegment[]
                link_value = "".join([
                    str(item.get("text", "")) if isinstance(item, dict) else str(item)
                    for item in link_value_raw
                ])
            elif isinstance(link_value_raw, dict):
                # 字典格式
                link_value = link_value_raw.get("text", link_value_raw.get("link", ""))
                if not link_value:
                    link_value = str(link_value_raw)
            else:
                link_value = str(link_value_raw) if link_value_raw else ""
            
            if link_value and link_value.strip():
                # 如果有链接，尝试从链接获取JSON
                try:
                    link_response = httpx.get(link_value.strip(), timeout=30)
                    link_response.raise_for_status()
                    content = link_response.text
                    if content and content.strip():
                        return content
                except httpx.HTTPError as e:
                    logger.warning(f"从链接获取数据失败 (HTTP错误): {e}，尝试使用参考字段")
                except Exception as e:
                    logger.warning(f"从链接获取数据失败: {e}，尝试使用参考字段")
        
        # 如果没有链接字段或链接获取失败，使用参考字段
        if field_name in fields:
            field_value_raw = fields[field_name]
            
            # 处理不同类型的字段值
            if isinstance(field_value_raw, list):
                # 列表格式，通常是IOpenSegment[]
                field_value = "".join([
                    str(item.get("text", "")) if isinstance(item, dict) else str(item)
                    for item in field_value_raw
                ])
            elif isinstance(field_value_raw, dict):
                # 字典格式
                field_value = field_value_raw.get("text", "")
                if not field_value:
                    field_value = str(field_value_raw)
            else:
                field_value = str(field_value_raw) if field_value_raw else ""
            
            if field_value and field_value.strip():
                return field_value.strip()
        
        return None


@app.get("/")
async def root():
    """健康检查接口"""
    return {"message": "批改结果查询API服务运行中"}


@app.post("/api/grade-data", response_model=GradeDataResponse)
async def get_grade_data(request: GradeDataRequest):
    """
    根据环境和索引值获取批改结果数据
    
    Args:
        request: 包含environment（test/production）和record_id（实际是索引列的单元格值）
    
    Returns:
        GradeDataResponse: 包含批改结果JSON数据
    
    Raises:
        HTTPException: 各种错误情况（400, 404, 500, 503）
    """
    try:
        # 验证环境参数
        if request.environment not in ["test", "production"]:
            raise HTTPException(
                status_code=400,
                detail="environment参数必须是'test'或'production'"
            )
        
        # 获取环境配置
        env_config = ENV_CONFIG[request.environment]
        app_token = env_config["app_token"]
        table_id = env_config["table_id"]
        index_field_name = env_config.get("index_field_name", "索引")
        
        if not app_token or not table_id:
            raise HTTPException(
                status_code=500,
                detail=f"{request.environment}环境配置缺失，请检查环境变量"
            )
        
        if not FEISHU_APP_ID or not FEISHU_APP_SECRET:
            raise HTTPException(
                status_code=500,
                detail="飞书应用配置缺失，请检查FEISHU_APP_ID和FEISHU_APP_SECRET环境变量"
            )
        
        # 获取tenant_access_token
        tenant_access_token = get_tenant_access_token()
        
        # 先根据索引列的值查找record_id
        try:
            record_id = find_record_by_index_value(
                app_token=app_token,
                table_id=table_id,
                index_value=request.record_id,  # 这里实际是索引列的值
                tenant_access_token=tenant_access_token,
                index_field_name=index_field_name
            )
        except HTTPException:
            # 重新抛出HTTPException
            raise
        
        if not record_id:
            raise HTTPException(
                status_code=404,
                detail=f"未找到索引值为 '{request.record_id}' 的记录，请检查索引值是否正确"
            )
        
        # 获取记录字段值
        # 优先尝试"自动批改结果json链接"字段
        try:
            grade_data = get_record_field_value(
                app_token=app_token,
                table_id=table_id,
                record_id=record_id,  # 使用找到的record_id
                tenant_access_token=tenant_access_token,
                field_name="自动批改结果参考"
            )
        except HTTPException:
            # 重新抛出HTTPException（如记录不存在）
            raise
        
        if not grade_data:
            raise HTTPException(
                status_code=404,
                detail=f"索引值为 '{request.record_id}' 的记录的批改结果数据为空"
            )
        
        # 验证数据格式（尝试解析JSON）
        try:
            json.loads(grade_data)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="批改结果数据格式错误，无法解析为JSON"
            )
        
        return GradeDataResponse(
            success=True,
            message="获取成功",
            data=grade_data
        )
        
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        logger.error(f"获取批改数据时网络错误: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail=f"网络请求失败: {str(e)}"
        )
    except Exception as e:
        logger.error(f"获取批改数据时出错: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"服务器内部错误: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

