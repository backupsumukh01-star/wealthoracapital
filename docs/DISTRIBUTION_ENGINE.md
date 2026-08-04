# Distribution Engine

## Entry point

`POST /api/v1/admin/returns` → `distributionService.publishReturn`

## Steps

1. Reject duplicate completed run for same date+basis (unless preview).
2. Upsert/recompute `DailyReturn` from closed trades.
3. Select eligible Investment wallets.
4. Create `DailyReturnRun` (`PROCESSING`).
5. For each wallet: create balanced ledger credit (`PROFIT_DISTRIBUTION`) when amount > 0; write `ProfitDistribution`; notify investor.
6. Mark run `COMPLETED`, day `DISTRIBUTED`.
7. Refresh portfolio snapshots + platform performance metrics.

## Idempotency

- Run: `idempotencyKey` unique on `DailyReturnRun`
- Wallet line: `run:{runId}:wallet:{walletId}`

## Losses

Negative returnPct records distribution rows and notifications without forcing ledger debits (capital protection v1).
