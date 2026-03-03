import { useState, useEffect, useCallback } from 'react'
import { useReport } from '../context/ReportContext'
import Card from '../components/Card'
import ChartWrapper from '../components/ChartWrapper'
import { fetchAdvice } from '../lib/api'
import { generateAdvicePdf } from '../lib/generatePdf'
import { formatCurrency, formatPercent } from '../lib/utils'
import type { ReportData } from '../types/report'
import type { AdviceResponse, AdviceBullet } from '../types/advice'
import {
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Shield,
  Target,
  Scale,
  Zap,
  BrainCircuit,
  Heart,
  Flame,
  FileDown,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

interface TraderAdviceProps {
  report: ReportData
}

const SCORE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  'A+': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: 'Exceptional' },
  'A':  { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', label: 'Excellent' },
  'B+': { color: '#84cc16', bg: 'rgba(132, 204, 22, 0.12)', label: 'Good' },
  'B':  { color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)', label: 'Above Average' },
  'C+': { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', label: 'Average' },
  'C':  { color: '#f97316', bg: 'rgba(249, 115, 22, 0.10)', label: 'Below Average' },
  'D':  { color: '#eb3b3b', bg: 'rgba(235, 59, 59, 0.12)', label: 'Needs Work' },
}

const TAB_LABELS: Record<number, string> = {
  0: 'Overview',
  1: 'Performance',
  2: 'Instruments',
  3: 'Charges',
  4: 'Portfolio',
}

const TRADING_LAWS = [
  {
    icon: Scale,
    name: 'Kelly Criterion',
    description:
      'Optimal position sizing formula based on your win rate and risk-reward ratio. Tells you what fraction of capital to risk per trade.',
  },
  {
    icon: Target,
    name: 'Pareto Principle (80/20)',
    description:
      '80% of your profits likely come from 20% of your trades. Focus on identifying and replicating those high-impact setups.',
  },
  {
    icon: Shield,
    name: 'Risk Management',
    description:
      'Charges should stay below 10% of gross P&L. High charges relative to profits signal overtrading or poor trade selection.',
  },
  {
    icon: TrendingUp,
    name: 'Win/Loss Asymmetry',
    description:
      'Average winners should be larger than average losers (ratio > 1.5). This ensures profitability even with a lower win rate.',
  },
  {
    icon: Zap,
    name: 'Concentration Risk',
    description:
      'Avoid having more than 40% of profits from a single underlying. Diversification protects against sector-specific drawdowns.',
  },
]

export default function TraderAdvice({ report }: TraderAdviceProps) {
  const { dispatch } = useReport()
  const [advice, setAdvice] = useState<AdviceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lawsExpanded, setLawsExpanded] = useState(false)
  const [tone, setTone] = useState<'helpful' | 'roast'>('helpful')

  const loadAdvice = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdvice(report, tone)
      setAdvice(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate advice')
    } finally {
      setLoading(false)
    }
  }, [report, tone])

  useEffect(() => {
    loadAdvice()
  }, [loadAdvice])

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={loadAdvice} />
  if (!advice) return null

  const scoreConfig = SCORE_CONFIG[advice.overall_score] || SCORE_CONFIG['C']
  const kellyData = [
    { name: 'Full Kelly', value: advice.kelly_pct, fill: '#eb3b3b' },
    { name: 'Half Kelly', value: advice.half_kelly_pct, fill: '#3b82f6' },
  ]

  const handleDownloadPdf = () => {
    generateAdvicePdf(advice, report.metadata.date_range)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl p-6" style={{
        background: 'linear-gradient(135deg, rgba(235, 59, 59, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'var(--accent-dim)' }}>
              <BrainCircuit size={28} color="var(--accent)" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                AI Trader Advice
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Personalized analysis based on your trading data
                {advice.source === 'groq-enhanced' && (
                  <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded text-xs"
                    style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                    <Sparkles size={10} /> AI Enhanced
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Tone Toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-medium)' }}>
              <button
                onClick={() => setTone('helpful')}
                className="px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all"
                style={{
                  background: tone === 'helpful' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                  color: tone === 'helpful' ? '#22c55e' : 'var(--text-secondary)',
                }}
              >
                <Heart size={12} /> Helpful
              </button>
              <button
                onClick={() => setTone('roast')}
                className="px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all"
                style={{
                  background: tone === 'roast' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                  color: tone === 'roast' ? '#f97316' : 'var(--text-secondary)',
                }}
              >
                <Flame size={12} /> Roast Me
              </button>
            </div>
            {/* Score Badge */}
            <div className="text-center px-5 py-3 rounded-xl" style={{
              background: scoreConfig.bg,
              border: `1px solid ${scoreConfig.color}33`,
            }}>
              <div className="text-3xl font-bold font-mono" style={{ color: scoreConfig.color }}>
                {advice.overall_score}
              </div>
              <div className="text-xs mt-1" style={{ color: scoreConfig.color }}>
                {scoreConfig.label}
              </div>
            </div>
            {/* Regenerate */}
            <button onClick={loadAdvice} className="btn-secondary">
              <RefreshCw size={14} /> Regenerate
            </button>
            {/* PDF Download */}
            <button onClick={handleDownloadPdf} className="btn-secondary">
              <FileDown size={14} /> <span className="hidden md:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      {advice.summary && (
        <div className="card" style={{
          borderImage: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3)) 1',
        }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} color="#a78bfa" />
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#a78bfa' }}>
              Executive Summary
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {advice.summary}
          </p>
        </div>
      )}

      {/* Three Column Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Strengths */}
        <div className="card" style={{ borderColor: 'rgba(34, 197, 94, 0.2)' }}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} color="#22c55e" />
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#22c55e' }}>
              What's Working
            </span>
          </div>
          <ul className="space-y-3">
            {advice.strengths.map((item, i) => (
              <BulletItem key={i} item={item} icon={<CheckCircle size={14} color="#22c55e" className="mt-0.5 flex-shrink-0" />} dispatch={dispatch} />
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="card" style={{ borderColor: 'rgba(235, 59, 59, 0.2)' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} color="#eb3b3b" />
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#eb3b3b' }}>
              What's Not Working
            </span>
          </div>
          <ul className="space-y-3">
            {advice.weaknesses.map((item, i) => (
              <BulletItem key={i} item={item} icon={<AlertTriangle size={14} color="#eb3b3b" className="mt-0.5 flex-shrink-0" />} dispatch={dispatch} />
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="card" style={{
          borderImage: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(235, 59, 59, 0.3)) 1',
        }}>
          <div className="flex items-center gap-2 mb-4">
            <ArrowRight size={18} color="#3b82f6" />
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#3b82f6' }}>
              What You Should Change
            </span>
          </div>
          <ol className="space-y-3">
            {advice.recommendations.map((item, i) => (
              <BulletItem
                key={i}
                item={item}
                icon={
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    {i + 1}
                  </span>
                }
                dispatch={dispatch}
              />
            ))}
          </ol>
        </div>
      </div>

      {/* Kelly Criterion + Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kelly Gauge */}
        <Card title="Kelly Criterion — Position Sizing">
          <div className="space-y-4">
            <ChartWrapper height={120} mobileHeight={100}>
              <BarChart data={kellyData} layout="vertical" barSize={28}>
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#a0a0a0' }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 12, fill: '#a0a0a0' }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f0f0f',
                    border: '1px solid #252525',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#e8e8e8',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Fraction']}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {kellyData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartWrapper>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                  Full Kelly
                </div>
                <div className="text-xl font-bold font-mono" style={{ color: '#eb3b3b' }}>
                  {advice.kelly_pct.toFixed(1)}%
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  f* = {advice.kelly_fraction.toFixed(3)}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                  Half Kelly (Recommended)
                </div>
                <div className="text-xl font-bold font-mono" style={{ color: '#3b82f6' }}>
                  {advice.half_kelly_pct.toFixed(1)}%
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  f*/2 = {advice.half_kelly_fraction.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Key Metrics */}
        <Card title="Trading Metrics Snapshot">
          <div className="grid grid-cols-2 gap-3">
            <MetricRow label="Win Rate" value={formatPercent(advice.metrics.win_rate)} />
            <MetricRow label="R:R Ratio" value={advice.metrics.rr_ratio.toFixed(2)} />
            <MetricRow label="Avg Winner" value={formatCurrency(advice.metrics.avg_winner)} color="#22c55e" />
            <MetricRow label="Avg Loser" value={formatCurrency(advice.metrics.avg_loser)} color="#eb3b3b" />
            <MetricRow label="Win/Loss Ratio" value={advice.metrics.win_loss_ratio.toFixed(2)} />
            <MetricRow label="Asymmetry" value={advice.metrics.asymmetry.toFixed(2)} />
            <MetricRow label="Charges % of P&L" value={`${advice.metrics.charges_pct.toFixed(1)}%`}
              color={advice.metrics.overtrading ? '#eb3b3b' : '#22c55e'} />
            <MetricRow label="Concentration" value={`${advice.metrics.concentration_pct.toFixed(0)}%`}
              color={advice.metrics.concentration_pct > 40 ? '#f97316' : '#22c55e'} />
            <MetricRow label="Realized P&L" value={formatCurrency(advice.metrics.realized_pnl)}
              color={advice.metrics.realized_pnl >= 0 ? '#22c55e' : '#eb3b3b'} />
            <MetricRow label="Net After Charges" value={formatCurrency(advice.metrics.net_after_charges)}
              color={advice.metrics.net_after_charges >= 0 ? '#22c55e' : '#eb3b3b'} />
          </div>
        </Card>
      </div>

      {/* Pareto Insight */}
      <Card title="Pareto Insight (80/20 Rule)">
        <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
          <Target size={20} color="#f97316" className="mt-0.5 flex-shrink-0" />
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {advice.pareto_insight}
          </p>
        </div>
      </Card>

      {/* Key Trading Laws — Collapsible */}
      <div className="card">
        <button
          onClick={() => setLawsExpanded(!lawsExpanded)}
          className="w-full flex items-center justify-between"
        >
          <span className="card-title mb-0">Key Trading Laws Applied</span>
          {lawsExpanded ? (
            <ChevronUp size={18} color="var(--text-secondary)" />
          ) : (
            <ChevronDown size={18} color="var(--text-secondary)" />
          )}
        </button>
        {lawsExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {TRADING_LAWS.map((law) => (
              <div key={law.name} className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <law.icon size={16} color="var(--accent)" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {law.name}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {law.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => dispatch({ type: 'SET_TAB', payload: 0 })}
          className="btn-secondary"
        >
          <TrendingUp size={14} /> View Overview
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_TAB', payload: 1 })}
          className="btn-secondary"
        >
          <Target size={14} /> View Pareto Analysis
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_TAB', payload: 3 })}
          className="btn-secondary"
        >
          <Shield size={14} /> View Charges
        </button>
      </div>
    </div>
  )
}

function BulletItem({ item, icon, dispatch }: {
  item: AdviceBullet;
  icon: React.ReactNode;
  dispatch: ReturnType<typeof useReport>['dispatch'];
}) {
  return (
    <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
      {icon}
      <div>
        <span>{item.text}</span>
        {item.related_tab != null && (
          <button
            onClick={() => dispatch({ type: 'SET_TAB', payload: item.related_tab! })}
            className="inline-flex items-center gap-0.5 ml-1.5 text-xs font-medium hover:underline transition-colors"
            style={{ color: '#3b82f6' }}
          >
            View {TAB_LABELS[item.related_tab!]} <ArrowRight size={10} />
          </button>
        )}
      </div>
    </li>
  )
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-sm font-semibold font-mono" style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl p-6" style={{
        background: 'linear-gradient(135deg, rgba(235, 59, 59, 0.05) 0%, rgba(59, 130, 246, 0.03) 100%)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'var(--accent-dim)' }}>
            <BrainCircuit size={28} color="var(--accent)" className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Analyzing Your Trades...
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Running Kelly Criterion, Pareto analysis, and AI enhancement
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="shimmer h-64 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="shimmer h-72 rounded-xl" />
        <div className="shimmer h-72 rounded-xl" />
      </div>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertTriangle size={48} color="#eb3b3b" />
      <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--text-primary)' }}>
        Advice Generation Failed
      </h2>
      <p className="text-sm mt-2 text-center max-w-md" style={{ color: 'var(--text-secondary)' }}>
        {error}
      </p>
      <button onClick={onRetry} className="btn-primary mt-6">
        <RefreshCw size={16} /> Try Again
      </button>
    </div>
  )
}
