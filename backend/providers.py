"""
模型提供商使用量查询模块
支持多种模型提供商的 API 调用
"""
import os
import json
import requests
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, timedelta

# OpenCLAW 配置路径
OPENCLAW_PATH = Path.home() / ".openclaw"
CONFIG_FILE = OPENCLAW_PATH / "openclaw.json"


class BaseProvider(ABC):
    """模型提供商基类"""

    def __init__(self, name: str, config: dict):
        self.name = name
        self.config = config
        self.base_url = config.get('baseUrl', '')
        self.api_key = config.get('apiKey', '')
        self.api_type = config.get('api', '')

    @abstractmethod
    def get_usage(self) -> Dict:
        """获取使用量"""
        pass

    @abstractmethod
    def get_balance(self) -> Optional[Dict]:
        """获取余额/订阅信息"""
        pass


class MiniMaxProvider(BaseProvider):
    """MiniMax 提供商"""

    def get_usage(self) -> Dict:
        """获取 MiniMax 使用量"""
        # MiniMax 使用 OAuth，需要从本地存储获取 token
        # 这里需要解析 OpenCLAW 的认证存储
        result = {
            'provider': 'minimax-portal',
            'input_tokens': 0,
            'output_tokens': 0,
            'total_tokens': 0,
            'calls': 0,
            'error': None
        }

        # 尝试从 gateway.log 中解析 MiniMax 使用量
        log_file = OPENCLAW_PATH / "logs" / "gateway.log"
        if log_file.exists():
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()

                # 查找最近的日志行
                for line in reversed(lines[-1000:]):
                    if 'minimax' in line.lower() and ('token' in line.lower() or 'usage' in line.lower()):
                        # 尝试解析 token 使用量
                        # 格式可能类似: "input_tokens": 1234
                        import re
                        input_match = re.search(r'"input_tokens"?\s*:\s*(\d+)', line)
                        output_match = re.search(r'"output_tokens"?\s*:\s*(\d+)', line)

                        if input_match:
                            result['input_tokens'] += int(input_match.group(1))
                        if output_match:
                            result['output_tokens'] += int(output_match.group(1))
            except Exception as e:
                result['error'] = str(e)

        result['total_tokens'] = result['input_tokens'] + result['output_tokens']
        return result

    def get_balance(self) -> Optional[Dict]:
        """MiniMax 余额查询 - 需要 OAuth token"""
        # MiniMax 余额查询接口
        # 由于使用 OAuth 认证，需要从 OpenCLAW 存储中获取 token
        # 这是一个简化实现
        return {
            'provider': 'minimax-portal',
            'subscription_remaining': '需要 OAuth 认证',
            'subscription_type': '订阅制',
            'note': 'MiniMax 使用 OAuth 认证，需从门户查询'
        }


class OpenAIProvider(BaseProvider):
    """OpenAI 提供商"""

    def get_usage(self) -> Dict:
        result = {
            'provider': 'openai',
            'input_tokens': 0,
            'output_tokens': 0,
            'total_tokens': 0,
            'calls': 0,
            'error': None
        }

        if not self.api_key or self.api_key == 'openai-oauth':
            result['error'] = '使用 OAuth 认证，请从 dashboard.openai.com 查询'
            return result

        try:
            # 调用 OpenAI 使用量 API
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }

            # 获取本月使用量
            now = datetime.now()
            start_date = now.replace(day=1).strftime('%Y-%m-%d')

            response = requests.get(
                f'https://api.openai.com/v1/usage?start_date={start_date}&end_date={now.strftime("%Y-%m-%d")}',
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                result['total_tokens'] = data.get('total_tokens', 0)
            else:
                result['error'] = f'API error: {response.status_code}'
        except Exception as e:
            result['error'] = str(e)

        return result

    def get_balance(self) -> Optional[Dict]:
        if not self.api_key or self.api_key == 'openai-oauth':
            return {
                'provider': 'openai',
                'subscription_remaining': '需要 OAuth 认证',
                'subscription_type': '订阅/按量',
                'note': '请从 dashboard.openai.com 查询'
            }

        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }

            response = requests.get(
                'https://api.openai.com/v1/dashboard/billing/subscription',
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    'provider': 'openai',
                    'subscription_type': data.get('plan', {}).get('title', '未知'),
                    'has_payment_method': data.get('has_payment_method', False),
                    'billing_email': data.get('billing_email', '')
                }
        except Exception as e:
            return {
                'provider': 'openai',
                'error': str(e)
            }

        return None


class QClawProvider(BaseProvider):
    """腾讯混元/QClaw 提供商"""

    def get_usage(self) -> Dict:
        result = {
            'provider': 'qclaw',
            'input_tokens': 0,
            'output_tokens': 0,
            'total_tokens': 0,
            'calls': 0,
            'error': None
        }

        if not self.api_key:
            result['error'] = 'No API key'
            return result

        try:
            # 腾讯混元余额查询
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }

            # 注意：这是示例接口，实际可能不同
            response = requests.get(
                f'{self.base_url}/billing/balance',
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                result['balance'] = data.get('data', {}).get('balance', 0)
            else:
                result['error'] = f'API error: {response.status_code}'
        except Exception as e:
            result['error'] = str(e)

        return result

    def get_balance(self) -> Optional[Dict]:
        return self.get_usage()


class AnthropicProvider(BaseProvider):
    """Anthropic (Claude) 提供商"""

    def get_usage(self) -> Dict:
        result = {
            'provider': 'anthropic',
            'input_tokens': 0,
            'output_tokens': 0,
            'total_tokens': 0,
            'calls': 0,
            'error': None
        }

        if not self.api_key:
            result['error'] = 'No API key'
            return result

        try:
            headers = {
                'x-api-key': self.api_key,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            }

            # Anthropic 使用量 API
            response = requests.get(
                'https://api.anthropic.com/v1/usage',
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                result['total_tokens'] = data.get('total_tokens', 0)
            else:
                result['error'] = f'API error: {response.status_code}'
        except Exception as e:
            result['error'] = str(e)

        return result

    def get_balance(self) -> Optional[Dict]:
        return self.get_usage()


# 提供商工厂
PROVIDER_CLASSES = {
    'minimax-portal': MiniMaxProvider,
    'minimax': MiniMaxProvider,
    'openai': OpenAIProvider,
    'openai-codex': OpenAIProvider,
    'qclaw': QClawProvider,
    'anthropic': AnthropicProvider,
    'claude': AnthropicProvider,
}


def get_provider(name: str, config: dict) -> Optional[BaseProvider]:
    """获取提供商实例"""
    name_lower = name.lower()

    for key, cls in PROVIDER_CLASSES.items():
        if key in name_lower:
            return cls(name, config)

    # 默认返回通用实现
    return BaseProvider(name, config)


def load_openclaw_config() -> dict:
    """加载 OpenCLAW 配置"""
    if not CONFIG_FILE.exists():
        raise FileNotFoundError(f"配置文件不存在: {CONFIG_FILE}")

    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_all_providers_usage() -> List[Dict]:
    """获取所有提供商的使用量"""
    try:
        config = load_openclaw_config()
    except Exception as e:
        print(f"加载配置错误: {e}")
        return []

    providers_config = config.get('models', {}).get('providers', {})

    results = []
    for name, provider_config in providers_config.items():
        provider = get_provider(name, provider_config)
        if provider:
            usage = provider.get_usage()
            balance = provider.get_balance()

            results.append({
                'provider': name,
                'config': provider_config,
                'usage': usage,
                'balance': balance
            })

    return results


def get_model_usage_summary() -> Dict:
    """获取模型使用量摘要"""
    providers = get_all_providers_usage()

    total_input = 0
    total_output = 0
    total_tokens = 0

    provider_stats = []

    for p in providers:
        usage = p.get('usage', {})
        balance = p.get('balance', {})

        total_input += usage.get('input_tokens', 0)
        total_output += usage.get('output_tokens', 0)
        total_tokens += usage.get('total_tokens', 0)

        provider_stats.append({
            'provider': p['provider'],
            'input_tokens': usage.get('input_tokens', 0),
            'output_tokens': usage.get('output_tokens', 0),
            'total_tokens': usage.get('total_tokens', 0),
            'error': usage.get('error'),
            'balance': balance
        })

    return {
        'total_input_tokens': total_input,
        'total_output_tokens': total_output,
        'total_tokens': total_tokens,
        'providers': provider_stats,
        'last_updated': datetime.now().isoformat()
    }


if __name__ == '__main__':
    print("=== Provider Usage ===")
    summary = get_model_usage_summary()
    print(f"Total Tokens: {summary['total_tokens']}")
    for p in summary['providers']:
        print(f"\n{p['provider']}:")
        print(f"  Input: {p['input_tokens']}")
        print(f"  Output: {p['output_tokens']}")
        print(f"  Total: {p['total_tokens']}")
        if p['error']:
            print(f"  Error: {p['error']}")
