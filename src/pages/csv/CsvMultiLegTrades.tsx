import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { GitMerge, TrendingUp, Target, Award, ChevronDown, ChevronRight, Trophy, AlertTriangle } from 'lucide-react'
import Card from '../../components/Card'
import ChartWrapper, { DarkTooltipStyle } from '../../components/ChartWrapper'
import { useIsMobile } from '../../lib/useIsMobile'
import { formatCurrency, formatCurrencyFull, formatPercent, pnlColor } from '../../lib/utils'
import type { MultiLegAnalysis, MultiLegTrade } from '../../types/csvReport'

const strategyColors: Record<string, string> = {
  'Bull Call Spread': '#3b82f6',
  'Bear Call Spread': '#ef4444',
  'Bull Put Spread': '#3b82f6',
  'Bear Put Spread': '#ef4444',
  'Long Straddle': '#a855f7',
  'Short Straddle': '#a855f7',
  'Long Strangle': '#8b5cf6',
  'Short Strangle': '#8b5cf6',
  'Call Ratio Spread': '#f59e0b',
  'Put Ratio Spread': '#f59e0b',
  'Synthetic Position': '#06b6d4',
  'Iron Condor': '#f97316',
  'Iron Butterfly': '#f97316',
  'Reverse Iron Condor': '#f97316',
  'Reverse Iron Butterfly': '#f97316',
  'Long Call Butterfly': '#10b981',
  'Short Call Butterfly': '#10b981',
  'Long Put Butterfly': '#10b981',
  'Short Put Butterfly': '#10b981',
  'Call Condor': '#14b8a6',
  'Put Condor': '#14b8a6',
}

function getColor(strategy: string): string {
  return strategyColors[strategy] || '#6b7280'
}

function ExpandableTrade({ trade }: { trade: MultiLegTrade }) {
  const [open, setOpen] = useState(false)
  const color = getColor(trade.strategy)

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span
          className="px-2 py-0.5 rounded text-xs font-semibold shrink-0"
          style={{ background: `${color}20`, color }}
        >
          {trade.strategy}
        </span>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {trade.underlying}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {trade.num_legs} legs
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {trade.entry_date}
        </span>
        <span className="text-sm font-bold font-mono ml-2" style={{ color: pnlColor(trade.combined_pnl) }}>
          {formatCurrencyFull(trade.combined_pnl)}
        </span>
        <span className="text-xs font-mono" style={{ color: pnlColor(trade.combined_pnl_pct) }}>
          {formatPercent(trade.combined_pnl_pct)}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="text-left py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>Symbol</th>
                  <th className="text-left py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>Type</th>
                  <th className="text-left py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>Strike</th>
                  <th className="text-left py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>Dir</th>
                  <th className="text-right py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>Qty</th>
                  <th className="text-right py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>Entry</th>
                  <th className="text-right py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>Exit</th>
                  <th className="text-right py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>P&L</th>
                </tr>
              </thead>
              <tbody>
                {trade.legs.map((leg, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-1.5 px-2 font-mono">{leg.symbol}</td>
                    <td className="py-1.5 px-2">{leg.instrument_type}</td>
                    <td className="py-1.5 px-2 font-mono">{leg.strike}</td>
                    <td className="py-1.5 px-2">
                      <span style={{ color: leg.direction === 'long' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {leg.entry_type}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{leg.quantity}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{leg.entry_price.toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{leg.exit_price.toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold" style={{ color: pnlColor(leg.pnl) }}>
                      {formatCurrencyFull(leg.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CsvMultiLegTrades({ data }: { data: MultiLegAnalysis }) {
  const mobile = useIsMobile()
  const [filterStrategy, setFilterStrategy] = useState('')
  const [filterUnderlying, setFilterUnderlying] = useState('')

  const { summary, by_strategy, by_underlying, trades } = data

  const filteredTrades = useMemo(() => {
    let t = trades
    if (filterStrategy) t = t.filter(tr => tr.strategy === filterStrategy)
    if (filterUnderlying) t = t.filter(tr => tr.underlying === filterUnderlying)
    return t
  }, [trades, filterStrategy, filterUnderlying])

  const allStrategies = useMemo(() => [...new Set(trades.map(t => t.strategy))].sort(), [trades])
  const allUnderlyings = useMemo(() => [...new Set(trades.map(t => t.underlying))].sort(), [trades])

  if (summary.total === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <GitMerge size={48} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <div className="text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>
              No Multi-Leg Trades Detected
            </div>
            <div className="text-sm text-center max-w-md" style={{ color: 'var(--text-muted)' }}>
              Multi-leg trades are options on the same underlying entered and exited within 3 seconds of each other
              (e.g., bull call spreads, straddles, iron condors).
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const tooltipProps = DarkTooltipStyle()

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className={`grid gap-4 ${mobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-6'}`}>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <GitMerge size={14} style={{ color: 'var(--accent-blue)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Spreads</span>
          </div>
          <div className="text-xl font-bold font-mono">{summary.total}</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} style={{ color: pnlColor(summary.total_pnl) }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Combined P&L</span>
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: pnlColor(summary.total_pnl) }}>
            {formatCurrency(summary.total_pnl)}
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} style={{ color: 'var(--accent-green)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Win Rate</span>
          </div>
          <div className="text-xl font-bold font-mono">{summary.win_rate}%</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} style={{ color: '#f59e0b' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg P&L</span>
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: pnlColor(summary.avg_pnl) }}>
            {formatCurrency(summary.avg_pnl)}
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={14} style={{ color: 'var(--accent-green)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Best Trade</span>
          </div>
          <div className="text-sm font-bold font-mono" style={{ color: '#22c55e' }}>
            {formatCurrency(summary.best_trade.pnl)}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {summary.best_trade.underlying} — {summary.best_trade.strategy}
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} style={{ color: 'var(--accent-red)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Worst Trade</span>
          </div>
          <div className="text-sm font-bold font-mono" style={{ color: '#eb3b3b' }}>
            {formatCurrency(summary.worst_trade.pnl)}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {summary.worst_trade.underlying} — {summary.worst_trade.strategy}
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className={`grid gap-4 ${mobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {/* P&L by Strategy */}
        {by_strategy.length > 0 && (
          <Card title="P&L by Strategy">
            <ChartWrapper height={280} mobileHeight={220}>
              <BarChart data={by_strategy} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis type="category" dataKey="strategy" width={130} tick={{ fill: '#ccc', fontSize: 10 }} />
                <Tooltip
                  {...tooltipProps}
                  formatter={(v: number) => [formatCurrencyFull(v), 'P&L']}
                />
                <Bar dataKey="total_pnl" radius={[0, 4, 4, 0]}>
                  {by_strategy.map((entry, i) => (
                    <Cell key={i} fill={entry.total_pnl >= 0 ? '#22c55e' : '#eb3b3b'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartWrapper>
            <div className="mt-3 space-y-1">
              {by_strategy.map(s => (
                <div key={s.strategy} className="flex items-center gap-2 text-xs px-1">
                  <span
                    className="px-1.5 py-0.5 rounded font-semibold text-[10px]"
                    style={{ background: `${getColor(s.strategy)}20`, color: getColor(s.strategy) }}
                  >
                    {s.strategy}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.count} trades</span>
                  <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>WR: {s.win_rate}%</span>
                  <span className="font-mono font-semibold" style={{ color: pnlColor(s.avg_pnl) }}>
                    Avg: {formatCurrency(s.avg_pnl)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* P&L by Underlying */}
        {by_underlying.length > 0 && (
          <Card title="P&L by Underlying">
            <ChartWrapper height={280} mobileHeight={220}>
              <BarChart data={by_underlying.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis type="category" dataKey="underlying" width={90} tick={{ fill: '#ccc', fontSize: 10 }} />
                <Tooltip
                  {...tooltipProps}
                  formatter={(v: number) => [formatCurrencyFull(v), 'P&L']}
                />
                <Bar dataKey="total_pnl" radius={[0, 4, 4, 0]}>
                  {by_underlying.slice(0, 10).map((entry, i) => (
                    <Cell key={i} fill={entry.total_pnl >= 0 ? '#22c55e' : '#eb3b3b'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartWrapper>
            <div className="mt-3 space-y-1">
              {by_underlying.slice(0, 10).map(u => (
                <div key={u.underlying} className="flex items-center gap-2 text-xs px-1">
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{u.underlying}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{u.count} trades</span>
                  <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>WR: {u.win_rate}%</span>
                  <span className="font-mono font-semibold" style={{ color: pnlColor(u.total_pnl) }}>
                    {formatCurrency(u.total_pnl)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* P&L Timeline */}
      {data.pnl_timeline.length > 0 && (
        <Card title="Multi-Leg P&L Timeline">
          <ChartWrapper height={220} mobileHeight={180}>
            <BarChart data={data.pnl_timeline} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 9 }} />
              <YAxis tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip
                {...tooltipProps}
                formatter={(v: number) => [formatCurrencyFull(v), 'P&L']}
                labelFormatter={(label: string) => `Date: ${label}`}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {data.pnl_timeline.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#eb3b3b'} />
                ))}
              </Bar>
            </BarChart>
          </ChartWrapper>
        </Card>
      )}

      {/* Trades List */}
      <Card title={`All Multi-Leg Trades (${filteredTrades.length})`}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={filterStrategy}
            onChange={e => setFilterStrategy(e.target.value)}
            className="modal-input w-full sm:w-auto"
            style={{ maxWidth: mobile ? undefined : 180 }}
          >
            <option value="">All Strategies</option>
            {allStrategies.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterUnderlying}
            onChange={e => setFilterUnderlying(e.target.value)}
            className="modal-input w-full sm:w-auto"
            style={{ maxWidth: mobile ? undefined : 140 }}
          >
            <option value="">All Underlyings</option>
            {allUnderlyings.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {filteredTrades.map(trade => (
            <ExpandableTrade key={trade.id} trade={trade} />
          ))}
          {filteredTrades.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
              No trades match the selected filters.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
