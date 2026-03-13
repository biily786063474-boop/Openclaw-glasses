# OpenCLAW 流量监控

一个实时监控 OpenCLAW Agent 使用情况的 Dashboard，展示真实的 Token 消耗、消息数量、定时任务执行情况等数据。

## 功能特性

- **实时用量监控** - 从 session 文件解析真实 Token 使用量
- **分时段分析** - 按小时查看 Token 消耗趋势
- **Agent 对比** - 各 Agent 用量横向对比
- **模型用量** - 各模型 Token 消耗统计
- **定时任务** - 监控 Cron 任务执行情况
- **Agent 管理** - 浏览和编辑 Agent 的 MD 文件

---

## 环境要求

- **Node.js** >= 18.0
- **Python** >= 3.9
- **OpenCLAW** 已安装并运行

---

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/你的用户名/Openclaw-glasses.git
cd Openclaw-glasses
```

### 2. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

### 3. 安装前端依赖

```bash
cd frontend
npm install
```

---

## 配置说明

### 首次配置

项目目录下有一个配置文件模板，首次使用需要复制并配置：

```bash
# 复制配置模板
cp backend/config.example.json backend/config.json
```

### 编辑配置

用文本编辑器打开 `backend/config.json`，修改 `openclaw_path` 为你的 OpenCLAW 路径：

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

**配置项说明：**

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| openclaw_path | OpenCLAW 根目录路径 | ~/.openclaw |
| api_port | API 服务端口 | 8765 |
| cors_origins | 允许的前端跨域地址 | localhost:3000/3001 |

---

## 启动项目

### 启动后端

```bash
cd backend
python main.py
```

后端启动成功后显示：
```
Starting OpenCLAW Traffic Monitor API on port 8765...
OpenCLAW 路径: /home/username/.openclaw
```

### 启动前端

```bash
cd frontend
npm run dev
```

前端启动成功后，访问 http://localhost:3000

### 一键启动（推荐）

项目提供了跨平台的一键启动脚本，自动处理配置和端口问题：

#### Linux / macOS

```bash
chmod +x start.sh
./start.sh
```

#### Windows

```bat
start.bat
```

一键启动脚本功能：
- 自动检测并创建配置文件（首次启动）
- 支持选择默认端口或自定义端口
- 自动检测端口占用并寻找可用端口
- 同时启动后端和前端服务
- Ctrl+C 或关闭窗口即可停止服务

---

## 页面说明

### 1. 流量监控

展示四个统计卡片：
- **Agent 总数** - 配置的 Agent 数量
- **订阅模型** - 使用订阅制模型的 Agent
- **Token** - 真实 API Token 消耗
- **定时任务** - Cron 任务执行次数

### 2. Token用量分析

当日数据分析：
- **Tool Calls** - Agent 调用工具的总次数
- **Errors** - 运行过程中的错误次数
- **Error Rate** - 错误率
- **Cache Hit Rate** - 缓存命中率

图表：
- 分时段 Token 使用量
- Agent Token 用量对比
- 模型 Token 用量对比

### 3. 定时任务

监控 OpenCLAW 的定时任务：
- 任务执行次数
- Token 消耗
- 各任务详情列表

### 4. Agent 管理

管理各 Agent 的 MD 文件：
- 按 Agent 分组显示
- 支持在线编辑
- 文件搜索

---

## 数据来源

本项目从以下位置读取数据：

1. **Agent 配置** - `~/.openclaw/openclaw.json`
2. **Session 文件** - `~/.openclaw/agents/{agent_id}/sessions/*.jsonl`
3. **MD 文件** - `~/.openclaw/agents/{agent_id}/workspace/*.md`

---

## 常见问题

### Q: 打开页面是空的怎么办？

1. 检查后端是否启动成功（终端显示 `Uvicorn running on http://0.0.0.0:8765`）
2. 检查浏览器控制台是否有错误
3. 确认 `config.json` 中的 `openclaw_path` 正确

### Q: 数据显示为 0 怎么办？

1. 确认 OpenCLAW 正在使用中（有会话记录）
2. 检查 OpenCLAW 路径是否正确
3. 点击页面上的"刷新"按钮

### Q: 如何修改端口？

修改 `backend/config.json` 中的 `api_port` 项，然后重启后端。

### Q: 支持其他设备访问吗？

可以。在 `cors_origins` 中添加对应 IP 地址，例如：
```json
"cors_origins": [
  "http://localhost:3000",
  "http://192.168.1.100:3000"
]
```

---

## 技术栈

- **后端**: FastAPI + SQLite
- **前端**: React + Vite + Recharts
- **样式**: Glassmorphism Dark Theme

---

## 项目结构

```
.
├── backend/
│   ├── main.py              # FastAPI 服务入口
│   ├── db.py               # 数据库读取
│   ├── usage.py            # Session 文件解析
│   ├── providers.py        # 模型提供商统计
│   ├── config.json         # 本地配置
│   └── requirements.txt    # Python 依赖
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # 主组件
│   │   └── index.css      # 样式
│   └── package.json       # Node 依赖
└── README.md               # 项目文档
```

---

## 注意事项

1. 本项目**只读**取 OpenCLAW 数据，不会修改任何文件
2. 数据按 **UTC 时间** 计算，每天 UTC 0 点刷新
3. 需要 OpenCLAW 已配置并有使用记录才能看到数据
