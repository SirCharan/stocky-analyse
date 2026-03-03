"""
Vercel Serverless Function: POST /api/advice
Receives the full report JSON, computes rule-based trading metrics,
then calls Groq LLM for polished mentor-quality advice.
Falls back to rule-based text if Groq is unavailable.
"""
import json
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


# ─── Rule-Based Metrics Engine ──────────────────────────────────────────────────

def compute_trading_metrics(report: dict) -> dict:
    """Compute all rule-based trading principle metrics from the report."""
    ov = report.get("overview", {})
    perf = report.get("performance", {})
    inst = report.get("instruments", {})
    ch = report.get("charges", {})
    op = report.get("open_portfolio", {})

    win_rate = ov.get("win_rate", 0) / 100  # as fraction
    avg_winner = abs(ov.get("avg_winner", 0))
    avg_loser = abs(ov.get("avg_loser", 0))
    realized_pnl = ov.get("net_realized_pnl", 0)
    total_charges = ov.get("total_charges", 0)
    symbols_traded = ov.get("symbols_traded", 0)
    winners = ov.get("winners", 0)
    losers = ov.get("losers", 0)
    total_buy = ov.get("total_buy_value", 0)
    total_sell = ov.get("total_sell_value", 0)
    win_loss_ratio = ov.get("win_loss_ratio", 0)

    # Kelly Criterion
    rr_ratio = (avg_winner / avg_loser) if avg_loser > 0 else 0
    kelly = (win_rate - (1 - win_rate) / rr_ratio) if rr_ratio > 0 else 0
    kelly = max(0, min(kelly, 1))  # clamp 0-1
    half_kelly = kelly / 2

    # Charges analysis
    charges_pct = ch.get("charges_pct_pnl", 0)
    overtrading = charges_pct > 10

    # Concentration risk
    top3_impact = perf.get("top_winners_impact", 0)
    top3_pct = perf.get("top_winners_pct", 0)
    top3_names = perf.get("top_winners_names", "")
    concentration_pct = perf.get("concentration_pct", 0)

    # Pareto
    pareto = perf.get("pareto", [])
    pareto_80_idx = perf.get("pareto_80_index", 0)
    total_winning_underlyings = len(pareto)
    pareto_pct = ((pareto_80_idx + 1) / total_winning_underlyings * 100) if total_winning_underlyings > 0 else 0

    # Instrument edge
    futures_pnl = inst.get("futures_pnl", 0)
    options_pnl = inst.get("options_pnl", 0)
    calls_pnl = inst.get("calls_pnl", 0)
    puts_pnl = inst.get("puts_pnl", 0)
    futures_count = inst.get("futures_count", 0)
    options_count = inst.get("options_count", 0)
    calls_count = inst.get("calls_count", 0)
    puts_count = inst.get("puts_count", 0)

    calls_wr = 0
    puts_wr = 0
    # Estimate from pnl_by_underlying isn't precise, use overall splits
    if calls_count > 0 and puts_count > 0:
        # approximate from overall data
        calls_wr = (calls_pnl / abs(calls_pnl + 1)) * 50 + 50 if calls_pnl != 0 else 50
        puts_wr = (puts_pnl / abs(puts_pnl + 1)) * 50 + 50 if puts_pnl != 0 else 50

    # Win/loss asymmetry
    asymmetry = perf.get("win_loss_asymmetry", 0)

    # Open portfolio concentration
    open_concentration = op.get("concentration", [])
    top_open = open_concentration[0] if open_concentration else {"underlying": "N/A", "pct": 0}

    # Overall score
    score = compute_score(win_rate * 100, rr_ratio, charges_pct, concentration_pct, asymmetry)

    return {
        "kelly_fraction": round(kelly, 4),
        "half_kelly": round(half_kelly, 4),
        "kelly_pct": round(kelly * 100, 1),
        "half_kelly_pct": round(half_kelly * 100, 1),
        "rr_ratio": round(rr_ratio, 2),
        "win_rate": round(win_rate * 100, 1),
        "charges_pct": round(charges_pct, 1),
        "overtrading": overtrading,
        "symbols_traded": symbols_traded,
        "winners": winners,
        "losers": losers,
        "avg_winner": round(avg_winner),
        "avg_loser": round(avg_loser),
        "win_loss_ratio": round(win_loss_ratio, 2),
        "realized_pnl": round(realized_pnl),
        "total_charges": round(total_charges),
        "net_after_charges": round(ov.get("net_after_charges", 0)),
        "top3_winners": top3_names,
        "top3_impact": round(top3_impact),
        "top3_pct": round(top3_pct, 1),
        "concentration_pct": round(concentration_pct, 1),
        "pareto_pct": round(pareto_pct, 1),
        "pareto_80_count": pareto_80_idx + 1,
        "total_winning_underlyings": total_winning_underlyings,
        "futures_pnl": round(futures_pnl),
        "options_pnl": round(options_pnl),
        "calls_pnl": round(calls_pnl),
        "puts_pnl": round(puts_pnl),
        "futures_count": futures_count,
        "options_count": options_count,
        "asymmetry": round(asymmetry, 2),
        "top_open_underlying": top_open.get("underlying", "N/A"),
        "top_open_pct": top_open.get("pct", 0),
        "open_count": op.get("open_positions_count", 0),
        "total_unrealized": round(op.get("total_unrealized_pnl", 0)),
        "overall_score": score,
    }


def compute_score(win_rate, rr_ratio, charges_pct, concentration_pct, asymmetry):
    """Grade the trader A+ to D based on key metrics."""
    score = 0
    # Win rate (0-25 pts)
    if win_rate >= 65: score += 25
    elif win_rate >= 55: score += 20
    elif win_rate >= 45: score += 15
    else: score += 5

    # Risk-reward ratio (0-25 pts)
    if rr_ratio >= 2.0: score += 25
    elif rr_ratio >= 1.5: score += 20
    elif rr_ratio >= 1.0: score += 15
    else: score += 5

    # Charges discipline (0-25 pts)
    if charges_pct <= 5: score += 25
    elif charges_pct <= 10: score += 20
    elif charges_pct <= 15: score += 15
    else: score += 5

    # Asymmetry / edge (0-25 pts)
    if asymmetry >= 2.0: score += 25
    elif asymmetry >= 1.5: score += 20
    elif asymmetry >= 1.0: score += 15
    else: score += 5

    if score >= 90: return "A+"
    if score >= 80: return "A"
    if score >= 70: return "B+"
    if score >= 60: return "B"
    if score >= 50: return "C+"
    if score >= 40: return "C"
    return "D"


# ─── Helpers ─────────────────────────────────────────────────────────────────────

def _b(text, tab=None):
    """Create a structured bullet with optional related_tab."""
    return {"text": text, "related_tab": tab}


def _generate_summary(metrics, tone="helpful"):
    """Generate an executive summary paragraph."""
    wr = metrics["win_rate"]
    rr = metrics["rr_ratio"]
    pnl = metrics["realized_pnl"]
    score = metrics["overall_score"]
    direction = "profitable" if pnl > 0 else "loss-making"

    if tone == "roast":
        if pnl > 0:
            summary = f"Alright, your portfolio is Rs {pnl:,.0f} in the green across {metrics['symbols_traded']} instruments — so you haven't completely set your money on fire. "
        else:
            summary = f"Your portfolio is Rs {abs(pnl):,.0f} in the red across {metrics['symbols_traded']} instruments — the market thanks you for your generous donation. "
        summary += f"Win rate sits at {wr}% with a {rr}:1 risk-reward ratio, "
        if score in ("A+", "A"):
            summary += f"earning you a {score} grade. Fine, I'll admit — that's actually impressive. Don't let it go to your head."
        elif score in ("B+", "B"):
            summary += f"landing you a {score}. Not terrible, not great. You're the participation trophy of trading."
        else:
            summary += f"scraping together a {score} grade. We have some serious work to do here."
    else:
        summary = f"Your trading has been {direction} with a net P&L of Rs {pnl:,.0f} across {metrics['symbols_traded']} instruments. "
        summary += f"With a {wr}% win rate and {rr}:1 risk-reward ratio, your overall grade is {score}. "
        if score in ("A+", "A"):
            summary += "This reflects strong trading discipline and a genuine statistical edge."
        elif score in ("B+", "B"):
            summary += "There's a solid foundation here with clear areas for improvement."
        else:
            summary += "Focused improvements in key areas can significantly elevate your trading performance."

    return summary


# ─── Fallback Rule-Based Advice ─────────────────────────────────────────────────

def generate_fallback_advice(metrics: dict, tone: str = "helpful") -> dict:
    """Generate structured advice using pure rule-based logic (no LLM)."""
    strengths = []
    weaknesses = []
    recommendations = []

    wr = metrics["win_rate"]
    rr = metrics["rr_ratio"]
    kelly_pct = metrics["kelly_pct"]
    charges_pct = metrics["charges_pct"]

    if tone == "roast":
        # ── Roast Strengths ──
        if wr >= 60:
            strengths.append(_b(f"Win rate of {wr}% — congratulations, you can pick winners more than half the time. Want a medal?", 0))
        if rr >= 1.5:
            strengths.append(_b(f"Risk-reward of {rr}:1 — your winners actually outsize your losers. I'm genuinely shocked.", None))
        if metrics["options_pnl"] > 0:
            strengths.append(_b(f"Options trading made Rs {abs(metrics['options_pnl']):,.0f}. At least ONE segment isn't bleeding money.", 2))
        if metrics["puts_pnl"] > metrics["calls_pnl"] and metrics["puts_pnl"] > 0:
            strengths.append(_b(f"Put strategies at Rs {metrics['puts_pnl']:,.0f} are carrying your entire portfolio. Maybe just stick to puts?", 2))
        if metrics["top3_pct"] > 30:
            strengths.append(_b(f"Top 3 underlyings ({metrics['top3_winners']}) drive {metrics['top3_pct']}% of profits. The rest of your trades? Tourist activity.", 1))
        if kelly_pct > 10:
            strengths.append(_b(f"Kelly Criterion at {kelly_pct}% says you have a real edge. Don't waste it with your other habits.", None))

        # ── Roast Weaknesses ──
        if wr < 50:
            weaknesses.append(_b(f"Win rate of {wr}%. You'd literally do better flipping a coin. Let that sink in.", 0))
        if rr < 1.0:
            weaknesses.append(_b(f"Average loser (Rs {metrics['avg_loser']:,.0f}) eats your average winner (Rs {metrics['avg_winner']:,.0f}) for breakfast. You're running a charity for the market.", 0))
        if charges_pct > 10:
            weaknesses.append(_b(f"Charges eating {charges_pct}% of profits. Your broker sends you a thank-you card every month, doesn't he?", 3))
        if metrics["futures_pnl"] < 0:
            weaknesses.append(_b(f"Futures P&L is Rs {metrics['futures_pnl']:,.0f}. The market is literally taking your lunch money on directional bets.", 2))
        if metrics["symbols_traded"] > 200:
            weaknesses.append(_b(f"You traded {metrics['symbols_traded']} instruments. That's not diversification, that's ADHD with a trading terminal.", 1))
        if metrics["concentration_pct"] > 60:
            weaknesses.append(_b(f"Top 5 underlyings = {metrics['concentration_pct']}% of P&L. One bad week in those names and you're toast.", 1))

        # ── Roast Recommendations ──
        if charges_pct > 10:
            recommendations.append(_b(f"Stop overtrading. Seriously. Cutting frequency by 30-40% saves Rs {int(metrics['total_charges'] * 0.3):,}. That's free money you're handing to your broker.", 3))
        if rr < 1.5:
            recommendations.append(_b(f"Your {rr}:1 risk-reward is embarrassing. Set stop losses that give you at least 2:1. Cut losers at Rs {int(metrics['avg_winner'] / 2):,} max.", None))
        recommendations.append(_b(f"Kelly says risk {kelly_pct}% per trade (half-Kelly: {metrics['half_kelly_pct']}%). Whatever you're doing now is probably wrong — use this instead.", None))
        if metrics["symbols_traded"] > 150:
            recommendations.append(_b(f"Your top {metrics['pareto_80_count']} underlyings make 80% of profits. Drop the other {metrics['symbols_traded'] - metrics['pareto_80_count']} instruments — they're dead weight.", 1))
        if metrics["top_open_pct"] > 50:
            recommendations.append(_b(f"Open portfolio is {metrics['top_open_pct']}% in {metrics['top_open_underlying']}. That's not conviction, that's gambling. Diversify.", 4))
        if metrics["futures_pnl"] < 0 and metrics["options_pnl"] > 0:
            recommendations.append(_b(f"You lose Rs {abs(metrics['futures_pnl']):,.0f} in futures but make Rs {metrics['options_pnl']:,.0f} in options. Read the room — shift your capital.", 2))
    else:
        # ── Helpful Strengths ──
        if wr >= 60:
            strengths.append(_b(f"Strong win rate of {wr}% — you're picking more winners than losers consistently.", 0))
        if rr >= 1.5:
            strengths.append(_b(f"Excellent risk-reward ratio of {rr}:1 — your winners are significantly larger than losers.", None))
        if metrics["options_pnl"] > 0:
            strengths.append(_b(f"Options trading is profitable at Rs {abs(metrics['options_pnl']):,.0f} across {metrics['options_count']} trades.", 2))
        if metrics["puts_pnl"] > metrics["calls_pnl"] and metrics["puts_pnl"] > 0:
            strengths.append(_b(f"Put strategies are your strongest edge (Rs {metrics['puts_pnl']:,.0f} P&L) — a clear competitive advantage.", 2))
        if metrics["top3_pct"] > 30:
            strengths.append(_b(f"Your top 3 underlyings ({metrics['top3_winners']}) drive {metrics['top3_pct']}% of profits — strong conviction trading.", 1))
        if kelly_pct > 10:
            strengths.append(_b(f"Positive Kelly Criterion ({kelly_pct}%) confirms you have a genuine statistical edge in the market.", None))

        # ── Helpful Weaknesses ──
        if wr < 50:
            weaknesses.append(_b(f"Win rate of {wr}% means you're losing more trades than winning. Focus on higher-probability setups.", 0))
        if rr < 1.0:
            weaknesses.append(_b(f"Average loser (Rs {metrics['avg_loser']:,.0f}) exceeds average winner (Rs {metrics['avg_winner']:,.0f}). You're letting losses run and cutting winners short.", 0))
        if charges_pct > 10:
            weaknesses.append(_b(f"Charges consuming {charges_pct}% of profits — classic overtrading signal. Brokerage and taxes are eroding your edge.", 3))
        if metrics["futures_pnl"] < 0:
            weaknesses.append(_b(f"Futures trading is loss-making (Rs {metrics['futures_pnl']:,.0f}). Consider reducing futures exposure or improving your directional calls.", 2))
        if metrics["symbols_traded"] > 200:
            weaknesses.append(_b(f"Traded {metrics['symbols_traded']} instruments — diffusion of focus. Pareto principle suggests most profits come from few underlyings.", 1))
        if metrics["concentration_pct"] > 60:
            weaknesses.append(_b(f"Top 5 underlyings account for {metrics['concentration_pct']}% of absolute P&L — high concentration risk.", 1))

        # ── Helpful Recommendations ──
        if charges_pct > 10:
            recommendations.append(_b(f"Reduce trade frequency by 30-40%. Focus on A+ setups only. This alone could save Rs {int(metrics['total_charges'] * 0.3):,} in charges.", 3))
        if rr < 1.5:
            recommendations.append(_b(f"Tighten stop losses to achieve minimum 1:2 risk-reward. Current ratio is {rr}:1 — target 2:1 by cutting losers at -Rs {int(metrics['avg_winner'] / 2):,}.", None))
        recommendations.append(_b(f"Kelly Criterion suggests risking up to {kelly_pct}% of capital per trade. Conservative (half-Kelly): {metrics['half_kelly_pct']}%. Compare against your actual position sizing.", None))
        if metrics["symbols_traded"] > 150:
            recommendations.append(_b(f"Apply Pareto ruthlessly: your top {metrics['pareto_80_count']} underlyings generate 80%+ of profits. Consider dropping the bottom 80% of instruments.", 1))
        if metrics["top_open_pct"] > 50:
            recommendations.append(_b(f"Open portfolio is {metrics['top_open_pct']}% concentrated in {metrics['top_open_underlying']}. Diversify to reduce single-underlying risk.", 4))
        if metrics["futures_pnl"] < 0 and metrics["options_pnl"] > 0:
            recommendations.append(_b(f"Shift capital from futures (loss Rs {abs(metrics['futures_pnl']):,.0f}) to options (profit Rs {metrics['options_pnl']:,.0f}) where your edge is proven.", 2))

    pareto_insight = f"Top {metrics['pareto_pct']:.0f}% of winning underlyings generated 80% of profits — {'textbook 80/20' if 15 <= metrics['pareto_pct'] <= 30 else 'concentrated edge'}."
    summary = _generate_summary(metrics, tone)

    return {
        "summary": summary,
        "strengths": strengths or [_b("Positive overall P&L shows market participation skills.")],
        "weaknesses": weaknesses or [_b("No critical weaknesses detected — maintain current discipline.")],
        "recommendations": recommendations,
        "kelly_fraction": metrics["kelly_fraction"],
        "half_kelly_fraction": metrics["half_kelly"],
        "kelly_pct": metrics["kelly_pct"],
        "half_kelly_pct": metrics["half_kelly_pct"],
        "pareto_insight": pareto_insight,
        "overall_score": metrics["overall_score"],
        "metrics": metrics,
        "source": "rule-based",
    }


# ─── Groq LLM Enhancement ───────────────────────────────────────────────────────

def _normalize_bullets(items):
    """Normalize Groq response items: convert plain strings to {text, related_tab} objects."""
    normalized = []
    for item in items:
        if isinstance(item, str):
            normalized.append({"text": item, "related_tab": None})
        elif isinstance(item, dict):
            normalized.append({
                "text": item.get("text", str(item)),
                "related_tab": item.get("related_tab"),
            })
    return normalized


def enhance_with_groq(metrics: dict, api_key: str, tone: str = "helpful") -> dict | None:
    """Call Groq LLM to generate polished, mentor-quality advice."""
    if tone == "roast":
        tone_instruction = """TONE: You are Gordon Ramsay reviewing this trader's performance. Be brutally honest, witty, and savage.
Roast their mistakes with sharp humor but stay data-driven and factual. Never be abusive or personal.
Think "IT'S RAW!" energy applied to trading mistakes. Every bullet should sting but teach.
Celebrate genuine strengths begrudgingly — like you're annoyed they did something right."""
    else:
        tone_instruction = """TONE: You are an encouraging but direct mentor. Be supportive while being honest about weaknesses.
Celebrate genuine strengths and frame improvements constructively. Professional and warm."""

    prompt = f"""You are an elite $500/hr trading mentor analyzing an Indian F&O trader's report.

{tone_instruction}

METRICS:
Win Rate: {metrics['win_rate']}% ({metrics['winners']} wins, {metrics['losers']} losses, {metrics['symbols_traded']} trades)
Avg Winner: Rs {metrics['avg_winner']}, Avg Loser: Rs {metrics['avg_loser']}
Risk-Reward: {metrics['rr_ratio']}:1, Kelly: {metrics['kelly_pct']}% (half-Kelly: {metrics['half_kelly_pct']}%)
Net P&L: Rs {metrics['realized_pnl']}, Charges: Rs {metrics['total_charges']} ({metrics['charges_pct']}% of P&L)
Futures: Rs {metrics['futures_pnl']} ({metrics['futures_count']} trades), Options: Rs {metrics['options_pnl']} ({metrics['options_count']} trades)
Puts: Rs {metrics['puts_pnl']}, Calls: Rs {metrics['calls_pnl']}
Top 3: {metrics['top3_winners']} = {metrics['top3_pct']}% of profits
Asymmetry: {metrics['asymmetry']}x
Pareto: Top {metrics['pareto_80_count']} of {metrics['total_winning_underlyings']} winning underlyings = 80% of profits
Concentration: Top 5 = {metrics['concentration_pct']}% of absolute P&L
Open: {metrics['open_count']} positions, {metrics['top_open_underlying']} at {metrics['top_open_pct']}%
Grade: {metrics['overall_score']}

Return JSON with this exact structure:
{{"summary":"2-3 sentence executive overview of trader performance","strengths":[{{"text":"bullet text","related_tab":tab_or_null}},...],"weaknesses":[{{"text":"bullet text","related_tab":tab_or_null}},...],"recommendations":[{{"text":"bullet text","related_tab":tab_or_null}},...] }}

For related_tab use: 0=Overview, 1=Performance, 2=Instruments, 3=Charges, 4=Portfolio, null=general.
Return 5-6 specific bullets per category with exact numbers. Use Rs for currency.
Reference Kelly Criterion, Pareto 80/20, 1% Risk Rule, Risk-Reward ratio. Be direct, specific numbers in every bullet. Each bullet 1-2 sentences max."""

    body = json.dumps({
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are an elite trading analyst. Always respond with valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.6 if tone == "roast" else 0.5,
        "max_tokens": 2500,
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
            # Normalize bullets in case Groq returns plain strings
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

        # Support both old format (raw report) and new format ({report, tone})
        if "metadata" in payload:
            report = payload
            tone = "helpful"
        else:
            report = payload.get("report", payload)
            tone = payload.get("tone", "helpful")

        if tone not in ("helpful", "roast"):
            tone = "helpful"

        # Compute rule-based metrics
        metrics = compute_trading_metrics(report)

        # Generate fallback advice
        advice = generate_fallback_advice(metrics, tone)

        # Try Groq enhancement
        api_key = os.environ.get("GROQ_API_KEY", "")
        if api_key:
            groq_result = enhance_with_groq(metrics, api_key, tone)
            if groq_result:
                advice["strengths"] = groq_result.get("strengths", advice["strengths"])
                advice["weaknesses"] = groq_result.get("weaknesses", advice["weaknesses"])
                advice["recommendations"] = groq_result.get("recommendations", advice["recommendations"])
                if "summary" in groq_result:
                    advice["summary"] = groq_result["summary"]
                advice["source"] = "groq-enhanced"

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
