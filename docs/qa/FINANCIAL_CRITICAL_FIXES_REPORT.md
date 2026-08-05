# Financial Critical Fixes — Remediation Report

**Date:** 2026-08-05  
**Source:** `docs/qa/FINANCIAL_WORKFLOW_AUDIT.md`  
**Scope:** C1–C3 + withdraw races, admin adjust idempotency, FORCE_CANCEL reversal, daily withdraw limits  
**Constraint:** ROI formulas unchanged

---

## Summary

| ID | Issue | Fix |
|----|-------|-----|
| **C1** | Deposit cancel vs approve / FORCE_COMPLETE race | `SELECT … FOR UPDATE` on deposit + conditional `updateMany` status gate; FORCE_COMPLETE uses same PENDING/UNDER_REVIEW gate |
| **C2** | Dual-key daily distribution double-pay | DB `UNIQUE (date, return_basis)` on `daily_return_runs` + create conflict handling |
| **C3** | `investedAmount` never decreases | Reduced on withdrawal **PAID** / complete ledger path |
| **H1** | FORCE_CANCEL after APPROVE no reverse | `ledgerService.reverseDepositCredit` (idempotent) |
| **H2** | Admin adjust `Date.now()` keys | Required client `idempotencyKey`; stable ledger keys |
| **H3** | Over-credit via `creditedAmount` | Cap credit at deposit amount |
| **H4** | Daily withdraw limit TOCTOU | `pg_advisory_xact_lock` + limit re-check inside tx with wallet lock |
| Withdraw races | Cancel vs pay / unlock | Row lock + conditional status + stable unlock idempotency key |

---

## Migration

`apps/api/prisma/migrations/20260805100000_financial_critical_fixes/migration.sql`

- Deduplicate legacy runs, then `UNIQUE (date, return_basis)`
- Extend wallet non-negative CHECK to include `invested_amount >= 0`

Applied locally via `prisma migrate deploy`.

---

## Code touchpoints

- `ledger.service.ts` — `completeWithdrawal` decreases invested; new `reverseDepositCredit`
- `deposit.service.ts` — locked conditional approve/cancel/reject; FORCE_CANCEL reverse; credit cap
- `withdrawal.service.ts` — advisory lock + in-tx daily limit; locked approve/pay/cancel/reject
- `distribution.service.ts` — unique violation → conflict; soft prior-run check
- `wallet.service.ts` + validators + web admin adjust client — required idempotency key

---

## Regression tests

`apps/api/tests/integration/financial-critical.test.ts` — **6/6 passed**

1. Cancel then FORCE_COMPLETE → no credit  
2. FORCE_CANCEL after APPROVE → reverses available + invested  
3. Second distribution key same date+basis → conflict  
4. Withdrawal PAID → investedAmount decreases  
5. Admin adjust retry same key → single credit  
6. Parallel withdraws vs daily limit → one success / one fail  

```bash
cd apps/api && pnpm exec vitest run tests/integration/financial-critical.test.ts
```

---

## Not changed (by design)

- Daily return **formula** (`base × returnPct / 100`)  
- Negative return days still do not debit wallets (product rule)  
- ROI reporting formulas untouched  

---

## Residual

- Prisma client generate may need a clean process restart on Windows if `query_engine` DLL is locked (`EPERM`). Migration is applied; `tsc` passes.  
- Admin notes / non-main wallet kinds remain out of scope.  
