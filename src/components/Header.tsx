import { Upload, FileSpreadsheet, FileText, Menu, Download } from 'lucide-react'
import { useRef } from 'react'
import { useReport } from '../context/ReportContext'
import { uploadReport, analyzeTradebook } from '../lib/api'
import { cn } from '../lib/utils'

const xlsxTabNames = ['Overview', 'Performance Attribution', 'Instrument Breakdown', 'Charges & Costs', 'Open Portfolio', 'AI Trader Advice']
const csvTabNames = ['Overview', 'P&L Analysis', 'Instrument Analysis', 'Expiry Analysis', 'Risk & Metrics', 'Trade Log', 'Multi-Leg Trades', 'AI Trader Advice']

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { state, dispatch } = useReport()
  const fileRef = useRef<HTMLInputElement>(null)

  const tabNames = state.reportType === 'csv' ? csvTabNames : xlsxTabNames
  const hasReport = state.report || state.csvReport

  const handleUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'csv') {
      dispatch({ type: 'SET_ERROR', payload: 'Please upload an .xlsx or .csv file' })
      return
    }
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

  const handleDownloadJSON = () => {
    const reportData = state.report || state.csvReport
    if (!reportData) return
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'stocky-analyse-report.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const metadata = state.report?.metadata || state.csvReport?.metadata

  return (
    <header className="header">
      <div className="flex items-center gap-3">
        <button className="mobile-menu-btn p-2 -ml-2 rounded-lg hover:bg-white/5" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div className="header-breadcrumb">
          <span
            className="cursor-pointer hover:text-white transition-colors"
            onClick={() => dispatch({ type: 'CLEAR' })}
          >
            Dashboard
          </span>
          {hasReport && (
            <> / <span>{tabNames[state.activeTab]}</span></>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        {hasReport && metadata && (
          <>
            <div className="hidden md:flex items-center gap-3">
              <div className="badge">
                {state.reportType === 'csv' ? <FileText size={12} /> : <FileSpreadsheet size={12} />}
                {state.fileName}
              </div>
              <div className="badge">
                {metadata.date_range}
              </div>
              <div className={cn('badge', 'badge-success')}>
                {metadata.total_symbols} symbols
              </div>
            </div>
            <button className="btn-secondary" onClick={handleDownloadJSON}>
              <Download size={14} />
              <span className="hidden md:inline">JSON</span>
            </button>
          </>
        )}
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
        <button className="btn-primary" onClick={() => fileRef.current?.click()}>
          <Upload size={16} />
          <span className="hidden md:inline">Upload Report</span>
        </button>
      </div>
    </header>
  )
}
