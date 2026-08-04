# Database Documentation — Phase 4 Finance

Migration: `20260804240000_phase4_finance`

## Models

| Model | Purpose |
|-------|---------|
| `Wallet` | Per-user Investment / Profit / Bonus / Referral wallets (cached balances) |
| `LedgerAccount` | Chart of accounts (system + per-wallet AVAILABLE/LOCKED) |
| `Transaction` | Posted financial transaction header |
| `LedgerEntry` | Immutable double-entry lines (DB trigger blocks UPDATE/DELETE) |
| `PaymentMethod` | Admin-managed deposit rails |
| `WalletAddress` | Platform crypto addresses |
| `PayoutMethod` | Investor withdrawal destinations |
| `Deposit` | Deposit cases + proof/hash |
| `Withdrawal` | Withdrawal cases + destination snapshot |
| `ApprovalQueue` | Finance / Admin / Supervisor queue |
| `FinanceReview` | Reviewer decision log |
| `TransactionHistory` | Investor-facing event trail / export prep |

## Wallet kinds

`INVESTMENT` · `PROFIT` · `BONUS` · `REFERRAL`

Unique on `(userId, kind)`.

## Invariants

- Wallet `balance` / `availableBalance` / `lockedBalance` are caches updated only by `ledgerService`.
- Ledger rows are append-only; corrections use reversal / compensating entries.
- Deposit approve credits Investment wallet via balanced DEBIT clearing / CREDIT available.
- Withdrawal request locks available → locked; pay completes locked → platform payout; reject unlocks.
- Unique constraints: deposit `idempotencyKey`, `txHash`; withdrawal `idempotencyKey`; ledger entry `idempotencyKey`.

## Seeded data

System accounts: `SYS:CLEARING`, `SYS:PAYOUT`, `SYS:FEES`, `SYS:SUSPENSE`  
Payment methods: Bank Transfer, USDT TRC20, USDT BEP20, BTC, ETH, Manual.
