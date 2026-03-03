import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react'
import { useReport } from '../context/ReportContext'
import { uploadReport, analyzeTradebook } from '../lib/api'
import { cn } from '../lib/utils'

export default function UploadZone() {
  const { state, dispatch } = useReport()
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
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

  return (
    <div className="max-w-2xl mx-auto mt-10 md:mt-20">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome to Stocky Analyse</h2>
        <p className="text-text-secondary">Upload your Zerodha F&O report to get started</p>
      </div>

      <div
        className={cn('upload-zone', dragOver && 'dragover')}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />

        {state.loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="text-accent animate-spin" />
            <p className="text-text-secondary">Analyzing your report...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              {dragOver ? <FileSpreadsheet size={32} className="text-accent" /> : <Upload size={32} className="text-accent" />}
            </div>
            <div>
              <p className="font-semibold text-lg">Drop your file here</p>
              <p className="text-text-secondary text-sm mt-1">or click to browse</p>
            </div>
            <p className="text-text-muted text-xs">Supports Zerodha F&O P&L reports (.xlsx) and tradebook exports (.csv)</p>
          </div>
        )}
      </div>

      {state.error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm font-medium">Upload Failed</p>
            <p className="text-red-400/70 text-xs mt-1">{state.error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
