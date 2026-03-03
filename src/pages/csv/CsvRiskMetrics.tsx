import StatCard from '../../components/StatCard'
import Card from '../../components/Card'
import ChartWrapper, { DarkTooltipStyle } from '../../components/ChartWrapper'
import { formatCurrency, formatCurrencyFull, pnlColor } from '../../lib/utils'
import type { CsvRiskMetrics } from '../../types/csvReport'
import { BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid, Cell } from 'recharts'

export default function CsvRiskMetricsPage({ data }: { data: CsvRiskMetrics }) {
  const c = data.cards

  const profitTrades = data.risk_reward_scatter.filter(t => t.pnl >= 0)
  const lossTrades = data.risk_reward_scatter.filter(t => t.pnl < 0)

  return (
    <div className="space-y-6">
      {/* Metrics Grid: 4x3 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <StatCard label="Profit Factor" value={c.profit_factor.toFixed(2)} accentColor={c.profit_factor >= 1 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <StatCard label="Payoff Ratio" value={c.payoff_ratio.toFixed(2)} accentColor={c.payoff_ratio >= 1 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <StatCard label="Expectancy" value={formatCurrency(c.expectancy)} accentColor={pnlColor(c.expectancy)} />
        <StatCard label="Sharpe Ratio" value={c.sharpe_ratio.toFixed(2)} accentColor={c.sharpe_ratio >= 1 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <StatCard label="Max Drawdown" value={formatCurrency(c.max_drawdown)} accentColor="var(--accent-red)" />
        <StatCard label="Max Drawdown %" value={`${c.max_drawdown_pct.toFixed(1)}%`} accentColor="var(--accent-red)" />
        <StatCard label="Recovery Factor" value={c.recovery_factor.toFixed(2)} />
        <StatCard label="Max DD Period" value={c.dd_peak_date && c.dd_trough_date ? `${c.dd_peak_date} → ${c.dd_trough_date}` : 'N/A'} accentColor="var(--accent-red)" />
        <StatCard label="Recovery Days" value={c.dd_recovery_days != null ? `${c.dd_recovery_days} days` : 'Not recovered'} accentColor={c.dd_recovery_days != null ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <StatCard label="Max Consec Wins" value={String(c.max_consec_wins)} accentColor="var(--accent-green)" />
        <StatCard label="Max Consec Losses" value={String(c.max_consec_losses)} accentColor="var(--accent-red)" />
        <StatCard label="Avg Win" value={formatCurrency(c.avg_win)} accentColor="var(--accent-green)" />
        <StatCard label="Avg Loss" value={formatCurrency(c.avg_loss)} accentColor="var(--accent-red)" />
        <StatCard label="Total Wins / Losses" value={`${formatCurrency(c.total_wins)} / ${formatCurrency(c.total_losses)}`} />
      </div>

      {/* Drawdown Curve */}
      {data.drawdown_curve.length > 0 && (
        <Card title="Drawdown">
          <ChartWrapper height={250} mobileHeight={180}>
            <AreaChart data={data.drawdown_curve}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eb3b3b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#eb3b3b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#555' }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
              <Tooltip {...DarkTooltipStyle()} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Drawdown']} />
              <Area type="monotone" dataKey="drawdown_pct" stroke="#eb3b3b" fill="url(#ddGrad)" strokeWidth={2} />
            </AreaChart>
          </ChartWrapper>
        </Card>
      )}

      {/* P&L Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="P&L Distribution">
          <ChartWrapper height={250} mobileHeight={180}>
            <BarChart data={data.pnl_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#555' }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: '#555' }} />
              <Tooltip {...DarkTooltipStyle()} formatter={(v: number) => [v, 'Count']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.pnl_distribution.map((item, i) => (
                  <Cell key={i} fill={item.min >= 0 ? '#22c55e' : '#eb3b3b'} />
                ))}
              </Bar>
            </BarChart>
          </ChartWrapper>
        </Card>
        <Card title="Return % Distribution">
          <ChartWrapper height={250} mobileHeight={180}>
            <BarChart data={data.return_pct_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#555' }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: '#555' }} />
              <Tooltip {...DarkTooltipStyle()} formatter={(v: number) => [v, 'Count']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.return_pct_distribution.map((item, i) => (
                  <Cell key={i} fill={item.min >= 0 ? '#22c55e' : '#eb3b3b'} />
                ))}
              </Bar>
            </BarChart>
          </ChartWrapper>
        </Card>
      </div>

      {/* Risk-Reward Scatter */}
      <Card title="Risk-Reward Scatter">
        <ChartWrapper height={350} mobileHeight={250}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis type="number" dataKey="capital" name="Capital" tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => formatCurrency(v)} />
            <YAxis type="number" dataKey="pnl" name="P&L" tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => formatCurrency(v)} />
            <ZAxis range={[30, 30]} />
            <Tooltip
              {...DarkTooltipStyle()}
              formatter={(v: number, name: string) => {
                if (name === 'Capital' || name === 'P&L') return [formatCurrencyFull(v), name]
                return [v, name]
              }}
              labelFormatter={(_, payload) => {
                if (payload?.[0]?.payload) return (payload[0].payload as { underlying: string }).underlying
                return ''
              }}
            />
            <Scatter name="Profit" data={profitTrades} fill="#22c55e" opacity={0.7} />
            <Scatter name="Loss" data={lossTrades} fill="#eb3b3b" opacity={0.7} />
          </ScatterChart>
        </ChartWrapper>
      </Card>
    </div>
  )
}
