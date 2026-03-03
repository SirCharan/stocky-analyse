"""
Vercel Serverless Function: POST /api/csv-advice
Receives CSV tradebook report JSON, computes section-based trading metrics,
then calls Groq LLM for hedge-fund-quality analysis per section.
Falls back to rule-based insights if Groq is unavailable.
"""
import json
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


# ─── Metrics Computation ────────────────────────────────────────────────────────

def compute_csv_metrics(report: dict) -> dict:
    """Extract all metrics from CSV report for 7 analysis sections."""
    ov = report.get("overview", {})
    pnl = report.get("pnl_analysis", {})
    inst = report.get("instrument_analysis", {})
    exp = report.get("expiry_analysis", {})
    risk = report.get("risk_metrics", {}).get("cards", {})

    # Section 1: Win Rate & Payoff
    win_rate = ov.get("win_rate", 0)
    avg_winner = abs(ov.get("avg_winner", 0))
    avg_loser = abs(ov.get("avg_loser", 0))
    win_loss_ratio = ov.get("win_loss_ratio", 0)
    total_pnl = ov.get("total_pnl", 0)
    total_trades = ov.get("total_trades", 0)
    winners = ov.get("winners", 0)
    losers = ov.get("losers", 0)
    profit_factor = ov.get("profit_factor", 0)
    avg_pnl_per_trade = ov.get("avg_pnl_per_trade", 0)
    best_trade = ov.get("best_trade", {"pnl": 0, "underlying": "N/A"})
    worst_trade = ov.get("worst_trade", {"pnl": 0, "underlying": "N/A"})

    # Section 2: Best & Worst Month
    monthly = pnl.get("monthly_table", [])
    if monthly:
        best_month_pnl = max(monthly, key=lambda m: m.get("gross_pnl", 0))
        worst_month_pnl = min(monthly, key=lambda m: m.get("gross_pnl", 0))
        green_months = sum(1 for m in monthly if m.get("gross_pnl", 0) > 0)
        red_months = sum(1 for m in monthly if m.get("gross_pnl", 0) <= 0)
        total_months = len(monthly)
        monthly_consistency = (green_months / total_months * 100) if total_months > 0 else 0
    else:
        best_month_pnl = {"month": "N/A", "gross_pnl": 0, "pnl_pct": 0, "win_rate": 0, "trades": 0}
        worst_month_pnl = {"month": "N/A", "gross_pnl": 0, "pnl_pct": 0, "win_rate": 0, "trades": 0}
        green_months = 0
        red_months = 0
        monthly_consistency = 0

    # Section 3: Day of Week P&L
    dow = pnl.get("day_of_week", [])
    if dow:
        best_day = max(dow, key=lambda d: d.get("total_pnl", 0))
        worst_day = min(dow, key=lambda d: d.get("total_pnl", 0))
    else:
        best_day = {"day": "N/A", "total_pnl": 0, "avg_pnl": 0, "win_rate": 0}
        worst_day = {"day": "N/A", "total_pnl": 0, "avg_pnl": 0, "win_rate": 0}

    # Section 4: Trades per Day
    tpd = pnl.get("trades_per_day", [])
    if tpd:
        busiest_day = max(tpd, key=lambda d: d.get("count", 0))
        quietest_day = min(tpd, key=lambda d: d.get("count", 0))
    else:
        busiest_day = {"day": "N/A", "count": 0}
        quietest_day = {"day": "N/A", "count": 0}

    # Section 5: Instruments & Direction
    sc = inst.get("summary_cards", {})
    dr = inst.get("directional", {})
    futures_pnl = sc.get("futures_pnl", 0)
    futures_count = sc.get("futures_count", 0)
    ce_pnl = sc.get("ce_pnl", 0)
    ce_count = sc.get("ce_count", 0)
    pe_pnl = sc.get("pe_pnl", 0)
    pe_count = sc.get("pe_count", 0)
    index_pnl = sc.get("index_pnl", 0)
    index_count = sc.get("index_count", 0)
    stock_pnl = sc.get("stock_pnl", 0)
    stock_count = sc.get("stock_count", 0)
    options_pnl = ce_pnl + pe_pnl
    options_count = ce_count + pe_count
    long_pnl = dr.get("long_pnl", 0)
    short_pnl = dr.get("short_pnl", 0)
    long_trades = dr.get("long_trades", 0)
    short_trades = dr.get("short_trades", 0)
    long_wr = dr.get("long_win_rate", 0)
    short_wr = dr.get("short_win_rate", 0)
    top5_winners = inst.get("top5_winners", [])
    top5_losers = inst.get("top5_losers", [])

    # Section 6: Monthly vs Weekly Expiry
    mvw = exp.get("monthly_vs_weekly", {})
    monthly_exp = mvw.get("monthly", {"pnl": 0, "trades": 0, "win_rate": 0, "avg_return": 0})
    weekly_exp = mvw.get("weekly", {"pnl": 0, "trades": 0, "win_rate": 0, "avg_return": 0})

    # Section 7: DTE Buckets
    dte_buckets = exp.get("dte_buckets", [])
    if dte_buckets:
        best_dte = max(dte_buckets, key=lambda b: b.get("pnl", 0))
        worst_dte = min(dte_buckets, key=lambda b: b.get("pnl", 0))
    else:
        best_dte = {"bucket": "N/A", "pnl": 0, "trades": 0, "win_rate": 0}
        worst_dte = {"bucket": "N/A", "pnl": 0, "trades": 0, "win_rate": 0}

    # Risk metrics
    sharpe_ratio = risk.get("sharpe_ratio", 0)
    max_drawdown = risk.get("max_drawdown", 0)
    max_drawdown_pct = risk.get("max_drawdown_pct", 0)
    recovery_factor = risk.get("recovery_factor", 0)
    expectancy = risk.get("expectancy", 0)
    payoff_ratio = risk.get("payoff_ratio", 0)
    max_consec_wins = risk.get("max_consec_wins", 0)
    max_consec_losses = risk.get("max_consec_losses", 0)

    # Kelly Criterion
    rr_ratio = payoff_ratio if payoff_ratio > 0 else (avg_winner / avg_loser if avg_loser > 0 else 0)
    wr_frac = win_rate / 100
    kelly = (wr_frac - (1 - wr_frac) / rr_ratio) if rr_ratio > 0 else 0
    kelly = max(0, min(kelly, 1))
    half_kelly = kelly / 2

    # Section 8: Multi-Leg Strategies
    ml = report.get("multi_leg_analysis", {})
    ml_summary = ml.get("summary", {})
    ml_total = ml_summary.get("total", 0)
    ml_total_pnl = ml_summary.get("total_pnl", 0)
    ml_win_rate = ml_summary.get("win_rate", 0)
    ml_avg_pnl = ml_summary.get("avg_pnl", 0)
    ml_by_strategy = ml.get("by_strategy", [])
    ml_best = ml_summary.get("best_trade", {"pnl": 0, "underlying": "N/A", "strategy": "N/A"})
    ml_worst = ml_summary.get("worst_trade", {"pnl": 0, "underlying": "N/A", "strategy": "N/A"})

    # Score
    score = compute_csv_score(win_rate, rr_ratio, profit_factor, sharpe_ratio, monthly_consistency)

    return {
        "win_rate": round(win_rate, 1),
        "avg_winner": round(avg_winner, 2),
        "avg_loser": round(avg_loser, 2),
        "win_loss_ratio": round(win_loss_ratio, 2),
        "winners": winners,
        "losers": losers,
        "total_trades": total_trades,
        "total_pnl": round(total_pnl, 2),
        "profit_factor": round(profit_factor, 2),
        "avg_pnl_per_trade": round(avg_pnl_per_trade, 2),
        "best_trade": {"pnl": round(best_trade.get("pnl", 0), 2), "underlying": best_trade.get("underlying", "N/A")},
        "worst_trade": {"pnl": round(worst_trade.get("pnl", 0), 2), "underlying": worst_trade.get("underlying", "N/A")},
        "best_month": {
            "month": best_month_pnl.get("month", "N/A"),
            "pnl": round(best_month_pnl.get("gross_pnl", 0), 2),
            "pnl_pct": round(best_month_pnl.get("pnl_pct", 0), 1),
            "win_rate": round(best_month_pnl.get("win_rate", 0), 1),
            "trades": best_month_pnl.get("trades", 0),
        },
        "worst_month": {
            "month": worst_month_pnl.get("month", "N/A"),
            "pnl": round(worst_month_pnl.get("gross_pnl", 0), 2),
            "pnl_pct": round(worst_month_pnl.get("pnl_pct", 0), 1),
            "win_rate": round(worst_month_pnl.get("win_rate", 0), 1),
            "trades": worst_month_pnl.get("trades", 0),
        },
        "green_months": green_months,
        "red_months": red_months,
        "monthly_consistency": round(monthly_consistency, 1),
        "best_day": {
            "day": best_day.get("day", "N/A"),
            "total_pnl": round(best_day.get("total_pnl", 0), 2),
            "avg_pnl": round(best_day.get("avg_pnl", 0), 2),
            "win_rate": round(best_day.get("win_rate", 0), 1),
        },
        "worst_day": {
            "day": worst_day.get("day", "N/A"),
            "total_pnl": round(worst_day.get("total_pnl", 0), 2),
            "avg_pnl": round(worst_day.get("avg_pnl", 0), 2),
            "win_rate": round(worst_day.get("win_rate", 0), 1),
        },
        "busiest_day": {"day": busiest_day.get("day", "N/A"), "count": busiest_day.get("count", 0)},
        "quietest_day": {"day": quietest_day.get("day", "N/A"), "count": quietest_day.get("count", 0)},
        "futures_pnl": round(futures_pnl, 2), "futures_count": futures_count,
        "ce_pnl": round(ce_pnl, 2), "ce_count": ce_count,
        "pe_pnl": round(pe_pnl, 2), "pe_count": pe_count,
        "options_pnl": round(options_pnl, 2), "options_count": options_count,
        "index_pnl": round(index_pnl, 2), "index_count": index_count,
        "stock_pnl": round(stock_pnl, 2), "stock_count": stock_count,
        "long_pnl": round(long_pnl, 2), "short_pnl": round(short_pnl, 2),
        "long_trades": long_trades, "short_trades": short_trades,
        "long_win_rate": round(long_wr, 1), "short_win_rate": round(short_wr, 1),
        "top5_winners": top5_winners[:5],
        "top5_losers": top5_losers[:5],
        "monthly_expiry": monthly_exp,
        "weekly_expiry": weekly_exp,
        "dte_buckets": dte_buckets,
        "best_dte_bucket": best_dte,
        "worst_dte_bucket": worst_dte,
        "sharpe_ratio": round(sharpe_ratio, 2),
        "max_drawdown": round(max_drawdown, 2),
        "max_drawdown_pct": round(max_drawdown_pct, 2),
        "recovery_factor": round(recovery_factor, 2),
        "expectancy": round(expectancy, 2),
        "payoff_ratio": round(payoff_ratio, 2),
        "max_consec_wins": max_consec_wins,
        "max_consec_losses": max_consec_losses,
        "rr_ratio": round(rr_ratio, 2),
        "kelly_fraction": round(kelly, 4),
        "half_kelly": round(half_kelly, 4),
        "kelly_pct": round(kelly * 100, 1),
        "half_kelly_pct": round(half_kelly * 100, 1),
        "overall_score": score,
        "ml_total": ml_total,
        "ml_total_pnl": round(ml_total_pnl, 2),
        "ml_win_rate": round(ml_win_rate, 1),
        "ml_avg_pnl": round(ml_avg_pnl, 2),
        "ml_by_strategy": ml_by_strategy,
        "ml_best": ml_best,
        "ml_worst": ml_worst,
    }


def compute_csv_score(win_rate, rr_ratio, profit_factor, sharpe_ratio, monthly_consistency):
    """Grade trader A+ to D based on 5 categories, 20 pts each."""
    score = 0

    # Win rate (0-20)
    if win_rate >= 65: score += 20
    elif win_rate >= 55: score += 16
    elif win_rate >= 45: score += 12
    elif win_rate >= 35: score += 6
    else: score += 2

    # Payoff ratio (0-20)
    if rr_ratio >= 2.0: score += 20
    elif rr_ratio >= 1.5: score += 16
    elif rr_ratio >= 1.0: score += 12
    elif rr_ratio >= 0.7: score += 6
    else: score += 2

    # Profit factor (0-20)
    if profit_factor >= 2.0: score += 20
    elif profit_factor >= 1.5: score += 16
    elif profit_factor >= 1.2: score += 12
    elif profit_factor >= 1.0: score += 6
    else: score += 2

    # Sharpe ratio (0-20)
    if sharpe_ratio >= 2.0: score += 20
    elif sharpe_ratio >= 1.5: score += 16
    elif sharpe_ratio >= 1.0: score += 12
    elif sharpe_ratio >= 0.5: score += 6
    else: score += 2

    # Monthly consistency (0-20)
    if monthly_consistency >= 80: score += 20
    elif monthly_consistency >= 65: score += 16
    elif monthly_consistency >= 50: score += 12
    elif monthly_consistency >= 35: score += 6
    else: score += 2

    if score >= 90: return "A+"
    if score >= 80: return "A"
    if score >= 70: return "B+"
    if score >= 60: return "B"
    if score >= 50: return "C+"
    if score >= 40: return "C"
    if score >= 30: return "C-"
    return "D"


# ─── Helpers ─────────────────────────────────────────────────────────────────────

_DAY_FULL = {"Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday", "Thu": "Thursday", "Fri": "Friday"}


def _day(abbr):
    return _DAY_FULL.get(abbr, abbr)


def _b(text, tab=None, cat=None):
    return {"text": text, "related_tab": tab, "category": cat}


def _classify_bullet(text):
    """Auto-classify a bullet into a category using keyword matching."""
    t = text.lower()
    if any(w in t for w in ["kelly", "position siz", "half-kelly", "half kelly", "sizing"]):
        return "Position Sizing"
    if any(w in t for w in ["multi-leg", "spread", "straddle", "strangle", "iron condor",
                             "bull put", "bear call", "bull call", "bear put"]):
        return "Multi-Leg"
    if any(w in t for w in ["drawdown", "consecutive loss", "max dd", "recovery factor"]):
        return "Risk & Drawdown"
    if any(w in t for w in ["monday", "tuesday", "wednesday", "thursday", "friday",
                             "best day", "worst day", "day of week"]):
        return "Day-wise"
    if any(w in t for w in ["monthly expir", "weekly expir", " dte", "days to expir",
                             "0 dte", "7+ dte", "4-7 dte", "expiry", "expiries"]):
        return "Expiry & DTE"
    if (any(w in t for w in ["futures", " ce ", " pe ",
                              "long trade", "short trade", "long pos", "short pos",
                              "long edge", "short edge", "long side", "short side",
                              "long bias", "short bias", "longs ", "shorts ",
                              "instrument", "calls", "puts"])
            or t.startswith("ce ") or t.startswith("pe ")):
        return "Instruments"
    if any(w in t for w in ["consistency", "green month", "red month"]):
        return "Consistency"
    return "Core Metrics"


def _dp(label, value):
    return {"label": label, "value": str(value)}


def _fmt(v):
    """Format number as Indian Rs currency."""
    return f"Rs {v:,.0f}"


def _generate_csv_summary(m, tone="helpful"):
    wr = m["win_rate"]
    rr = m["rr_ratio"]
    pnl = m["total_pnl"]
    score = m["overall_score"]
    direction = "profitable" if pnl > 0 else "loss-making"

    if tone == "roast":
        if pnl > 0:
            s = f"Net P&L of {_fmt(pnl)} across {m['total_trades']} trades — fine, you're not completely underwater. "
        else:
            s = f"You've managed to lose {_fmt(abs(pnl))} across {m['total_trades']} trades. The market makers are sending you a thank-you card. "
        s += f"Win rate of {wr}% with a {rr}:1 payoff and Sharpe of {m['sharpe_ratio']}. "
        if score in ("A+", "A"):
            s += f"Grade: {score}. I'll grudgingly admit — your numbers are solid. Don't let it inflate your ego."
        elif score in ("B+", "B"):
            s += f"Grade: {score}. Mediocre by institutional standards, but at least you're not bleeding out."
        else:
            s += f"Grade: {score}. If this were my desk, we'd be having a very uncomfortable conversation right now."
    else:
        s = f"Your trading has been {direction} with a net P&L of {_fmt(pnl)} across {m['total_trades']} trades over the analysis period. "
        s += f"With a {wr}% win rate, {rr}:1 payoff ratio, and Sharpe of {m['sharpe_ratio']}, your overall grade is {score}. "
        if score in ("A+", "A"):
            s += "This reflects strong trading discipline, positive expectancy, and consistent execution."
        elif score in ("B+", "B"):
            s += "You have a solid foundation with clear areas where focused improvements can elevate performance."
        else:
            s += "There are significant improvement opportunities across multiple dimensions that can transform your results."

    return s


# ─── Fallback Rule-Based Advice ─────────────────────────────────────────────────

def generate_csv_fallback_advice(m: dict, tone: str = "helpful") -> dict:
    """Generate section-based advice using rule-based logic."""
    sections = []
    strengths = []
    weaknesses = []
    recommendations = []

    wr = m["win_rate"]
    rr = m["rr_ratio"]
    pf = m["profit_factor"]

    # ── Section 1: Win Rate & Payoff ──────────────────────────────────────────
    dp1 = [
        _dp("Win Rate", f"{wr}%"),
        _dp("Avg Winner", _fmt(m["avg_winner"])),
        _dp("Avg Loser", _fmt(m["avg_loser"])),
        _dp("Payoff Ratio", f"{rr}:1"),
        _dp("Profit Factor", f"{pf}"),
        _dp("Expectancy", f"{_fmt(m['expectancy'])}/trade"),
    ]
    if tone == "roast":
        if wr >= 55 and rr >= 1.5:
            ins1 = f"Win rate at {wr}% with a {rr}:1 payoff — congratulations on clearing the lowest bar of competence. Your avg winner of {_fmt(m['avg_winner'])} vs avg loser of {_fmt(m['avg_loser'])} shows you can hold winners. Barely."
        elif wr < 45:
            ins1 = f"A {wr}% win rate. You'd do better flipping a coin. Your avg loser at {_fmt(m['avg_loser'])} is eating you alive while winners at {_fmt(m['avg_winner'])} barely cover the damage. Profit factor of {pf} confirms the math is ugly."
        else:
            ins1 = f"Win rate of {wr}% with a {rr}:1 payoff ratio — it's not terrible, but it's not good either. With expectancy at {_fmt(m['expectancy'])} per trade, you're grinding for crumbs. The market isn't impressed."
    else:
        if wr >= 55 and rr >= 1.5:
            ins1 = f"Strong foundation: {wr}% win rate combined with a {rr}:1 payoff ratio creates positive expectancy. Your average winner ({_fmt(m['avg_winner'])}) meaningfully exceeds your average loser ({_fmt(m['avg_loser'])}), indicating good trade management."
        elif wr < 45:
            ins1 = f"Win rate of {wr}% means you're losing more trades than winning. With average winner at {_fmt(m['avg_winner'])} and average loser at {_fmt(m['avg_loser'])}, focus on either improving setup selection or tightening stop losses to improve the payoff ratio."
        else:
            ins1 = f"Your win rate of {wr}% with a {rr}:1 payoff gives you an expectancy of {_fmt(m['expectancy'])} per trade. There's room to improve by either increasing win rate through better setups or widening the payoff ratio through tighter risk management."
    sections.append({"id": "win-rate", "title": "Win Rate & Payoff Analysis", "related_tab": 0, "data_points": dp1, "insight": ins1})

    # ── Section 2: Monthly Performance ────────────────────────────────────────
    bm = m["best_month"]
    wm = m["worst_month"]
    dp2 = [
        _dp("Best Month", f"{bm['month']}: {_fmt(bm['pnl'])}"),
        _dp("Worst Month", f"{wm['month']}: {_fmt(wm['pnl'])}"),
        _dp("Green Months", f"{m['green_months']}/{m['green_months'] + m['red_months']}"),
        _dp("Consistency", f"{m['monthly_consistency']}%"),
    ]
    if tone == "roast":
        if m["monthly_consistency"] >= 60:
            ins2 = f"Best month was {bm['month']} at {_fmt(bm['pnl'])} ({bm['pnl_pct']}% return) — at least you can point to one decent month. Worst was {wm['month']} at {_fmt(wm['pnl'])}. {m['green_months']} green months out of {m['green_months'] + m['red_months']} — you're consistent enough to not get fired. Barely."
        else:
            ins2 = f"Best month {bm['month']} ({_fmt(bm['pnl'])}) doesn't come close to offsetting {wm['month']} ({_fmt(wm['pnl'])}). Only {m['green_months']} profitable months out of {m['green_months'] + m['red_months']}. That {m['monthly_consistency']}% consistency would get you shown the door at any real fund."
    else:
        if m["monthly_consistency"] >= 60:
            ins2 = f"Your best month was {bm['month']} ({_fmt(bm['pnl'])}, {bm['pnl_pct']}% return) and worst was {wm['month']} ({_fmt(wm['pnl'])}). With {m['green_months']} profitable months out of {m['green_months'] + m['red_months']} ({m['monthly_consistency']}% consistency), you show reasonable monthly discipline."
        else:
            ins2 = f"Best month {bm['month']} ({_fmt(bm['pnl'])}) was offset by a difficult {wm['month']} ({_fmt(wm['pnl'])}). With only {m['green_months']} profitable months out of {m['green_months'] + m['red_months']}, improving monthly consistency should be a priority."
    sections.append({"id": "monthly-performance", "title": "Monthly Performance", "related_tab": 1, "data_points": dp2, "insight": ins2})

    # ── Section 3: Day of Week P&L ────────────────────────────────────────────
    bd = m["best_day"]
    wd = m["worst_day"]
    dp3 = [
        _dp("Best Day", f"{bd['day']}: {_fmt(bd['total_pnl'])}"),
        _dp("Worst Day", f"{wd['day']}: {_fmt(wd['total_pnl'])}"),
        _dp(f"{bd['day']} Avg P&L", _fmt(bd["avg_pnl"])),
        _dp(f"{bd['day']} Win Rate", f"{bd['win_rate']}%"),
    ]
    if tone == "roast":
        if wd["total_pnl"] < 0:
            ins3 = f"{wd['day']}s are bleeding you for {_fmt(abs(wd['total_pnl']))}. Every single {wd['day']}, the market takes your money and you keep coming back for more. Meanwhile, {bd['day']}s make {_fmt(bd['total_pnl'])} — maybe just don't trade on {wd['day']}s?"
        else:
            ins3 = f"Your best day is {bd['day']} ({_fmt(bd['total_pnl'])}) and your 'worst' is {wd['day']} ({_fmt(wd['total_pnl'])}). All days profitable — I'll give you credit, but the spread between best and worst tells me your edge isn't consistent across the week."
    else:
        if wd["total_pnl"] < 0:
            ins3 = f"Your strongest day is {bd['day']} ({_fmt(bd['total_pnl'])} total, {bd['win_rate']}% win rate), while {wd['day']}s show losses ({_fmt(wd['total_pnl'])}). Consider reducing position size or being more selective on {wd['day']}s to improve overall consistency."
        else:
            ins3 = f"{bd['day']}s are your most profitable ({_fmt(bd['total_pnl'])}) while {wd['day']}s bring the least ({_fmt(wd['total_pnl'])}). All days are positive, indicating broad consistency across the trading week."
    sections.append({"id": "day-of-week-pnl", "title": "P&L by Day of Week", "related_tab": 1, "data_points": dp3, "insight": ins3})

    # ── Section 4: Trade Frequency ────────────────────────────────────────────
    bus = m["busiest_day"]
    qui = m["quietest_day"]
    dp4 = [
        _dp("Busiest Day", f"{bus['day']}: {bus['count']} trades"),
        _dp("Quietest Day", f"{qui['day']}: {qui['count']} trades"),
        _dp("Total Trades", str(m["total_trades"])),
    ]
    # Cross-reference: is busiest day the worst P&L day?
    busiest_is_worst = bus["day"] == wd["day"] and wd["total_pnl"] < 0
    if tone == "roast":
        if busiest_is_worst:
            ins4 = f"You trade the most on {bus['day']}s ({bus['count']} trades) and it's also your worst P&L day. Classic overtrading pattern — the more you trade, the more you lose. Your {qui['day']}s have fewer trades ({qui['count']}) and probably better results. Take the hint."
        else:
            ins4 = f"Most active on {bus['day']}s ({bus['count']} trades), quietest on {qui['day']}s ({qui['count']}). At least your busiest day isn't your worst — small mercies. But {m['total_trades']} total trades means you're paying a lot of spread and slippage."
    else:
        if busiest_is_worst:
            ins4 = f"You're most active on {bus['day']}s ({bus['count']} trades) which is also your weakest P&L day. This overtrading pattern suggests reducing {bus['day']} trade count could improve results. Your quieter {qui['day']}s ({qui['count']} trades) show that less can be more."
        else:
            ins4 = f"Trade frequency peaks on {bus['day']}s ({bus['count']} trades) and dips on {qui['day']}s ({qui['count']}). Across {m['total_trades']} total trades, monitor whether higher-frequency days maintain the same win rate and payoff as quieter days."
    sections.append({"id": "trade-frequency", "title": "Trade Frequency", "related_tab": 1, "data_points": dp4, "insight": ins4})

    # ── Section 5: Instruments & Direction ────────────────────────────────────
    dp5 = [
        _dp("Long P&L", f"{_fmt(m['long_pnl'])} ({m['long_trades']} trades)"),
        _dp("Short P&L", f"{_fmt(m['short_pnl'])} ({m['short_trades']} trades)"),
        _dp("Futures", f"{_fmt(m['futures_pnl'])} ({m['futures_count']})"),
        _dp("Calls (CE)", f"{_fmt(m['ce_pnl'])} ({m['ce_count']})"),
        _dp("Puts (PE)", f"{_fmt(m['pe_pnl'])} ({m['pe_count']})"),
        _dp("Index", f"{_fmt(m['index_pnl'])} ({m['index_count']})"),
    ]
    # Find best/worst instrument
    inst_perf = [("Futures", m["futures_pnl"]), ("CE", m["ce_pnl"]), ("PE", m["pe_pnl"])]
    inst_perf.sort(key=lambda x: x[1], reverse=True)
    best_inst = inst_perf[0]
    worst_inst = inst_perf[-1]

    if tone == "roast":
        ins5 = f"Long trades: {_fmt(m['long_pnl'])} ({m['long_win_rate']}% WR). Short trades: {_fmt(m['short_pnl'])} ({m['short_win_rate']}% WR). "
        if m["long_pnl"] > 0 and m["short_pnl"] < 0:
            ins5 += f"You can go long but can't short — half the market is invisible to you. "
        elif m["short_pnl"] > 0 and m["long_pnl"] < 0:
            ins5 += f"You can short but can't go long — you're missing half the opportunity set. "
        ins5 += f"{best_inst[0]} at {_fmt(best_inst[1])} is carrying your book while {worst_inst[0]} at {_fmt(worst_inst[1])} is dragging it down. The numbers are screaming — listen to them."
    else:
        ins5 = f"Directionally, longs generated {_fmt(m['long_pnl'])} ({m['long_win_rate']}% WR) and shorts {_fmt(m['short_pnl'])} ({m['short_win_rate']}% WR). "
        ins5 += f"By instrument, {best_inst[0]} is your strongest segment ({_fmt(best_inst[1])}) while {worst_inst[0]} ({_fmt(worst_inst[1])}) needs attention. Consider reallocating capital toward your proven edges."
    sections.append({"id": "instruments-direction", "title": "Instruments & Direction", "related_tab": 2, "data_points": dp5, "insight": ins5})

    # ── Section 6: Monthly vs Weekly Expiry ───────────────────────────────────
    me = m["monthly_expiry"]
    we = m["weekly_expiry"]
    dp6 = [
        _dp("Monthly P&L", f"{_fmt(me['pnl'])} ({me['trades']} trades)"),
        _dp("Monthly Win Rate", f"{me['win_rate']}%"),
        _dp("Weekly P&L", f"{_fmt(we['pnl'])} ({we['trades']} trades)"),
        _dp("Weekly Win Rate", f"{we['win_rate']}%"),
    ]
    if tone == "roast":
        if me["pnl"] > 0 and we["pnl"] < 0:
            ins6 = f"Monthly expiries make {_fmt(me['pnl'])} while weeklies lose {_fmt(abs(we['pnl']))}. You're gambling on weeklies and it shows. The premium decay is eating you alive on short-dated contracts. Stick to what works."
        elif we["pnl"] > 0 and me["pnl"] < 0:
            ins6 = f"Weeklies at {_fmt(we['pnl'])} vs monthlies at {_fmt(me['pnl'])}. Your weekly scalping works but you fall apart on longer-dated positions. Maybe you don't have the patience for monthly theta decay — accept it."
        else:
            ins6 = f"Monthly expiries: {_fmt(me['pnl'])} ({me['win_rate']}% WR) vs Weekly: {_fmt(we['pnl'])} ({we['win_rate']}% WR). Both segments are {'profitable — I suppose even a blind squirrel finds a nut sometimes' if me['pnl'] > 0 and we['pnl'] > 0 else 'losing money — impressive consistency in losing'}."
    else:
        if me["pnl"] > 0 and we["pnl"] < 0:
            ins6 = f"Monthly expiries are profitable ({_fmt(me['pnl'])}, {me['win_rate']}% WR) while weekly expiries show losses ({_fmt(we['pnl'])}). Consider reducing weekly exposure and focusing capital on monthly contracts where your edge is established."
        elif we["pnl"] > 0 and me["pnl"] < 0:
            ins6 = f"Weekly expiries generate {_fmt(we['pnl'])} ({we['win_rate']}% WR) while monthlies lose {_fmt(abs(me['pnl']))}. Your short-dated trading strategy is working — lean into it and review your monthly expiry approach."
        else:
            ins6 = f"Monthly expiries: {_fmt(me['pnl'])} ({me['win_rate']}% WR, {me['trades']} trades). Weekly expiries: {_fmt(we['pnl'])} ({we['win_rate']}% WR, {we['trades']} trades). {'Both segments profitable — maintain current allocation.' if me['pnl'] > 0 and we['pnl'] > 0 else 'Both segments losing — fundamental strategy review needed.'}"
    sections.append({"id": "expiry-type", "title": "Monthly vs Weekly Expiry", "related_tab": 3, "data_points": dp6, "insight": ins6})

    # ── Section 7: DTE Analysis ───────────────────────────────────────────────
    dp7 = [_dp(b["bucket"], f"{_fmt(b['pnl'])} | {b['trades']}t | {b['win_rate']}% WR") for b in m["dte_buckets"]]
    bdte = m["best_dte_bucket"]
    wdte = m["worst_dte_bucket"]
    if tone == "roast":
        ins7 = f"Best DTE bucket: {bdte['bucket']} ({_fmt(bdte['pnl'])}, {bdte['win_rate']}% WR). Worst: {wdte['bucket']} ({_fmt(wdte['pnl'])}). "
        if wdte["bucket"] == "0 DTE" and wdte["pnl"] < 0:
            ins7 += f"0 DTE is bleeding you — you're not scalping, you're gambling with gamma exposure. The house always wins on expiry day."
        elif bdte["bucket"] == "0 DTE":
            ins7 += f"Making money on 0 DTE — either you're skilled or lucky. Given the rest of your numbers, I'm leaning lucky. Don't push it."
        else:
            ins7 += f"Your edge clearly lives in the {bdte['bucket']} bucket. Stop wasting capital on {wdte['bucket']} where you have no edge."
    else:
        ins7 = f"Your strongest DTE bucket is {bdte['bucket']} ({_fmt(bdte['pnl'])}, {bdte['win_rate']}% WR) while {wdte['bucket']} is weakest ({_fmt(wdte['pnl'])}). "
        if wdte["bucket"] == "0 DTE" and wdte["pnl"] < 0:
            ins7 += "0 DTE trades carry extreme gamma risk — consider reducing exposure or using tighter stops on expiry-day trades."
        else:
            ins7 += f"Focus capital allocation toward {bdte['bucket']} trades where you have demonstrated consistent edge."
    sections.append({"id": "dte-analysis", "title": "Days to Expiry Analysis", "related_tab": 3, "data_points": dp7, "insight": ins7})

    # ── Section 8: Multi-Leg Strategies ────────────────────────────────────────
    ml_total = m.get("ml_total", 0)
    if ml_total > 0:
        ml_pnl = m["ml_total_pnl"]
        ml_wr = m["ml_win_rate"]
        ml_avg = m["ml_avg_pnl"]
        ml_strategies = m.get("ml_by_strategy", [])
        ml_pct_of_trades = round(ml_total / m["total_trades"] * 100, 1) if m["total_trades"] > 0 else 0

        dp8 = [
            _dp("Multi-Leg Trades", str(ml_total)),
            _dp("Combined P&L", _fmt(ml_pnl)),
            _dp("Win Rate", f"{ml_wr}%"),
            _dp("Avg P&L/Trade", _fmt(ml_avg)),
            _dp("% of All Trades", f"{ml_pct_of_trades}%"),
        ]
        # Add top strategies
        for s in ml_strategies[:3]:
            dp8.append(_dp(s["strategy"], f"{_fmt(s['total_pnl'])} ({s['count']}t, {s['win_rate']}% WR)"))

        # Best/worst strategy
        best_strat = max(ml_strategies, key=lambda s: s["total_pnl"]) if ml_strategies else None
        worst_strat = min(ml_strategies, key=lambda s: s["total_pnl"]) if ml_strategies else None

        # Compare multi-leg vs single-leg
        single_leg_pnl = m["total_pnl"] - ml_pnl
        single_leg_count = m["total_trades"] - ml_total

        if tone == "roast":
            ins8 = f"{ml_total} multi-leg trades ({ml_pct_of_trades}% of your book) generating {_fmt(ml_pnl)} with {ml_wr}% win rate. "
            if ml_pnl > 0 and single_leg_pnl < 0:
                ins8 += f"Your spreads are carrying the book while your {single_leg_count} naked trades are losing {_fmt(abs(single_leg_pnl))}. Maybe stop trading naked and stick to what works. "
            elif ml_pnl < 0:
                ins8 += f"Even with defined risk, you're losing {_fmt(abs(ml_pnl))}. The complexity isn't helping you — you're just paying extra commissions to lose money in a fancier way. "
            if best_strat and worst_strat and best_strat != worst_strat:
                ins8 += f"{best_strat['strategy']} is your best ({_fmt(best_strat['total_pnl'])}) while {worst_strat['strategy']} is bleeding {_fmt(worst_strat['total_pnl'])}."
        else:
            ins8 = f"You executed {ml_total} multi-leg trades ({ml_pct_of_trades}% of total) with a combined P&L of {_fmt(ml_pnl)} and {ml_wr}% win rate. "
            if ml_pnl > 0 and single_leg_pnl < 0:
                ins8 += f"Your structured trades outperform single-leg trades (which lost {_fmt(abs(single_leg_pnl))}). Consider shifting more capital toward defined-risk strategies. "
            elif ml_pnl > 0:
                ins8 += f"Both multi-leg ({_fmt(ml_pnl)}) and single-leg ({_fmt(single_leg_pnl)}) strategies are contributing positively. "
            if best_strat and worst_strat and best_strat != worst_strat:
                ins8 += f"Your strongest strategy is {best_strat['strategy']} ({_fmt(best_strat['total_pnl'])}, {best_strat['win_rate']}% WR). Review {worst_strat['strategy']} performance ({_fmt(worst_strat['total_pnl'])})."

        sections.append({"id": "multi-leg", "title": "Multi-Leg Strategies", "related_tab": 6, "data_points": dp8, "insight": ins8})

    # ── Pre-compute bullet variables ──────────────────────────────────────────
    me_pnl = m["monthly_expiry"]["pnl"]
    me_wr = m["monthly_expiry"]["win_rate"]
    we_pnl = m["weekly_expiry"]["pnl"]
    we_wr = m["weekly_expiry"]["win_rate"]
    ml_strats = m.get("ml_by_strategy", [])
    ml_best_s = max(ml_strats, key=lambda s: s["total_pnl"]) if ml_strats else None
    ml_worst_s = min(ml_strats, key=lambda s: s["total_pnl"]) if ml_strats else None

    # ── Strengths ─────────────────────────────────────────────────────────────
    if tone == "roast":
        if wr >= 55:
            strengths.append(_b(f"{wr}% win rate — lowest bar cleared. Barely.", 0, cat="Core Metrics"))
        if rr >= 1.5:
            strengths.append(_b(f"{rr}:1 payoff. Your winners actually outsize losers. Shocked.", 0, cat="Core Metrics"))
        if m["sharpe_ratio"] >= 1.0:
            strengths.append(_b(f"Sharpe {m['sharpe_ratio']}. Begrudgingly impressed.", None, cat="Core Metrics"))
        if m["monthly_consistency"] >= 60:
            strengths.append(_b(f"{m['green_months']}/{m['green_months'] + m['red_months']} green months ({m['monthly_consistency']}%). Not a one-hit wonder.", 1, cat="Consistency"))
        if best_inst[1] > 0:
            strengths.append(_b(f"{best_inst[0]} at {_fmt(best_inst[1])} — one thing works. Don't mess it up.", 2, cat="Instruments"))
        if bd["total_pnl"] > 0:
            strengths.append(_b(f"{_day(bd['day'])}s print {_fmt(bd['total_pnl'])}. If only every day were {_day(bd['day'])}.", 1, cat="Day-wise"))
        if bdte["pnl"] > 0:
            strengths.append(_b(f"{bdte['bucket']}: {_fmt(bdte['pnl'])}, {bdte['win_rate']}% WR — your one real edge.", 3, cat="Expiry & DTE"))
        if pf >= 1.5:
            strengths.append(_b(f"Profit factor {pf}. At least something's working.", 0, cat="Core Metrics"))
        if m["best_trade"]["pnl"] > 0:
            strengths.append(_b(f"{_fmt(m['best_trade']['pnl'])} on {m['best_trade']['underlying']} — your one claim to fame.", 5, cat="Core Metrics"))
        if me_pnl > 0 and me_pnl > we_pnl:
            strengths.append(_b(f"Monthly expiries: {_fmt(me_pnl)}. Weeklies wish they could relate.", 3, cat="Expiry & DTE"))
        elif we_pnl > 0 and we_pnl > me_pnl:
            strengths.append(_b(f"Weeklies at {_fmt(we_pnl)}. Monthlies are dead weight.", 3, cat="Expiry & DTE"))
        if m["long_pnl"] > 0 and m["long_win_rate"] >= 55:
            strengths.append(_b(f"Longs at {m['long_win_rate']}% WR. At least one direction works.", 2, cat="Instruments"))
        if m["short_pnl"] > 0 and m["short_win_rate"] >= 55:
            strengths.append(_b(f"Shorts at {m['short_win_rate']}% WR. Bears can be right sometimes.", 2, cat="Instruments"))
        if ml_best_s and ml_best_s["total_pnl"] > 0:
            strengths.append(_b(f"{ml_best_s['strategy']} actually works: {_fmt(ml_best_s['total_pnl'])}. Do more of this.", 6, cat="Multi-Leg"))
    else:
        if wr >= 55:
            strengths.append(_b(f"{wr}% win rate — consistently picking more winners than losers.", 0, cat="Core Metrics"))
        if rr >= 1.5:
            strengths.append(_b(f"{rr}:1 payoff — winners meaningfully outsize losers.", 0, cat="Core Metrics"))
        if m["sharpe_ratio"] >= 1.0:
            strengths.append(_b(f"Sharpe of {m['sharpe_ratio']} — solid risk-adjusted returns.", None, cat="Core Metrics"))
        if m["monthly_consistency"] >= 60:
            strengths.append(_b(f"{m['green_months']}/{m['green_months'] + m['red_months']} green months — {m['monthly_consistency']}% monthly consistency.", 1, cat="Consistency"))
        if best_inst[1] > 0:
            strengths.append(_b(f"{best_inst[0]} profitable at {_fmt(best_inst[1])} — a clear edge.", 2, cat="Instruments"))
        if bd["total_pnl"] > 0:
            strengths.append(_b(f"{_day(bd['day'])}s are your cash day: {_fmt(bd['total_pnl'])}, {bd['win_rate']}% WR.", 1, cat="Day-wise"))
        if bdte["pnl"] > 0:
            strengths.append(_b(f"{bdte['bucket']} trades: {_fmt(bdte['pnl'])} with {bdte['win_rate']}% WR — your sweet spot.", 3, cat="Expiry & DTE"))
        if pf >= 1.5:
            strengths.append(_b(f"Profit factor {pf} — every rupee lost generates {pf}x back.", 0, cat="Core Metrics"))
        if m["best_trade"]["pnl"] > 0:
            strengths.append(_b(f"Best trade: {_fmt(m['best_trade']['pnl'])} on {m['best_trade']['underlying']} — proves you can hit big.", 5, cat="Core Metrics"))
        if me_pnl > 0 and me_pnl > we_pnl:
            strengths.append(_b(f"Monthly expiries net {_fmt(me_pnl)} ({me_wr}% WR) — stronger than weeklies.", 3, cat="Expiry & DTE"))
        elif we_pnl > 0 and we_pnl > me_pnl:
            strengths.append(_b(f"Weekly expiries net {_fmt(we_pnl)} ({we_wr}% WR) — outperform monthlies.", 3, cat="Expiry & DTE"))
        if m["long_pnl"] > 0 and m["long_win_rate"] >= 55:
            strengths.append(_b(f"Long trades: {_fmt(m['long_pnl'])}, {m['long_win_rate']}% WR — natural long-side edge.", 2, cat="Instruments"))
        if m["short_pnl"] > 0 and m["short_win_rate"] >= 55:
            strengths.append(_b(f"Short trades: {_fmt(m['short_pnl'])}, {m['short_win_rate']}% WR — strong short-side edge.", 2, cat="Instruments"))
        if ml_best_s and ml_best_s["total_pnl"] > 0:
            strengths.append(_b(f"{ml_best_s['strategy']}: {ml_best_s['count']} trades, {_fmt(ml_best_s['total_pnl'])} — your best spread strategy.", 6, cat="Multi-Leg"))

    # ── Weaknesses ────────────────────────────────────────────────────────────
    if tone == "roast":
        if wr < 50:
            weaknesses.append(_b(f"{wr}% win rate. A coin flip does better.", 0, cat="Core Metrics"))
        if rr < 1.0:
            weaknesses.append(_b(f"{rr}:1 payoff — losers devour winners. You're a charity.", 0, cat="Core Metrics"))
        if m["max_drawdown_pct"] > 20:
            weaknesses.append(_b(f"{m['max_drawdown_pct']}% drawdown ({_fmt(abs(m['max_drawdown']))}). That's a crater, not a dip.", 4, cat="Risk & Drawdown"))
        if m["max_consec_losses"] >= 5:
            weaknesses.append(_b(f"{m['max_consec_losses']} consecutive losses — systematic process failure.", None, cat="Risk & Drawdown"))
        if wd["total_pnl"] < 0:
            weaknesses.append(_b(f"{_day(wd['day'])}s cost {_fmt(abs(wd['total_pnl']))} weekly. You keep showing up anyway.", 1, cat="Day-wise"))
        if worst_inst[1] < 0:
            weaknesses.append(_b(f"{worst_inst[0]} hemorrhaging {_fmt(abs(worst_inst[1]))}. The numbers scream stop.", 2, cat="Instruments"))
        if wdte["pnl"] < 0:
            weaknesses.append(_b(f"{wdte['bucket']} lost {_fmt(abs(wdte['pnl']))}. Zero edge in this range.", 3, cat="Expiry & DTE"))
        if pf < 1.0:
            weaknesses.append(_b(f"Profit factor {pf}. Literally burning money.", 0, cat="Core Metrics"))
        if m["worst_trade"]["pnl"] < 0:
            weaknesses.append(_b(f"{_fmt(m['worst_trade']['pnl'])} on {m['worst_trade']['underlying']}. One trade, that much damage.", 5, cat="Core Metrics"))
        if me_pnl < 0:
            weaknesses.append(_b(f"Monthly expiries: {_fmt(me_pnl)}. Just stop.", 3, cat="Expiry & DTE"))
        if we_pnl < 0:
            weaknesses.append(_b(f"Weeklies: {_fmt(we_pnl)}. Theta's eating you alive.", 3, cat="Expiry & DTE"))
        if m["long_pnl"] < 0:
            weaknesses.append(_b(f"Longs at {m['long_win_rate']}% WR, {_fmt(m['long_pnl'])}. Stop buying the dip.", 2, cat="Instruments"))
        if m["short_pnl"] < 0:
            weaknesses.append(_b(f"Shorts: {_fmt(m['short_pnl'])}, {m['short_win_rate']}% WR. You can't time tops.", 2, cat="Instruments"))
        if ml_worst_s and ml_worst_s["total_pnl"] < 0:
            weaknesses.append(_b(f"{ml_worst_s['strategy']} lost {_fmt(abs(ml_worst_s['total_pnl']))}. You're subsidizing the market.", 6, cat="Multi-Leg"))
    else:
        if wr < 50:
            weaknesses.append(_b(f"{wr}% win rate — below breakeven. Need better setups.", 0, cat="Core Metrics"))
        if rr < 1.0:
            weaknesses.append(_b(f"{rr}:1 payoff — losers ({_fmt(m['avg_loser'])}) exceed winners ({_fmt(m['avg_winner'])}). Tighten stops.", 0, cat="Core Metrics"))
        if m["max_drawdown_pct"] > 20:
            weaknesses.append(_b(f"{m['max_drawdown_pct']}% max drawdown ({_fmt(abs(m['max_drawdown']))}) — significant capital risk.", 4, cat="Risk & Drawdown"))
        if m["max_consec_losses"] >= 5:
            weaknesses.append(_b(f"{m['max_consec_losses']} consecutive losses — risk management gap.", None, cat="Risk & Drawdown"))
        if wd["total_pnl"] < 0:
            weaknesses.append(_b(f"{_day(wd['day'])}s losing {_fmt(abs(wd['total_pnl']))}. Reduce exposure or skip this day.", 1, cat="Day-wise"))
        if worst_inst[1] < 0:
            weaknesses.append(_b(f"{worst_inst[0]} losing {_fmt(abs(worst_inst[1]))}. Review or drop this segment.", 2, cat="Instruments"))
        if wdte["pnl"] < 0:
            weaknesses.append(_b(f"{wdte['bucket']} trades losing {_fmt(abs(wdte['pnl']))}. Shift to stronger DTE buckets.", 3, cat="Expiry & DTE"))
        if pf < 1.0:
            weaknesses.append(_b(f"Profit factor {pf} — losing more than you make overall.", 0, cat="Core Metrics"))
        if m["worst_trade"]["pnl"] < 0:
            weaknesses.append(_b(f"Worst trade: {_fmt(m['worst_trade']['pnl'])} on {m['worst_trade']['underlying']} — single-trade risk too high.", 5, cat="Core Metrics"))
        if me_pnl < 0:
            weaknesses.append(_b(f"Monthly expiries losing {_fmt(abs(me_pnl))} ({me_wr}% WR) — avoid or rethink.", 3, cat="Expiry & DTE"))
        if we_pnl < 0:
            weaknesses.append(_b(f"Weekly expiries losing {_fmt(abs(we_pnl))} ({we_wr}% WR) — bleeding capital.", 3, cat="Expiry & DTE"))
        if m["long_pnl"] < 0:
            weaknesses.append(_b(f"Long trades losing {_fmt(abs(m['long_pnl']))} ({m['long_win_rate']}% WR) — long bias hurting you.", 2, cat="Instruments"))
        if m["short_pnl"] < 0:
            weaknesses.append(_b(f"Short trades losing {_fmt(abs(m['short_pnl']))} ({m['short_win_rate']}% WR) — short side is weak.", 2, cat="Instruments"))
        if ml_worst_s and ml_worst_s["total_pnl"] < 0:
            weaknesses.append(_b(f"{ml_worst_s['strategy']}: losing {_fmt(abs(ml_worst_s['total_pnl']))} across {ml_worst_s['count']} trades — drop or fix.", 6, cat="Multi-Leg"))

    # ── Recommendations ───────────────────────────────────────────────────────
    if tone == "roast":
        recommendations.append(_b(f"Kelly: {m['kelly_pct']}% per trade (half: {m['half_kelly_pct']}%). Your current sizing is wrong.", None, cat="Position Sizing"))
        if worst_inst[1] < 0:
            recommendations.append(_b(f"Stop trading {worst_inst[0]} (lost {_fmt(abs(worst_inst[1]))}). Move capital to {best_inst[0]}.", 2, cat="Instruments"))
        if m["long_pnl"] < 0 and m["short_pnl"] > 0:
            recommendations.append(_b(f"Lose {_fmt(abs(m['long_pnl']))} long, make {_fmt(m['short_pnl'])} short. Accept it — go short.", 2, cat="Instruments"))
        elif m["short_pnl"] < 0 and m["long_pnl"] > 0:
            recommendations.append(_b(f"Shorts bleed {_fmt(abs(m['short_pnl']))}. Longs make {_fmt(m['long_pnl'])}. Stop fighting it.", 2, cat="Instruments"))
        if wd["total_pnl"] < 0:
            recommendations.append(_b(f"{_day(wd['day'])}s hemorrhage {_fmt(abs(wd['total_pnl']))}. Stop or halve size. No exceptions.", 1, cat="Day-wise"))
        if wdte["pnl"] < 0:
            recommendations.append(_b(f"Drop {wdte['bucket']}. Shift to {bdte['bucket']} ({bdte['win_rate']}% WR) — your only edge.", 3, cat="Expiry & DTE"))
        if m["monthly_consistency"] < 50:
            recommendations.append(_b(f"{m['green_months']} green months. 2-3 setups per month max. Stop spraying.", 1, cat="Consistency"))
        if ml_worst_s and ml_best_s and ml_worst_s["total_pnl"] < 0 and ml_best_s["total_pnl"] > 0:
            recommendations.append(_b(f"Drop {ml_worst_s['strategy']}. Shift to {ml_best_s['strategy']} ({_fmt(ml_best_s['total_pnl'])}). No debate.", 6, cat="Multi-Leg"))
        if me_pnl < 0 and we_pnl > 0:
            recommendations.append(_b(f"Monthly expiries cost {_fmt(abs(me_pnl))}. Go weekly only.", 3, cat="Expiry & DTE"))
        elif we_pnl < 0 and me_pnl > 0:
            recommendations.append(_b(f"Weeklies hemorrhage {_fmt(abs(we_pnl))}. Stick to monthly expiries.", 3, cat="Expiry & DTE"))
    else:
        recommendations.append(_b(f"Kelly says {m['kelly_pct']}% per trade (half-Kelly: {m['half_kelly_pct']}%). Size accordingly.", None, cat="Position Sizing"))
        if worst_inst[1] < 0:
            recommendations.append(_b(f"Cut {worst_inst[0]} (losing {_fmt(abs(worst_inst[1]))}). Shift capital to {best_inst[0]}.", 2, cat="Instruments"))
        if m["long_pnl"] < 0 and m["short_pnl"] > 0:
            recommendations.append(_b(f"Short edge ({_fmt(m['short_pnl'])}) clear. Cut longs ({_fmt(m['long_pnl'])}), lean into shorts.", 2, cat="Instruments"))
        elif m["short_pnl"] < 0 and m["long_pnl"] > 0:
            recommendations.append(_b(f"Longs make {_fmt(m['long_pnl'])}, shorts lose {_fmt(abs(m['short_pnl']))}. You're a natural long-side trader.", 2, cat="Instruments"))
        if wd["total_pnl"] < 0:
            recommendations.append(_b(f"{_day(wd['day'])}s cost {_fmt(abs(wd['total_pnl']))} — halve position size or skip.", 1, cat="Day-wise"))
        if wdte["pnl"] < 0:
            recommendations.append(_b(f"Shift from {wdte['bucket']} to {bdte['bucket']} ({bdte['win_rate']}% WR) — proven edge.", 3, cat="Expiry & DTE"))
        if m["monthly_consistency"] < 50:
            recommendations.append(_b(f"{m['monthly_consistency']}% monthly consistency — fewer trades, higher conviction.", 1, cat="Consistency"))
        if ml_worst_s and ml_best_s and ml_worst_s["total_pnl"] < 0 and ml_best_s["total_pnl"] > 0:
            recommendations.append(_b(f"Drop {ml_worst_s['strategy']}, shift to {ml_best_s['strategy']} ({_fmt(ml_best_s['total_pnl'])}, {ml_best_s['win_rate']}% WR).", 6, cat="Multi-Leg"))
        if me_pnl < 0 and we_pnl > 0:
            recommendations.append(_b(f"Stop monthly expiries (losing {_fmt(abs(me_pnl))}). Focus on weeklies ({we_wr}% WR).", 3, cat="Expiry & DTE"))
        elif we_pnl < 0 and me_pnl > 0:
            recommendations.append(_b(f"Stop weekly expiries (losing {_fmt(abs(we_pnl))}). Focus on monthlies ({me_wr}% WR).", 3, cat="Expiry & DTE"))

    # Ensure minimums
    if not strengths:
        strengths.append(_b("Positive P&L — basic market participation ability.", 0, cat="Core Metrics"))
    if not weaknesses:
        weaknesses.append(_b("No critical weaknesses — maintain current discipline.", None, cat="Core Metrics"))
    if len(recommendations) < 3:
        recommendations.append(_b(f"Target Sharpe above 1.5 (current: {m['sharpe_ratio']}). Cap drawdowns at 15%.", 4, cat="Risk & Drawdown"))

    summary = _generate_csv_summary(m, tone)

    return {
        "summary": summary,
        "sections": sections,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations,
        "kelly_fraction": m["kelly_fraction"],
        "half_kelly_fraction": m["half_kelly"],
        "kelly_pct": m["kelly_pct"],
        "half_kelly_pct": m["half_kelly_pct"],
        "overall_score": m["overall_score"],
        "metrics": m,
        "source": "rule-based",
    }


# ─── Groq LLM Enhancement ───────────────────────────────────────────────────────

def _normalize_bullets(items):
    normalized = []
    for item in items:
        if isinstance(item, str):
            normalized.append({"text": item, "related_tab": None, "category": None})
        elif isinstance(item, dict):
            normalized.append({
                "text": item.get("text", str(item)),
                "related_tab": item.get("related_tab"),
                "category": item.get("category"),
            })
    return normalized


def _fmt_top5(items):
    return ", ".join(f"{t['underlying']} ({_fmt(t['pnl'])})" for t in items[:5]) if items else "N/A"


def _fmt_dte(buckets):
    return " | ".join(f"{b['bucket']}: {_fmt(b['pnl'])} ({b['trades']}t, {b['win_rate']}% WR)" for b in buckets) if buckets else "N/A"


def enhance_csv_with_groq(metrics: dict, api_key: str, tone: str = "helpful") -> dict | None:
    """Call Groq LLM for hedge-fund-quality section analysis."""
    if tone == "roast":
        tone_instruction = """TONE: You are a ruthless hedge fund portfolio manager reviewing a junior trader's book.
Be savage and specific — every criticism must reference exact numbers from the data. Think of the PM who fires
traders for losing money on specific days. Roast their worst month, their losing instruments, their wrong-direction bias.
Be more cutting than a standard roast. But never be personally abusive or offensive.
Backhanded compliments for things that actually work. Make them feel institutional-level scrutiny."""
    else:
        tone_instruction = """TONE: You are a senior quant portfolio manager at a top hedge fund providing a quarterly review.
Be analytically rigorous and data-driven. Every insight must reference specific numbers. Professional, incisive,
and constructive. Frame weaknesses as high-ROI improvement areas."""

    m = metrics
    bm = m["best_month"]
    wm = m["worst_month"]
    bd = m["best_day"]
    wd = m["worst_day"]

    prompt = f"""You are an elite hedge fund analyst ($2000/hr) reviewing an Indian F&O derivatives trader's performance.

{tone_instruction}

=== TRADER DATA ===

OVERVIEW:
Total P&L: {_fmt(m['total_pnl'])} | {m['total_trades']} trades | Win Rate: {m['win_rate']}%
Profit Factor: {m['profit_factor']} | Expectancy: {_fmt(m['expectancy'])}/trade | Avg P&L/Trade: {_fmt(m['avg_pnl_per_trade'])}
Winners: {m['winners']} (avg {_fmt(m['avg_winner'])}) | Losers: {m['losers']} (avg {_fmt(m['avg_loser'])})
Payoff Ratio: {m['rr_ratio']}:1 | Kelly: {m['kelly_pct']}% (Half: {m['half_kelly_pct']}%)
Best Trade: {_fmt(m['best_trade']['pnl'])} ({m['best_trade']['underlying']}) | Worst: {_fmt(m['worst_trade']['pnl'])} ({m['worst_trade']['underlying']})

MONTHLY:
Best: {bm['month']} ({_fmt(bm['pnl'])}, {bm['pnl_pct']}% return, {bm['win_rate']}% WR, {bm['trades']} trades)
Worst: {wm['month']} ({_fmt(wm['pnl'])}, {wm['pnl_pct']}% return, {wm['win_rate']}% WR, {wm['trades']} trades)
Green Months: {m['green_months']}/{m['green_months'] + m['red_months']} ({m['monthly_consistency']}% consistency)

DAY OF WEEK:
Best: {bd['day']} ({_fmt(bd['total_pnl'])} total, {_fmt(bd['avg_pnl'])} avg, {bd['win_rate']}% WR)
Worst: {wd['day']} ({_fmt(wd['total_pnl'])} total, {_fmt(wd['avg_pnl'])} avg, {wd['win_rate']}% WR)
Busiest: {m['busiest_day']['day']} ({m['busiest_day']['count']} trades) | Quietest: {m['quietest_day']['day']} ({m['quietest_day']['count']} trades)

INSTRUMENTS:
Long: {_fmt(m['long_pnl'])} ({m['long_trades']} trades, {m['long_win_rate']}% WR)
Short: {_fmt(m['short_pnl'])} ({m['short_trades']} trades, {m['short_win_rate']}% WR)
Futures: {_fmt(m['futures_pnl'])} ({m['futures_count']}) | CE: {_fmt(m['ce_pnl'])} ({m['ce_count']}) | PE: {_fmt(m['pe_pnl'])} ({m['pe_count']})
Index: {_fmt(m['index_pnl'])} ({m['index_count']}) | Stocks: {_fmt(m['stock_pnl'])} ({m['stock_count']})
Top Winners: {_fmt_top5(m['top5_winners'])}
Top Losers: {_fmt_top5(m['top5_losers'])}

EXPIRY:
Monthly: {_fmt(m['monthly_expiry']['pnl'])} ({m['monthly_expiry']['trades']} trades, {m['monthly_expiry']['win_rate']}% WR)
Weekly: {_fmt(m['weekly_expiry']['pnl'])} ({m['weekly_expiry']['trades']} trades, {m['weekly_expiry']['win_rate']}% WR)
DTE: {_fmt_dte(m['dte_buckets'])}

RISK:
Sharpe: {m['sharpe_ratio']} | Max DD: {_fmt(abs(m['max_drawdown']))} ({m['max_drawdown_pct']}%)
Recovery Factor: {m['recovery_factor']} | Max Consec: {m['max_consec_wins']} wins, {m['max_consec_losses']} losses
Grade: {m['overall_score']}

MULTI-LEG STRATEGIES:
Total: {m.get('ml_total', 0)} trades | P&L: {_fmt(m.get('ml_total_pnl', 0))} | Win Rate: {m.get('ml_win_rate', 0)}% | Avg: {_fmt(m.get('ml_avg_pnl', 0))}
By Strategy: {', '.join(f"{s['strategy']}: {_fmt(s['total_pnl'])} ({s['count']}t, {s['win_rate']}% WR)" for s in m.get('ml_by_strategy', [])[:5]) or 'None'}
Best: {m.get('ml_best', {}).get('strategy', 'N/A')} ({_fmt(m.get('ml_best', {}).get('pnl', 0))})
Worst: {m.get('ml_worst', {}).get('strategy', 'N/A')} ({_fmt(m.get('ml_worst', {}).get('pnl', 0))})

=== OUTPUT ===

Return JSON:
{{"summary":"2-3 sentence hedge-fund-quality executive assessment","sections":[{{"id":"win-rate","title":"Win Rate & Payoff Analysis","related_tab":0,"insight":"2-3 sentences"}},{{"id":"monthly-performance","title":"Monthly Performance","related_tab":1,"insight":"2-3 sentences"}},{{"id":"day-of-week-pnl","title":"P&L by Day of Week","related_tab":1,"insight":"2-3 sentences"}},{{"id":"trade-frequency","title":"Trade Frequency","related_tab":1,"insight":"2-3 sentences"}},{{"id":"instruments-direction","title":"Instruments & Direction","related_tab":2,"insight":"2-3 sentences"}},{{"id":"expiry-type","title":"Monthly vs Weekly Expiry","related_tab":3,"insight":"2-3 sentences"}},{{"id":"dte-analysis","title":"Days to Expiry Analysis","related_tab":3,"insight":"2-3 sentences"}},{{"id":"multi-leg","title":"Multi-Leg Strategies","related_tab":6,"insight":"2-3 sentences (skip if no multi-leg trades)"}}],"strengths":[{{"text":"bullet","related_tab":n}},...],"weaknesses":[same format],"recommendations":[same format] }}

related_tab: 0=Overview, 1=P&L Analysis, 2=Instruments, 3=Expiry, 4=Risk, 5=Trade Log, 6=Multi-Leg Trades, null=general.
7-10 bullets per category. Each bullet: 1 sentence, under 20 words, must include a specific number (Rs amount or %). Punchy and direct — no filler words.
Cover these topics: win rate, payoff, Sharpe, profit factor, best/worst day (use full names like Monday), monthly/weekly expiry comparison, DTE buckets, long vs short, best/worst instrument, multi-leg strategies, drawdown, consecutive losses, Kelly sizing, monthly consistency."""

    body = json.dumps({
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are an elite derivatives trading analyst at a top-tier hedge fund. Always respond with valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.65 if tone == "roast" else 0.5,
        "max_tokens": 4000,
        "response_format": {"type": "json_object"},
    }).encode("utf-8")

    req = urllib.request.Request(
        GROQ_API_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "TradeNexus/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            for key in ("strengths", "weaknesses", "recommendations"):
                if key in parsed and isinstance(parsed[key], list):
                    parsed[key] = _normalize_bullets(parsed[key])
            return parsed
    except Exception:
        return None


# ─── HTTP Handler ───────────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            payload = json.loads(body)
        except Exception:
            self._respond(400, {"error": "Invalid JSON body"})
            return

        report = payload.get("report", payload)
        tone = payload.get("tone", "helpful")
        if tone not in ("helpful", "roast"):
            tone = "helpful"

        # Compute metrics
        metrics = compute_csv_metrics(report)

        # Generate fallback advice
        advice = generate_csv_fallback_advice(metrics, tone)

        # Try Groq enhancement
        api_key = os.environ.get("GROQ_API_KEY", "")
        if api_key:
            groq_result = enhance_csv_with_groq(metrics, api_key, tone)
            if groq_result:
                # Merge section insights
                if "sections" in groq_result and isinstance(groq_result["sections"], list):
                    groq_sections = {s["id"]: s for s in groq_result["sections"] if isinstance(s, dict) and "id" in s}
                    for section in advice["sections"]:
                        if section["id"] in groq_sections:
                            gs = groq_sections[section["id"]]
                            if "insight" in gs:
                                section["insight"] = gs["insight"]
                # Merge Groq bullets (better writing quality)
                for key in ("strengths", "weaknesses", "recommendations"):
                    if key in groq_result and isinstance(groq_result[key], list) and groq_result[key]:
                        advice[key] = groq_result[key]
                if "summary" in groq_result:
                    advice["summary"] = groq_result["summary"]
                advice["source"] = "groq-enhanced"

        # Auto-classify bullets that don't have a category
        for key in ("strengths", "weaknesses", "recommendations"):
            for bullet in advice.get(key, []):
                if not bullet.get("category"):
                    bullet["category"] = _classify_bullet(bullet.get("text", ""))

        self._respond(200, advice)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _respond(self, status: int, data: dict):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
