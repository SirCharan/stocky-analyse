// CSV Tradebook Report Types — mirrors api/analyze.py response

export interface CsvReportData {
  report_type: 'csv'
  metadata: CsvMetadata
  overview: CsvOverview
  pnl_analysis: CsvPnlAnalysis
  instrument_analysis: CsvInstrumentAnalysis
  expiry_analysis: CsvExpiryAnalysis
  risk_metrics: CsvRiskMetrics
  trade_log: CsvTradeLog
  multi_leg_analysis: MultiLegAnalysis
}

export interface CsvMetadata {
  filename: string
  date_range: string
  total_trades: number
  total_symbols: number
  period_days: number
}

// --- Overview ---

export interface CsvOverview {
  total_pnl: number
  total_trades: number
  win_rate: number
  profit_factor: number
  best_trade: { pnl: number; underlying: string }
  worst_trade: { pnl: number; underlying: string }
  avg_pnl_per_trade: number
  avg_holding_period: number
  avg_dte: number
  winners: number
  losers: number
  avg_winner: number
  avg_loser: number
  win_loss_ratio: number
  equity_curve: { date: string; cumulative_pnl: number }[]
  monthly_pnl: { month: string; pnl: number; trade_count: number; cumulative: number }[]
}

// --- P&L Analysis ---

export interface CsvPnlAnalysis {
  monthly_table: MonthlyRow[]
  daily_heatmap: { date: string; pnl: number }[]
  day_of_week: DayOfWeekRow[]
  trades_per_day: { day: string; count: number }[]
}

export interface MonthlyRow {
  month: string
  trades: number
  gross_pnl: number
  pnl_pct: number
  win_rate: number
  avg_pnl: number
  largest_win: number
  largest_loss: number
  profit_factor: number
}

export interface DayOfWeekRow {
  day: string
  avg_pnl: number
  total_pnl: number
  win_rate: number
  trade_count: number
}

// --- Instrument Analysis ---

export interface CsvInstrumentAnalysis {
  summary_cards: {
    futures_pnl: number; futures_count: number
    ce_pnl: number; ce_count: number
    pe_pnl: number; pe_count: number
    index_pnl: number; index_count: number
    stock_pnl: number; stock_count: number
  }
  per_underlying: UnderlyingRow[]
  top5_winners: { underlying: string; pnl: number }[]
  top5_losers: { underlying: string; pnl: number }[]
  capital_concentration: { underlying: string; capital: number; pct: number }[]
  directional: {
    long_pnl: number; short_pnl: number
    long_trades: number; short_trades: number
    long_win_rate: number; short_win_rate: number
  }
  long_short_by_underlying: { underlying: string; long_pnl: number; short_pnl: number; net_pnl: number }[]
}

export interface UnderlyingRow {
  underlying: string
  trades: number
  total_pnl: number
  pnl_pct: number
  win_rate: number
  avg_return: number
  capital: number
}

// --- Expiry Analysis ---

export interface CsvExpiryAnalysis {
  monthly_vs_weekly: {
    monthly: { pnl: number; trades: number; win_rate: number; avg_return: number }
    weekly: { pnl: number; trades: number; win_rate: number; avg_return: number }
  }
  pnl_by_expiry: { expiry_date: string; pnl: number; trades: number; win_rate: number; avg_pnl: number }[]
  dte_buckets: { bucket: string; pnl: number; trades: number; win_rate: number }[]
}

// --- Risk Metrics ---

export interface CsvRiskMetrics {
  cards: {
    profit_factor: number
    payoff_ratio: number
    expectancy: number
    max_drawdown: number
    max_drawdown_pct: number
    max_consec_wins: number
    max_consec_losses: number
    sharpe_ratio: number
    recovery_factor: number
    avg_win: number
    avg_loss: number
    total_wins: number
    total_losses: number
    dd_peak_date: string | null
    dd_trough_date: string | null
    dd_recovery_days: number | null
  }
  pnl_distribution: HistogramBin[]
  return_pct_distribution: HistogramBin[]
  risk_reward_scatter: { capital: number; pnl: number; symbol: string; underlying: string }[]
  drawdown_curve: { date: string; drawdown_pct: number }[]
}

export interface HistogramBin {
  range: string
  count: number
  min: number
  max: number
}

// --- Trade Log ---

export interface CsvTradeLog {
  completed_trades: MatchedTrade[]
  open_positions: CsvOpenPosition[]
  multi_leg_trades: MultiLegTrade[]
  multi_leg_summary: MultiLegSummary
}

export interface MatchedTrade {
  symbol: string
  underlying: string
  instrument_type: string
  strike: string
  direction: 'long' | 'short'
  entry_type: string
  entry_date: string
  exit_date: string
  entry_time?: string
  exit_time?: string
  multi_leg_id?: string
  entry_price: number
  exit_price: number
  quantity: number
  pnl: number
  pnl_pct: number
  capital: number
  hold_days: number
  dte: number
  is_weekly: boolean
  is_index: boolean
  is_monthly: boolean
  expiry_date: string
}

export interface CsvOpenPosition {
  symbol: string
  underlying: string
  instrument_type: string
  strike: string
  side: string
  price: number
  quantity: number
  entry_date: string
  expiry_date: string
  is_index: boolean
}

// --- Multi-Leg Trades ---

export interface MultiLegTrade {
  id: string
  strategy: string
  underlying: string
  entry_time: string
  exit_time: string
  entry_date: string
  exit_date: string
  legs: MatchedTrade[]
  num_legs: number
  combined_pnl: number
  combined_capital: number
  combined_pnl_pct: number
  is_index: boolean
  is_weekly: boolean
  dte: number
}

export interface MultiLegSummary {
  total: number
  total_pnl: number
  win_rate: number
  strategies: Record<string, number>
  legs_grouped: number
}

export interface MultiLegAnalysis {
  summary: {
    total: number
    total_pnl: number
    win_rate: number
    avg_pnl: number
    best_trade: { pnl: number; underlying: string; strategy: string }
    worst_trade: { pnl: number; underlying: string; strategy: string }
  }
  by_strategy: { strategy: string; count: number; total_pnl: number; win_rate: number; avg_pnl: number }[]
  by_underlying: { underlying: string; count: number; total_pnl: number; win_rate: number }[]
  pnl_timeline: { date: string; pnl: number; strategy: string; underlying: string }[]
  trades: MultiLegTrade[]
}
