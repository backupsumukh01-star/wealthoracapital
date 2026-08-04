# Trading Architecture — Growzy Phase 5

## Principles

1. **Admin-only trade creation.** Investors never open trades.
2. **Ledger-only money movement.** Daily profits credit wallets through `ledgerService.creditAvailable`.
3. **Idempotent distributions.** `DailyReturnRun.idempotencyKey` + per-wallet keys.
4. **Immutable settlement.** Closed trade results cannot be edited.
5. **Auditable.** Trade history, finance reviews pattern via audit/activity, profit distributions.

## Domain map

```
Admin Trade CRUD ──► Trade / TradeHistory / TradeResult
        │
        ├── allocate ──► TradeAllocation
        └── close ──► DailyReturn (recompute)

Admin publish return ──► DailyReturnRun
        │
        └── for each eligible Investment wallet
              ├── ProfitDistribution (immutable row)
              └── ledger PROFIT_DISTRIBUTION credit
                    └── PortfolioSnapshot + PerformanceMetric refresh
```

## Trade lifecycle

`DRAFT` → `SCHEDULED` / `OPEN` → `RUNNING` → `CLOSED`  
Also: `CANCELLED`, `ARCHIVED`. Publish/hide toggles `isPublic`.

## Allocation modes

| Mode | Behaviour |
|------|-----------|
| EQUAL | Split total eligible capital evenly |
| PERCENTAGE | Explicit per-user % |
| CAPITAL | Proportional to available balance |
| MANUAL | Explicit per-user amounts |

## Daily return

Eligible: ACTIVE + KYC APPROVED investors with Investment wallet base > 0.  
Basis: `BALANCE` (available+locked) or `INVESTED`.  
Amount: `round_half_up(base × returnPct / 100, 2)`.  
Positive amounts credit Investment wallet and bump `totalProfit`; PROFIT wallet cache mirrored.

## Scheduler

In-process `scheduler` + `jobQueue` (no BullMQ): daily-return-prepare, portfolio-snapshots, performance-recalculate.
