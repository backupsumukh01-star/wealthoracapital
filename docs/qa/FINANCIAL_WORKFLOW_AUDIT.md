# Financial Workflow Audit — Growzy

**Date:** 2026-08-05  
**Scope:** API money paths (`apps/api` ledger, deposits, withdrawals, distribution, performance)  
**Mode:** Report only — no fixes  
**Critical rule:** Any issue where **money can be lost, double-credited, or minted** is marked **CRITICAL**

---

## Executive verdict

| Area | Status |
|------|--------|
| Core ledger (double-entry, `FOR UPDATE`, unique idempotency) | **Strong foundation** |
| Deposit lifecycle concurrency | **CRITICAL gaps** |
| Withdrawal lock / complete | **Mostly sound**; daily limit race |
| Profit distribution | **Pays real money**; concurrent dual-key / INVESTED basis **CRITICAL** |
| Referral / commission / bonus payouts | **Not implemented** (schema/UI only) |
| Frontend demo wallets | Do **not** mutate API balances (integrity OK; ops confusion risk) |

**Do not run live capital** until CRITICAL items below are closed.

---

## Workflow scorecards

### Deposits

| Check | Result | Notes |
|-------|--------|-------|
| Create + pending bump | ✅ | Unique `idempotencyKey`; `adjustPending(+)` |
| Approve credits wallet | ✅ | `creditAvailable` + ledger DEBIT clearing / CREDIT available |
| Idempotent re-approve | ✅ | Key `deposit:{id}:approve` |
| Conditional status transition | ❌ | Update by id without `WHERE status IN (PENDING…)` |
| Cancel vs approve race | **CRITICAL** | See C1 |
| FORCE_COMPLETE after cancel | **CRITICAL** | Status gate skipped for FORCE_COMPLETE |
| FORCE_CANCEL after approve (no reverse) | **HIGH** | Status flips; balance kept |
| Over-credit via `creditedAmount` | **HIGH** | Uncapped vs deposit amount |
| Fees | ⚠️ | Computed at create; not applied to credit |

### Withdrawals

| Check | Result | Notes |
|-------|--------|-------|
| Lock available → locked | ✅ | `FOR UPDATE` + insufficient-balance check |
| Complete → payout clearing | ✅ | Idempotent `withdrawal:{id}:complete` |
| Cancel / reject unlock | ✅ | Locked balance gate |
| Daily limit | **HIGH** | Checked **outside** lock tx (TOCTOU bypass) |
| Create idempotency race | MEDIUM | Parallel same key → unique violation / 500 |
| Double complete | ✅ | Ledger idempotency blocks |

### Wallet / balance updates

| Bucket | Behavior |
|--------|----------|
| `availableBalance` | Spendable; credit/debit/lock |
| `lockedBalance` | Withdraw holds |
| `balance` | Total cash (available+locked intent) |
| `pendingBalance` | Off-ledger open deposits only |
| `investedAmount` | Counter; **+ on deposit approve only**; never reduced on withdraw |

| Check | Result |
|-------|--------|
| Negative balances | ✅ App checks + DB `CHECK >= 0` |
| Wallet row lock | ✅ `SELECT … FOR UPDATE` in ledger ops |
| OCC `version` | ⚠️ Incremented, never compared |
| `balance = available + locked` CHECK | ❌ Missing |

### Profit distribution

| Check | Result | Notes |
|-------|--------|-------|
| Formula | `base × returnPct / 100` → 2dp | BALANCE = avail+locked; INVESTED = `investedAmount` |
| Ledger credit | ✅ | Per-wallet key `run:{runId}:wallet:{walletId}` |
| Same-key resume | ✅ | Skips paid lines |
| Date+basis uniqueness | **CRITICAL** | Soft `findFirst` only — dual-key race double-pays |
| INVESTED after withdraw | **CRITICAL** | Stale invested → phantom yield |
| Negative return days | ⚠️ | Rows only; **no debit** (capital protection) |
| Reversal engine | 🚫 | Schema flags only |

### ROI calculation

| Check | Result | Notes |
|-------|--------|-------|
| Investor ROI | ⚠️ | Often `Σ distributions / investedAmount` or `totalProfit / invested` |
| Misnamed avg daily | MEDIUM | Average of **amounts**, not % |
| Trade returnPct sum | HIGH | `recomputeDailyReturn` **sums** trade % (not weighted) |
| Series history | MEDIUM | Fallback uses **current** balance for past points |
| Wallet vs performance on loss days | HIGH | Performance falls; balances do not |

### Referral rewards / commission / bonuses

| Check | Result |
|-------|--------|
| Referral code on signup | ✅ Graph only (`referredById`) |
| Referral **payout** | 🚫 Stub — no credit path |
| Commission engine | 🚫 None |
| Bonus wallet kind | ✅ Created empty |
| `REFERRAL_BONUS` / `BONUS` ledger types | 🚫 Unused for credits |
| UI referral earnings | Shows zeros / marketing copy |

### Ledger / transaction history

| Check | Result |
|-------|--------|
| Double-entry gate | ✅ `postBalanced` debit=credit |
| Immutable lines | ✅ |
| User history | ⚠️ Filters by user wallet lines; system clearing may be hidden |
| Signed amounts | ⚠️ Lock lines use `signedAmount: 0` quirk |
| Display rounding | 2dp API vs 8dp storage |

### Double spending / duplicate requests / race conditions

| Scenario | Result |
|----------|--------|
| Double deposit approve (same id) | ✅ Idempotent |
| Cancel + approve / FORCE_COMPLETE race | **CRITICAL** — C1 |
| Concurrent withdraw locks | ✅ Wallet lock |
| Concurrent daily limit | **HIGH** — soft check |
| Concurrent distribution dual keys | **CRITICAL** — C2 |
| Admin adjust retry | **HIGH** — `Date.now()` keys |
| Frontend double-click | Depends on client Idempotency-Key when wired |

### Negative balances

| Check | Result |
|-------|--------|
| Available overdraft | ✅ Blocked in `lockFunds` / debit |
| Pending below zero | ✅ `adjustPending` refuses |
| DB CHECKs | ✅ Non-negative columns |

---

## CRITICAL issues (money can be lost / minted)

### C1 — Deposit cancel/reject vs approve / FORCE_COMPLETE race

**Impact:** User/platform can credit a deposit that is already cancelled/rejected, or leave funds credited under a cancelled status. Shared `pendingBalance` lets sibling deposits absorb the pending decrement.

**Evidence:**
- Approve path updates deposit by id with no conditional status (`deposit.service.ts` ~403–414)
- FORCE_COMPLETE skips the PENDING/UNDER_REVIEW gate used for APPROVE (~395–398)
- Cancel updates status + `adjustPending(-)` without re-checking status inside a deposit row lock (~237–256)
- Pending is a **wallet aggregate**, not per-deposit entitlement

**Money at risk:** Double economic outcome (credit after cancel) → **platform loss**.

---

### C2 — Concurrent profit distribution with different idempotency keys

**Impact:** Two admin publishes for the same `date` + `returnBasis` with different keys can both pass soft blocking and credit every eligible wallet twice.

**Evidence:**
- Soft `findFirst` for blocking runs; **no** `@@unique([date, returnBasis])`
- Per-run wallet keys do not collide across runs

**Money at risk:** Double payout → **platform loss**.

---

### C3 — INVESTED basis never decreases on withdrawal

**Impact:** After users withdraw capital, `investedAmount` stays high. Publishing with `returnBasis: INVESTED` pays `% × stale invested` onto remaining available → **phantom capital yield**.

**Evidence:**
- `bumpInvested: true` only on deposit approve
- Withdrawal path never reduces `investedAmount`

**Money at risk:** Minted profits → **platform loss**.

---

## HIGH issues

| ID | Issue | Money impact |
|----|-------|--------------|
| H1 | FORCE_CANCEL / REJECT after APPROVE does not reverse ledger | Status vs cash diverge; admin-induced loss |
| H2 | Admin wallet adjust idempotency = `Date.now()` | Double-click / retry double-moves money |
| H3 | `creditedAmount` uncapped vs deposit; fee unused on credit | Over-credit on approve |
| H4 | Withdrawal daily limit outside lock transaction | Limit bypass (not balance theft) |
| H5 | Negative distribution days skip ledger debits | Performance ≠ wallet; product/comms risk |
| H6 | Resume recomputes live bases + caller `returnPct` | Inconsistent day / overpay vs original intent |
| H7 | Trade `%` sum used as daily computed return | Misleading publish guidance |

---

## MEDIUM / LOW

| ID | Severity | Issue |
|----|----------|-------|
| M1 | MEDIUM | Create deposit/withdraw check-then-insert → parallel 500 (unique still protects rows) |
| M2 | MEDIUM | Different unlock idempotency keys cancel vs reject |
| M3 | MEDIUM | Activity/notify after money commit (side-effect loss only) |
| M4 | MEDIUM | No wallet equality CHECK / unused OCC version / no reconciliation job surfaced |
| M5 | MEDIUM | Referral/bonus product surface without payout engine |
| M6 | MEDIUM | No profit reversal implementation |
| L1 | LOW | History / signedAmount / display rounding quirks |

---

## Workflow detail

### Balance update model

```
Deposit approve:  SYS:CLEARING → USER available (+investedAmount, +totalDeposited)
Withdraw create:  available → locked
Withdraw paid:    locked → SYS:PAYOUT (−balance)
Withdraw cancel:  locked → available
Profit (positive): SYS → USER available (+totalProfit on INVESTMENT + PROFIT counter)
Profit (negative): distribution row only (no debit)
Admin adjust:     credit/debit with weak idempotency (H2)
```

### Double spending

- **Spend same available twice:** Protected by `FOR UPDATE` + available check on lock.
- **Spend credited deposit twice via withdraw:** Normal after legitimate credit; C1 is the illicit credit path.
- **Duplicate ledger post:** Unique `Transaction` / `LedgerEntry` idempotency keys.

### Duplicate requests

| Request | Protection |
|---------|------------|
| Deposit create | Client `idempotencyKey` unique |
| Withdraw create | Client `idempotencyKey` unique |
| Deposit approve | Server `deposit:{id}:approve` |
| Withdraw complete | Server `withdrawal:{id}:complete` |
| Distribution line | `run:{runId}:wallet:{walletId}` |
| Admin adjust | **Broken** (`Date.now()`) |

### Race conditions summary

| Race | Protected? |
|------|------------|
| Concurrent withdraw locks | ✅ |
| Concurrent deposit approve same id | ✅ (idempotent credit) |
| Cancel + approve / FORCE_COMPLETE | ❌ **C1** |
| Dual distribution keys same day | ❌ **C2** |
| Daily withdraw limit | ❌ **H4** |
| Distribution resume peers | ⚠️ Weak (FAILED clobber / no claim lock) |

---

## Stubbed vs live money features

| Feature | Live API money movement? |
|---------|--------------------------|
| Deposits approve → wallet | ✅ |
| Withdrawals lock/pay | ✅ |
| Daily profit distribution | ✅ |
| ROI / performance reporting | Partial (can diverge) |
| Referral rewards | ❌ |
| Commission | ❌ |
| Bonuses | ❌ (wallet shell only) |
| Profit reversal | ❌ |
| Frontend demo wallet | ❌ (localStorage only) |

---

## Residual risk matrix

| Area | Residual |
|------|----------|
| Deposit concurrency | **Critical** until conditional status + deposit-row lock |
| Distribution concurrency + INVESTED basis | **Critical** until unique (date,basis) + invested lifecycle |
| Admin FORCE_* / adjust / creditedAmount | **High** |
| Withdraw balance integrity | **Low–medium** |
| Referral/commission promises | **Product/compliance** (no cash movement yet) |
| Demo UI vs API | **Ops confusion**, not API theft |

---

## Gate recommendation

Before live funds:

1. Fix **C1** — conditional deposit transitions + lock deposit row; never FORCE_COMPLETE cancelled rows; pending tied to successful transition.  
2. Fix **C2** — DB unique `(date, returnBasis)` or advisory lock around publish.  
3. Fix **C3** — define invested semantics (reduce on withdraw or ban INVESTED basis until fixed).  
4. Fix **H2** — stable client-supplied admin adjust idempotency keys.  
5. Add reconciliation job comparing wallet aggregates to ledger sums; alert on drift.

---

*Read-only audit of `ledger.service.ts`, `deposit.service.ts`, `withdrawal.service.ts`, `wallet.service.ts`, `distribution.service.ts`, Prisma constraints, and referral/bonus surfaces. No code changes.*
