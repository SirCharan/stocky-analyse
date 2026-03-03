// CSV Trader Advice types — mirrors api/csv-advice.py response

export interface CsvAdviceDataPoint {
  label: string
  value: string
}

export interface CsvAdviceSection {
  id: string
  title: string
  related_tab: number
  data_points: CsvAdviceDataPoint[]
  insight: string
}

export interface CsvAdviceBullet {
  text: string
  related_tab: number | null
  category?: string | null
}

export interface CsvAdviceMetrics {
  // Section 1: Win Rate & Payoff
  win_rate: number
  avg_winner: number
  avg_loser: number
  win_loss_ratio: number
  winners: number
  losers: number
  total_trades: number
  total_pnl: number
  profit_factor: number
  avg_pnl_per_trade: number
  best_trade: { pnl: number; underlying: string }
  worst_trade: { pnl: number; underlying: string }

  // Section 2: Monthly
  best_month: { month: string; pnl: number; pnl_pct: number; win_rate: number; trades: number }
  worst_month: { month: string; pnl: number; pnl_pct: number; win_rate: number; trades: number }
  green_months: number
  red_months: number
  monthly_consistency: number

  // Section 3: Day of Week P&L
  best_day: { day: string; total_pnl: number; avg_pnl: number; win_rate: number }
  worst_day: { day: string; total_pnl: number; avg_pnl: number; win_rate: number }

  // Section 4: Trade Frequency
  busiest_day: { day: string; count: number }
  quietest_day: { day: string; count: number }

  // Section 5: Instruments & Direction
  futures_pnl: number; futures_count: number
  ce_pnl: number; ce_count: number
  pe_pnl: number; pe_count: number
  options_pnl: number; options_count: number
  index_pnl: number; index_count: number
  stock_pnl: number; stock_count: number
  long_pnl: number; short_pnl: number
  long_trades: number; short_trades: number
  long_win_rate: number; short_win_rate: number
  top5_winners: { underlying: string; pnl: number }[]
  top5_losers: { underlying: string; pnl: number }[]

  // Section 6 & 7: Expiry
  monthly_expiry: { pnl: number; trades: number; win_rate: number; avg_return: number }
  weekly_expiry: { pnl: number; trades: number; win_rate: number; avg_return: number }
  dte_buckets: { bucket: string; pnl: number; trades: number; win_rate: number }[]
  best_dte_bucket: { bucket: string; pnl: number; trades: number; win_rate: number }
  worst_dte_bucket: { bucket: string; pnl: number; trades: number; win_rate: number }

  // Risk
  sharpe_ratio: number
  max_drawdown: number
  max_drawdown_pct: number
  recovery_factor: number
  expectancy: number
  payoff_ratio: number
  max_consec_wins: number
  max_consec_losses: number

  // Kelly & Score
  rr_ratio: number
  kelly_fraction: number
  half_kelly: number
  kelly_pct: number
  half_kelly_pct: number
  overall_score: string

  // Section 8: Multi-Leg Strategies
  ml_total: number
  ml_total_pnl: number
  ml_win_rate: number
  ml_avg_pnl: number
  ml_by_strategy: { strategy: string; count: number; total_pnl: number; win_rate: number; avg_pnl: number }[]
  ml_best: { pnl: number; underlying: string; strategy: string }
  ml_worst: { pnl: number; underlying: string; strategy: string }
}

export interface CsvAdviceResponse {
  summary: string
  sections: CsvAdviceSection[]
  strengths: CsvAdviceBullet[]
  weaknesses: CsvAdviceBullet[]
  recommendations: CsvAdviceBullet[]
  kelly_fraction: number
  half_kelly_fraction: number
  kelly_pct: number
  half_kelly_pct: number
  overall_score: string
  metrics: CsvAdviceMetrics
  source: 'rule-based' | 'groq-enhanced'
}
