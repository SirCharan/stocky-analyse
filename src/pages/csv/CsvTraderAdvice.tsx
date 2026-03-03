import { useState, useEffect, useCallback } from 'react'
import { useReport } from '../../context/ReportContext'
import Card from '../../components/Card'
import ChartWrapper from '../../components/ChartWrapper'
import { fetchCsvAdvice } from '../../lib/api'
import { generateCsvAdvicePdf } from '../../lib/generateCsvAdvicePdf'
import { formatCurrency, formatPercent } from '../../lib/utils'
import type { CsvReportData } from '../../types/csvReport'
import type { CsvAdviceResponse, CsvAdviceBullet, CsvAdviceSection } from '../../types/csvAdvice'
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Shield,
  Target,
  Scale,
  Zap,
  BrainCircuit,
  Heart,
  Flame,
  FileDown,
  Calendar,
  Activity,
  Layers,
  Timer,
  Clock,
  GitMerge,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

interface CsvTraderAdviceProps {
  report: CsvReportData
}

const SCORE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  'A+': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: 'Exceptional' },
  'A':  { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', label: 'Excellent' },
  'B+': { color: '#84cc16', bg: 'rgba(132, 204, 22, 0.12)', label: 'Good' },
  'B':  { color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)', label: 'Above Average' },
  'C+': { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', label: 'Average' },
  'C':  { color: '#f97316', bg: 'rgba(249, 115, 22, 0.10)', label: 'Below Average' },
  'C-': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.10)', label: 'Weak' },
  'D':  { color: '#eb3b3b', bg: 'rgba(235, 59, 59, 0.12)', label: 'Needs Work' },
}

const CSV_TAB_LABELS: Record<number, string> = {
  0: 'Overview',
  1: 'P&L Analysis',
  2: 'Instrument Analysis',
  3: 'Expiry Analysis',
  4: 'Risk & Metrics',
  5: 'Trade Log',
  6: 'Multi-Leg Trades',
}

const SECTION_NAV = [
  { id: 'win-rate', label: 'Win Rate', icon: Target },
  { id: 'monthly-performance', label: 'Months', icon: Calendar },
  { id: 'day-of-week-pnl', label: 'Day P&L', icon: TrendingUp },
  { id: 'trade-frequency', label: 'Frequency', icon: Activity },
  { id: 'instruments-direction', label: 'Instruments', icon: Layers },
  { id: 'expiry-type', label: 'Expiry', icon: Timer },
  { id: 'dte-analysis', label: 'DTE', icon: Clock },
  { id: 'multi-leg', label: 'Multi-Leg', icon: GitMerge },
]

const TRADING_LAWS = [
  {
    icon: Scale,
    name: 'Kelly Criterion',
    description: 'Optimal position sizing based on your win rate and payoff ratio. Risk the Kelly fraction per trade for geometric growth maximization.',
  },
  {
    icon: Target,
    name: 'Sharpe Ratio',
    description: 'Risk-adjusted return metric. Above 1.0 is acceptable, above 2.0 is excellent. Measures whether returns justify the volatility taken.',
  },
  {
    icon: Shield,
    name: 'Profit Factor',
    description: 'Gross wins divided by gross losses. Above 1.5 shows consistent edge. Below 1.0 means you\'re net negative before charges.',
  },
  {
    icon: TrendingUp,
    name: 'Payoff Ratio (R:R)',
    description: 'Average winner divided by average loser. Above 1.5:1 ensures profitability even with win rates below 50%.',
  },
  {
    icon: Zap,
    name: 'Expectancy',
    description: 'Expected profit per trade. Positive expectancy = (Win% × Avg Win) - (Loss% × Avg Loss). The foundation of systematic trading.',
  },
]

export default function CsvTraderAdvice({ report }: CsvTraderAdviceProps) {
  const { dispatch } = useReport()
  const [advice, setAdvice] = useState<CsvAdviceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lawsExpanded, setLawsExpanded] = useState(false)
  const [tone, setTone] = useState<'helpful' | 'roast'>('helpful')

  const loadAdvice = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchCsvAdvice(report, tone)
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
    generateCsvAdvicePdf(advice, report.metadata.date_range)
  }

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
                Hedge fund level analysis of your tradebook
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
            {/* PDF Download */}
            <button onClick={handleDownloadPdf} className="btn-secondary">
              <FileDown size={14} /> <span className="hidden md:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Nav Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1" style={{ scrollbarWidth: 'none' }}>
        {SECTION_NAV.map(nav => (
          <button
            key={nav.id}
            onClick={() => scrollToSection(nav.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors hover:bg-white/5"
            style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <nav.icon size={12} />
            {nav.label}
          </button>
        ))}
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
            <TrendingUp size={18} color="#22c55e" />
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#22c55e' }}>
              What's Working
            </span>
          </div>
          <GroupedBullets
            items={advice.strengths}
            icon={(
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
            )}
            dispatch={dispatch}
          />
        </div>

        {/* Weaknesses */}
        <div className="card" style={{ borderColor: 'rgba(235, 59, 59, 0.2)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={18} color="#eb3b3b" />
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#eb3b3b' }}>
              What's Not Working
            </span>
          </div>
          <GroupedBullets
            items={advice.weaknesses}
            icon={(
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: '#eb3b3b' }} />
            )}
            dispatch={dispatch}
          />
        </div>

        {/* Recommendations */}
        <div className="card" style={{
          borderImage: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(235, 59, 59, 0.3)) 1',
        }}>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={18} color="#3b82f6" />
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#3b82f6' }}>
              What You Should Change
            </span>
          </div>
          <GroupedBullets
            items={advice.recommendations}
            numbered
            dispatch={dispatch}
          />
        </div>
      </div>

      {/* Analysis Sections */}
      {advice.sections.map(section => (
        section.id === 'multi-leg'
          ? <MultiLegSection key={section.id} section={section} dispatch={dispatch} />
          : <AnalysisSection key={section.id} section={section} dispatch={dispatch} />
      ))}

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
            <MetricRow label="Payoff Ratio" value={advice.metrics.rr_ratio.toFixed(2)} />
            <MetricRow label="Profit Factor" value={advice.metrics.profit_factor.toFixed(2)}
              color={advice.metrics.profit_factor >= 1.5 ? '#22c55e' : advice.metrics.profit_factor >= 1.0 ? '#eab308' : '#eb3b3b'} />
            <MetricRow label="Sharpe Ratio" value={advice.metrics.sharpe_ratio.toFixed(2)}
              color={advice.metrics.sharpe_ratio >= 1.5 ? '#22c55e' : advice.metrics.sharpe_ratio >= 1.0 ? '#eab308' : '#eb3b3b'} />
            <MetricRow label="Avg Winner" value={formatCurrency(advice.metrics.avg_winner)} color="#22c55e" />
            <MetricRow label="Avg Loser" value={formatCurrency(advice.metrics.avg_loser)} color="#eb3b3b" />
            <MetricRow label="Max Drawdown" value={`${advice.metrics.max_drawdown_pct.toFixed(1)}%`} color="#eb3b3b" />
            <MetricRow label="Expectancy" value={formatCurrency(advice.metrics.expectancy)}
              color={advice.metrics.expectancy >= 0 ? '#22c55e' : '#eb3b3b'} />
            <MetricRow label="Recovery Factor" value={advice.metrics.recovery_factor.toFixed(2)} />
            <MetricRow label="Consistency" value={`${advice.metrics.monthly_consistency.toFixed(0)}%`}
              color={advice.metrics.monthly_consistency >= 60 ? '#22c55e' : '#f97316'} />
          </div>
        </Card>
      </div>

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
        <button onClick={() => dispatch({ type: 'SET_TAB', payload: 0 })} className="btn-secondary">
          <TrendingUp size={14} /> View Overview
        </button>
        <button onClick={() => dispatch({ type: 'SET_TAB', payload: 1 })} className="btn-secondary">
          <Calendar size={14} /> View P&L Analysis
        </button>
        <button onClick={() => dispatch({ type: 'SET_TAB', payload: 2 })} className="btn-secondary">
          <Layers size={14} /> View Instruments
        </button>
        <button onClick={() => dispatch({ type: 'SET_TAB', payload: 4 })} className="btn-secondary">
          <Shield size={14} /> View Risk Metrics
        </button>
        <button onClick={() => dispatch({ type: 'SET_TAB', payload: 6 })} className="btn-secondary">
          <GitMerge size={14} /> View Multi-Leg Trades
        </button>
      </div>
    </div>
  )
}

function AnalysisSection({ section, dispatch }: {
  section: CsvAdviceSection;
  dispatch: ReturnType<typeof useReport>['dispatch'];
}) {
  return (
    <div id={section.id} className="card scroll-mt-4">
      <div className="flex items-center justify-between mb-4">
        <span className="card-title mb-0">{section.title}</span>
        <button
          onClick={() => dispatch({ type: 'SET_TAB', payload: section.related_tab })}
          className="text-xs font-medium flex items-center gap-1 hover:underline transition-colors"
          style={{ color: '#3b82f6' }}
        >
          View {CSV_TAB_LABELS[section.related_tab]} <ArrowRight size={10} />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
        {section.data_points.map((dp, i) => (
          <MetricRow key={i} label={dp.label} value={dp.value} />
        ))}
      </div>
      <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {section.insight}
        </p>
      </div>
    </div>
  )
}

function MultiLegSection({ section, dispatch }: {
  section: CsvAdviceSection;
  dispatch: ReturnType<typeof useReport>['dispatch'];
}) {
  const summaryPoints = section.data_points.slice(0, 5)
  const strategyPoints = section.data_points.slice(5)

  const parsePnl = (val: string) => {
    const m = val.match(/Rs\s*-?([\d,]+)/)
    return m ? parseFloat(m[1].replace(/,/g, '')) : 0
  }
  const maxPnl = strategyPoints.length > 0
    ? Math.max(...strategyPoints.map(s => parsePnl(s.value)))
    : 0

  return (
    <div id={section.id} className="card scroll-mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitMerge size={18} color="var(--accent)" />
          <span className="card-title mb-0">{section.title}</span>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_TAB', payload: section.related_tab })}
          className="text-xs font-medium flex items-center gap-1 hover:underline transition-colors"
          style={{ color: '#3b82f6' }}
        >
          View {CSV_TAB_LABELS[section.related_tab]} <ArrowRight size={10} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {summaryPoints.map((dp, i) => (
          <MetricRow key={i} label={dp.label} value={dp.value} />
        ))}
      </div>

      {strategyPoints.length > 0 && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-muted)' }}>
            By Strategy
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {strategyPoints.map((sp, i) => {
              const isPositive = !sp.value.includes('Rs -')
              const pnlNum = parsePnl(sp.value)
              const barWidth = maxPnl > 0 ? (pnlNum / maxPnl) * 100 : 0

              return (
                <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {sp.label}
                    </span>
                    <span className="text-xs font-mono font-semibold"
                      style={{ color: isPositive ? '#22c55e' : '#eb3b3b' }}>
                      {sp.value}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--bg-depth, rgba(0,0,0,0.2))' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${barWidth}%`,
                        background: isPositive ? '#22c55e' : '#eb3b3b',
                      }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {section.insight}
        </p>
      </div>
    </div>
  )
}

function GroupedBullets({ items, icon, numbered, dispatch }: {
  items: CsvAdviceBullet[];
  icon?: React.ReactNode;
  numbered?: boolean;
  dispatch: ReturnType<typeof useReport>['dispatch'];
}) {
  // Group items by category, preserving first-appearance order
  const groups: { cat: string; bullets: CsvAdviceBullet[] }[] = []
  const seen = new Map<string, number>()

  for (const item of items) {
    const cat = item.category || 'General'
    if (seen.has(cat)) {
      groups[seen.get(cat)!].bullets.push(item)
    } else {
      seen.set(cat, groups.length)
      groups.push({ cat, bullets: [item] })
    }
  }

  const showHeadings = groups.length > 1

  let globalIdx = 0

  return (
    <div className="space-y-4">
      {groups.map((g, gi) => (
        <div key={g.cat}>
          {showHeadings && (
            <div className="text-[11px] font-bold uppercase tracking-wider mb-2 pb-1"
              style={{
                color: 'var(--text-secondary)',
                borderBottom: gi === 0 ? 'none' : '1px solid var(--border-subtle)',
                paddingTop: gi === 0 ? 0 : 8,
              }}>
              {g.cat}
            </div>
          )}
          <ul className="space-y-2">
            {g.bullets.map((b) => {
              globalIdx++
              const bulletIcon = numbered ? (
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                  {globalIdx}
                </span>
              ) : icon
              return (
                <BulletItem key={globalIdx} item={b} icon={bulletIcon} dispatch={dispatch} />
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function BulletItem({ item, icon, dispatch }: {
  item: CsvAdviceBullet;
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
            View {CSV_TAB_LABELS[item.related_tab!]} <ArrowRight size={10} />
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
              Analyzing Your Tradebook...
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Running Kelly Criterion, Sharpe analysis, and AI enhancement
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
