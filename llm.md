# Trade Nexus - LLM Context

## What is this project?

Trade Nexus is a web application that analyzes Zerodha F&O (Futures & Options) P&L reports. Users upload an Excel (.xlsx) file exported from Zerodha's console, and the app parses it to display a comprehensive 5-tab analytics dashboard.

## Architecture

- **Frontend**: React 18 + TypeScript single-page app built with Vite. Uses TailwindCSS for styling with a dark cyber-finance theme. Charts rendered with Recharts, tables with TanStack Table v8.
- **Backend**: A single Python serverless function (`api/upload.py`) deployed on Vercel. It receives the Excel file via multipart POST, parses it with openpyxl, computes all analytics, and returns a JSON response. No database — everything is computed on-the-fly and stored in the browser.
- **State Management**: React Context + useReducer. Two pieces of global state: the report data (JSON from API) and the active tab index.

## Key Files

- `api/upload.py` — Python serverless function. Contains Excel parsing logic, symbol parsing helpers (get_underlying, get_instrument_type), and analytics computation for all 5 tabs.
- `src/App.tsx` — Root component with sidebar, header, and lazy-loaded tab content.
- `src/pages/Overview.tsx` — Overview dashboard tab.
- `src/pages/PerformanceAttribution.tsx` — Performance attribution analytics.
- `src/pages/InstrumentBreakdown.tsx` — Instrument type analysis.
- `src/pages/ChargesCosts.tsx` — Charges and costs breakdown.
- `src/pages/OpenPortfolio.tsx` — Open positions analysis.
- `src/types/report.ts` — TypeScript interfaces matching the API response.
- `src/lib/utils.ts` — Currency formatting (Indian ₹L/Cr notation), P&L coloring.

## Excel Format

Zerodha F&O P&L reports have two sheets:
1. **F&O** — Summary section (charges, realized/unrealized P&L) in rows 15-18, individual charge breakdown in rows 24-33, position data starting at row 38 (header) with columns: Symbol, ISIN, Quantity, Buy Value, Sell Value, Realized P&L, etc.
2. **Other Debits and Credits** — Miscellaneous entries like brokerage reversals.

Symbol parsing handles both monthly (`NIFTY25JUN24000CE`) and weekly (`NIFTY2560524550CE`) Zerodha option formats using regex `r'^([A-Z&]+?)\d{2}'`.

## How to modify

- To add a new metric: Add it to the `compute_analytics()` function in `api/upload.py`, add the TypeScript type in `src/types/report.ts`, and display it in the relevant page component.
- To change styling: Edit `src/index.css` for the design system or use Tailwind utilities in components.
- To support a different broker: Create a new parser function in `api/upload.py` alongside `parse_excel()`.
