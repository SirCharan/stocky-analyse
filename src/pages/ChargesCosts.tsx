import { useMemo, useState } from 'react'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import ChartWrapper, { DarkTooltipStyle } from '../components/ChartWrapper'
import DataTable from '../components/DataTable'
import { formatCurrency, formatCurrencyFull, formatPercent, pnlColor } from '../lib/utils'
import { useIsMobile } from '../lib/useIsMobile'
import type { ChargesData, ChargeItem, OtherEntry } from '../types/report'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import type { ColumnDef } from '@tanstack/react-table'

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#eab308', '#14b8a6', '#8b5cf6', '#ec4899']

interface DetailedChargeRow {
  name: string;
  amount: number;
  pct: number;
  isTotal?: boolean;
}

export default function ChargesCosts({ data }: { data: ChargesData }) {
  const mobile = useIsMobile()
  const [showOtherEntries, setShowOtherEntries] = useState(false)

  const chargesColumns = useMemo<ColumnDef<DetailedChargeRow, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Charge',
        cell: (info) => {
          const row = info.row.original
          return (
            <span style={{ fontWeight: row.isTotal ? 700 : 400 }}>
              {info.getValue() as string}
            </span>
          )
        },
      },
      {
        accessorKey: 'amount',
        header: 'Amount (\u20b9)',
        cell: (info) => {
          const row = info.row.original
          return (
            <span style={{ color: '#eb3b3b', fontWeight: row.isTotal ? 700 : 400 }}>
              {formatCurrencyFull(info.getValue() as number)}
            </span>
          )
        },
      },
      {
        accessorKey: 'pct',
        header: '% of Total',
        cell: (info) => {
          const row = info.row.original
          return (
            <span style={{ fontWeight: row.isTotal ? 700 : 400 }}>
              {(info.getValue() as number).toFixed(1)}%
            </span>
          )
        },
      },
    ],
    [],
  )

  const otherEntriesColumns = useMemo<ColumnDef<OtherEntry, unknown>[]>(
    () => [
      {
        accessorKey: 'particulars',
        header: 'Particulars',
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: 'posting_date',
        header: 'Date',
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: 'debit',
        header: 'Debit (\u20b9)',
        cell: (info) => {
          const value = info.getValue() as number
          return value ? (
            <span style={{ color: '#eb3b3b' }}>{formatCurrencyFull(value)}</span>
          ) : (
            '-'
          )
        },
      },
      {
        accessorKey: 'credit',
        header: 'Credit (\u20b9)',
        cell: (info) => {
          const value = info.getValue() as number
          return value ? (
            <span style={{ color: '#22c55e' }}>{formatCurrencyFull(value)}</span>
          ) : (
            '-'
          )
        },
      },
    ],
    [],
  )

  const detailedChargesWithTotal: DetailedChargeRow[] = [
    ...data.detailed_charges,
    {
      name: 'Total',
      amount: data.total_charges,
      pct: 100,
      isTotal: true,
    },
  ]

  const grossVsNetData = [
    { name: 'Gross P&L', value: data.gross_pnl },
    { name: 'Charges', value: -Math.abs(data.total_charges) },
    { name: 'Net P&L', value: data.net_pnl },
  ]

  return (
    <div className="space-y-6">
      {/* Row 1: 4 StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Charges"
          value={formatCurrency(data.total_charges)}
          accentColor="#eb3b3b"
        />
        <StatCard
          label="Charges as % of P&L"
          value={formatPercent(data.charges_pct_pnl)}
          accentColor="#eb3b3b"
        />
        <StatCard
          label="Charges as % of Turnover"
          value={formatPercent(data.charges_pct_turnover)}
        />
        <StatCard
          label="Symbols to Cover Charges"
          value={String(data.symbols_to_cover)}
        />
      </div>

      {/* Row 2: Pie + Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Charges Breakdown">
          <ChartWrapper height={300} mobileHeight={220}>
            <PieChart>
              <Pie
                data={data.charges_breakdown}
                dataKey="amount"
                nameKey="name"
                innerRadius={mobile ? 45 : 60}
                outerRadius={mobile ? 75 : 100}
                paddingAngle={2}
              >
                {data.charges_breakdown.map((_item, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                {...DarkTooltipStyle()}
                formatter={(value: number) => [formatCurrencyFull(value), 'Amount']}
              />
            </PieChart>
          </ChartWrapper>
        </Card>

        <Card title="Gross vs Net P&L">
          <ChartWrapper height={300} mobileHeight={220}>
            <BarChart data={grossVsNetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#555555' }} />
              <YAxis tick={{ fontSize: 11, fill: '#555555' }} />
              <Tooltip
                {...DarkTooltipStyle()}
                formatter={(value: number) => [formatCurrency(value), 'Value']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {grossVsNetData.map((item, index) => (
                  <Cell
                    key={index}
                    fill={item.name === 'Charges' ? '#eb3b3b' : '#22c55e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartWrapper>
        </Card>
      </div>

      {/* Detailed Charges Table */}
      <Card title="Detailed Charges">
        <DataTable data={detailedChargesWithTotal} columns={chargesColumns} />
      </Card>

      {/* Other Debits & Credits */}
      <Card title="Other Debits & Credits">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Total Debits"
              value={formatCurrency(data.other_debits_credits.total_debits)}
              accentColor="#eb3b3b"
            />
            <StatCard
              label="Total Credits"
              value={formatCurrency(data.other_debits_credits.total_credits)}
              accentColor="#22c55e"
            />
            <StatCard
              label="Net"
              value={formatCurrency(data.other_debits_credits.net)}
              accentColor={pnlColor(data.other_debits_credits.net)}
            />
          </div>

          {data.other_debits_credits.entries.length > 0 && (
            <div>
              <button
                className="btn-secondary text-xs px-3 py-1"
                onClick={() => setShowOtherEntries(!showOtherEntries)}
              >
                {showOtherEntries ? 'Hide Entries' : 'Show Entries'}
              </button>
              {showOtherEntries && (
                <div className="mt-4">
                  <DataTable
                    data={data.other_debits_credits.entries}
                    columns={otherEntriesColumns}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
