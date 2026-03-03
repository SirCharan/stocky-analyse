# Trade Nexus

Premium F&O P&L analytics dashboard for Zerodha trading reports. Upload your `.xlsx` P&L report and get deep insights across 5 analytical dimensions.

## Features

- **Overview** — Net P&L, win rate, P&L distribution histograms, symbol-wise breakdown
- **Performance Attribution** — Top contributors/detractors, P&L waterfall, Pareto analysis, concentration risk
- **Instrument Breakdown** — Futures vs Options, Calls vs Puts, Index vs Stock, capital-return scatter
- **Charges & Costs** — Charge breakdown donut, gross vs net P&L, detailed charges table, other debits/credits
- **Open Portfolio** — Unrealized P&L by position, portfolio concentration, full open positions table

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| Backend | Python (Vercel Serverless Functions) |
| Excel Parsing | openpyxl |
| Deployment | Vercel |

## Quick Start

### Vercel (Production)

The app is deployed on Vercel. Just visit the URL and upload your Zerodha F&O P&L `.xlsx` file.

### Local Development

```bash
# Install frontend dependencies
npm install

# Start dev server
npm run dev

# The app runs at http://localhost:5173
```

For the API to work locally, you need the Vercel CLI:

```bash
npm i -g vercel
vercel dev
```

### Docker (Self-hosted)

```bash
docker-compose up --build
# Frontend: http://localhost
# Backend API: http://localhost:8000
```

## API

### `POST /api/upload`

Upload a Zerodha F&O P&L `.xlsx` file and receive the full analytics JSON.

**Request:** `multipart/form-data` with a `file` field containing the `.xlsx` file.

**Response:** JSON containing `metadata`, `overview`, `performance`, `instruments`, `charges`, and `open_portfolio` objects with all computed metrics.

## Supported Excel Format

- Zerodha F&O P&L report (`.xlsx`)
- Must contain "F&O" and "Other Debits and Credits" sheets
- Supports both monthly and weekly option symbol formats

## Project Structure

```
trade-nexus/
├── api/upload.py              # Vercel serverless function (Python)
├── src/
│   ├── components/            # Shared UI components
│   ├── pages/                 # 5 dashboard tab pages
│   ├── context/               # React context for global state
│   ├── lib/                   # API client + utilities
│   └── types/                 # TypeScript interfaces
├── public/                    # Static assets
├── vercel.json                # Vercel routing config
└── docker-compose.yml         # Docker alternative
```

## License

MIT
