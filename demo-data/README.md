# Demo data

Synthetic datasets used for UI presentation and offline demos.

## 4-year public demo / backtest

Path: `demo-data/3-year-backtest/` (folder name kept for existing URLs)

Generates a reproducible four-year trading-day and trade history for public
charts, tables, reports, and marketing statistics. **Not live market data.**
**Do not import into production financial tables.**

Monthly returns are seeded in 13.00%–17.00% with a 15.30% arithmetic average
per programme year (48 months).

### Generate

From the repository root:

```bash
node demo-data/3-year-backtest/generate.mjs
node scripts/generate-hpc-reports.mjs
node --test demo-data/3-year-backtest/canonical.test.mjs
```

Outputs land under `demo-data/3-year-backtest/export/` and are mirrored to
`apps/web/public/demo/backtest/`.

See `demo-data/DISCLAIMER.txt` before sharing or importing.
