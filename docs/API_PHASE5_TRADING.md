# API Documentation — Phase 5 (Trading Engine)

Base: `http://localhost:4000/api/v1`

---

## Investor

| Method | Path | Permission |
|--------|------|------------|
| GET | `/trades` | `trades.view` |
| GET | `/trades/:id` | `trades.view` |
| GET | `/trades/pairs` | `trades.view` |
| GET | `/trades/stats` | `trades.view` |
| GET | `/trades/public` | public |
| GET | `/performance/summary` | `performance.view` |
| GET | `/performance/series?range=` | `performance.view` |
| GET | `/performance/monthly` | `performance.view` |
| GET | `/performance/yearly` | `performance.view` |
| GET | `/performance/distributions` | `performance.view` |
| GET | `/performance/public` | public |
| GET | `/portfolio` | `performance.view` |
| GET | `/returns` | `performance.view` |

Trades are read-only for investors. `WalletSummary` now includes live performance, chart points, and recent public trades.

---

## Admin

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/admin/trades` | `trades.manage` |
| GET/PATCH | `/admin/trades/:id` | `trades.manage` |
| POST | `/admin/trades/:id/open\|close\|cancel\|archive\|duplicate\|publish\|hide` | `trades.manage` |
| POST | `/admin/trades/allocate` | `trades.manage` |
| POST | `/admin/trades/publish` | `trades.manage` (batch `{ tradeIds }`) |
| GET/POST | `/admin/returns` | `returns.manage` |
| GET | `/admin/performance` | `performance.view` |

### Create trade

```json
{
  "pair": "EUR/USD",
  "direction": "BUY",
  "entryPrice": "1.17000",
  "exitPrice": "1.17820",
  "tradeDate": "2026-08-04",
  "strategy": "Breakout",
  "risk": "MEDIUM"
}
```

### Allocate

```json
{
  "tradeId": "<uuid>",
  "mode": "CAPITAL"
}
```

Modes: `EQUAL` · `PERCENTAGE` · `CAPITAL` · `MANUAL`

### Publish daily return

```json
{
  "date": "2026-08-04",
  "returnPct": "0.70",
  "idempotencyKey": "return-2026-08-04",
  "returnBasis": "BALANCE"
}
```

Credits Investment wallets via ledger `PROFIT_DISTRIBUTION` (idempotent per run+wallet).
