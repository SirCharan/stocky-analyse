import StatCard from '../../components/StatCard'
import Card from '../../components/Card'
import ChartWrapper, { DarkTooltipStyle } from '../../components/ChartWrapper'
import { formatCurrency, formatCurrencyFull, formatPercent, pnlColor } from '../../lib/utils'
import type { CsvExpiryAnalysis } from '../../types/csvReport'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'

export default function CsvExpiryAnalysisPage({ data }: { data: CsvExpiryAnalysis }) {
  const m = data.monthly_vs_weekly.monthly
  const w = data.monthly_vs_weekly.weekly

  return (
    <div className="space-y-6">
      {/* Monthly vs Weekly Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Monthly Expiry P&L" value={formatCurrency(m.pnl)} subtext={`${m.trades} trades`} accentColor={pnlColor(m.pnl)} />
        <StatCard label="Monthly Win Rate" value={formatPercent(m.win_rate)} accentColor={m.win_rate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <StatCard label="Weekly Expiry P&L" value={formatCurrency(w.pnl)} subtext={`${w.trades} trades`} accentColor={pnlColor(w.pnl)} />
        <StatCard label="Weekly Win Rate" value={formatPercent(w.win_rate)} accentColor={w.win_rate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)'} />
      </div>

      {/* DTE Buckets */}
      <Card title="P&L by Days to Expiry">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {data.dte_buckets.map(b => (
            <StatCard
              key={b.bucket}
              label={b.bucket}
              value={formatCurrency(b.pnl)}
              subtext={`${b.trades} trades · ${formatPercent(b.win_rate)} win`}
              accentColor={pnlColor(b.pnl)}
            />
          ))}
        </div>
        <ChartWrapper height={250} mobileHeight={180}>
          <BarChart data={data.dte_buckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#555' }} />
            <YAxis tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => formatCurrency(v)} />
            <Tooltip {...DarkTooltipStyle()} formatter={(v: number) => [formatCurrencyFull(v), 'P&L']} />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.dte_buckets.map((b, i) => (
                <Cell key={i} fill={b.pnl >= 0 ? '#22c55e' : '#eb3b3b'} />
              ))}
            </Bar>
          </BarChart>
        </ChartWrapper>
      </Card>

      {/* P&L by Expiry Date */}
      <Card title="P&L by Expiry Date">
        <ChartWrapper height={350} mobileHeight={250}>
          <BarChart data={data.pnl_by_expiry}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis dataKey="expiry_date" tick={{ fontSize: 11, fill: '#555' }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => formatCurrency(v)} />
            <Tooltip {...DarkTooltipStyle()} formatter={(v: number, name: string) => {
              if (name === 'pnl') return [formatCurrencyFull(v), 'P&L']
              return [v, name]
            }} />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.pnl_by_expiry.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? '#22c55e' : '#eb3b3b'} />
              ))}
            </Bar>
          </BarChart>
        </ChartWrapper>
      </Card>
    </div>
  )
}
