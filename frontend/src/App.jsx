import { useState, useEffect } from 'react'
import {
  Activity,
  Users,
  MessageSquare,
  Cpu,
  Server,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronRight,
  Save,
  BarChart2,
  AlertCircle,
  Zap,
  Database,
  Clock
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const API_BASE = 'http://localhost:8765'

// ========== Sidebar Component ==========
function Sidebar({ currentPage, setCurrentPage }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">OC MONITOR</div>
      <ul className="nav-list">
        <li className="nav-item">
          <button
            className={`nav-link ${currentPage === 'traffic' ? 'active' : ''}`}
            onClick={() => setCurrentPage('traffic')}
          >
            <Activity />
            <span>流量监控</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${currentPage === 'token' ? 'active' : ''}`}
            onClick={() => setCurrentPage('token')}
          >
            <BarChart2 />
            <span>Token用量分析</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${currentPage === 'cron' ? 'active' : ''}`}
            onClick={() => setCurrentPage('cron')}
          >
            <Clock />
            <span>定时任务</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${currentPage === 'files' ? 'active' : ''}`}
            onClick={() => setCurrentPage('files')}
          >
            <FileText />
            <span>Agent 管理</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}

// ========== Traffic Monitor Page ==========
function TrafficPage() {
  const [agents, setAgents] = useState([])
  const [stats, setStats] = useState(null)
  const [models, setModels] = useState([])
  const [usage, setUsage] = useState(null)
  const [cronData, setCronData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = async () => {
    try {
      const [agentsRes, statsRes, modelsRes, usageRes, cronRes] = await Promise.all([
        fetch(`${API_BASE}/api/agents`),
        fetch(`${API_BASE}/api/stats`),
        fetch(`${API_BASE}/api/models`),
        fetch(`${API_BASE}/api/usage`),
        fetch(`${API_BASE}/api/usage/cron`)
      ])

      if (!agentsRes.ok || !statsRes.ok || !modelsRes.ok || !usageRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const agentsData = await agentsRes.json()
      const statsData = await statsRes.json()
      const modelsData = await modelsRes.json()
      const usageData = await usageRes.json()
      const cronJson = await cronRes.json()

      setAgents(agentsData.agents || [])
      setStats(statsData)
      setModels(modelsData.models || [])
      setUsage(usageData)
      setCronData(cronJson)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message || '无法获取数据')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatNumber = (num) => {
    if (!num && num !== 0) return '-'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num?.toLocaleString() || '0'
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">正在连接...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container glass-card">
        <Server className="error-icon" />
        <p className="error-message">无法连接到 API</p>
        <p className="error-detail">{error}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <h1>流量监控</h1>
          <span className="header-badge">实时</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span className="last-updated">
            更新: {lastUpdated?.toLocaleTimeString('zh-CN') || 'N/A'}
          </span>
          <button className="refresh-btn" onClick={fetchData}>
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="stats-grid">
        {/* Agent 总数 */}
        <div className="glass-card stat-card">
          <div className="stat-icon agents">
            <Users size={26} />
          </div>
          <div className="stat-info">
            <h3>{stats?.total_agents || 0}</h3>
            <p>Agent 总数</p>
          </div>
          <div className="stat-tooltip">
            <div className="stat-tooltip-title">所有 Agent 列表</div>
            {agents.map(agent => (
              <div key={agent.id} className="stat-tooltip-item">
                <span className="stat-tooltip-name">
                  {agent.emoji} {agent.name}
                </span>
                <span className="stat-tooltip-value">{agent.model}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 订阅模型 */}
        <div className="glass-card stat-card">
          <div className="stat-icon active">
            <Cpu size={26} />
          </div>
          <div className="stat-info">
            <h3>{stats?.subscription_agents || 0}</h3>
            <p>订阅模型</p>
          </div>
          <div className="stat-tooltip">
            <div className="stat-tooltip-title">订阅模型 Agent</div>
            {agents.filter(a => a.is_subscription).map(agent => (
              <div key={agent.id} className="stat-tooltip-item">
                <span className="stat-tooltip-name">
                  {agent.emoji} {agent.name}
                </span>
                <span className="stat-tooltip-value">{agent.model}</span>
              </div>
            ))}
            {agents.filter(a => a.is_subscription).length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>暂无订阅模型</div>
            )}
          </div>
        </div>

        {/* 今日消息 */}
        <div className="glass-card stat-card">
          <div className="stat-icon messages">
            <MessageSquare size={26} />
          </div>
          <div className="stat-info">
            <h3>{formatNumber(stats?.total_messages_today)}</h3>
            <p>今日消息</p>
          </div>
          <div className="stat-tooltip">
            <div className="stat-tooltip-title">各 Agent 今日消息数 (从 gateway.log 统计)</div>
            {agents.map(agent => (
              <div key={agent.id} className="stat-tooltip-item">
                <span className="stat-tooltip-name">
                  {agent.emoji} {agent.name}
                </span>
                <span className="stat-tooltip-value">{formatNumber(agent.messages_today)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 真实 Token */}
        <div className="glass-card stat-card">
          <div className="stat-icon tokens">
            <Cpu size={26} />
          </div>
          <div className="stat-info">
            <h3>
              {usage?.total_tokens > 0
                ? formatNumber(usage.total_tokens)
                : formatNumber(stats?.total_tokens_estimate)
              }
            </h3>
            <p>{usage?.total_tokens > 0 ? 'Token (真实)' : 'Token (估算)'}</p>
          </div>
          <div className="stat-tooltip">
            <div className="stat-tooltip-title">
              {usage?.total_tokens > 0 ? 'API 真实使用量' : '各 Agent Token 估算'}
            </div>
            {usage?.total_tokens > 0 ? (
              <>
                <div className="stat-tooltip-item">
                  <span className="stat-tooltip-name">Input Tokens</span>
                  <span className="stat-tooltip-value">{formatNumber(usage.total_input_tokens)}</span>
                </div>
                <div className="stat-tooltip-item">
                  <span className="stat-tooltip-name">Output Tokens</span>
                  <span className="stat-tooltip-value">{formatNumber(usage.total_output_tokens)}</span>
                </div>
                <div className="stat-tooltip-item">
                  <span className="stat-tooltip-name">Total</span>
                  <span className="stat-tooltip-value">{formatNumber(usage.total_tokens)}</span>
                </div>
                {usage.providers?.map((p, idx) => (
                  <div key={idx} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--primary-light)', marginBottom: 8 }}>{p.provider}</div>
                    {p.error ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.error}</div>
                    ) : (
                      <>
                        <div className="stat-tooltip-item">
                          <span style={{ color: 'var(--text-secondary)' }}>Input</span>
                          <span className="stat-tooltip-value">{formatNumber(p.input_tokens)}</span>
                        </div>
                        <div className="stat-tooltip-item">
                          <span style={{ color: 'var(--text-secondary)' }}>Output</span>
                          <span className="stat-tooltip-value">{formatNumber(p.output_tokens)}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <>
                {agents.map(agent => (
                  <div key={agent.id} className="stat-tooltip-item">
                    <span className="stat-tooltip-name">
                      {agent.emoji} {agent.name}
                    </span>
                    <span className="stat-tooltip-value">
                      {agent.messages_today} × 500 = {formatNumber(agent.tokens_estimate)}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                  * 从 gateway.log 估算。如需真实数据需配置模型提供商 API
                </div>
              </>
            )}
          </div>
        </div>

        {/* 定时任务 */}
        <div className="glass-card stat-card" onClick={() => window.location.hash = 'cron'} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.05))' }}>
            <Clock size={26} />
          </div>
          <div className="stat-info">
            <h3>{cronData?.messages || 0}</h3>
            <p>定时任务</p>
          </div>
          <div className="stat-tooltip">
            <div className="stat-tooltip-title">定时任务 Token 用量</div>
            <div className="stat-tooltip-item">
              <span className="stat-tooltip-name">执行次数</span>
              <span className="stat-tooltip-value">{cronData?.messages || 0}</span>
            </div>
            <div className="stat-tooltip-item">
              <span className="stat-tooltip-name">Token 消耗</span>
              <span className="stat-tooltip-value">{formatNumber(cronData?.total_tokens || 0)}</span>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
              * 点击查看详情
            </div>
          </div>
        </div>
      </section>

      {/* Agents Grid */}
      <section>
        <h2 className="section-title">
          <Users size={20} />
          Agent 状态
        </h2>
        <div className="agents-grid">
          {agents.map((agent) => (
            <div key={agent.id} className="glass-card agent-card">
              {agent.emoji && <div className="agent-emoji">{agent.emoji}</div>}
              <div className="agent-header">
                <span className="agent-name">
                  {agent.name}
                  {agent.is_subscription && (
                    <span className="agent-subscription">订阅</span>
                  )}
                </span>
                <span className="agent-model">{agent.model}</span>
              </div>
              <div className="agent-stats">
                <div className="agent-stat">
                  <div className="agent-stat-value">{formatNumber(agent.messages_today)}</div>
                  <div className="agent-stat-label">消息</div>
                </div>
                <div className="agent-stat">
                  <div className="agent-stat-value">{formatNumber(agent.tokens_estimate)}</div>
                  <div className="agent-stat-label">Token</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Models Section */}
      <section className="models-section">
        <h2 className="section-title">
          <Cpu size={20} />
          模型使用情况
        </h2>
        <div className="models-grid">
          {models.map((model, idx) => (
            <div key={idx} className="glass-card model-card">
              <div className="model-icon">
                <Cpu size={22} />
              </div>
              <div className="model-info">
                <div className="model-name">
                  {model.model}
                  {model.is_subscription && <span className="agent-subscription" style={{ marginLeft: 8 }}>订阅</span>}
                </div>
                <div className="model-stats">
                  {model.agent_count} 个 Agent • {formatNumber(model.messages)} 消息
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ========== MD Files Page ==========
function FilesPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingFile, setEditingFile] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedAgents, setExpandedAgents] = useState({})

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/md-files`)
      const data = await res.json()
      setFiles(data.files || [])
      // 默认展开所有 agent
      const initialExpanded = {}
      ;(data.files || []).forEach(agent => {
        initialExpanded[agent.agent_id] = true
      })
      setExpandedAgents(initialExpanded)
    } catch (err) {
      console.error('Error fetching files:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const toggleAgent = (agentId) => {
    setExpandedAgents(prev => ({
      ...prev,
      [agentId]: !prev[agentId]
    }))
  }

  const openFile = async (file) => {
    try {
      const res = await fetch(`${API_BASE}/api/md-files/content?path=${encodeURIComponent(file.path)}`)
      const data = await res.json()
      setEditingFile(file)
      setEditContent(data.content || '')
    } catch (err) {
      console.error('Error opening file:', err)
    }
  }

  const saveFile = async () => {
    if (!editingFile) return
    setSaving(true)

    try {
      const res = await fetch(`${API_BASE}/api/md-files/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: editingFile.path,
          content: editContent
        })
      })
      const data = await res.json()
      if (data.success) {
        setEditingFile(null)
        fetchFiles()
      } else {
        alert('保存失败: ' + data.error)
      }
    } catch (err) {
      alert('保存失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (isoString) => {
    if (!isoString) return ''
    return new Date(isoString).toLocaleDateString('zh-CN')
  }

  const truncateContent = (content, maxLength = 150) => {
    if (!content) return '暂无预览'
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">加载文件中...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="files-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Agent 管理
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            按 Agent 分组显示根目录 MD 文件
          </p>
        </div>
        <button className="refresh-btn" onClick={fetchFiles}>
          <RefreshCw size={16} />
          刷新
        </button>
      </div>

      {/* Agent File Groups */}
      <div className="agent-files-container">
        {files.map((agent) => (
          <div key={agent.agent_id} className="glass-card agent-file-group" style={{ marginBottom: 20 }}>
            {/* Agent Header */}
            <div
              className="agent-group-header"
              onClick={() => toggleAgent(agent.agent_id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                paddingBottom: 16,
                borderBottom: agent.root_files.length > 0 ? '1px solid var(--border)' : 'none',
                marginBottom: agent.root_files.length > 0 ? 16 : 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{agent.agent_emoji}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
                  {agent.agent_name}
                </span>
                <span style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  borderRadius: 12,
                  color: 'var(--primary-light)'
                }}>
                  {agent.total_count} 个文件
                </span>
              </div>
              {expandedAgents[agent.agent_id] ? (
                <ChevronDown size={20} color="var(--text-muted)" />
              ) : (
                <ChevronRight size={20} color="var(--text-muted)" />
              )}
            </div>

            {/* Root Files Only - 一排2个 */}
            {expandedAgents[agent.agent_id] && agent.root_files.length > 0 && (
              <div className="root-files-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 16
              }}>
                {agent.root_files.map((file, idx) => (
                  <div
                    key={idx}
                    className="file-item root"
                    onClick={() => openFile(file)}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-md)',
                      padding: 16,
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <FileText size={16} color="var(--primary-light)" />
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {file.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDate(file.modified)} • {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {expandedAgents[agent.agent_id] && agent.root_files.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                根目录暂无 MD 文件
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingFile && (
        <div className="modal-overlay" onClick={() => setEditingFile(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <FileText size={18} style={{ marginRight: 8 }} />
                {editingFile.name}
              </div>
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setEditingFile(null)}>
                  取消
                </button>
                <button className="modal-btn primary" onClick={saveFile} disabled={saving}>
                  <Save size={16} style={{ marginRight: 6 }} />
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
            <div className="modal-body">
              <textarea
                className="editor-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="文件内容..."
              />
            </div>
            <div className="modal-footer">
              <span>路径: {editingFile.path}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ========== Token Usage Analysis Page ==========
function TokenUsagePage() {
  const [agents, setAgents] = useState([])
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = async () => {
    try {
      const [agentsRes, usageRes, hourlyRes, agentsUsageRes] = await Promise.all([
        fetch(`${API_BASE}/api/agents`),
        fetch(`${API_BASE}/api/usage`),
        fetch(`${API_BASE}/api/usage/hourly`),
        fetch(`${API_BASE}/api/usage/agents`)
      ])

      if (!agentsRes.ok || !usageRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const agentsData = await agentsRes.json()
      const usageData = await usageRes.json()
      const hourlyData = await hourlyRes.json()
      const agentsUsageData = await agentsUsageRes.json()

      setAgents(agentsData.agents || [])
      setUsage({
        ...usageData,
        hourly_data: hourlyData.hourly || [],
        agents_usage: agentsUsageData.agents || []
      })
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message || '无法获取数据')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatNumber = (num) => {
    if (!num && num !== 0) return '-'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num?.toLocaleString() || '0'
  }

  // 数据处理
  const hourlyData = usage?.hourly_data || []
  const agentsUsageData = usage?.agents_usage || []

  // Agent 对比数据
  const agentComparisonData = agentsUsageData.map(agentUsage => {
    const agent = agents.find(a => a.id === agentUsage.agent_id) || {}
    return {
      name: agent.emoji ? `${agent.emoji} ${agent.name}` : agentUsage.agent_id,
      messages: agentUsage.messages,
      tokens: agentUsage.total_tokens,
      fullName: agentUsage.agent_id
    }
  }).sort((a, b) => b.tokens - a.tokens)

  // 模型用量对比数据
  const byModel = usage?.by_model || {}
  const modelComparisonData = Object.entries(byModel)
    .filter(([model, tokens]) => tokens > 0)
    .map(([model, tokens]) => ({
      name: model,
      tokens: tokens
    }))
    .sort((a, b) => b.tokens - a.tokens)

  // 从 usage 数据中提取四个指标
  const toolCalls = usage?.tool_calls || 0
  const errors = usage?.errors || 0
  const errorRate = errors > 0 && toolCalls > 0 ? ((errors / toolCalls) * 100).toFixed(2) : '0.00'
  const cacheHitRate = usage?.cache_read && usage?.total_tokens
    ? ((usage.cache_read / usage.total_tokens) * 100).toFixed(2)
    : '0.00'

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <AlertCircle className="error-icon" />
        <div className="error-message">{error}</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <h1>Token用量分析</h1>
          <span className="header-badge">当日数据</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span className="last-updated">
            更新: {lastUpdated?.toLocaleTimeString('zh-CN') || 'N/A'}
          </span>
          <button className="refresh-btn" onClick={fetchData}>
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      </header>

      {/* Four Metric Cards */}
      <section className="stats-grid" style={{ marginBottom: 40 }}>
        {/* Tool Calls */}
        <div className="glass-card stat-card">
          <div className="stat-icon messages">
            <Zap size={26} />
          </div>
          <div className="stat-info">
            <h3>{formatNumber(toolCalls)}</h3>
            <p>Tool Calls</p>
          </div>
          <div className="stat-tooltip">
            <div className="stat-tooltip-title">Tool Calls 解释</div>
            <div className="stat-tooltip-item">
              <span className="stat-tooltip-name">Agent 调用工具的总次数</span>
            </div>
            <div className="stat-tooltip-item">
              <span className="stat-tooltip-name">包括代码执行、文件操作、搜索等</span>
            </div>
          </div>
        </div>

        {/* Errors */}
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))' }}>
            <AlertCircle size={26} />
          </div>
          <div className="stat-info">
            <h3>{formatNumber(errors)}</h3>
            <p>Errors</p>
          </div>
          <div className="stat-tooltip">
            <div className="stat-tooltip-title">Errors 解释</div>
            <div className="stat-tooltip-item">
              <span className="stat-tooltip-name">Agent 运行过程中出现的错误次数</span>
            </div>
            <div className="stat-tooltip-item">
              <span className="stat-tooltip-name">包括 API 错误、执行失败等</span>
            </div>
          </div>
        </div>

        {/* Error Rate */}
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(234, 179, 8, 0.05))' }}>
            <Cpu size={26} />
          </div>
          <div className="stat-info">
            <h3>{errorRate}%</h3>
            <p>Error Rate</p>
          </div>
          <div className="stat-tooltip">
            <div className="stat-tooltip-title">Error Rate 解释</div>
            <div className="stat-tooltip-item">
              <span className="stat-tooltip-name">错误次数占总操作数的百分比</span>
            </div>
            <div className="stat-tooltip-item">
              <span className="stat-tooltip-name">公式: (Errors / Tool Calls) × 100%</span>
            </div>
          </div>
        </div>

        {/* Cache Hit Rate */}
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.05))' }}>
            <Database size={26} />
          </div>
          <div className="stat-info">
            <h3>{cacheHitRate}%</h3>
            <p>Cache Hit Rate</p>
          </div>
          <div className="stat-tooltip">
            <div className="stat-tooltip-title">Cache Hit Rate 解释</div>
            <div className="stat-tooltip-item">
              <span className="stat-tooltip-name">缓存读取占总 Token 的比例</span>
            </div>
            <div className="stat-tooltip-item">
              <span className="stat-tooltip-name">公式: (Cache Read / Total Tokens) × 100%</span>
            </div>
            <div className="stat-tooltip-item">
              <span className="stat-tooltip-name">越高说明重复使用内容越多，节省成本</span>
            </div>
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
          {/* 分时段 Token 柱状图 */}
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 20, color: 'var(--text-primary)' }}>
              📊 分时段 Token 使用量
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <XAxis
                  dataKey="hour"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(0) + 'K' : v}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12
                  }}
                  formatter={(value) => [formatNumber(value), 'Token']}
                />
                <Bar dataKey="tokens" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Agent Token 用量横向对比 */}
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 20, color: 'var(--text-primary)' }}>
              🤖 Agent Token 用量对比
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agentComparisonData} layout="vertical">
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(0) + 'K' : v}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12
                  }}
                  formatter={(value) => [formatNumber(value), 'Token']}
                />
                <Bar dataKey="tokens" fill="var(--secondary)" radius={[0, 4, 4, 0]}>
                  {agentComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#6366f1', '#ec4899', '#22c55e', '#eab308', '#8b5cf6'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 模型用量横向对比 */}
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 20, color: 'var(--text-primary)' }}>
              🔮 模型 Token 用量对比
            </h3>
            {modelComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={modelComparisonData} layout="vertical">
                  <XAxis
                    type="number"
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(0) + 'K' : v}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12
                    }}
                    formatter={(value) => [formatNumber(value), 'Token']}
                  />
                  <Bar dataKey="tokens" fill="#22c55e" radius={[0, 4, 4, 0]}>
                    {modelComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#22c55e', '#eab308', '#8b5cf6', '#f43f5e', '#06b6d4'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                暂无模型数据
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

// ========== Cron Jobs Page ==========
function CronJobsPage() {
  const [cronData, setCronData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = async () => {
    try {
      const cronRes = await fetch(`${API_BASE}/api/usage/cron`)

      if (!cronRes.ok) {
        throw new Error('Failed to fetch cron data')
      }

      const cronJson = await cronRes.json()
      setCronData(cronJson)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message || '无法获取定时任务数据')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatNumber = (num) => {
    if (!num && num !== 0) return '-'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num?.toLocaleString() || '0'
  }

  // 处理 cron 数据
  const cronList = cronData?.by_cron ? Object.entries(cronData.by_cron).map(([name, data]) => ({
    name,
    count: data.count,
    tokens: data.tokens,
    input: data.input,
    output: data.output
  })).sort((a, b) => b.tokens - a.tokens) : []

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <AlertCircle className="error-icon" />
        <div className="error-message">{error}</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <h1>定时任务</h1>
          <span className="header-badge">当日数据</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span className="last-updated">
            更新: {lastUpdated?.toLocaleTimeString('zh-CN') || 'N/A'}
          </span>
          <button className="refresh-btn" onClick={fetchData}>
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="stats-grid" style={{ marginBottom: 40 }}>
        <div className="glass-card stat-card">
          <div className="stat-icon messages">
            <Clock size={26} />
          </div>
          <div className="stat-info">
            <h3>{cronData?.messages || 0}</h3>
            <p>任务执行次数</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon tokens">
            <Zap size={26} />
          </div>
          <div className="stat-info">
            <h3>{formatNumber(cronData?.total_tokens || 0)}</h3>
            <p>Token 消耗</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))' }}>
            <Database size={26} />
          </div>
          <div className="stat-info">
            <h3>{formatNumber(cronData?.input_tokens || 0)}</h3>
            <p>Input Tokens</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(236, 72, 153, 0.05))' }}>
            <Cpu size={26} />
          </div>
          <div className="stat-info">
            <h3>{formatNumber(cronData?.output_tokens || 0)}</h3>
            <p>Output Tokens</p>
          </div>
        </div>
      </section>

      {/* Cron List */}
      <section>
        <h2 className="section-title">
          <Clock size={20} />
          任务详情
        </h2>
        <div className="agents-grid">
          {cronList.map((cron) => (
            <div key={cron.name} className="glass-card agent-card">
              <div className="agent-header">
                <span className="agent-name">
                  <Clock size={18} />
                  {cron.name}
                </span>
              </div>
              <div className="agent-stats">
                <div className="agent-stat">
                  <div className="agent-stat-value">{cron.count}</div>
                  <div className="agent-stat-label">执行次数</div>
                </div>
                <div className="agent-stat">
                  <div className="agent-stat-value">{formatNumber(cron.tokens)}</div>
                  <div className="agent-stat-label">Token</div>
                </div>
              </div>
            </div>
          ))}
          {cronList.length === 0 && (
            <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>暂无定时任务数据</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ========== Main App ==========
function App() {
  const [currentPage, setCurrentPage] = useState('traffic')

  return (
    <>
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="main-content">
        {currentPage === 'traffic' && <TrafficPage />}
        {currentPage === 'token' && <TokenUsagePage />}
        {currentPage === 'cron' && <CronJobsPage />}
        {currentPage === 'files' && <FilesPage />}
      </main>
    </>
  )
}

export default App
