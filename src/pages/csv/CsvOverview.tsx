import StatCard from '../../components/StatCard'
import Card from '../../components/Card'
import ChartWrapper, { DarkTooltipStyle } from '../../components/ChartWrapper'
import { formatCurrency, formatCurrencyFull, formatPercent, pnlColor } from '../../lib/utils'
import type { CsvOverview } from '../../types/csvReport'
import { AreaChart, Area, BarChart, Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'

export default function CsvOverviewPage({ data }: { data: CsvOverview }) {
  return (
    <div className="space-y-6">
      {/* Row 1: 4 main cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Net P&L" value={formatCurrency(data.total_pnl)} accentColor={pnlColor(data.total_pnl)} />
        <StatCard label="Total Trades" value={String(data.total_trades)} />
        <StatCard label="Win Rate" value={formatPercent(data.win_rate)} accentColor={data.win_rate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <StatCard label="Profit Factor" value={data.profit_factor.toFixed(2)} accentColor={data.profit_factor >= 1 ? 'var(--accent-green)' : 'var(--accent-red)'} />
      </div>

      {/* Row 2: 4 more cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Best Trade" value={formatCurrency(data.best_trade.pnl)} subtext={data.best_trade.underlying} accentColor="var(--accent-green)" />
        <StatCard label="Worst Trade" value={formatCurrency(data.worst_trade.pnl)} subtext={data.worst_trade.underlying} accentColor="var(--accent-red)" />
        <StatCard label="Avg P&L / Trade" value={formatCurrency(data.avg_pnl_per_trade)} accentColor={pnlColor(data.avg_pnl_per_trade)} />
        <StatCard label="Avg Holding" value={`${data.avg_holding_period.toFixed(1)}d`} subtext={`Avg DTE: ${data.avg_dte.toFixed(1)}d`} />
      </div>

      {/* Row 3: more stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Winners" value={String(data.winners)} accentColor="var(--accent-green)" />
        <StatCard label="Losers" value={String(data.losers)} accentColor="var(--accent-red)" />
        <StatCard label="Avg Winner" value={formatCurrency(data.avg_winner)} accentColor="var(--accent-green)" />
        <StatCard label="Avg Loser" value={formatCurrency(data.avg_loser)} accentColor="var(--accent-red)" />
      </div>

      {/* Equity Curve */}
      <Card title="Equity Curve">
        <ChartWrapper height={350} mobileHeight={250}>
          <AreaChart data={data.equity_curve}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#555' }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => formatCurrency(v)} />
            <Tooltip {...DarkTooltipStyle()} formatter={(v: number) => [formatCurrencyFull(v), 'Cumulative P&L']} />
            <Area type="monotone" dataKey="cumulative_pnl" stroke="#22c55e" fill="url(#eqGrad)" strokeWidth={2} />
          </AreaChart>
        </ChartWrapper>
      </Card>

      {/* Monthly P&L */}
      <Card title="Monthly P&L">
        <ChartWrapper height={350} mobileHeight={250}>
          <ComposedChart data={data.monthly_pnl}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#555' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => formatCurrency(v)} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#555' }} tickFormatter={(v: number) => formatCurrency(v)} />
            <Tooltip {...DarkTooltipStyle()} formatter={(v: number, name: string) => [formatCurrencyFull(v), name === 'pnl' ? 'Monthly P&L' : 'Cumulative']} />
            <Bar yAxisId="left" dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.monthly_pnl.map((item, i) => (
                <Cell key={i} fill={item.pnl >= 0 ? '#22c55e' : '#eb3b3b'} />
              ))}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ChartWrapper>
      </Card>
    </div>
  )
}
