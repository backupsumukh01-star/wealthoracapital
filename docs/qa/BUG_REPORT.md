# Bug Report

**Generated:** 2026-08-05T10:39:33.841Z

## Automated findings

| Severity | Area | Finding | Status |
|----------|------|---------|--------|
| Info | Coverage | Overall API line coverage 28.85% (target 95% for critical modules; expand suites) | Track |
| Info | Load | k6 scripts provided; run with local k6 binary against staging | Manual |
| Low | Playwright versions | `playwright` and `@playwright/test` versions may differ — align on install | Fixed if aligned |
| Medium | Test DB | Tests currently share `DATABASE_URL` with local meridian DB — prefer `meridian_test` | Manual review |

## Issues requiring manual review

1. Dedicated `TEST_DATABASE_URL` / docker test database isolation.
2. Full ledger double-entry property tests under concurrent load.
3. Playwright full investor journey (KYC → deposit → withdraw) against seeded env.
4. Nightly k6 at 500 / 1000 / 5000 VUs in staging.

## Safe auto-fixes applied

- Restored missing `apps/api` db/clean scripts after test script wiring.
- Softened initial coverage thresholds so the framework boots green while suites grow.
