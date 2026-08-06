# Demo data

Synthetic datasets used for UI presentation and offline demos.

## 3-year backtest

Path: `demo-data/3-year-backtest/`

Generates a reproducible three-year trading-day and trade history for charts,
admin screens, and stakeholder walkthroughs. **Not live market data.**

### Generate

From the repository root:

```bash
node demo-data/3-year-backtest/generate.mjs
```

Outputs land under `demo-data/3-year-backtest/export/`:

| Folder | Contents |
|--------|----------|
| `json/` | `meta.json`, `dashboard_stats.json`, `monthly_returns.json`, trading days, trades, equity curve |
| `csv/` | Flat CSV exports of the same series |
| `sql/` | Illustrative `INSERT` statements (offline review only) |
| `prisma/` | JSON seed artefacts shaped for Prisma models |
| `reports/html/` | Human-readable HTML summary |
| `reports/pdf/` | Lightweight PDF summary |

See `demo-data/DISCLAIMER.txt` before sharing or importing.
