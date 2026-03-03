import { useMemo } from 'react'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import ChartWrapper, { DarkTooltipStyle } from '../components/ChartWrapper'
import DataTable from '../components/DataTable'
import { formatCurrency, formatCurrencyFull, formatPercent, pnlColor } from '../lib/utils'
import { useIsMobile } from '../lib/useIsMobile'
import type { PerformanceData, ContributionRow } from '../types/report'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine } from 'recharts'
import type { ColumnDef } from '@tanstack/react-table'

export default function PerformanceAttribution({ data }: { data: PerformanceData }) {
  const mobile = useIsMobile()
  const contributionColumns = useMemo<ColumnDef<ContributionRow, unknown>[]>(
    () => [
      {
        accessorKey: 'underlying',
        header: 'Underlying',
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: 'num_symbols',
        header: '# Symbols',
        cell: (info) => info.getValue() as number,
      },
      {
        accessorKey: 'pnl',
        header: 'P&L',
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
        accessorKey: 'contribution_pct',
        header: 'Contribution %',
        cell: (info) => {
          const value = info.getValue() as number
          return (
            <span style={{ color: pnlColor(value) }}>
              {formatPercent(value)}
            </span>
          )
        },
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
    ],
    [],
  )

  return (
    <div className="space-y-6">
      {/* Row 1: 3 StatCards - Impact stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Top 3 Winners Impact"
          value={formatCurrency(data.top_winners_impact)}
          accentColor="var(--accent-green)"
          subtext={`${formatPercent(data.top_winners_pct)} of total | ${data.top_winners_names}`}
        />
        <StatCard
          label="Top 3 Losers Impact"
          value={formatCurrency(data.top_losers_impact)}
          accentColor="var(--accent-red)"
          subtext={`${formatPercent(data.top_losers_pct)} of total | ${data.top_losers_names}`}
        />
        <StatCard
          label="Concentration Risk"
          value={formatCurrency(data.concentration_risk)}
          subtext={`${formatPercent(data.concentration_pct)} | ${data.concentration_detail}`}
        />
      </div>

      {/* Row 2: Top Contributors and Detractors side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Top 5 Contributors">
          <ChartWrapper height={250} mobileHeight={180}>
            <BarChart layout="vertical" data={data.top_contributors}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#a0a0a0' }}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <YAxis
                type="category"
                dataKey="underlying"
                tick={{ fontSize: 11, fill: '#a0a0a0' }}
                width={mobile ? 70 : 100}
              />
              <Tooltip
                {...DarkTooltipStyle()}
                formatter={(value: number) => [formatCurrencyFull(value), 'P&L']}
              />
              <Bar dataKey="pnl" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartWrapper>
        </Card>

        <Card title="Top 5 Detractors">
          <ChartWrapper height={250} mobileHeight={180}>
            <BarChart layout="vertical" data={data.top_detractors}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#a0a0a0' }}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <YAxis
                type="category"
                dataKey="underlying"
                tick={{ fontSize: 11, fill: '#a0a0a0' }}
                width={mobile ? 70 : 100}
              />
              <Tooltip
                {...DarkTooltipStyle()}
                formatter={(value: number) => [formatCurrencyFull(value), 'P&L']}
              />
              <Bar dataKey="pnl" fill="#eb3b3b" radius={[4, 0, 0, 4]} />
            </BarChart>
          </ChartWrapper>
        </Card>
      </div>

      {/* Waterfall Chart */}
      <Card title="P&L Waterfall (Top 20 Underlyings)">
        <ChartWrapper height={350} mobileHeight={250}>
          <ComposedChart data={data.waterfall}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis
              dataKey="underlying"
              tick={{ fontSize: 10, fill: '#a0a0a0' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#a0a0a0' }}
              tickFormatter={(v: number) => formatCurrency(v)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#a0a0a0' }}
              tickFormatter={(v: number) => formatCurrency(v)}
            />
            <Tooltip
              {...DarkTooltipStyle()}
              formatter={(value: number, name: string) => [
                formatCurrencyFull(value),
                name === 'pnl' ? 'P&L' : 'Cumulative',
              ]}
            />
            <Bar dataKey="pnl" yAxisId="left" radius={[4, 4, 0, 0]}>
              {data.waterfall.map((item, index) => (
                <Cell key={index} fill={item.pnl >= 0 ? '#22c55e' : '#eb3b3b'} />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="cumulative"
              yAxisId="right"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartWrapper>
      </Card>

      {/* Pareto Analysis */}
      <Card title="Pareto Analysis (Winning Underlyings)">
        <ChartWrapper height={350} mobileHeight={250}>
          <ComposedChart data={data.pareto}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis
              dataKey="underlying"
              tick={{ fontSize: 10, fill: '#a0a0a0' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#a0a0a0' }}
              tickFormatter={(v: number) => formatCurrency(v)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#a0a0a0' }}
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              {...DarkTooltipStyle()}
              formatter={(value: number, name: string) => [
                name === 'cumulative_pct' ? `${value.toFixed(1)}%` : formatCurrencyFull(value),
                name === 'pnl' ? 'P&L' : 'Cumulative %',
              ]}
            />
            <Bar dataKey="pnl" yAxisId="left" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="cumulative_pct"
              yAxisId="right"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <ReferenceLine
              yAxisId="right"
              y={80}
              label={{ value: '80%', position: 'right', fill: '#eb3b3b', fontSize: 11 }}
              stroke="#eb3b3b"
              strokeDasharray="5 5"
            />
          </ComposedChart>
        </ChartWrapper>
      </Card>

      {/* Row: Avg Win, Avg Loss, Win/Loss Asymmetry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Avg Win"
          value={formatCurrency(data.avg_win)}
          accentColor="var(--accent-green)"
        />
        <StatCard
          label="Avg Loss"
          value={formatCurrency(data.avg_loss)}
          accentColor="var(--accent-red)"
        />
        <StatCard
          label="Win/Loss Asymmetry"
          value={data.win_loss_asymmetry.toFixed(2)}
        />
      </div>

      {/* Contribution Table */}
      <Card title="P&L Contribution by Underlying">
        <DataTable data={data.contribution_table} columns={contributionColumns} />
      </Card>
    </div>
  )
}
