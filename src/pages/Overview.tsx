import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import ChartWrapper, { DarkTooltipStyle } from '../components/ChartWrapper'
import DataTable from '../components/DataTable'
import { formatCurrency, formatCurrencyFull, formatPercent, pnlColor } from '../lib/utils'
import { useReport } from '../context/ReportContext'
import type { OverviewData, InstrumentData, SymbolPnl } from '../types/report'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import type { ColumnDef } from '@tanstack/react-table'

export default function Overview({ data, instruments }: { data: OverviewData; instruments: InstrumentData }) {
  const { dispatch } = useReport()

  const symbolColumns = useMemo<ColumnDef<SymbolPnl, unknown>[]>(
    () => [
      {
        accessorKey: 'symbol',
        header: 'Symbol',
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: 'underlying',
        header: 'Underlying',
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: 'buy_value',
        header: 'Buy Value',
        cell: (info) => formatCurrency(info.getValue() as number),
      },
      {
        accessorKey: 'sell_value',
        header: 'Sell Value',
        cell: (info) => formatCurrency(info.getValue() as number),
      },
      {
        accessorKey: 'realized_pnl',
        header: 'Realized P&L',
        cell: (info) => {
          const value = info.getValue() as number
          return (
            <span style={{ color: pnlColor(value) }}>
              {formatCurrency(value)}
            </span>
          )
        },
      },
      {
        accessorKey: 'pnl_pct',
        header: 'P&L %',
        cell: (info) => {
          const value = info.getValue() as number
          return (
            <span style={{ color: pnlColor(value) }}>
              {formatPercent(value)}
            </span>
          )
        },
      },
    ],
    [],
  )

  const symbolTypeSubtext = Object.entries(data.symbols_by_type)
    .map(([type, count]) => `${type}: ${count}`)
    .join(' | ')

  const bestStocks = instruments.pnl_by_underlying.slice(0, 3)
  const worstStocks = instruments.pnl_by_underlying.slice(-3).reverse()
  const winLossRatio = data.win_loss_ratio
  const winLossHealthy = winLossRatio >= 1

  return (
    <div className="space-y-6">
      {/* Row 1: 4 StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Net Realized P&L"
          value={formatCurrency(data.net_realized_pnl)}
          accentColor={pnlColor(data.net_realized_pnl)}
        />
        <StatCard
          label="Unrealized P&L"
          value={formatCurrency(data.unrealized_pnl)}
          accentColor={pnlColor(data.unrealized_pnl)}
        />
        <StatCard
          label="Total Charges"
          value={formatCurrency(data.total_charges)}
          accentColor="var(--accent-red)"
        />
        <StatCard
          label="Net After Charges"
          value={formatCurrency(data.net_after_charges)}
          accentColor={pnlColor(data.net_after_charges)}
        />
      </div>

      {/* Row 2: Win Rate + Symbols | Buy/Sell Value | Winners/Losers/Breakeven */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Win Rate"
            value={formatPercent(data.win_rate)}
            accentColor={data.win_rate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)'}
          />
          <StatCard
            label="Symbols Traded"
            value={String(data.symbols_traded)}
            subtext={symbolTypeSubtext}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total Buy Value"
            value={formatCurrency(data.total_buy_value)}
          />
          <StatCard
            label="Total Sell Value"
            value={formatCurrency(data.total_sell_value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Winners"
            value={String(data.winners)}
            accentColor="var(--accent-green)"
          />
          <StatCard
            label="Losers"
            value={String(data.losers)}
            accentColor="var(--accent-red)"
          />
          <StatCard
            label="Breakeven"
            value={String(data.breakeven)}
          />
        </div>
      </div>

      {/* Row 3: Avg Winner, Avg Loser, Win/Loss Ratio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Avg Winner"
          value={formatCurrency(data.avg_winner)}
          accentColor="var(--accent-green)"
        />
        <StatCard
          label="Avg Loser"
          value={formatCurrency(data.avg_loser)}
          accentColor="var(--accent-red)"
        />
        <StatCard
          label="Win/Loss Ratio"
          value={data.win_loss_ratio.toFixed(2)}
        />
      </div>

      {/* Insight Cards: 2x2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Calls vs Puts */}
        <Card title="Calls vs Puts">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Calls
              </div>
              <div className="text-xl font-bold font-mono mt-1" style={{ color: pnlColor(instruments.calls_pnl) }}>
                {formatCurrencyFull(instruments.calls_pnl)}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {instruments.calls_count} trades
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Puts
              </div>
              <div className="text-xl font-bold font-mono mt-1" style={{ color: pnlColor(instruments.puts_pnl) }}>
                {formatCurrencyFull(instruments.puts_pnl)}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {instruments.puts_count} trades
              </div>
            </div>
          </div>
          <div className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Puts outperform in bearish markets
          </div>
        </Card>

        {/* Card 2: Futures vs Options */}
        <Card title="Futures vs Options">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Futures
              </div>
              <div className="text-xl font-bold font-mono mt-1" style={{ color: pnlColor(instruments.futures_pnl) }}>
                {formatCurrencyFull(instruments.futures_pnl)}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {instruments.futures_count} trades
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Options
              </div>
              <div className="text-xl font-bold font-mono mt-1" style={{ color: pnlColor(instruments.options_pnl) }}>
                {formatCurrencyFull(instruments.options_pnl)}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {instruments.options_count} trades
              </div>
            </div>
          </div>
          <div className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Options have lower capital outlay
          </div>
        </Card>

        {/* Card 3: Top & Bottom Performers */}
        <Card title="Top & Bottom Performers">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-green)' }}>
                Top Performers
              </div>
              {bestStocks.map((s) => (
                <div key={s.underlying} className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    {s.underlying}
                  </span>
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent-green)' }}>
                    {formatCurrency(s.pnl)}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-red)' }}>
                Bottom Performers
              </div>
              {worstStocks.map((s) => (
                <div key={s.underlying} className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    {s.underlying}
                  </span>
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent-red)' }}>
                    {formatCurrency(s.pnl)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Card 4: Avg Win vs Avg Loss */}
        <Card title="Avg Win vs Avg Loss">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Avg Win
              </div>
              <div className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--accent-green)' }}>
                {formatCurrencyFull(data.avg_winner)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Avg Loss
              </div>
              <div className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--accent-red)' }}>
                {formatCurrencyFull(Math.abs(data.avg_loser))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center mt-4">
            <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              Ratio: {winLossRatio.toFixed(2)}x
            </span>
          </div>
          <div className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            {winLossHealthy
              ? 'Winners outsize losers'
              : 'Losses exceed wins — review stop-losses'}
          </div>
        </Card>
      </div>

      {/* AI Advice CTA */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-4 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.06) 100%)',
          borderLeft: '3px solid #8b5cf6',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderLeftWidth: '3px',
          borderLeftColor: '#8b5cf6',
        }}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            AI Trader Advice
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            AI-powered analysis of your trading patterns and areas to improve
          </div>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_TAB', payload: 5 })}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          View AI Advice <ArrowRight size={14} />
        </button>
      </div>

      {/* P&L Distribution */}
      <Card title="P&L Distribution">
        <ChartWrapper height={300} mobileHeight={220}>
          <BarChart data={data.pnl_distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 11, fill: '#a0a0a0' }}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11, fill: '#a0a0a0' }} />
            <Tooltip
              {...DarkTooltipStyle()}
              formatter={(value: number) => [value, 'Count']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.pnl_distribution.map((item, index) => (
                <Cell key={index} fill={item.min >= 0 ? '#22c55e' : '#eb3b3b'} />
              ))}
            </Bar>
          </BarChart>
        </ChartWrapper>
      </Card>

      {/* Return % Distribution */}
      <Card title="Return % Distribution">
        <ChartWrapper height={300} mobileHeight={220}>
          <BarChart data={data.return_pct_distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 11, fill: '#a0a0a0' }}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11, fill: '#a0a0a0' }} />
            <Tooltip
              {...DarkTooltipStyle()}
              formatter={(value: number) => [value, 'Count']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.return_pct_distribution.map((item, index) => (
                <Cell key={index} fill={item.min >= 0 ? '#22c55e' : '#eb3b3b'} />
              ))}
            </Bar>
          </BarChart>
        </ChartWrapper>
      </Card>

      {/* Symbol-wise P&L Table */}
      <Card title="Symbol-wise P&L">
        <DataTable data={data.symbol_wise_pnl} columns={symbolColumns} />
      </Card>
    </div>
  )
}
