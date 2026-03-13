"""
从 OpenCLAW session 文件中解析真实的使用量数据
"""
import os
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import defaultdict

# 加载配置
CONFIG_FILE = Path(__file__).parent / "config.json"

def load_config() -> dict:
    """加载配置文件"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"openclaw_path": "~/.openclaw"}

config = load_config()

# OpenCLAW 路径配置
openclaw_path = config.get('openclaw_path', '~/.openclaw')
OPENCLAW_PATH = Path(os.path.expanduser(openclaw_path))

def get_agent_session_dir(agent_id: str) -> Path:
    """获取 agent 的 session 目录"""
    return OPENCLAW_PATH / "agents" / agent_id / "sessions"


def parse_session_file(file_path: Path) -> List[Dict]:
    """解析单个 session 文件"""
    messages = []
    if not file_path.exists():
        return messages

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    # 只关注 message 类型
                    if data.get('type') == 'message':
                        msg = data.get('message', {})
                        usage = msg.get('usage', {})
                        if usage:
                            msg_data = {
                                'timestamp': data.get('timestamp', ''),
                                'model': msg.get('model', 'unknown'),
                                'provider': msg.get('provider', 'unknown'),
                                'usage': usage,
                                'stopReason': msg.get('stopReason', ''),
                            }
                            messages.append(msg_data)
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"解析文件错误 {file_path}: {e}")

    return messages


def get_agent_usage(agent_id: str, hours: int = 24, today_only: bool = False) -> Dict:
    """获取指定 agent 的使用量

    Args:
        agent_id: Agent ID
        hours: 获取最近 N 小时的数据
        today_only: 是否仅获取今日数据（优先于 hours）
    """
    session_dir = get_agent_session_dir(agent_id)

    result = {
        'agent_id': agent_id,
        'input_tokens': 0,
        'output_tokens': 0,
        'cache_read': 0,
        'cache_write': 0,
        'total_tokens': 0,
        'messages': 0,
        'tool_calls': 0,
        'errors': 0,
        'by_model': {},
        'by_hour': {},
    }

    if not session_dir.exists():
        return result

    # 计算时间范围 (统一使用 UTC 时间比较)
    now = datetime.utcnow()  # 使用 UTC 时间
    if today_only:
        # 今日数据：从今天 00:00 UTC 到 now
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        cutoff_time = start_of_day
    else:
        # 最近 N 小时
        cutoff_time = now - timedelta(hours=hours)

    by_model = defaultdict(int)
    by_hour = defaultdict(int)

    try:
        files = list(session_dir.glob("*.jsonl"))
        for file_path in files:
            messages = parse_session_file(file_path)
            for msg in messages:
                # 按消息时间过滤
                timestamp = msg.get('timestamp', '')
                if timestamp:
                    try:
                        # 解析为 UTC 时间
                        dt_utc = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        # 转换为 naive datetime 进行比较
                        dt = dt_utc.replace(tzinfo=None)

                        # 比较
                        if dt < cutoff_time:
                            continue
                    except:
                        continue
                else:
                    continue  # 没有时间戳的消息跳过

                usage = msg.get('usage', {})

                input_tok = usage.get('input', 0) or 0
                output_tok = usage.get('output', 0) or 0
                cache_read = usage.get('cacheRead', 0) or 0
                cache_write = usage.get('cacheWrite', 0) or 0

                result['input_tokens'] += input_tok
                result['output_tokens'] += output_tok
                result['cache_read'] += cache_read
                result['cache_write'] += cache_write
                result['messages'] += 1

                # 追踪 tool_calls 和 errors (通过 stopReason)
                stop_reason = msg.get('stopReason', '')
                if stop_reason == 'toolUse':
                    result['tool_calls'] += 1
                elif stop_reason == 'error':
                    result['errors'] += 1

                # 按模型统计
                model = msg.get('model', 'unknown')
                by_model[model] += input_tok + output_tok

                # 按小时统计
                if timestamp:
                    try:
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        hour_key = dt.strftime('%H:00')
                        by_hour[hour_key] += input_tok + output_tok
                    except:
                        pass

    except Exception as e:
        print(f"获取 agent {agent_id} 使用量错误: {e}")

    result['total_tokens'] = (
        result['input_tokens'] +
        result['output_tokens'] +
        result['cache_read'] +
        result['cache_write']
    )
    result['by_model'] = dict(by_model)
    result['by_hour'] = dict(by_hour)

    return result


def get_all_agents_usage(hours: int = 24, today_only: bool = False) -> List[Dict]:
    """获取所有 agent 的使用量"""
    # Agent IDs - 从配置读取
    from db import load_openclaw_config

    try:
        config_data = load_openclaw_config()
        agents_list = config_data.get('agents', {}).get('list', [])
        agent_ids = [a.get('id') for a in agents_list if a.get('id')]
    except:
        agent_ids = ['main', 'assistant', 'creative', 'researcher', 'developer']

    results = []
    for agent_id in agent_ids:
        usage = get_agent_usage(agent_id, hours, today_only)
        results.append(usage)

    return results


def get_cron_usage(hours: int = 24, today_only: bool = False) -> Dict:
    """获取定时任务的使用量

    通过检测 '[cron:' 前缀的用户消息来识别定时任务
    """
    # 计算时间范围
    now = datetime.utcnow()
    if today_only:
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        cutoff_time = start_of_day
    else:
        cutoff_time = now - timedelta(hours=hours)

    result = {
        'total_tokens': 0,
        'input_tokens': 0,
        'output_tokens': 0,
        'messages': 0,
        'by_cron': {},
    }

    by_cron = defaultdict(lambda: {'count': 0, 'tokens': 0, 'input': 0, 'output': 0})

    # Agent IDs
    from db import load_openclaw_config
    try:
        config_data = load_openclaw_config()
        agents_list = config_data.get('agents', {}).get('list', [])
        agent_ids = [a.get('id') for a in agents_list if a.get('id')]
    except:
        agent_ids = ['main', 'assistant', 'creative', 'researcher', 'developer']

    for agent_id in agent_ids:
        session_dir = get_agent_session_dir(agent_id)
        if not session_dir.exists():
            continue

        try:
            files = list(session_dir.glob("*.jsonl"))
            for file_path in files:
                messages = parse_session_file(file_path)

                # 需要读取原始文件来找 cron 任务（因为需要前后消息关联）
                prev_msg = None
                with open(file_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            if data.get('type') == 'message':
                                msg = data.get('message', {})
                                role = msg.get('role')

                                # 检查是否是 cron 用户消息
                                is_cron = False
                                cron_name = ''
                                if role == 'user':
                                    content = msg.get('content', [])
                                    if isinstance(content, list):
                                        for c in content:
                                            if isinstance(c, dict) and c.get('type') == 'text':
                                                text = c.get('text', '')
                                                if '[cron:' in text:
                                                    is_cron = True
                                                    # 提取 cron 名称
                                                    import re
                                                    match = re.search(r'\[cron:\S+\s+(\S+)\]', text)
                                                    if match:
                                                        cron_name = match.group(1)
                                                    break

                                # 如果前一条是 cron 用户消息，当前是 assistant，统计 usage
                                if prev_msg and prev_msg.get('is_cron') and role == 'assistant':
                                    timestamp = data.get('timestamp', '')
                                    if timestamp:
                                        try:
                                            dt_utc = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                                            dt = dt_utc.replace(tzinfo=None)
                                            if dt < cutoff_time:
                                                prev_msg = {'is_cron': is_cron, 'cron_name': cron_name}
                                                continue
                                        except:
                                            pass

                                    usage = msg.get('usage', {})
                                    if usage:
                                        input_tok = usage.get('input', 0) or 0
                                        output_tok = usage.get('output', 0) or 0
                                        total_tok = input_tok + output_tok

                                        result['total_tokens'] += total_tok
                                        result['input_tokens'] += input_tok
                                        result['output_tokens'] += output_tok
                                        result['messages'] += 1

                                        cron_key = prev_msg.get('cron_name', 'unknown')
                                        by_cron[cron_key]['count'] += 1
                                        by_cron[cron_key]['tokens'] += total_tok
                                        by_cron[cron_key]['input'] += input_tok
                                        by_cron[cron_key]['output'] += output_tok

                                prev_msg = {'is_cron': is_cron, 'cron_name': cron_name}
                            else:
                                prev_msg = None
                        except:
                            prev_msg = None

        except Exception as e:
            print(f"处理 cron 错误 {agent_id}: {e}")

    result['by_cron'] = dict(by_cron)
    return result


def get_total_usage(hours: int = 24, today_only: bool = False) -> Dict:
    """获取总体使用量"""
    all_usage = get_all_agents_usage(hours, today_only)

    total = {
        'input_tokens': 0,
        'output_tokens': 0,
        'cache_read': 0,
        'cache_write': 0,
        'total_tokens': 0,
        'messages': 0,
        'tool_calls': 0,
        'errors': 0,
        'by_agent': {},
        'by_hour': {},
        'by_model': {},
    }

    for agent_usage in all_usage:
        agent_id = agent_usage['agent_id']
        total['by_agent'][agent_id] = agent_usage['total_tokens']

        total['input_tokens'] += agent_usage['input_tokens']
        total['output_tokens'] += agent_usage['output_tokens']
        total['cache_read'] += agent_usage['cache_read']
        total['cache_write'] += agent_usage['cache_write']
        total['messages'] += agent_usage['messages']
        total['tool_calls'] += agent_usage.get('tool_calls', 0)
        total['errors'] += agent_usage.get('errors', 0)

        # 合并 by_hour
        for hour, tokens in agent_usage.get('by_hour', {}).items():
            total['by_hour'][hour] = total['by_hour'].get(hour, 0) + tokens

        # 合并 by_model
        for model, tokens in agent_usage.get('by_model', {}).items():
            total['by_model'][model] = total['by_model'].get(model, 0) + tokens

    total['total_tokens'] = (
        total['input_tokens'] +
        total['output_tokens'] +
        total['cache_read'] +
        total['cache_write']
    )

    return total


def get_hourly_usage(hours: int = 24, today_only: bool = False) -> List[Dict]:
    """获取分小时的使用量（用于图表）"""
    total = get_total_usage(hours, today_only=today_only)
    by_hour = total.get('by_hour', {})

    # 生成 24 小时数据
    result = []
    now = datetime.now()

    for i in range(hours - 1, -1, -1):
        hour_time = now - timedelta(hours=i)
        hour_key = hour_time.strftime('%H:00')
        tokens = by_hour.get(hour_key, 0)

        result.append({
            'hour': hour_key,
            'tokens': tokens,
            'time': hour_time.strftime('%H:00')
        })

    return result


if __name__ == '__main__':
    print("=== Agent Usage (Last 24 hours) ===")
    print(f"OpenCLAW Path: {OPENCLAW_PATH}")
    all_usage = get_all_agents_usage(24)
    for usage in all_usage:
        print(f"\n{usage['agent_id']}:")
        print(f"  Messages: {usage['messages']}")
        print(f"  Input: {usage['input_tokens']}")
        print(f"  Output: {usage['output_tokens']}")
        print(f"  Cache Read: {usage['cache_read']}")
        print(f"  Cache Write: {usage['cache_write']}")
        print(f"  Total: {usage['total_tokens']}")
        print(f"  By Model: {usage['by_model']}")

    print("\n=== Total Usage ===")
    total = get_total_usage(24)
    print(f"Total Messages: {total['messages']}")
    print(f"Total Tokens: {total['total_tokens']}")
    print(f"By Hour: {total['by_hour']}")
