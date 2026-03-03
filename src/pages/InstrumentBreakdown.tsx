import { useMemo } from 'react'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import ChartWrapper, { DarkTooltipStyle } from '../components/ChartWrapper'
import DataTable from '../components/DataTable'
import { formatCurrency, formatCurrencyFull, formatPercent, pnlColor } from '../lib/utils'
import type { InstrumentData, UnderlyingPnl } from '../types/report'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ScatterChart, Scatter, ZAxis } from 'recharts'
import type { ColumnDef } from '@tanstack/react-table'

export default function InstrumentBreakdown({ data }: { data: InstrumentData }) {
  const underlyingColumns = useMemo<ColumnDef<UnderlyingPnl, unknown>[]>(
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
        header: 'P&L (\u20b9)',
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
        accessorKey: 'win_rate',
        header: 'Win Rate',
        cell: (info) => formatPercent(info.getValue() as number),
      },
      {
        accessorKey: 'avg_return',
        header: 'Avg Return %',
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
    ],
    [],
  )

  const futuresVsOptionsData = [
    { name: 'Futures', value: data.futures_vs_options.futures },
    { name: 'Options', value: data.futures_vs_options.options },
  ]

  const callsVsPutsData = [
    { name: 'Calls', value: data.calls_vs_puts.calls },
    { name: 'Puts', value: data.calls_vs_puts.puts },
  ]

  const indexVsStockData = [
    { name: 'Index', value: data.index_vs_stock.index },
    { name: 'Stock', value: data.index_vs_stock.stock },
  ]

  return (
    <div className="space-y-6">
      {/* Row 1: 5 StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <StatCard
          label="Futures P&L"
          value={formatCurrency(data.futures_pnl)}
          accentColor="#eb3b3b"
          subtext={`${data.futures_count} positions`}
        />
        <StatCard
          label="Options P&L"
          value={formatCurrency(data.options_pnl)}
          accentColor="#22c55e"
          subtext={`${data.options_count} positions`}
        />
        <StatCard
          label="Calls P&L"
          value={formatCurrency(data.calls_pnl)}
          accentColor={pnlColor(data.calls_pnl)}
          subtext={`${data.calls_count} positions`}
        />
        <StatCard
          label="Puts P&L"
          value={formatCurrency(data.puts_pnl)}
          accentColor={pnlColor(data.puts_pnl)}
          subtext={`${data.puts_count} positions`}
        />
        <StatCard
          label="Index F&O P&L"
          value={formatCurrency(data.index_fo_pnl)}
          accentColor={pnlColor(data.index_fo_pnl)}
          subtext={`${data.index_count} positions`}
        />
      </div>

      {/* Row 2: 3 comparison bar charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Futures vs Options">
          <ChartWrapper height={250} mobileHeight={180}>
            <BarChart data={futuresVsOptionsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#555555' }} />
              <YAxis tick={{ fontSize: 11, fill: '#555555' }} />
              <Tooltip
                {...DarkTooltipStyle()}
                formatter={(value: number) => [formatCurrency(value), 'P&L']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {futuresVsOptionsData.map((item, index) => (
                  <Cell
                    key={index}
                    fill={item.value > 0 ? '#22c55e' : '#eb3b3b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartWrapper>
        </Card>

        <Card title="Calls vs Puts">
          <ChartWrapper height={250} mobileHeight={180}>
            <BarChart data={callsVsPutsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#555555' }} />
              <YAxis tick={{ fontSize: 11, fill: '#555555' }} />
              <Tooltip
                {...DarkTooltipStyle()}
                formatter={(value: number) => [formatCurrency(value), 'P&L']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {callsVsPutsData.map((item, index) => (
                  <Cell
                    key={index}
                    fill={item.value > 0 ? '#22c55e' : '#eb3b3b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartWrapper>
        </Card>

        <Card title="Index vs Stock">
          <ChartWrapper height={250} mobileHeight={180}>
            <BarChart data={indexVsStockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#555555' }} />
              <YAxis tick={{ fontSize: 11, fill: '#555555' }} />
              <Tooltip
                {...DarkTooltipStyle()}
                formatter={(value: number) => [formatCurrency(value), 'P&L']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {indexVsStockData.map((item, index) => (
                  <Cell
                    key={index}
                    fill={item.value > 0 ? '#22c55e' : '#eb3b3b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartWrapper>
        </Card>
      </div>

      {/* P&L by Underlying Table */}
      <Card title="P&L by Underlying">
        <DataTable data={data.pnl_by_underlying} columns={underlyingColumns} />
      </Card>

      {/* Capital vs Returns Scatter */}
      <Card title="Capital vs Returns">
        <ChartWrapper height={350} mobileHeight={250}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
            <XAxis
              dataKey="capital"
              type="number"
              name="Capital"
              tick={{ fontSize: 11, fill: '#555555' }}
              tickFormatter={(v: number) => formatCurrency(v)}
            />
            <YAxis
              dataKey="return_pct"
              type="number"
              name="Return %"
              tick={{ fontSize: 11, fill: '#555555' }}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            />
            <ZAxis range={[40, 40]} />
            <Tooltip
              {...DarkTooltipStyle()}
              formatter={(value: number, name: string) => {
                if (name === 'Capital') return [formatCurrencyFull(value), name]
                return [formatPercent(value), name]
              }}
              labelFormatter={(_, payload) => {
                if (payload && payload.length > 0) {
                  return (payload[0].payload as { underlying: string }).underlying
                }
                return ''
              }}
            />
            <Scatter data={data.capital_vs_returns} name="Underlyings">
              {data.capital_vs_returns.map((item, index) => (
                <Cell
                  key={index}
                  fill={item.return_pct > 0 ? '#22c55e' : '#eb3b3b'}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ChartWrapper>
      </Card>
    </div>
  )
}
