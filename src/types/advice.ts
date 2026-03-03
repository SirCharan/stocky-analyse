export interface AdviceMetrics {
  kelly_fraction: number;
  half_kelly: number;
  kelly_pct: number;
  half_kelly_pct: number;
  rr_ratio: number;
  win_rate: number;
  charges_pct: number;
  overtrading: boolean;
  symbols_traded: number;
  winners: number;
  losers: number;
  avg_winner: number;
  avg_loser: number;
  win_loss_ratio: number;
  realized_pnl: number;
  total_charges: number;
  net_after_charges: number;
  top3_winners: string;
  top3_impact: number;
  top3_pct: number;
  concentration_pct: number;
  pareto_pct: number;
  pareto_80_count: number;
  total_winning_underlyings: number;
  futures_pnl: number;
  options_pnl: number;
  calls_pnl: number;
  puts_pnl: number;
  futures_count: number;
  options_count: number;
  asymmetry: number;
  top_open_underlying: string;
  top_open_pct: number;
  open_count: number;
  total_unrealized: number;
  overall_score: string;
}

export interface AdviceBullet {
  text: string;
  related_tab: number | null;
}

export interface AdviceResponse {
  summary: string;
  strengths: AdviceBullet[];
  weaknesses: AdviceBullet[];
  recommendations: AdviceBullet[];
  kelly_fraction: number;
  half_kelly_fraction: number;
  kelly_pct: number;
  half_kelly_pct: number;
  pareto_insight: string;
  overall_score: string;
  metrics: AdviceMetrics;
  source: 'rule-based' | 'groq-enhanced';
}
