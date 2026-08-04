# Financial Architecture — Growzy Phase 4

## Principles

1. **Ledger is truth.** Wallet balances are derived caches.
2. **No naked balance writes.** Every money move goes through `ledgerService` inside a DB transaction.
3. **Double-entry.** Every post balances DEBIT = CREDIT.
4. **Immutability.** Ledger rows cannot be updated or deleted (PostgreSQL trigger). Reverse only.
5. **Decimal money.** `Decimal(20,8)` in Postgres; `decimal.js` in application code; API strings.
6. **Idempotency.** Deposit/withdrawal/ledger posts use idempotency keys.
7. **Auditability.** Audit log + activity log + finance review + approval queue + transaction history.

## Module graph

```
deposits ──┐
withdrawals─┼──► ledgerService ──► wallets / ledger_entries / transactions
adjustments─┘         │
                      ├── approval_queue
                      ├── finance_reviews
                      └── notifications (DB)
```

## Wallet portfolio

On KYC approval each user receives four wallets:

| Kind | Role |
|------|------|
| Investment | Primary funding / withdrawals |
| Profit | Future daily-return credits (Phase 5+) |
| Bonus | Promotional credits |
| Referral | Referral rewards |

`GET /wallet` aggregates portfolio totals for the frontend DTO.

## Deposit lifecycle

`PENDING` → (proof) `UNDER_REVIEW` → `APPROVED` | `REJECTED` | `CANCELLED` | `EXPIRED`

Approve posts ledger credit and clears pending balance.

## Withdrawal lifecycle

`PENDING`/`UNDER_REVIEW` (funds locked) → `APPROVED` → `PAID`/`COMPLETED`  
Reject/cancel unlocks funds. Mark-paid completes the locked debit out of the system.

## Approval roles

Queue `requiredRole`: Finance · Admin · Supervisor. History stored in `FinanceReview`.

## Deferred

Trading engine, daily returns, performance, reports, CMS, support channels, email provider.
