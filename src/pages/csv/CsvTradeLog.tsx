import { useMemo, useState } from 'react'
import { useIsMobile } from '../../lib/useIsMobile'
import Card from '../../components/Card'
import DataTable from '../../components/DataTable'
import { formatCurrency, formatCurrencyFull, formatPercent, pnlColor } from '../../lib/utils'
import type { CsvTradeLog, MatchedTrade, CsvOpenPosition } from '../../types/csvReport'
import type { ColumnDef } from '@tanstack/react-table'
import { GitMerge, TrendingUp, Target, Award } from 'lucide-react'

// Strategy badge colors
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
}

function getStrategyColor(strategy: string): string {
  return strategyColors[strategy] || '#6b7280'
}

// Build a map from multi_leg_id → strategy name
function buildStrategyMap(data: CsvTradeLog): Record<string, string> {
  const map: Record<string, string> = {}
  if (data.multi_leg_trades) {
    for (const ml of data.multi_leg_trades) {
      map[ml.id] = ml.strategy
    }
  }
  return map
}

export default function CsvTradeLogPage({ data }: { data: CsvTradeLog }) {
  const mobile = useIsMobile()
  const [filter, setFilter] = useState({ search: '', type: '', direction: '' })

  const strategyMap = useMemo(() => buildStrategyMap(data), [data])

  const filteredTrades = useMemo(() => {
    let trades = data.completed_trades
    if (filter.search) {
      const q = filter.search.toLowerCase()
      trades = trades.filter(t => t.underlying.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q))
    }
    if (filter.type) trades = trades.filter(t => t.instrument_type === filter.type)
    if (filter.direction) trades = trades.filter(t => t.direction === filter.direction)
    return trades
  }, [data.completed_trades, filter])

  const tradeColumns = useMemo<ColumnDef<MatchedTrade, unknown>[]>(() => [
    { accessorKey: 'underlying', header: 'Underlying' },
    { accessorKey: 'instrument_type', header: 'Type' },
    { accessorKey: 'strike', header: 'Strike' },
    { accessorKey: 'direction', header: 'Dir', cell: i => {
      const v = i.getValue() as string
      return <span style={{ color: v === 'long' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{v}</span>
    }},
    { accessorKey: 'entry_date', header: 'Entry', cell: i => (i.getValue() as string).slice(0, 10) },
    { accessorKey: 'exit_date', header: 'Exit', cell: i => (i.getValue() as string).slice(0, 10) },
    { accessorKey: 'quantity', header: 'Qty', cell: i => (i.getValue() as number).toLocaleString() },
    { accessorKey: 'entry_price', header: 'Entry ₹', cell: i => (i.getValue() as number).toFixed(2) },
    { accessorKey: 'exit_price', header: 'Exit ₹', cell: i => (i.getValue() as number).toFixed(2) },
    { accessorKey: 'pnl', header: 'P&L', cell: i => <span style={{ color: pnlColor(i.getValue() as number) }}>{formatCurrencyFull(i.getValue() as number)}</span> },
    { accessorKey: 'pnl_pct', header: 'P&L %', cell: i => <span style={{ color: pnlColor(i.getValue() as number) }}>{formatPercent(i.getValue() as number)}</span> },
    {
      id: 'strategy',
      header: 'Strategy',
      cell: ({ row }) => {
        const mlId = row.original.multi_leg_id
        if (!mlId) return null
        const strat = strategyMap[mlId]
        if (!strat) return null
        return (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
            style={{ background: `${getStrategyColor(strat)}20`, color: getStrategyColor(strat) }}
          >
            {strat}
          </span>
        )
      },
    },
    { accessorKey: 'capital', header: 'Capital', cell: i => formatCurrency(i.getValue() as number) },
    { accessorKey: 'hold_days', header: 'Hold', cell: i => `${i.getValue()}d` },
    { accessorKey: 'dte', header: 'DTE', cell: i => `${i.getValue()}d` },
  ], [strategyMap])

  const openColumns = useMemo<ColumnDef<CsvOpenPosition, unknown>[]>(() => [
    { accessorKey: 'underlying', header: 'Underlying' },
    { accessorKey: 'instrument_type', header: 'Type' },
    { accessorKey: 'strike', header: 'Strike' },
    { accessorKey: 'side', header: 'Side' },
    { accessorKey: 'quantity', header: 'Qty', cell: i => (i.getValue() as number).toLocaleString() },
    { accessorKey: 'price', header: 'Price', cell: i => (i.getValue() as number).toFixed(2) },
    { accessorKey: 'entry_date', header: 'Entry', cell: i => (i.getValue() as string).slice(0, 10) },
    { accessorKey: 'expiry_date', header: 'Expiry' },
  ], [])

  const mlSummary = data.multi_leg_summary
  const hasMultiLeg = mlSummary && mlSummary.total > 0
  const topStrategy = hasMultiLeg
    ? Object.entries(mlSummary.strategies).sort((a, b) => b[1] - a[1])[0]
    : null

  return (
    <div className="space-y-6">
      {/* Multi-Leg Summary Cards */}
      {hasMultiLeg && (
        <div className={`grid gap-4 ${mobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <GitMerge size={14} style={{ color: 'var(--accent-blue)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Multi-Leg Trades</span>
            </div>
            <div className="text-xl font-bold font-mono">{mlSummary.total}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {mlSummary.legs_grouped} legs grouped
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} style={{ color: pnlColor(mlSummary.total_pnl) }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Combined P&L</span>
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: pnlColor(mlSummary.total_pnl) }}>
              {formatCurrency(mlSummary.total_pnl)}
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} style={{ color: 'var(--accent-green)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Win Rate</span>
            </div>
            <div className="text-xl font-bold font-mono">{mlSummary.win_rate}%</div>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Award size={14} style={{ color: '#f59e0b' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Top Strategy</span>
            </div>
            <div className="text-sm font-bold" style={{ color: topStrategy ? getStrategyColor(topStrategy[0]) : undefined }}>
              {topStrategy ? topStrategy[0] : '-'}
            </div>
            {topStrategy && (
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{topStrategy[1]} trades</div>
            )}
          </Card>
        </div>
      )}

      {/* Filter Bar */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search symbol or underlying..."
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            className="modal-input w-full sm:w-auto"
            style={{ maxWidth: mobile ? undefined : 240 }}
          />
          <select
            value={filter.type}
            onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
            className="modal-input w-full sm:w-auto"
            style={{ maxWidth: mobile ? undefined : 120 }}
          >
            <option value="">All Types</option>
            <option value="CE">CE</option>
            <option value="PE">PE</option>
            <option value="FUT">FUT</option>
          </select>
          <select
            value={filter.direction}
            onChange={e => setFilter(f => ({ ...f, direction: e.target.value }))}
            className="modal-input w-full sm:w-auto"
            style={{ maxWidth: mobile ? undefined : 120 }}
          >
            <option value="">All Dirs</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {filteredTrades.length} of {data.completed_trades.length} trades
          </span>
        </div>
      </Card>

      {/* Trade Table */}
      <Card title="Completed Trades">
        <DataTable data={filteredTrades} columns={tradeColumns} pageSize={25} />
      </Card>

      {/* Open Positions */}
      {data.open_positions.length > 0 && (
        <Card title={`Open Positions (${data.open_positions.length})`}>
          <DataTable data={data.open_positions} columns={openColumns} pageSize={25} />
        </Card>
      )}
    </div>
  )
}
