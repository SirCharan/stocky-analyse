import { useMemo } from 'react'
import StatCard from '../../components/StatCard'
import Card from '../../components/Card'
import ChartWrapper, { DarkTooltipStyle } from '../../components/ChartWrapper'
import DataTable from '../../components/DataTable'
import { formatCurrency, formatCurrencyFull, formatPercent, pnlColor } from '../../lib/utils'
import { useIsMobile } from '../../lib/useIsMobile'
import type { CsvInstrumentAnalysis, UnderlyingRow } from '../../types/csvReport'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import type { ColumnDef } from '@tanstack/react-table'

export default function CsvInstrumentAnalysisPage({ data }: { data: CsvInstrumentAnalysis }) {
  const mobile = useIsMobile()
  const sc = data.summary_cards

  const underlyingColumns = useMemo<ColumnDef<UnderlyingRow, unknown>[]>(() => [
    { accessorKey: 'underlying', header: 'Underlying' },
    { accessorKey: 'trades', header: 'Trades' },
    { accessorKey: 'total_pnl', header: 'P&L', cell: i => <span style={{ color: pnlColor(i.getValue() as number) }}>{formatCurrencyFull(i.getValue() as number)}</span> },
    { accessorKey: 'win_rate', header: 'Win Rate', cell: i => formatPercent(i.getValue() as number) },
    { accessorKey: 'avg_return', header: 'Avg Return', cell: i => <span style={{ color: pnlColor(i.getValue() as number) }}>{formatPercent(i.getValue() as number)}</span> },
    { accessorKey: 'capital', header: 'Capital', cell: i => formatCurrency(i.getValue() as number) },
  ], [])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <StatCard label="Futures P&L" value={formatCurrency(sc.futures_pnl)} subtext={`${sc.futures_count} trades`} accentColor={pnlColor(sc.futures_pnl)} />
        <StatCard label="Calls (CE) P&L" value={formatCurrency(sc.ce_pnl)} subtext={`${sc.ce_count} trades`} accentColor={pnlColor(sc.ce_pnl)} />
        <StatCard label="Puts (PE) P&L" value={formatCurrency(sc.pe_pnl)} subtext={`${sc.pe_count} trades`} accentColor={pnlColor(sc.pe_pnl)} />
        <StatCard label="Index P&L" value={formatCurrency(sc.index_pnl)} subtext={`${sc.index_count} trades`} accentColor={pnlColor(sc.index_pnl)} />
        <StatCard label="Stock P&L" value={formatCurrency(sc.stock_pnl)} subtext={`${sc.stock_count} trades`} accentColor={pnlColor(sc.stock_pnl)} />
      </div>

      {/* Directional Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Long Trades">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>P&L</div>
              <div className="text-lg font-bold font-mono mt-1" style={{ color: pnlColor(data.directional.long_pnl) }}>{formatCurrencyFull(data.directional.long_pnl)}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Trades</div>
              <div className="text-lg font-bold font-mono mt-1" style={{ color: 'var(--text-primary)' }}>{data.directional.long_trades}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Win Rate</div>
              <div className="text-lg font-bold font-mono mt-1" style={{ color: 'var(--text-primary)' }}>{formatPercent(data.directional.long_win_rate)}</div>
            </div>
          </div>
        </Card>
        <Card title="Short Trades">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>P&L</div>
              <div className="text-lg font-bold font-mono mt-1" style={{ color: pnlColor(data.directional.short_pnl) }}>{formatCurrencyFull(data.directional.short_pnl)}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Trades</div>
              <div className="text-lg font-bold font-mono mt-1" style={{ color: 'var(--text-primary)' }}>{data.directional.short_trades}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Win Rate</div>
              <div className="text-lg font-bold font-mono mt-1" style={{ color: 'var(--text-primary)' }}>{formatPercent(data.directional.short_win_rate)}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top 5 Winners & Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Top 5 Winners">
          <ChartWrapper height={200} mobileHeight={160}>
            <BarChart data={data.top5_winners} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => formatCurrency(v)} />
              <YAxis type="category" dataKey="underlying" width={mobile ? 60 : 80} tick={{ fontSize: 11, fill: '#a0a0a0' }} />
              <Tooltip {...DarkTooltipStyle()} formatter={(v: number) => [formatCurrencyFull(v), 'P&L']} />
              <Bar dataKey="pnl" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartWrapper>
        </Card>
        <Card title="Top 5 Losers">
          <ChartWrapper height={200} mobileHeight={160}>
            <BarChart data={data.top5_losers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => formatCurrency(v)} />
              <YAxis type="category" dataKey="underlying" width={mobile ? 60 : 80} tick={{ fontSize: 11, fill: '#a0a0a0' }} />
              <Tooltip {...DarkTooltipStyle()} formatter={(v: number) => [formatCurrencyFull(v), 'P&L']} />
              <Bar dataKey="pnl" fill="#eb3b3b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartWrapper>
        </Card>
      </div>

      {/* Per-Underlying Table */}
      <Card title="P&L by Underlying">
        <DataTable data={data.per_underlying} columns={underlyingColumns} />
      </Card>

      {/* Long vs Short by Underlying */}
      {data.long_short_by_underlying.length > 0 && (
        <Card title="Long vs Short by Underlying">
          <ChartWrapper height={Math.max(400, data.long_short_by_underlying.length * 28)} mobileHeight={Math.max(280, data.long_short_by_underlying.length * 20)}>
            <BarChart data={data.long_short_by_underlying} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => formatCurrency(v)} />
              <YAxis type="category" dataKey="underlying" width={mobile ? 60 : 80} tick={{ fontSize: 11, fill: '#a0a0a0' }} />
              <Tooltip {...DarkTooltipStyle()} formatter={(v: number, name: string) => [formatCurrencyFull(v), name === 'long_pnl' ? 'Long' : 'Short']} />
              <Bar dataKey="long_pnl" fill="#22c55e" stackId="a" />
              <Bar dataKey="short_pnl" fill="#eb3b3b" stackId="a" />
            </BarChart>
          </ChartWrapper>
        </Card>
      )}
    </div>
  )
}
