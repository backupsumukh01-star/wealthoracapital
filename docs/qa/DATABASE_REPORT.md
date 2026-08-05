# Database Report

**Generated:** 2026-08-05T10:39:33.841Z

## Status

- Prisma migrations through Phase 6 applied in local/dev.
- Automated suite uses `DATABASE_URL` (recommend dedicated `meridian_test`).

## Recommendations

1. Add docker-compose `postgres-test` service on port 5433.
2. Truncate or transaction-rollback between integration tests.
3. Index review under k6 concurrent deposit/withdraw scenarios.
4. Deadlock probe: parallel withdraw + distribute on same wallet.
