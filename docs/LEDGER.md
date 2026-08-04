# Ledger Documentation

## Double-entry posting

`ledgerService` creates a `Transaction` (status `POSTED`) and two or more `LedgerEntry` lines.

Each line has:

- `direction`: `DEBIT` | `CREDIT`
- `amount`: always positive
- `signedAmount`: wallet-facing signed delta (+ credit / − debit to user available)
- `entryType`: domain classification (`DEPOSIT_APPROVED`, `WITHDRAWAL_LOCKED`, …)
- Optional `balanceBefore` / `balanceAfter` on the user wallet line
- `idempotencyKey` for safe retries

## Core operations

| Operation | Debit | Credit | Wallet cache |
|-----------|-------|--------|--------------|
| Deposit approve | SYS:CLEARING | USER:…:AVAILABLE | +balance, +available, +deposited, +invested |
| Withdrawal lock | USER:…:AVAILABLE | USER:…:LOCKED | −available, +locked |
| Withdrawal complete | USER:…:LOCKED | SYS:PAYOUT | −balance, −locked, +withdrawn |
| Withdrawal refund | USER:…:LOCKED | USER:…:AVAILABLE | +available, −locked |
| Admin credit | SYS:CLEARING | USER:…:AVAILABLE | +balance, +available |
| Admin debit | USER:…:AVAILABLE | SYS:CLEARING | −balance, −available |

## Concurrency

Wallet rows are locked with `SELECT … FOR UPDATE` before mutation.

## Reconcile

Nightly/job (future): `SUM(signedAmount)` per wallet must equal `wallet.balance`.

## Protection

```sql
BEFORE UPDATE OR DELETE ON ledger_entries
  → RAISE 'Ledger entries are immutable'
```
