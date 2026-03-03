import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react'

interface DateRangePickerProps {
  open: boolean
  onClose: () => void
  startDate: Date
  endDate: Date
  onUploadNew: () => void
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isInRange(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false
  return date >= start && date <= end
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DateRangePicker({ open, onClose, startDate, endDate, onUploadNew }: DateRangePickerProps) {
  const [leftMonth, setLeftMonth] = useState(startDate.getMonth())
  const [leftYear, setLeftYear] = useState(startDate.getFullYear())
  const [selStart, setSelStart] = useState<Date | null>(startDate)
  const [selEnd, setSelEnd] = useState<Date | null>(endDate)
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Right month is always leftMonth + 1
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear

  useEffect(() => {
    if (open) {
      setLeftMonth(startDate.getMonth())
      setLeftYear(startDate.getFullYear())
      setSelStart(startDate)
      setSelEnd(endDate)
    }
  }, [open, startDate, endDate])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  const goLeft = () => {
    if (leftMonth === 0) { setLeftMonth(11); setLeftYear(leftYear - 1) }
    else setLeftMonth(leftMonth - 1)
  }
  const goRight = () => {
    if (leftMonth === 11) { setLeftMonth(0); setLeftYear(leftYear + 1) }
    else setLeftMonth(leftMonth + 1)
  }

  const handleDayClick = (date: Date) => {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(date)
      setSelEnd(null)
    } else {
      if (date < selStart) {
        setSelEnd(selStart)
        setSelStart(date)
      } else {
        setSelEnd(date)
      }
    }
  }

  const effectiveEnd = selEnd || hoveredDate
  const rangeStart = selStart && effectiveEnd && effectiveEnd < selStart ? effectiveEnd : selStart
  const rangeEnd = selStart && effectiveEnd && effectiveEnd < selStart ? selStart : effectiveEnd

  const renderMonth = (year: number, month: number) => {
    const days = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const cells: React.ReactNode[] = []

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} />)
    }

    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d)
      const isStart = selStart && isSameDay(date, selStart)
      const isEnd = selEnd && isSameDay(date, selEnd)
      const inRange = isInRange(date, rangeStart, rangeEnd)
      const isToday = isSameDay(date, new Date())

      let bg = 'transparent'
      let color = 'var(--text-primary)'
      let borderRadius = '6px'

      if (isStart || isEnd) {
        bg = 'var(--accent)'
        color = '#fff'
      } else if (inRange) {
        bg = 'rgba(201, 169, 110, 0.12)'
        color = 'var(--text-primary)'
        borderRadius = '0'
        if (d === 1 || firstDay + d - 1 === firstDay) borderRadius = '6px 0 0 6px'
      }

      cells.push(
        <button
          key={d}
          onClick={() => handleDayClick(date)}
          onMouseEnter={() => { if (selStart && !selEnd) setHoveredDate(date) }}
          className="w-8 h-8 text-xs font-medium flex items-center justify-center transition-all hover:bg-white/10"
          style={{
            background: bg,
            color,
            borderRadius,
            border: isToday && !isStart && !isEnd ? '1px solid var(--border-medium)' : 'none',
          }}
        >
          {d}
        </button>
      )
    }

    return (
      <div>
        <div className="text-center text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          {MONTHS[month]} {year}
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAYS.map(day => (
            <div key={day} className="w-8 h-6 text-center text-[10px] font-semibold flex items-center justify-center"
              style={{ color: 'var(--text-muted)' }}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells}
        </div>
      </div>
    )
  }

  const hasNewRange = selStart && selEnd && (!isSameDay(selStart, startDate) || !isSameDay(selEnd, endDate))

  return (
    <div ref={ref} className="absolute left-0 right-0 md:left-auto md:right-auto mt-2 z-50"
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-medium)',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        padding: '20px',
        width: 'fit-content',
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goLeft} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronLeft size={16} color="var(--text-secondary)" />
        </button>
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Select date range
        </div>
        <button onClick={goRight} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronRight size={16} color="var(--text-secondary)" />
        </button>
      </div>

      {/* Two month calendars */}
      <div className="flex gap-6 flex-col md:flex-row">
        {renderMonth(leftYear, leftMonth)}
        {renderMonth(rightYear, rightMonth)}
      </div>

      {/* Selected range display */}
      <div className="mt-4 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {selStart ? formatDate(selStart) : '—'} &nbsp;→&nbsp; {selEnd ? formatDate(selEnd) : '—'}
        </div>
        <div className="flex items-center gap-2">
          {hasNewRange && (
            <button onClick={onUploadNew} className="btn-primary" style={{ padding: '6px 14px', fontSize: '11px' }}>
              <Upload size={12} /> Upload report for this range
            </button>
          )}
          <button onClick={onClose} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>
            Close
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
        To analyze a different period, download the matching report from Zerodha and upload it.
      </p>
    </div>
  )
}
