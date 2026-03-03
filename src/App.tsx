import { useState, useRef, lazy, Suspense } from 'react'
import { Calendar } from 'lucide-react'
import { ReportProvider, useReport } from './context/ReportContext'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import UploadZone from './components/UploadZone'
import DateRangePicker from './components/DateRangePicker'
import { formatCurrency } from './lib/utils'
import { uploadReport, analyzeTradebook } from './lib/api'

// XLSX pages
const Overview = lazy(() => import('./pages/Overview'))
const PerformanceAttribution = lazy(() => import('./pages/PerformanceAttribution'))
const InstrumentBreakdown = lazy(() => import('./pages/InstrumentBreakdown'))
const ChargesCosts = lazy(() => import('./pages/ChargesCosts'))
const OpenPortfolio = lazy(() => import('./pages/OpenPortfolio'))
const TraderAdvice = lazy(() => import('./pages/TraderAdvice'))

// CSV pages
const CsvOverview = lazy(() => import('./pages/csv/CsvOverview'))
const CsvPnlAnalysis = lazy(() => import('./pages/csv/CsvPnlAnalysis'))
const CsvInstrumentAnalysis = lazy(() => import('./pages/csv/CsvInstrumentAnalysis'))
const CsvExpiryAnalysis = lazy(() => import('./pages/csv/CsvExpiryAnalysis'))
const CsvRiskMetrics = lazy(() => import('./pages/csv/CsvRiskMetrics'))
const CsvTradeLog = lazy(() => import('./pages/csv/CsvTradeLog'))
const CsvMultiLegTrades = lazy(() => import('./pages/csv/CsvMultiLegTrades'))
const CsvTraderAdvice = lazy(() => import('./pages/csv/CsvTraderAdvice'))

function TabContent() {
  const { state } = useReport()

  if (!state.report && !state.csvReport) return <UploadZone />

  let page: React.ReactNode

  if (state.reportType === 'csv' && state.csvReport) {
    const d = state.csvReport
    switch (state.activeTab) {
      case 0: page = <CsvOverview data={d.overview} />; break
      case 1: page = <CsvPnlAnalysis data={d.pnl_analysis} />; break
      case 2: page = <CsvInstrumentAnalysis data={d.instrument_analysis} />; break
      case 3: page = <CsvExpiryAnalysis data={d.expiry_analysis} />; break
      case 4: page = <CsvRiskMetrics data={d.risk_metrics} />; break
      case 5: page = <CsvTradeLog data={d.trade_log} />; break
      case 6: page = <CsvMultiLegTrades data={d.multi_leg_analysis} />; break
      case 7: page = <CsvTraderAdvice report={d} />; break
      default: page = <CsvOverview data={d.overview} />
    }
  } else if (state.report) {
    switch (state.activeTab) {
      case 0: page = <Overview data={state.report.overview} instruments={state.report.instruments} />; break
      case 1: page = <PerformanceAttribution data={state.report.performance} />; break
      case 2: page = <InstrumentBreakdown data={state.report.instruments} />; break
      case 3: page = <ChargesCosts data={state.report.charges} />; break
      case 4: page = <OpenPortfolio data={state.report.open_portfolio} />; break
      case 5: page = <TraderAdvice report={state.report} />; break
      default: page = <Overview data={state.report.overview} instruments={state.report.instruments} />
    }
  } else {
    return <UploadZone />
  }

  return (
    <Suspense fallback={<LoadingShimmer />}>
      {page}
    </Suspense>
  )
}

function LoadingShimmer() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="shimmer h-28 rounded-xl" />
        ))}
      </div>
      <div className="shimmer h-80 rounded-xl" />
    </div>
  )
}

function parseDateRange(dateRange: string): { start: Date; end: Date } {
  const parts = dateRange.split(' - ')
  const parse = (s: string) => {
    const d = new Date(s)
    return isNaN(d.getTime()) ? new Date() : d
  }
  return {
    start: parts[0] ? parse(parts[0]) : new Date(),
    end: parts[1] ? parse(parts[1]) : new Date(),
  }
}

function DateRangeBar() {
  const { state, dispatch } = useReport()
  const [pickerOpen, setPickerOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const metadata = state.report?.metadata || state.csvReport?.metadata
  if (!metadata) return null

  const { date_range, total_symbols } = metadata
  const netPnl = state.report?.overview.net_realized_pnl ?? state.csvReport?.overview.total_pnl ?? 0
  const { start, end } = parseDateRange(date_range)

  const handleUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    dispatch({ type: 'SET_LOADING' })
    try {
      if (ext === 'csv') {
        const data = await analyzeTradebook(file)
        dispatch({ type: 'SET_CSV_REPORT', payload: data, fileName: file.name })
      } else {
        const data = await uploadReport(file)
        dispatch({ type: 'SET_REPORT', payload: data, fileName: file.name })
      }
    } catch (e: unknown) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Upload failed' })
    }
  }

  const handleUploadNew = () => {
    setPickerOpen(false)
    fileRef.current?.click()
  }

  return (
    <div className="mx-3 md:mx-6 mt-3 md:mt-4 relative">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(201, 169, 110, 0.06) 0%, rgba(201, 169, 110, 0.03) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="flex items-center gap-2 px-2 py-1 -mx-2 -my-1 rounded-lg transition-colors hover:bg-white/5"
        >
          <Calendar size={14} color="var(--accent)" />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Analysis Period:
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {date_range}
          </span>
          <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            Edit
          </span>
        </button>
        <div className="hidden md:block w-px h-4" style={{ background: 'var(--border-medium)' }} />
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {total_symbols} symbols
        </span>
        <div className="hidden md:block w-px h-4" style={{ background: 'var(--border-medium)' }} />
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Net P&L:</span>
          <span className="text-sm font-bold font-mono"
            style={{ color: netPnl >= 0 ? '#22c55e' : '#eb3b3b' }}
          >
            {formatCurrency(netPnl)}
          </span>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleUpload(f)
          e.target.value = ''
        }}
      />

      <DateRangePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        startDate={start}
        endDate={end}
        onUploadNew={handleUploadNew}
      />
    </div>
  )
}

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-depth">
      <div className="ambient-glow" />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content flex-1 md:ml-[260px]">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <DateRangeBar />
        <div className="p-3 md:p-6">
          <TabContent />
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ReportProvider>
      <AppContent />
    </ReportProvider>
  )
}
