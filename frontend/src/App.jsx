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
  AlertTriangle,
  Zap,
  Database,
  Clock,
  Copy,
  Check
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
            className={`nav-link ${currentPage === 'errors' ? 'active' : ''}`}
            onClick={() => setCurrentPage('errors')}
          >
            <AlertTriangle />
            <span>错误分析</span>
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

// ========== Error Analysis Page ==========
function ErrorAnalysisPage() {
  const [data, setData] = useState(null)
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [expandedModel, setExpandedModel] = useState(null)
  const [expandedErrors, setExpandedErrors] = useState({})
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [timeRange, setTimeRange] = useState('today')
  const [hiddenModels, setHiddenModels] = useState({})

  const toggleError = (idx) => {
    setExpandedErrors(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const copyError = async (err, idx) => {
    const agent = agents.find(a => a.id === err.agent_id) || {}
    const text = [
      `Agent: ${agent.name || err.agent_id}`,
      `Model: ${err.model}`,
      `Time: ${err.timestamp}`,
      err.task_context ? `Task: ${err.task_context}` : '',
      err.error_message ? `Error: ${err.error_message}` : '',
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch {}
  }

  const handleRangeChange = (r) => {
    setTimeRange(r)
    setLoading(true)
    setExpandedErrors({})
    fetchData(r)
  }

  const fetchData = async (range) => {
    const r = range || timeRange
    try {
      const [errRes, agentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/usage/errors?range=${r}`),
        fetch(`${API_BASE}/api/agents`)
      ])

      if (!errRes.ok) throw new Error('Failed to fetch error data')

      const errData = await errRes.json()
      const agentsData = await agentsRes.json()

      setData(errData)
      setAgents(agentsData.agents || [])
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message || '无法获取错误分析数据')
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

  // 按模型错误率数据（全部，用于筛选 UI）
  const allModelErrorData = Object.entries(data?.errors_by_model || {})
    .map(([model, info]) => ({
      name: model,
      errors: info.errors,
      total: info.total,
      rate: info.rate
    }))
    .sort((a, b) => b.errors - a.errors)

  // 筛选后的模型错误率数据
  const modelErrorData = allModelErrorData.filter(m => !hiddenModels[m.name])

  const toggleModel = (modelName) => {
    setHiddenModels(prev => ({ ...prev, [modelName]: !prev[modelName] }))
  }

  // 按小时错误数据（补全 24 小时）
  const hourlyErrorData = []
  for (let i = 0; i < 24; i++) {
    const hourKey = `${String(i).padStart(2, '0')}:00`
    const info = data?.errors_by_hour?.[hourKey] || { errors: 0, total: 0, rate: 0 }
    hourlyErrorData.push({
      hour: hourKey,
      errors: info.errors,
      total: info.total,
      rate: info.rate
    })
  }

  // 按 Agent 错误数据
  const agentErrorData = Object.entries(data?.errors_by_agent || {})
    .map(([agentId, info]) => {
      const agent = agents.find(a => a.id === agentId) || {}
      return {
        name: agent.emoji ? `${agent.emoji} ${agent.name}` : agentId,
        errors: info.errors,
        total: info.total,
        rate: info.rate
      }
    })
    .sort((a, b) => b.errors - a.errors)

  // 找出错误最多的模型和时段
  const topErrorModel = modelErrorData.length > 0 ? modelErrorData[0] : null
  const topErrorHour = hourlyErrorData.reduce((max, h) => h.errors > max.errors ? h : max, { errors: 0, hour: '-' })

  // 工具调用成功率数据
  const toolByModel = data?.tool_success_by_model || {}
  const toolRanking = data?.tool_success_ranking || []

  // 工具成功率图表数据（按模型）
  const toolModelChartData = Object.entries(toolByModel)
    .map(([model, info]) => ({
      name: model,
      success_rate: info.success_rate,
      total: info.total,
      fail: info.fail,
    }))
    .sort((a, b) => a.success_rate - b.success_rate)

  // 动态计算工具成功率 Y 轴范围（最低值-10 ~ 最高值+10，限制在 0-100）
  const toolRates = toolModelChartData.map(d => d.success_rate)
  const toolRateMin = toolRates.length > 0 ? Math.max(0, Math.floor(Math.min(...toolRates) - 10)) : 0
  const toolRateMax = toolRates.length > 0 ? Math.min(100, Math.ceil(Math.max(...toolRates) + 10)) : 100

  const thStyle = { padding: '12px 8px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: 1 }
  const thStyleRight = { ...thStyle, textAlign: 'right' }

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <h1>错误分析</h1>
          <span className="header-badge">{TIME_RANGES.find(r => r.key === timeRange)?.label || '今日'}数据</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <TimeRangePicker value={timeRange} onChange={handleRangeChange} />
          <span className="last-updated">
            更新: {lastUpdated?.toLocaleTimeString('zh-CN') || 'N/A'}
          </span>
          <button className="refresh-btn" onClick={() => fetchData()}>
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 40 }}>
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))' }}>
            <AlertTriangle size={26} />
          </div>
          <div className="stat-info">
            <h3>{data?.total_errors || 0}</h3>
            <p>总错误数</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon messages">
            <Activity size={26} />
          </div>
          <div className="stat-info">
            <h3>{data?.overall_error_rate || 0}%</h3>
            <p>总体错误率</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(236, 72, 153, 0.05))' }}>
            <Cpu size={26} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: topErrorModel?.name?.length > 15 ? 16 : 24 }}>
              {topErrorModel ? topErrorModel.name : '-'}
            </h3>
            <p>错误最多的模型</p>
          </div>
          {topErrorModel && (
            <div className="stat-tooltip">
              <div className="stat-tooltip-title">模型错误详情</div>
              <div className="stat-tooltip-item">
                <span className="stat-tooltip-name">错误次数</span>
                <span className="stat-tooltip-value">{topErrorModel.errors}</span>
              </div>
              <div className="stat-tooltip-item">
                <span className="stat-tooltip-name">总请求数</span>
                <span className="stat-tooltip-value">{topErrorModel.total}</span>
              </div>
              <div className="stat-tooltip-item">
                <span className="stat-tooltip-name">错误率</span>
                <span className="stat-tooltip-value">{topErrorModel.rate}%</span>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.05))' }}>
            <Clock size={26} />
          </div>
          <div className="stat-info">
            <h3>{topErrorHour.errors > 0 ? topErrorHour.hour : '-'}</h3>
            <p>错误高峰时段</p>
          </div>
          {topErrorHour.errors > 0 && (
            <div className="stat-tooltip">
              <div className="stat-tooltip-title">高峰时段详情</div>
              <div className="stat-tooltip-item">
                <span className="stat-tooltip-name">错误次数</span>
                <span className="stat-tooltip-value">{topErrorHour.errors}</span>
              </div>
              <div className="stat-tooltip-item">
                <span className="stat-tooltip-name">总请求数</span>
                <span className="stat-tooltip-value">{topErrorHour.total}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Charts Row 1: 分时段 + 模型错误率 */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* 分时段错误分布 */}
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 20, color: 'var(--text-primary)' }}>
              分时段错误分布
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourlyErrorData}>
                <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} interval={3} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value, name) => {
                    if (name === 'errors') return [value, '错误数']
                    if (name === 'total') return [value, '总请求']
                    return [value, name]
                  }}
                />
                <Bar dataKey="total" fill="rgba(99, 102, 241, 0.3)" radius={[4, 4, 0, 0]} name="total" />
                <Bar dataKey="errors" fill="#ef4444" radius={[4, 4, 0, 0]} name="errors" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 各模型错误率对比 */}
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 12, color: 'var(--text-primary)' }}>
              各模型错误率对比
            </h3>
            {/* 模型筛选器 */}
            {allModelErrorData.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {allModelErrorData.map(m => (
                  <button
                    key={m.name}
                    onClick={() => toggleModel(m.name)}
                    style={{
                      padding: '3px 10px',
                      fontSize: 11,
                      borderRadius: 12,
                      border: `1px solid ${hiddenModels[m.name] ? 'var(--border)' : 'rgba(99, 102, 241, 0.5)'}`,
                      background: hiddenModels[m.name] ? 'transparent' : 'rgba(99, 102, 241, 0.15)',
                      color: hiddenModels[m.name] ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      textDecoration: hiddenModels[m.name] ? 'line-through' : 'none',
                      opacity: hiddenModels[m.name] ? 0.5 : 1,
                      transition: 'all 0.2s',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
            {modelErrorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(160, modelErrorData.length * 40)}>
                <BarChart data={modelErrorData} layout="vertical">
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} width={120} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(value, name) => name === 'rate' ? [`${value}%`, '错误率'] : [value, name]}
                  />
                  <Bar dataKey="rate" fill="#ef4444" radius={[0, 4, 4, 0]} name="rate">
                    {modelErrorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.rate > 5 ? '#ef4444' : entry.rate > 1 ? '#eab308' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                {allModelErrorData.length > 0 ? '所有模型已被筛选隐藏' : '暂无模型错误数据'}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tool Call Success Rate Section */}
      <section style={{ marginBottom: 40 }}>
        <h2 className="section-title">
          <Zap size={20} />
          工具调用成功率
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* 各模型工具调用成功率图表 */}
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 20, color: 'var(--text-primary)' }}>
              各模型工具调用成功率
            </h3>
            {toolModelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, toolModelChartData.length * 50)}>
                <BarChart data={toolModelChartData} layout="vertical">
                  <XAxis type="number" domain={[toolRateMin, toolRateMax]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} width={120} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(value, name, props) => {
                      const item = props.payload
                      return [`${value}% (${item.total} 次调用, ${item.fail} 次失败)`, '成功率']
                    }}
                  />
                  <Bar dataKey="success_rate" radius={[0, 4, 4, 0]} name="success_rate">
                    {toolModelChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.success_rate >= 99 ? '#22c55e' : entry.success_rate >= 95 ? '#eab308' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                暂无工具调用数据
              </div>
            )}
          </div>

          {/* 工具调用排行 */}
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 20, color: 'var(--text-primary)' }}>
              工具调用排行
            </h3>
            {toolRanking.length > 0 ? (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={thStyle}>工具</th>
                      <th style={thStyleRight}>调用</th>
                      <th style={thStyleRight}>失败</th>
                      <th style={thStyleRight}>成功率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolRanking.map((tool, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 8px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{tool.tool}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>{tool.total}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13, color: tool.fail > 0 ? '#ef4444' : 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>{tool.fail}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <span style={{
                            fontSize: 12, padding: '4px 10px', borderRadius: 12, fontFamily: 'var(--font-display)',
                            background: tool.success_rate >= 99 ? 'rgba(34, 197, 94, 0.15)' : tool.success_rate >= 95 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: tool.success_rate >= 99 ? '#22c55e' : tool.success_rate >= 95 ? '#eab308' : '#ef4444',
                            border: `1px solid ${tool.success_rate >= 99 ? 'rgba(34, 197, 94, 0.3)' : tool.success_rate >= 95 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}>
                            {tool.success_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>暂无工具调用数据</div>
            )}
          </div>
        </div>

        {/* 各模型工具明细（可展开） */}
        {Object.keys(toolByModel).length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 16 }}>
              {Object.entries(toolByModel).map(([model, info]) => (
                <div key={model} className="glass-card" style={{ padding: 20, cursor: 'pointer' }}
                  onClick={() => setExpandedModel(expandedModel === model ? null : model)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expandedModel === model ? 16 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Cpu size={18} color="var(--primary-light)" />
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>{model}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {info.total} 次调用
                      </span>
                      <span style={{
                        fontSize: 12, padding: '4px 10px', borderRadius: 12, fontFamily: 'var(--font-display)',
                        background: info.success_rate >= 99 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: info.success_rate >= 99 ? '#22c55e' : '#eab308',
                      }}>
                        {info.success_rate}%
                      </span>
                      {expandedModel === model ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                    </div>
                  </div>
                  {expandedModel === model && info.tools.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      {info.tools.map((tool, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < info.tools.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{tool.tool}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tool.total} 次</span>
                            {tool.fail > 0 && <span style={{ fontSize: 12, color: '#ef4444' }}>{tool.fail} 失败</span>}
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', color: tool.success_rate >= 99 ? '#22c55e' : tool.success_rate >= 95 ? '#eab308' : '#ef4444' }}>
                              {tool.success_rate}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Agent Error Table + Recent Errors (with context) */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 各 Agent 错误统计 */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 20, color: 'var(--text-primary)' }}>
            各 Agent 错误统计
          </h3>
          {agentErrorData.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={thStyle}>Agent</th>
                    <th style={thStyleRight}>错误</th>
                    <th style={thStyleRight}>总请求</th>
                    <th style={thStyleRight}>错误率</th>
                  </tr>
                </thead>
                <tbody>
                  {agentErrorData.map((agent, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px', fontSize: 14, color: 'var(--text-primary)' }}>{agent.name}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, color: agent.errors > 0 ? '#ef4444' : 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>{agent.errors}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>{agent.total}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <span style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 12, fontFamily: 'var(--font-display)',
                          background: agent.rate > 5 ? 'rgba(239, 68, 68, 0.15)' : agent.rate > 1 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                          color: agent.rate > 5 ? '#ef4444' : agent.rate > 1 ? '#eab308' : '#22c55e',
                          border: `1px solid ${agent.rate > 5 ? 'rgba(239, 68, 68, 0.3)' : agent.rate > 1 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                        }}>
                          {agent.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              暂无 Agent 错误数据
            </div>
          )}
        </div>

        {/* 最近错误事件（含任务上下文、展开/收起、一键复制） */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 20, color: 'var(--text-primary)' }}>
            最近错误事件
          </h3>
          {data?.error_details?.length > 0 ? (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {data.error_details.map((err, idx) => {
                const agent = agents.find(a => a.id === err.agent_id) || {}
                const time = new Date(err.timestamp).toLocaleTimeString('zh-CN')
                const isExpanded = expandedErrors[idx]
                const hasDetail = err.error_message || err.task_context
                return (
                  <div key={idx} style={{
                    padding: '14px 0',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: hasDetail ? 'pointer' : 'default' }}
                      onClick={() => hasDetail && toggleError(idx)}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {agent.emoji || ''} {agent.name || err.agent_id}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
                        {err.model}
                      </span>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
                          {time}
                        </span>
                        {hasDetail && (
                          isExpanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />
                        )}
                      </div>
                    </div>
                    {/* Summary line (always visible) */}
                    {err.error_message && !isExpanded && (
                      <div style={{
                        fontSize: 11, color: '#ef4444', marginLeft: 18, marginTop: 4,
                        fontFamily: 'monospace', opacity: 0.7,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%'
                      }}>
                        {err.error_message.length > 80 ? err.error_message.slice(0, 80) + '...' : err.error_message}
                      </div>
                    )}
                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ marginLeft: 18, marginTop: 10, position: 'relative' }}>
                        {/* Copy button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); copyError(err, idx) }}
                          style={{
                            position: 'absolute', top: 0, right: 0,
                            background: copiedIdx === idx ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${copiedIdx === idx ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)'}`,
                            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 12, fontFamily: 'var(--font-display)',
                            color: copiedIdx === idx ? '#22c55e' : 'var(--text-muted)',
                            transition: 'all 0.2s'
                          }}
                        >
                          {copiedIdx === idx ? <Check size={12} /> : <Copy size={12} />}
                          {copiedIdx === idx ? 'Copied' : 'Copy'}
                        </button>
                        {/* Task context */}
                        {err.task_context && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-display)', letterSpacing: 0.5 }}>TASK</div>
                            <div style={{
                              fontSize: 12, color: 'var(--primary-light)',
                              padding: '8px 12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: 8,
                              lineHeight: 1.5, wordBreak: 'break-all', whiteSpace: 'pre-wrap', maxWidth: 'calc(100% - 90px)'
                            }}>
                              {err.task_context}
                            </div>
                          </div>
                        )}
                        {/* Full error message */}
                        {err.error_message && (
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-display)', letterSpacing: 0.5 }}>ERROR</div>
                            <div style={{
                              fontSize: 12, color: '#ef4444',
                              fontFamily: 'monospace', lineHeight: 1.6,
                              padding: '10px 14px', background: 'rgba(239, 68, 68, 0.06)', borderRadius: 8,
                              border: '1px solid rgba(239, 68, 68, 0.12)',
                              wordBreak: 'break-all', whiteSpace: 'pre-wrap', maxWidth: 'calc(100% - 90px)',
                              maxHeight: 200, overflowY: 'auto'
                            }}>
                              {err.error_message}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              暂无错误记录
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ========== Time Range Picker ==========
const TIME_RANGES = [
  { key: 'today', label: '今日' },
  { key: '3d', label: '3天' },
  { key: '7d', label: '7天' },
  { key: '30d', label: '30天' },
]

function TimeRangePicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
      {TIME_RANGES.map(r => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, fontFamily: 'var(--font-display)', letterSpacing: 0.5, transition: 'all 0.2s',
            background: value === r.key ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(236, 72, 153, 0.15))' : 'transparent',
            color: value === r.key ? 'var(--primary-light)' : 'var(--text-muted)',
            borderBottom: value === r.key ? '2px solid var(--primary)' : '2px solid transparent',
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

// ========== Cron Jobs Page ==========
function CronJobsPage() {
  const [cronData, setCronData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [timeRange, setTimeRange] = useState('today')

  const fetchData = async (range) => {
    const r = range || timeRange
    try {
      const cronRes = await fetch(`${API_BASE}/api/usage/cron?range=${r}`)

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

  const handleRangeChange = (r) => {
    setTimeRange(r)
    setLoading(true)
    fetchData(r)
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

  const rangeLabel = TIME_RANGES.find(r => r.key === timeRange)?.label || '今日'

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
          <span className="header-badge">{rangeLabel}数据</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <TimeRangePicker value={timeRange} onChange={handleRangeChange} />
          <span className="last-updated">
            更新: {lastUpdated?.toLocaleTimeString('zh-CN') || 'N/A'}
          </span>
          <button className="refresh-btn" onClick={() => fetchData()}>
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 40 }}>
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

      {/* Cron Table */}
      <section>
        <h2 className="section-title">
          <Clock size={20} />
          任务详情
        </h2>
        {cronList.length > 0 ? (
          <div className="glass-card">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 12px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: 1 }}>任务名称</th>
                  <th style={{ padding: '14px 12px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: 1 }}>执行次数</th>
                  <th style={{ padding: '14px 12px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: 1 }}>INPUT</th>
                  <th style={{ padding: '14px 12px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: 1 }}>OUTPUT</th>
                  <th style={{ padding: '14px 12px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: 1 }}>TOTAL TOKEN</th>
                </tr>
              </thead>
              <tbody>
                {cronList.map((cron, idx) => (
                  <tr key={cron.name} style={{ borderBottom: idx < cronList.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Clock size={16} color="var(--primary-light)" />
                        <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{cron.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {cron.count}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-secondary)' }}>
                      {formatNumber(cron.input)}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-secondary)' }}>
                      {formatNumber(cron.output)}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600,
                        color: cron.tokens > 50000 ? '#ec4899' : cron.tokens > 10000 ? '#eab308' : 'var(--text-primary)'
                      }}>
                        {formatNumber(cron.tokens)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)' }}>
                  <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    合计 ({cronList.length} 个任务)
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--primary-light)' }}>
                    {cronData?.messages || 0}
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--primary-light)' }}>
                    {formatNumber(cronData?.input_tokens || 0)}
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--primary-light)' }}>
                    {formatNumber(cronData?.output_tokens || 0)}
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--primary-light)' }}>
                    {formatNumber(cronData?.total_tokens || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-muted)' }}>暂无定时任务数据</p>
          </div>
        )}
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
        {currentPage === 'errors' && <ErrorAnalysisPage />}
        {currentPage === 'cron' && <CronJobsPage />}
        {currentPage === 'files' && <FilesPage />}
      </main>
    </>
  )
}

export default App
