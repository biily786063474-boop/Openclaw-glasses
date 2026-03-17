#!/bin/bash

# OpenCLAW Traffic Monitor - Mac 双击启动
# 双击此文件即可启动监控服务

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 默认端口
BACKEND_PORT=8765
FRONTEND_PORT=3000

clear
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   OpenCLAW Traffic Monitor 启动中...  ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════╝${NC}"
echo ""

# ========== 检查依赖 ==========
check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}错误: 未找到 $1，请先安装${NC}"
        echo "按任意键退出..."
        read -n 1
        exit 1
    fi
}

check_dependency python3
check_dependency node
check_dependency npm

# ========== 配置文件处理 ==========
CONFIG_FILE="backend/config.json"

if [ ! -f "$CONFIG_FILE" ]; then
    if [ -f "backend/config.example.json" ]; then
        echo -e "${YELLOW}首次启动，创建默认配置...${NC}"
        cat > "$CONFIG_FILE" << 'EOF'
{
  "openclaw_path": "~/.openclaw",
  "api_port": 8765,
  "cors_origins": [
    "http://localhost:3000",
    "http://localhost:3001"
  ]
}
EOF
        echo -e "${GREEN}已创建配置文件: $CONFIG_FILE${NC}"
        echo -e "${YELLOW}提示: 如需修改 OpenCLAW 路径，请编辑 $CONFIG_FILE${NC}"
    fi
fi

# 从配置文件读取端口
if [ -f "$CONFIG_FILE" ]; then
    CONFIGURED_PORT=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE')).get('api_port', 8765))" 2>/dev/null)
    if [ -n "$CONFIGURED_PORT" ]; then
        BACKEND_PORT=$CONFIGURED_PORT
    fi
fi

# ========== 端口检查 ==========
check_port() {
    if lsof -i :"$1" > /dev/null 2>&1; then
        return 1
    fi
    return 0
}

find_available_port() {
    local port=$1
    while ! check_port $port; do
        port=$((port + 1))
        if [ $port -gt $(($1 + 100)) ]; then
            echo "$1"
            return
        fi
    done
    echo $port
}

if ! check_port $BACKEND_PORT; then
    echo -e "${YELLOW}端口 $BACKEND_PORT 被占用，自动寻找可用端口...${NC}"
    BACKEND_PORT=$(find_available_port $BACKEND_PORT)
fi

if ! check_port $FRONTEND_PORT; then
    echo -e "${YELLOW}端口 $FRONTEND_PORT 被占用，自动寻找可用端口...${NC}"
    FRONTEND_PORT=$(find_available_port $FRONTEND_PORT)
fi

# ========== 安装依赖（如果需要）==========
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}首次启动，安装前端依赖...${NC}"
    cd frontend && npm install && cd ..
    echo ""
fi

# ========== 启动后端 ==========
echo -e "${GREEN}[1/2] 启动后端 (端口: $BACKEND_PORT)...${NC}"

# 更新配置文件端口
if [ -f "$CONFIG_FILE" ]; then
    python3 -c "
import json
with open('$CONFIG_FILE', 'r') as f:
    cfg = json.load(f)
cfg['api_port'] = $BACKEND_PORT
with open('$CONFIG_FILE', 'w') as f:
    json.dump(cfg, f, indent=2, ensure_ascii=False)
" 2>/dev/null
fi

cd backend
python3 main.py > /tmp/openclaw_backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
echo -n "  等待后端就绪"
for i in $(seq 1 10); do
    sleep 1
    echo -n "."
    if curl -s "http://localhost:$BACKEND_PORT" > /dev/null 2>&1; then
        break
    fi
done
echo ""

if curl -s "http://localhost:$BACKEND_PORT" > /dev/null 2>&1; then
    echo -e "  ${GREEN}后端启动成功${NC}"
else
    echo -e "  ${RED}后端启动失败，查看日志: /tmp/openclaw_backend.log${NC}"
    cat /tmp/openclaw_backend.log
    echo ""
    echo "按任意键退出..."
    read -n 1
    exit 1
fi

# ========== 启动前端 ==========
echo -e "${GREEN}[2/2] 启动前端 (端口: $FRONTEND_PORT)...${NC}"
cd frontend
VITE_PORT=$FRONTEND_PORT npm run dev > /tmp/openclaw_frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 3
echo -e "  ${GREEN}前端启动成功${NC}"

# ========== 完成 ==========
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          启动完成!                    ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "  监控面板: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  API 地址: ${GREEN}http://localhost:$BACKEND_PORT${NC}"
echo ""
echo -e "${YELLOW}关闭此窗口或按 Ctrl+C 停止服务${NC}"
echo ""

# 尝试自动打开浏览器
open "http://localhost:$FRONTEND_PORT" 2>/dev/null

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}正在停止服务...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}服务已停止${NC}"
    exit 0
}

trap cleanup INT TERM HUP

# 保持运行
wait
