import { useState } from 'react'
import { LayoutDashboard, TrendingUp, Layers, Receipt, Briefcase, BrainCircuit, FilePlus, MessageSquare, Calendar, Shield, List, GitMerge } from 'lucide-react'
import { useReport } from '../context/ReportContext'
import { cn } from '../lib/utils'
import FeedbackModal from './FeedbackModal'

const xlsxNavItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Performance Attribution', icon: TrendingUp },
  { label: 'Instrument Breakdown', icon: Layers },
  { label: 'Charges & Costs', icon: Receipt },
  { label: 'Open Portfolio', icon: Briefcase },
  { label: 'AI Trader Advice', icon: BrainCircuit },
]

const csvNavItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'P&L Analysis', icon: TrendingUp },
  { label: 'Instrument Analysis', icon: Layers },
  { label: 'Expiry Analysis', icon: Calendar },
  { label: 'Risk & Metrics', icon: Shield },
  { label: 'Trade Log', icon: List },
  { label: 'Multi-Leg Trades', icon: GitMerge },
  { label: 'AI Trader Advice', icon: BrainCircuit },
]

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { state, dispatch } = useReport()
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const navItems = state.reportType === 'csv' ? csvNavItems : xlsxNavItems

  return (
    <>
      <div className={cn('sidebar-overlay', open && 'open')} onClick={onClose} />
      <nav className={cn('sidebar', open && 'open')}>
        <div className="sidebar-logo">
          <img src="/logo-mark.png" alt="Stocky" className="h-8 w-8 object-contain" />
          <span className="ml-2 text-lg font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            STOCKY <span style={{ color: 'var(--accent)', fontWeight: 400 }}>Analyse</span>
          </span>
        </div>
        <div className="sidebar-nav">
          {navItems.map((item, i) => (
            <div
              key={item.label}
              className={cn('sidebar-nav-item', state.activeTab === i && 'active')}
              onClick={() => { dispatch({ type: 'SET_TAB', payload: i }); onClose(); }}
            >
              <item.icon />
              {item.label}
            </div>
          ))}
          {(state.report || state.csvReport) && (
            <div
              className="sidebar-nav-item"
              onClick={() => { dispatch({ type: 'CLEAR' }); onClose(); }}
            >
              <FilePlus />
              New Report
            </div>
          )}
          <div className="mt-auto pt-4 border-t border-border-subtle mx-4" />
          <div
            className="sidebar-nav-item"
            onClick={() => setFeedbackOpen(true)}
          >
            <MessageSquare />
            Send Feedback
          </div>
        </div>
      </nav>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  )
}
