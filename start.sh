#!/bin/bash

# OpenCLAW Traffic Monitor 一键启动脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认端口
DEFAULT_BACKEND_PORT=8765
DEFAULT_FRONTEND_PORT=3000

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}  OpenCLAW Traffic Monitor 启动器  ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# 检查端口是否占用
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 1  # 端口被占用
    else
        return 0  # 端口可用
    fi
}

# 查找可用端口
find_available_port() {
    local start=$1
    local port=$start
    while ! check_port $port; do
        port=$((port + 1))
        if [ $port -gt $((start + 100)) ]; then
            echo -e "${RED}错误: 找不到可用端口${NC}"
            exit 1
        fi
    done
    echo $port
}

# 检查配置文件
check_config() {
    local config_file="backend/config.json"
    if [ ! -f "$config_file" ]; then
        if [ -f "backend/config.example.json" ]; then
            echo -e "${YELLOW}首次启动，需要配置 OpenCLAW 路径...${NC}"
            echo ""
            echo -n "请输入 OpenCLAW 目录路径 (默认: ~/.openclaw): "
            read openclaw_path
            if [ -z "$openclaw_path" ]; then
                openclaw_path="~/.openclaw"
            fi
            # 展开 ~
            openclaw_path=$(eval echo $openclaw_path)

            # 创建配置文件
            cat > "$config_file" << EOF
{
  "openclaw_path": "$openclaw_path",
  "api_port": $DEFAULT_BACKEND_PORT,
  "cors_origins": [
    "http://localhost:$DEFAULT_FRONTEND_PORT",
    "http://localhost:$((DEFAULT_FRONTEND_PORT + 1))"
  ]
}
EOF
            echo -e "${GREEN}配置文件已创建: $config_file${NC}"
        fi
    else
        # 检查 openclaw_path 是否配置
        if grep -q '"openclaw_path": ""' "$config_file" || ! grep -q '"openclaw_path"' "$config_file"; then
            echo -e "${YELLOW}请配置 OpenCLAW 路径...${NC}"
            echo -n "请输入 OpenCLAW 目录路径: "
            read openclaw_path
            if [ -z "$openclaw_path" ]; then
                openclaw_path="~/.openclaw"
            fi
            openclaw_path=$(eval echo $openclaw_path)
            sed -i '' "s|\"openclaw_path\": \".*\"|\"openclaw_path\": \"$openclaw_path\"|" "$config_file"
            echo -e "${GREEN}配置文件已更新${NC}"
        fi
    fi

    # 显示当前配置
    if [ -f "$config_file" ]; then
        echo ""
        echo -e "${GREEN}当前配置:${NC}"
        cat "$config_file"
        echo ""
    fi
}

# 端口选择
echo "请选择启动模式:"
echo "  1) 默认端口 (后端:8765, 前端:3000)"
echo "  2) 自定义端口"
echo ""
echo -n "请输入选项 (1-2, 默认1): "
read choice

case $choice in
    2)
        echo -n "请输入后端端口 (默认 $DEFAULT_BACKEND_PORT): "
        read backend_port
        if [ -z "$backend_port" ]; then
            backend_port=$DEFAULT_BACKEND_PORT
        fi

        echo -n "请输入前端端口 (默认 $DEFAULT_FRONTEND_PORT): "
        read frontend_port
        if [ -z "$frontend_port" ]; then
            frontend_port=$DEFAULT_FRONTEND_PORT
        fi
        ;;
    *)
        backend_port=$DEFAULT_BACKEND_PORT
        frontend_port=$DEFAULT_FRONTEND_PORT
        ;;
esac

echo ""
echo -e "${YELLOW}启动配置:${NC}"
echo "  后端端口: $backend_port"
echo "  前端端口: $frontend_port"
echo ""

# 检查并更新配置文件中的端口
if [ -f "backend/config.json" ]; then
    sed -i '' "s/\"api_port\": [0-9]*/\"api_port\": $backend_port/" backend/config.json
    sed -i '' "s|http://localhost:[0-9]*|http://localhost:$frontend_port|g" backend/config.json
fi

# 检查端口
if ! check_port $backend_port; then
    echo -e "${YELLOW}端口 $backend_port 被占用，尝试查找可用端口...${NC}"
    backend_port=$(find_available_port $backend_port)
    echo -e "${GREEN}后端使用端口: $backend_port${NC}"
fi

if ! check_port $frontend_port; then
    echo -e "${YELLOW}端口 $frontend_port 被占用，尝试查找可用端口...${NC}"
    frontend_port=$(find_available_port $frontend_port)
    echo -e "${GREEN}前端使用端口: $frontend_port${NC}"
fi

echo ""
echo -e "${GREEN}正在启动服务...${NC}"

# 启动后端
echo -e "${GREEN}[1/2] 启动后端...${NC}"
cd backend
if ! python3 main.py > /tmp/openclaw_backend.log 2>&1 & then
    echo -e "${RED}后端启动失败，请查看日志: /tmp/openclaw_backend.log${NC}"
    exit 1
fi
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 2

# 检查后端是否启动成功
if ! curl -s http://localhost:$backend_port > /dev/null 2>&1; then
    echo -e "${RED}后端启动失败${NC}"
    cat /tmp/openclaw_backend.log
    exit 1
fi
echo -e "${GREEN}后端启动成功 (PID: $BACKEND_PID)${NC}"

# 启动前端
echo -e "${GREEN}[2/2] 启动前端...${NC}"
cd frontend
# 修改 vite 配置端口
if [ "$frontend_port" != "3000" ]; then
    # 创建或修改 .env 文件
    echo "VITE_PORT=$frontend_port" > .env
fi
npm run dev > /tmp/openclaw_frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 等待前端启动
sleep 3

echo -e "${GREEN}前端启动成功 (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}  启动完成！                     ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "访问地址: ${GREEN}http://localhost:$frontend_port${NC}"
echo -e "API 地址:  ${GREEN}http://localhost:$backend_port${NC}"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
echo ""
echo "后端日志: /tmp/openclaw_backend.log"
echo "前端日志: /tmp/openclaw_frontend.log"
echo ""

# 等待用户中断
trap "echo ''; echo -e '${YELLOW}正在停止服务...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
