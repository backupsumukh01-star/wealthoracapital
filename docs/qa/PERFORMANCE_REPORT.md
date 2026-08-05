# Performance Report

**Generated:** 2026-08-05T10:39:33.841Z

## Load scripts

| Script | Purpose |
|--------|---------|
| `tests/load/k6-smoke.js` | Health + public CMS/trades |
| `tests/load/k6-concurrent.js` | Ramp to N VUs (500/1000/5000 via `-e VUS=`) |

Run example:

```bash
k6 run tests/load/k6-smoke.js
k6 run -e VUS=500 -e DURATION=2m tests/load/k6-concurrent.js
```

## Observations

- Automated k6 execution requires the k6 binary (not a Node dependency).
- Thresholds: smoke p95 < 2s; concurrent p95 < 5s; failure rate budgets documented in scripts.
- Profile slow SQL via `EXPLAIN ANALYZE` on ledger and deposit review paths during staging load.
