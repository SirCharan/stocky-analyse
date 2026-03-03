# Trade Nexus — Project Summary

## Overview

Trade Nexus is a premium F&O P&L analytics dashboard that transforms Zerodha trading reports into actionable insights. It provides deep analysis across five dimensions: overview metrics, performance attribution, instrument breakdown, charges analysis, and open portfolio tracking.

## Problem

Zerodha's P&L reports are raw Excel files with hundreds of rows of trade data. Traders need a way to quickly understand their trading performance, identify winners and losers, analyze charge impact, and monitor open positions — all in one place.

## Solution

A web-based dashboard that:
1. Accepts a Zerodha F&O P&L Excel upload
2. Parses and computes 50+ analytics metrics server-side
3. Renders an interactive, dark-themed dashboard with charts and tables
4. Works entirely in-browser after upload (no data stored on servers)

## Key Metrics Computed

- Net Realized/Unrealized P&L, Win Rate, Average Winner/Loser
- Performance attribution by underlying (Top 5 contributors/detractors)
- P&L waterfall and Pareto analysis
- Instrument breakdown (Futures vs Options, Calls vs Puts, Index vs Stock)
- Total charges breakdown with percentage of P&L and turnover
- Open portfolio concentration and unrealized P&L

## Technical Highlights

- Serverless Python backend — no infrastructure to maintain
- Client-side state management — data stays in the browser
- Lazy-loaded dashboard tabs for fast initial load
- Responsive design with mobile sidebar
- Support for both monthly and weekly Zerodha option symbol formats
- Indian currency formatting (₹L/Cr notation)
