export interface ReportMetadata {
  filename: string;
  date_range: string;
  total_symbols: number;
}

export interface OverviewData {
  net_realized_pnl: number;
  unrealized_pnl: number;
  total_charges: number;
  net_after_charges: number;
  win_rate: number;
  symbols_traded: number;
  symbols_by_type: Record<string, number>;
  total_buy_value: number;
  total_sell_value: number;
  winners: number;
  losers: number;
  breakeven: number;
  avg_winner: number;
  avg_loser: number;
  win_loss_ratio: number;
  pnl_distribution: HistogramBin[];
  return_pct_distribution: HistogramBin[];
  symbol_wise_pnl: SymbolPnl[];
}

export interface HistogramBin {
  range: string;
  count: number;
  min: number;
  max: number;
}

export interface SymbolPnl {
  symbol: string;
  underlying: string;
  type: string;
  buy_value: number;
  sell_value: number;
  realized_pnl: number;
  pnl_pct: number;
}

export interface PerformanceData {
  top_winners_impact: number;
  top_winners_pct: number;
  top_winners_names: string;
  top_losers_impact: number;
  top_losers_pct: number;
  top_losers_names: string;
  concentration_risk: number;
  concentration_pct: number;
  concentration_detail: string;
  top_contributors: { underlying: string; pnl: number }[];
  top_detractors: { underlying: string; pnl: number }[];
  waterfall: { underlying: string; pnl: number; cumulative: number }[];
  pareto: { underlying: string; pnl: number; cumulative_pct: number }[];
  pareto_80_index: number;
  avg_win: number;
  avg_loss: number;
  win_loss_asymmetry: number;
  contribution_table: ContributionRow[];
}

export interface ContributionRow {
  underlying: string;
  num_symbols: number;
  pnl: number;
  contribution_pct: number;
  buy_value: number;
  sell_value: number;
}

export interface InstrumentData {
  futures_pnl: number;
  options_pnl: number;
  calls_pnl: number;
  puts_pnl: number;
  index_fo_pnl: number;
  futures_count: number;
  options_count: number;
  calls_count: number;
  puts_count: number;
  index_count: number;
  futures_vs_options: { futures: number; options: number };
  calls_vs_puts: { calls: number; puts: number };
  index_vs_stock: { index: number; stock: number };
  pnl_by_underlying: UnderlyingPnl[];
  capital_vs_returns: { underlying: string; capital: number; return_pct: number }[];
}

export interface UnderlyingPnl {
  underlying: string;
  num_symbols: number;
  pnl: number;
  win_rate: number;
  avg_return: number;
  buy_value: number;
}

export interface ChargesData {
  total_charges: number;
  charges_pct_pnl: number;
  charges_pct_turnover: number;
  symbols_to_cover: number;
  charges_breakdown: ChargeItem[];
  gross_pnl: number;
  net_pnl: number;
  detailed_charges: ChargeItem[];
  other_debits_credits: {
    total_debits: number;
    total_credits: number;
    net: number;
    entries: OtherEntry[];
  };
}

export interface ChargeItem {
  name: string;
  amount: number;
  pct: number;
}

export interface OtherEntry {
  particulars: string;
  posting_date: string;
  debit: number;
  credit: number;
}

export interface OpenPortfolioData {
  open_positions_count: number;
  total_unrealized_pnl: number;
  total_open_value: number;
  max_unrealized_profit: number;
  max_unrealized_loss: number;
  concentration: { underlying: string; pct: number }[];
  unrealized_by_position: { symbol: string; underlying: string; pnl: number }[];
  positions: OpenPosition[];
}

export interface OpenPosition {
  symbol: string;
  underlying: string;
  type: string;
  strike: string;
  qty: number;
  qty_type: string;
  buy_price: number;
  open_value: number;
  unrealized_pnl: number;
  pnl_pct: number;
  prev_close: number;
}

export interface ReportData {
  metadata: ReportMetadata;
  overview: OverviewData;
  performance: PerformanceData;
  instruments: InstrumentData;
  charges: ChargesData;
  open_portfolio: OpenPortfolioData;
}
