# Performance Engine

## Outputs

- `PerformanceSummary` — ROI, monthly profits, best/worst day, win rate, active days
- Equity series from `PortfolioSnapshot` (fallback: profit distributions)
- Monthly / yearly aggregates
- Platform analytics — win/loss rate, best/worst trade, total PnL

## Portfolio (`GET /portfolio`)

Current balance, daily/weekly/monthly profit, total ROI, portfolio value.

## Snapshots

`performanceService.snapshotAllForDate(date)` writes per-user `PortfolioSnapshot` rows used by charts.

## Wallet summary integration

`GET /wallet/summary` pulls live performance extras (today, performance, chart, recentTrades).
