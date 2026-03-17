# OpenCLAW Traffic Monitor

<p align="center">
  <a href="#中文">中文</a> | <a href="#english">English</a>
</p>

---

<a id="中文"></a>

## 中文

一个实时监控 OpenCLAW Agent 使用情况的 Dashboard，展示真实的 Token 消耗、错误分析、定时任务执行情况等数据。

### 功能特性

- **实时用量监控** - 从 session 文件解析真实 Token 使用量
- **分时段分析** - 按小时查看 Token 消耗趋势
- **Agent 对比** - 各 Agent 用量横向对比
- **模型用量** - 各模型 Token 消耗统计
- **错误分析** - 按模型/时段/Agent 分析错误分布，支持模型筛选
- **工具调用成功率** - 按模型统计各工具调用成功率与排名
- **定时任务** - 监控 Cron 任务执行情况，支持时间范围切换
- **Agent 管理** - 浏览和编辑 Agent 的 MD 文件

### 环境要求

- **Node.js** >= 18.0
- **Python** >= 3.9
- **OpenCLAW** 已安装并运行

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/biily786063474-boop/Openclaw-glasses.git
cd Openclaw-glasses
```

#### 2. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

#### 3. 安装前端依赖

```bash
cd frontend
npm install
```

### 配置说明

#### 首次配置

```bash
cp backend/config.example.json backend/config.json
```

#### 编辑配置

打开 `backend/config.json`，修改 `openclaw_path` 为你的 OpenCLAW 路径：

```json
{
  "openclaw_path": "/home/你的用户名/.openclaw",
  "api_port": 8765,
  "cors_origins": [
    "http://localhost:3000",
    "http://localhost:3001"
  ]
}
```

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| openclaw_path | OpenCLAW 根目录路径 | ~/.openclaw |
| api_port | API 服务端口 | 8765 |
| cors_origins | 允许的前端跨域地址 | localhost:3000/3001 |

### 启动项目

#### 方式一：Mac 双击启动（推荐）

双击项目中的 `启动监控.command` 文件，自动完成配置、启动服务并打开浏览器。

#### 方式二：命令行启动

**Linux / macOS：**

```bash
chmod +x start.sh
./start.sh
```

**Windows：**

```bat
start.bat
```

#### 方式三：手动启动

```bash
# 启动后端
cd backend && python main.py

# 启动前端（另一个终端）
cd frontend && npm run dev
```

启动后访问 http://localhost:3000

### 页面说明

#### 1. 流量监控

展示总览统计卡片：Agent 总数、订阅模型数、Token 消耗、定时任务执行次数。

#### 2. Token 用量分析

当日数据分析：Tool Calls、Errors、Error Rate、Cache Hit Rate。图表包含分时段 Token 用量、Agent 对比、模型对比。

#### 3. 错误分析

- 按模型/时段/Agent 三维度分析错误分布
- 支持手动筛选隐藏模型
- 工具调用成功率统计（动态轴范围）
- 错误事件可展开查看详情 + 一键复制
- 支持 今日/3天/7天/30天 时间范围切换

#### 4. 定时任务

完整表格展示所有 Cron 任务的执行次数、Token 消耗。支持时间范围切换。

#### 5. Agent 管理

按 Agent 分组管理 MD 文件，支持在线编辑和搜索。

### 数据来源

| 数据 | 路径 |
|------|------|
| Agent 配置 | `~/.openclaw/openclaw.json` |
| Session 文件 | `~/.openclaw/agents/{agent_id}/sessions/*.jsonl` |
| MD 文件 | `~/.openclaw/agents/{agent_id}/workspace/*.md` |

### 常见问题

**Q: 打开页面是空的？**
检查后端是否启动（终端显示 `Uvicorn running`）、浏览器控制台错误、`config.json` 路径是否正确。

**Q: 数据显示为 0？**
确认 OpenCLAW 有使用记录，路径正确，点击刷新按钮。

**Q: 如何修改端口？**
修改 `backend/config.json` 中的 `api_port`，重启后端。

**Q: 支持其他设备访问？**
在 `cors_origins` 中添加对应 IP，如 `"http://192.168.1.100:3000"`。

### 技术栈

- **后端**: FastAPI + Python
- **前端**: React + Vite + Recharts
- **样式**: Glassmorphism Dark Theme

### 项目结构

```
.
├── backend/
│   ├── main.py              # FastAPI 服务入口
│   ├── db.py                # 数据读取
│   ├── usage.py             # Session 文件解析 & 错误分析
│   ├── providers.py         # 模型提供商统计
│   ├── config.json          # 本地配置
│   └── requirements.txt     # Python 依赖
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # 主组件
│   │   └── index.css        # 样式
│   └── package.json         # Node 依赖
├── start.sh                 # Linux/macOS 启动脚本
├── 启动监控.command          # Mac 双击启动
└── README.md
```

### 注意事项

1. 本项目**只读**取 OpenCLAW 数据，不会修改任何文件
2. 数据按 **UTC 时间** 计算，每天 UTC 0 点刷新
3. 需要 OpenCLAW 已配置并有使用记录才能看到数据

---

<a id="english"></a>

## English

A real-time dashboard for monitoring OpenCLAW Agent usage, displaying actual token consumption, error analysis, cron job execution, and more.

### Features

- **Real-time Usage Monitoring** - Parse actual token usage from session files
- **Hourly Analysis** - View token consumption trends by hour
- **Agent Comparison** - Side-by-side usage comparison across agents
- **Model Usage** - Token consumption statistics per model
- **Error Analysis** - Error distribution by model/time/agent with model filtering
- **Tool Call Success Rate** - Per-model tool call success rates and rankings
- **Cron Jobs** - Monitor cron task execution with time range switching
- **Agent Management** - Browse and edit agent MD files

### Requirements

- **Node.js** >= 18.0
- **Python** >= 3.9
- **OpenCLAW** installed and running

### Installation

#### 1. Clone the repository

```bash
git clone https://github.com/biily786063474-boop/Openclaw-glasses.git
cd Openclaw-glasses
```

#### 2. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

#### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

### Configuration

#### Initial setup

```bash
cp backend/config.example.json backend/config.json
```

#### Edit configuration

Open `backend/config.json` and set `openclaw_path` to your OpenCLAW directory:

```json
{
  "openclaw_path": "/home/yourname/.openclaw",
  "api_port": 8765,
  "cors_origins": [
    "http://localhost:3000",
    "http://localhost:3001"
  ]
}
```

| Option | Description | Default |
|--------|-------------|---------|
| openclaw_path | OpenCLAW root directory | ~/.openclaw |
| api_port | API server port | 8765 |
| cors_origins | Allowed frontend origins | localhost:3000/3001 |

### Getting Started

#### Option 1: Mac Double-Click Launch (Recommended)

Double-click `启动监控.command` in the project folder. It auto-configures, starts both services, and opens your browser.

#### Option 2: Command Line

**Linux / macOS:**

```bash
chmod +x start.sh
./start.sh
```

**Windows:**

```bat
start.bat
```

#### Option 3: Manual Start

```bash
# Start backend
cd backend && python main.py

# Start frontend (in another terminal)
cd frontend && npm run dev
```

Then visit http://localhost:3000

### Pages

#### 1. Traffic Overview

Summary cards: total agents, subscription models, token consumption, cron executions.

#### 2. Token Usage Analysis

Today's metrics: Tool Calls, Errors, Error Rate, Cache Hit Rate. Charts include hourly token usage, agent comparison, and model comparison.

#### 3. Error Analysis

- Error distribution across model, time period, and agent dimensions
- Manual model filtering (toggle visibility)
- Tool call success rates with dynamic axis range
- Expandable error event details with one-click copy
- Time range switching: Today / 3 Days / 7 Days / 30 Days

#### 4. Cron Jobs

Full table view of all cron tasks with execution counts and token consumption. Supports time range switching.

#### 5. Agent Management

Manage agent MD files grouped by agent, with online editing and search.

### Data Sources

| Data | Path |
|------|------|
| Agent config | `~/.openclaw/openclaw.json` |
| Session files | `~/.openclaw/agents/{agent_id}/sessions/*.jsonl` |
| MD files | `~/.openclaw/agents/{agent_id}/workspace/*.md` |

### FAQ

**Q: Page is blank?**
Check if the backend is running (`Uvicorn running` in terminal), browser console errors, and verify `config.json` path.

**Q: Data shows 0?**
Confirm OpenCLAW has session records, path is correct, and click the refresh button.

**Q: How to change ports?**
Edit `api_port` in `backend/config.json` and restart the backend.

**Q: Access from other devices?**
Add the device IP to `cors_origins`, e.g., `"http://192.168.1.100:3000"`.

### Tech Stack

- **Backend**: FastAPI + Python
- **Frontend**: React + Vite + Recharts
- **Style**: Glassmorphism Dark Theme

### Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── db.py                # Data access
│   ├── usage.py             # Session parsing & error analysis
│   ├── providers.py         # Model provider stats
│   ├── config.json          # Local config
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main component
│   │   └── index.css        # Styles
│   └── package.json         # Node dependencies
├── start.sh                 # Linux/macOS launcher
├── 启动监控.command          # Mac double-click launcher
└── README.md
```

### Notes

1. This project is **read-only** — it does not modify any OpenCLAW files
2. Data is calculated in **UTC time**, resetting daily at UTC 00:00
3. OpenCLAW must be configured and have usage records to display data
