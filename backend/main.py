import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from db import (
    get_all_agents_data,
    get_stats_summary,
    get_models_usage,
    get_all_md_files,
    get_all_md_files_grouped,
    get_md_file_content,
    save_md_file,
    config
)
from providers import get_model_usage_summary, get_all_providers_usage
from usage import get_all_agents_usage, get_total_usage, get_hourly_usage, get_cron_usage, get_error_analysis

app = FastAPI(title="OpenCLAW Traffic Monitor", version="1.0.0")

# 从配置读取 CORS
cors_origins = config.get('cors_origins', ["*"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== 流量监控 API ==========

@app.get("/api/agents")
async def get_agents():
    """获取所有 agent 及其统计"""
    return {"agents": get_all_agents_data()}


@app.get("/api/stats")
async def get_stats():
    """获取总体统计"""
    return get_stats_summary()


@app.get("/api/models")
async def get_models():
    """获取模型使用统计"""
    return {"models": get_models_usage()}


@app.get("/api/usage")
async def get_usage():
    """获取真实的使用量（从 session 文件解析）- 今日数据"""
    return get_total_usage(hours=24, today_only=True)


@app.get("/api/usage/hourly")
async def get_hourly_usage_endpoint():
    """获取分小时使用量 - 今日数据"""
    return {"hourly": get_hourly_usage(hours=24)}


@app.get("/api/usage/agents")
async def get_agents_usage():
    """获取各 Agent 使用量 - 今日数据"""
    return {"agents": get_all_agents_usage(hours=24, today_only=True)}


@app.get("/api/usage/cron")
async def get_cron_usage_endpoint(range: str = "today"):
    """获取定时任务使用量，支持 range 参数: today, 3d, 7d, 30d"""
    if range == "today":
        return get_cron_usage(hours=24, today_only=True)
    hours_map = {"3d": 72, "7d": 168, "30d": 720}
    hours = hours_map.get(range, 24)
    return get_cron_usage(hours=hours, today_only=False)


@app.get("/api/usage/errors")
async def get_error_analysis_endpoint(range: str = "today"):
    """获取错误分析数据，支持 range 参数: today, 3d, 7d, 30d"""
    if range == "today":
        return get_error_analysis(hours=24, today_only=True)
    hours_map = {"3d": 72, "7d": 168, "30d": 720}
    hours = hours_map.get(range, 24)
    return get_error_analysis(hours=hours, today_only=False)


@app.get("/api/providers")
async def get_providers():
    """获取所有提供商详细信息"""
    return {"providers": get_all_providers_usage()}


# ========== MD 文件管理 API ==========

@app.get("/api/md-files")
async def list_md_files():
    """获取所有 MD 文件列表（按 Agent 分组）"""
    return {"files": get_all_md_files_grouped()}


@app.get("/api/md-files/content")
async def read_md_file(path: str):
    """读取 MD 文件内容"""
    result = get_md_file_content(path)
    if 'error' in result:
        raise HTTPException(status_code=404, detail=result['error'])
    return result


class SaveMdRequest(BaseModel):
    path: str
    content: str


@app.post("/api/md-files/save")
async def write_md_file(request: SaveMdRequest):
    """保存 MD 文件内容"""
    result = save_md_file(request.path, request.content)
    if 'error' in result:
        raise HTTPException(status_code=500, detail=result['error'])
    return result


# ========== 根路径 ==========

@app.get("/")
async def root():
    return {
        "name": "OpenCLAW 流量监控 API",
        "version": "1.1.0",
        "openclaw_path": str(config.get('openclaw_path', '~/.openclaw')),
        "pages": {
            "/": "流量监控首页",
            "/files": "MD 文件管理"
        },
        "endpoints": {
            "/api/agents": "获取所有 agent 数据",
            "/api/stats": "获取总体统计",
            "/api/models": "获取模型使用情况",
            "/api/md-files": "获取 MD 文件列表",
            "/api/md-files/content?path=xxx": "读取 MD 文件内容",
            "/api/md-files/save": "保存 MD 文件内容",
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = config.get('api_port', 8765)
    print(f"Starting OpenCLAW Traffic Monitor API on port {port}...")
    print(f"OpenCLAW 路径: {config.get('openclaw_path', '~/.openclaw')}")
    uvicorn.run(app, host="0.0.0.0", port=port)
