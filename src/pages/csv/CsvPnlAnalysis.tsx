import { useMemo } from 'react'
import Card from '../../components/Card'
import ChartWrapper, { DarkTooltipStyle } from '../../components/ChartWrapper'
import DataTable from '../../components/DataTable'
import { formatCurrency, formatCurrencyFull, formatPercent, pnlColor } from '../../lib/utils'
import type { CsvPnlAnalysis, MonthlyRow, DayOfWeekRow } from '../../types/csvReport'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import type { ColumnDef } from '@tanstack/react-table'

export default function CsvPnlAnalysisPage({ data }: { data: CsvPnlAnalysis }) {
  const monthlyColumns = useMemo<ColumnDef<MonthlyRow, unknown>[]>(() => [
    { accessorKey: 'month', header: 'Month' },
    { accessorKey: 'trades', header: 'Trades' },
    { accessorKey: 'gross_pnl', header: 'Gross P&L', cell: i => <span style={{ color: pnlColor(i.getValue() as number) }}>{formatCurrencyFull(i.getValue() as number)}</span> },
    { accessorKey: 'win_rate', header: 'Win Rate', cell: i => formatPercent(i.getValue() as number) },
    { accessorKey: 'avg_pnl', header: 'Avg P&L', cell: i => <span style={{ color: pnlColor(i.getValue() as number) }}>{formatCurrency(i.getValue() as number)}</span> },
    { accessorKey: 'largest_win', header: 'Best', cell: i => <span style={{ color: 'var(--accent-green)' }}>{formatCurrency(i.getValue() as number)}</span> },
    { accessorKey: 'largest_loss', header: 'Worst', cell: i => <span style={{ color: 'var(--accent-red)' }}>{formatCurrency(i.getValue() as number)}</span> },
    { accessorKey: 'profit_factor', header: 'PF', cell: i => (i.getValue() as number).toFixed(2) },
  ], [])

  const dowColumns = useMemo<ColumnDef<DayOfWeekRow, unknown>[]>(() => [
    { accessorKey: 'day', header: 'Day' },
    { accessorKey: 'trade_count', header: 'Trades' },
    { accessorKey: 'total_pnl', header: 'Total P&L', cell: i => <span style={{ color: pnlColor(i.getValue() as number) }}>{formatCurrencyFull(i.getValue() as number)}</span> },
    { accessorKey: 'avg_pnl', header: 'Avg P&L', cell: i => <span style={{ color: pnlColor(i.getValue() as number) }}>{formatCurrency(i.getValue() as number)}</span> },
    { accessorKey: 'win_rate', header: 'Win Rate', cell: i => formatPercent(i.getValue() as number) },
  ], [])

  // GitHub-style heatmap: build a grid of weeks (columns) x weekdays (rows)
  const heatmapGrid = useMemo(() => {
    if (!data.daily_heatmap.length) return { weeks: [], monthLabels: [], maxAbs: 1 }

    const pnlMap = new Map<string, number>()
    for (const d of data.daily_heatmap) pnlMap.set(d.date, d.pnl)

    // Find date range
    const dates = data.daily_heatmap.map(d => d.date).sort()
    const startDate = new Date(dates[0] + 'T00:00:00')
    const endDate = new Date(dates[dates.length - 1] + 'T00:00:00')

    // Rewind startDate to Monday of that week
    const startDay = startDate.getDay() // 0=Sun
    const mondayOffset = startDay === 0 ? -6 : 1 - startDay
    startDate.setDate(startDate.getDate() + mondayOffset)

    // Build weeks: each week = array of 5 slots (Mon-Fri)
    const weeks: ({ date: string; pnl: number } | null)[][] = []
    const monthLabels: { weekIdx: number; label: string }[] = []
    let lastMonth = ''
    const cursor = new Date(startDate)

    while (cursor <= endDate || cursor.getDay() !== 1) {
      const week: ({ date: string; pnl: number } | null)[] = []
      for (let dow = 0; dow < 5; dow++) { // Mon(0) to Fri(4)
        // Set cursor to correct day of week (Mon=1 ... Fri=5)
        const targetDay = new Date(startDate)
        targetDay.setDate(startDate.getDate() + weeks.length * 7 + dow)
        const iso = targetDay.toISOString().slice(0, 10)
        const monthKey = iso.slice(0, 7)

        // Month label on first occurrence
        if (monthKey !== lastMonth && dow === 0) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const m = targetDay.getMonth()
          monthLabels.push({ weekIdx: weeks.length, label: monthNames[m] })
          lastMonth = monthKey
        }

        if (targetDay > endDate) {
          week.push(null)
        } else if (pnlMap.has(iso)) {
          week.push({ date: iso, pnl: pnlMap.get(iso)! })
        } else {
          week.push(null) // no trading day
        }
      }
      weeks.push(week)
      // Advance start reference check
      const nextMonday = new Date(startDate)
      nextMonday.setDate(startDate.getDate() + (weeks.length) * 7)
      if (nextMonday > endDate && week.every(d => d === null)) break
      if (weeks.length > 200) break // safety
    }

    const maxAbs = Math.max(...data.daily_heatmap.map(d => Math.abs(d.pnl)), 1)
    return { weeks, monthLabels, maxAbs }
  }, [data.daily_heatmap])

  return (
    <div className="space-y-6">
      {/* Monthly Performance Table */}
      <Card title="Monthly Performance">
        <DataTable data={data.monthly_table} columns={monthlyColumns} pageSize={24} />
      </Card>

      {/* Daily P&L Heatmap — GitHub contribution graph style */}
      <Card title="Daily P&L Heatmap">
        <div className="overflow-x-auto">
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, minWidth: 'fit-content' }}>
            {/* Month labels row */}
            <div style={{ display: 'flex', paddingLeft: 32, gap: 3, marginBottom: 4 }}>
              {heatmapGrid.weeks.map((_, wi) => {
                const label = heatmapGrid.monthLabels.find(m => m.weekIdx === wi)
                return (
                  <div key={wi} style={{ width: 13, fontSize: 10, color: 'var(--text-secondary)', textAlign: 'left', flexShrink: 0 }}>
                    {label?.label ?? ''}
                  </div>
                )
              })}
            </div>
            {/* Grid: 5 rows (Mon-Fri) x N week columns */}
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((dayLabel, rowIdx) => (
              <div key={dayLabel} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 26, fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>
                  {rowIdx % 2 === 0 ? dayLabel : ''}
                </div>
                {heatmapGrid.weeks.map((week, wi) => {
                  const cell = week[rowIdx]
                  if (!cell) {
                    return <div key={wi} style={{ width: 13, height: 13, borderRadius: 2, background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                  }
                  const intensity = Math.abs(cell.pnl) / heatmapGrid.maxAbs
                  const level = intensity < 0.15 ? 0.15 : intensity < 0.35 ? 0.35 : intensity < 0.6 ? 0.6 : intensity < 0.85 ? 0.85 : 1
                  const bg = cell.pnl >= 0
                    ? `rgba(34, 197, 94, ${0.2 + level * 0.8})`
                    : `rgba(235, 59, 59, ${0.2 + level * 0.8})`
                  return (
                    <div
                      key={wi}
                      title={`${cell.date} (${dayLabel}): ${formatCurrencyFull(cell.pnl)}`}
                      style={{ width: 13, height: 13, borderRadius: 2, background: bg, flexShrink: 0, cursor: 'default' }}
                    />
                  )
                })}
              </div>
            ))}
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 32, marginTop: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Loss</span>
              {[0.25, 0.5, 0.75, 1].map(a => (
                <div key={`r${a}`} style={{ width: 13, height: 13, borderRadius: 2, background: `rgba(235, 59, 59, ${a})` }} />
              ))}
              <div style={{ width: 13, height: 13, borderRadius: 2, background: 'rgba(255,255,255,0.03)', margin: '0 2px' }} />
              {[0.25, 0.5, 0.75, 1].map(a => (
                <div key={`g${a}`} style={{ width: 13, height: 13, borderRadius: 2, background: `rgba(34, 197, 94, ${a})` }} />
              ))}
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Profit</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Day of Week */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="P&L by Day of Week">
          <ChartWrapper height={250} mobileHeight={180}>
            <BarChart data={data.day_of_week}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#555' }} />
              <YAxis tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => formatCurrency(v)} />
              <Tooltip {...DarkTooltipStyle()} formatter={(v: number) => [formatCurrencyFull(v), 'Total P&L']} />
              <Bar dataKey="total_pnl" radius={[4, 4, 0, 0]}>
                {data.day_of_week.map((d, i) => (
                  <Cell key={i} fill={d.total_pnl >= 0 ? '#22c55e' : '#eb3b3b'} />
                ))}
              </Bar>
            </BarChart>
          </ChartWrapper>
          <DataTable data={data.day_of_week} columns={dowColumns} pageSize={7} />
        </Card>

        <Card title="Trades per Day">
          <ChartWrapper height={250} mobileHeight={180}>
            <BarChart data={data.trades_per_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#555' }} />
              <YAxis tick={{ fontSize: 11, fill: '#555' }} />
              <Tooltip {...DarkTooltipStyle()} formatter={(v: number) => [v, 'Trades']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#3b82f6" />
            </BarChart>
          </ChartWrapper>
        </Card>
      </div>
    </div>
  )
}
