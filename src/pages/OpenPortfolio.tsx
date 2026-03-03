import { useMemo } from 'react'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import ChartWrapper, { DarkTooltipStyle } from '../components/ChartWrapper'
import DataTable from '../components/DataTable'
import { formatCurrency, formatCurrencyFull, formatPercent, pnlColor } from '../lib/utils'
import { useIsMobile } from '../lib/useIsMobile'
import type { OpenPortfolioData, OpenPosition } from '../types/report'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts'
import type { ColumnDef } from '@tanstack/react-table'

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#eab308', '#14b8a6', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#84cc16']

export default function OpenPortfolio({ data }: { data: OpenPortfolioData }) {
  const mobile = useIsMobile()
  const positionColumns = useMemo<ColumnDef<OpenPosition, unknown>[]>(
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
        accessorKey: 'strike',
        header: 'Strike',
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: 'qty',
        header: 'Qty',
        cell: (info) => info.getValue() as number,
      },
      {
        accessorKey: 'buy_price',
        header: 'Buy Price',
        cell: (info) => formatCurrencyFull(info.getValue() as number),
      },
      {
        accessorKey: 'open_value',
        header: 'Open Value',
        cell: (info) => formatCurrency(info.getValue() as number),
      },
      {
        accessorKey: 'unrealized_pnl',
        header: 'Unrealized P&L',
        cell: (info) => {
          const value = info.getValue() as number
          return (
            <span style={{ color: pnlColor(value) }}>
              {formatCurrencyFull(value)}
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
      {
        accessorKey: 'prev_close',
        header: 'Prev Close',
        cell: (info) => formatCurrencyFull(info.getValue() as number),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      {/* Row 1: 4 StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Open Positions"
          value={String(data.open_positions_count)}
        />
        <StatCard
          label="Total Unrealized P&L"
          value={formatCurrency(data.total_unrealized_pnl)}
          accentColor={pnlColor(data.total_unrealized_pnl)}
        />
        <StatCard
          label="Max Unrealized Profit"
          value={formatCurrency(data.max_unrealized_profit)}
          accentColor="#22c55e"
        />
        <StatCard
          label="Max Unrealized Loss"
          value={formatCurrency(data.max_unrealized_loss)}
          accentColor="#eb3b3b"
        />
      </div>

      {/* Row 2: Horizontal Bar + Donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Unrealized P&L by Position">
          <ChartWrapper height={Math.max(300, data.unrealized_by_position.length * 35)} mobileHeight={Math.max(220, data.unrealized_by_position.length * 25)}>
            <BarChart data={data.unrealized_by_position} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#555555' }}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <YAxis
                dataKey="symbol"
                type="category"
                width={mobile ? 80 : 120}
                tick={{ fontSize: 11, fill: '#555555' }}
              />
              <Tooltip
                {...DarkTooltipStyle()}
                formatter={(value: number) => [formatCurrencyFull(value), 'P&L']}
              />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                {data.unrealized_by_position.map((item, index) => (
                  <Cell
                    key={index}
                    fill={item.pnl > 0 ? '#22c55e' : '#eb3b3b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartWrapper>
        </Card>

        <Card title="Portfolio Concentration">
          <ChartWrapper height={300} mobileHeight={220}>
            <PieChart>
              <Pie
                data={data.concentration}
                dataKey="pct"
                nameKey="underlying"
                innerRadius={mobile ? 45 : 60}
                outerRadius={mobile ? 75 : 100}
                paddingAngle={2}
              >
                {data.concentration.map((_item, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                {...DarkTooltipStyle()}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Share']}
              />
            </PieChart>
          </ChartWrapper>
        </Card>
      </div>

      {/* Open Positions Table */}
      <Card title="Open Positions">
        <DataTable data={data.positions} columns={positionColumns} />
      </Card>
    </div>
  )
}
