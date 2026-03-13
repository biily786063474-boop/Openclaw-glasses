import os
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

# 导入 usage 模块获取真实使用量
from usage import get_agent_usage

# 加载配置
CONFIG_FILE = Path(__file__).parent / "config.json"

def load_config() -> dict:
    """加载配置文件"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "openclaw_path": "~/.openclaw",
        "api_port": 8765,
        "cors_origins": ["*"]
    }

config = load_config()

# OpenCLAW 路径配置
openclaw_path = config.get('openclaw_path', '~/.openclaw')
OPENCLAW_PATH = Path(os.path.expanduser(openclaw_path))
CONFIG_FILE_PATH = OPENCLAW_PATH / "openclaw.json"
LOG_FILE = OPENCLAW_PATH / "logs" / "gateway.log"
WORKSPACE_PATH = OPENCLAW_PATH / "workspace"


def load_openclaw_config() -> dict:
    """加载 OpenCLAW 配置文件"""
    if not CONFIG_FILE_PATH.exists():
        raise FileNotFoundError(f"配置文件不存在: {CONFIG_FILE_PATH}")

    with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_agents_from_config(config: dict) -> List[Dict]:
    """从配置中获取 agent 列表"""
    agents_list = config.get('agents', {}).get('list', [])
    defaults = config.get('agents', {}).get('defaults', {})

    agents = []
    for agent in agents_list:
        agent_id = agent.get('id', agent.get('name', 'unknown'))

        # 获取模型配置
        agent_model = agent.get('model', {})
        if agent_model:
            primary_model = agent_model.get('primary', defaults.get('model', {}).get('primary', 'unknown'))
        else:
            primary_model = defaults.get('model', {}).get('primary', 'unknown')

        # 简化模型名称
        model_name = primary_model.split('/')[-1] if '/' in primary_model else primary_model

        # 获取 workspace 路径
        workspace = agent.get('workspace', '')

        agents.append({
            'id': agent_id,
            'name': agent.get('identity', {}).get('name', agent_id.capitalize()),
            'emoji': agent.get('identity', {}).get('emoji', ''),
            'model': model_name,
            'model_full': primary_model,
            'workspace': workspace,
        })

    return agents


def find_md_files(workspace_path: Path, agent_id: str) -> List[Dict]:
    """查找 workspace 根目录下的 MD 文件"""
    md_files = []

    if not workspace_path or not workspace_path.exists():
        return md_files

    try:
        # 只遍历根目录下的 MD 文件
        for md_file in workspace_path.glob("*.md"):
            # 忽略特定目录
            if any(skip in md_file.parts for skip in ['node_modules', '.git', '.obsidian', 'archive']):
                continue

            try:
                stat = md_file.stat()
                md_files.append({
                    'name': md_file.name,
                    'path': str(md_file),
                    'relative_path': md_file.name,
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'agent_id': agent_id,
                    'is_root': True,
                })
            except Exception:
                continue
    except Exception as e:
        print(f"查找 MD 文件错误: {e}")

    return md_files


def get_all_agents_with_workspaces() -> List[Dict]:
    """获取所有 agent 及其 workspace 中的 MD 文件"""
    try:
        openclaw_config = load_openclaw_config()
    except Exception as e:
        print(f"加载配置错误: {e}")
        return []

    agents = get_agents_from_config(openclaw_config)

    # 为每个 agent 获取其 workspace 的根目录 MD 文件
    for agent in agents:
        agent_files = []

        # 先获取主 workspace 的文件（适用于 main agent）
        if agent['id'] == 'main' and WORKSPACE_PATH.exists():
            agent_files.extend(find_md_files(WORKSPACE_PATH, 'main'))

        # 获取 agent 自己 workspace 的文件
        if agent['workspace']:
            workspace = Path(agent['workspace'])
            if workspace.exists():
                agent_files.extend(find_md_files(workspace, agent['id']))

        # 按修改时间排序
        agent_files.sort(key=lambda x: x.get('modified', ''), reverse=True)

        # 去重
        seen = set()
        unique_files = []
        for f in agent_files:
            if f['path'] not in seen:
                seen.add(f['path'])
                unique_files.append(f)

        agent['md_files'] = unique_files

    return agents


def parse_gateway_logs() -> Dict:
    """解析 gateway.log 获取使用统计"""
    stats = {
        'total_messages': 0,
        'agents': {},
        'last_updated': None
    }

    if not LOG_FILE.exists():
        return stats

    try:
        with open(LOG_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # 只解析最近 5000 行
        recent_lines = lines[-5000:] if len(lines) > 5000 else lines

        for line in recent_lines:
            # 查找 agent 消息
            if 'dispatching to agent' in line or 'agent:' in line:
                stats['total_messages'] += 1

                # 提取 agent 名称
                for agent_id in ['main', 'assistant', 'creative', 'researcher', 'developer']:
                    if f'agent:{agent_id}' in line or f'agent/{agent_id}' in line:
                        if agent_id not in stats['agents']:
                            stats['agents'][agent_id] = {'messages': 0, 'last_active': None}
                        stats['agents'][agent_id]['messages'] += 1

    except Exception as e:
        print(f"解析日志错误: {e}")

    return stats


def get_all_agents_data() -> List[Dict]:
    """获取所有 agent 的完整数据"""
    try:
        openclaw_config = load_openclaw_config()
    except Exception as e:
        print(f"加载配置错误: {e}")
        return []

    agents = get_agents_from_config(openclaw_config)

    # 获取模型价格信息（用于订阅追踪）
    models_config = openclaw_config.get('models', {}).get('providers', {})

    result = []
    for agent in agents:
        agent_id = agent['id']

        # 从 session 文件获取真实使用量
        agent_usage = get_agent_usage(agent_id, hours=24, today_only=True)

        # 检查是否是订阅模型
        model_full = agent['model_full']
        is_subscription = False
        subscription_remaining = None

        for provider, provider_config in models_config.items():
            for model in provider_config.get('models', []):
                if f"{provider}/{model['id']}" == model_full:
                    # 检查是否有订阅信息（cost 为 0 可能是订阅）
                    cost = model.get('cost', {})
                    if cost.get('input', 0) == 0 and cost.get('output', 0) == 0:
                        is_subscription = True
                        # 订阅剩余次数需要从日志或其他地方获取
                        subscription_remaining = "需查询"
                    break

        result.append({
            'id': agent_id,
            'name': agent['name'],
            'emoji': agent['emoji'],
            'model': agent['model'],
            'model_full': agent['model_full'],
            'messages_today': agent_usage.get('messages', 0),
            'tokens_estimate': agent_usage.get('total_tokens', 0),
            'is_subscription': is_subscription,
            'subscription_remaining': subscription_remaining,
            'workspace': agent['workspace'],
        })

    return result


def get_stats_summary() -> Dict:
    """获取总体统计"""
    agents_data = get_all_agents_data()

    total_messages = sum(a['messages_today'] for a in agents_data)
    total_tokens = sum(a['tokens_estimate'] for a in agents_data)
    subscription_agents = sum(1 for a in agents_data if a['is_subscription'])

    return {
        'total_agents': len(agents_data),
        'subscription_agents': subscription_agents,
        'total_messages_today': total_messages,
        'total_tokens_estimate': total_tokens,
        'last_updated': datetime.now().isoformat(),
    }


def get_models_usage() -> List[Dict]:
    """获取模型使用统计"""
    agents_data = get_all_agents_data()

    model_stats = {}
    for agent in agents_data:
        model = agent['model']
        if model not in model_stats:
            model_stats[model] = {
                'model': model,
                'agent_count': 0,
                'messages': 0,
                'tokens': 0,
                'is_subscription': agent['is_subscription'],
            }
        model_stats[model]['agent_count'] += 1
        model_stats[model]['messages'] += agent['messages_today']
        model_stats[model]['tokens'] += agent['tokens_estimate']

    return list(model_stats.values())


# ========== MD 文件相关 API ==========

def get_all_md_files_grouped() -> List[Dict]:
    """获取所有 MD 文件，按 Agent 分组（仅根目录）"""
    agents_with_workspaces = get_all_agents_with_workspaces()

    result = []
    for agent in agents_with_workspaces:
        md_files = agent.get('md_files', [])

        # 只取根目录文件
        root_files = [f for f in md_files if f.get('is_root', False)]

        # 按修改时间排序
        root_files.sort(key=lambda x: x.get('modified', ''), reverse=True)

        if root_files:
            result.append({
                'agent_id': agent['id'],
                'agent_name': agent['name'],
                'agent_emoji': agent['emoji'],
                'workspace': agent.get('workspace', ''),
                'root_files': root_files,
                'total_count': len(root_files),
            })

    return result


def get_all_md_files() -> List[Dict]:
    """获取所有 MD 文件（扁平列表）"""
    agents_with_workspaces = get_all_agents_with_workspaces()

    md_files = []
    for agent in agents_with_workspaces:
        for md in agent.get('md_files', []):
            md_files.append({
                **md,
                'agent_name': agent['name'],
                'agent_emoji': agent['emoji'],
            })

    # 按修改时间排序
    md_files.sort(key=lambda x: x.get('modified', ''), reverse=True)
    return md_files


def get_md_file_content(file_path: str) -> Dict:
    """获取 MD 文件内容"""
    path = Path(file_path)

    if not path.exists():
        return {'error': '文件不存在'}

    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        return {
            'content': content,
            'path': str(path),
            'name': path.name,
        }
    except Exception as e:
        return {'error': str(e)}


def save_md_file(file_path: str, content: str) -> Dict:
    """保存 MD 文件内容"""
    path = Path(file_path)

    if not path.exists():
        return {'error': '文件不存在'}

    try:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

        return {'success': True, 'path': str(path)}
    except Exception as e:
        return {'error': str(e)}


if __name__ == '__main__':
    # 测试
    print(f"OpenCLAW 路径: {OPENCLAW_PATH}")
    print("\n=== Agents ===")
    for a in get_all_agents_data():
        print(f"{a['emoji']} {a['name']}: {a['model']} (订阅: {a['is_subscription']})")

    print("\n=== MD Files ===")
    md_files = get_all_md_files()
    print(f"找到 {len(md_files)} 个 MD 文件")
    for md in md_files[:5]:
        print(f"  - {md['name']} ({md['agent_name']})")
