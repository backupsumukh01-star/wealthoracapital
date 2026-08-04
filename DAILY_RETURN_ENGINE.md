# Growzy — Daily Return Engine (Architecture)

**No code in this document.** Implementation guide for Phase 2+.  
**Canonical math detail also in:** `docs/12-trading-engine.md`.

---

## 1. Purpose

Convert a published trading day’s return percentage into per-investor ledger credits/debits, safely and idempotently, with full auditability.

---

## 2. Actors & inputs

| Input | Source |
|-------|--------|
| Trading day D | `trading_days.date` |
| Trades | Sum → `computed_return_pct` |
| Applied % | Computed or admin override |
| Return basis | Setting: `BALANCE` (default) or `INVESTED` |
| Eligibility snapshot | Wallets at start of D (platform TZ) |

Admin enters or confirms **today’s return**, then runs **preview** then **apply**.

---

## 3. End-to-end flow

```
1. Trades recorded for day D (DRAFT)
2. Day PUBLISHED (public visibility)
3. PREVIEW
      - load settings (basis, maxDailyReturnPct)
      - compute eligible users
      - compute each profit (no writes)
      - return preview table + totals
4. APPLY (Idempotency-Key + confirm phrase)
      - advisory lock + unique(trading_day_id) on run
      - create DailyReturnRun PROCESSING
      - batch wallets FOR UPDATE (500)
      - for each user:
          create ProfitDistribution
          wallet.ledger.post PROFIT_DISTRIBUTION (idempotent key)
          update wallet projection + total_profit
      - mark COMPLETED / day DISTRIBUTED
5. OUTBOX
      - notification DAILY_PROFIT | DAILY_LOSS
      - email template
      - audit log (run summary)
```

---

## 4. Eligibility (day D)

User is eligible if **all** are true:

1. `status = ACTIVE`  
2. Email verified  
3. Wallet balance **at start of D** > 0 (policy: use balance snapshot rules in `docs/12`)  
4. First approved deposit timestamp **&lt; start of D** (intra-day deposits earn from D+1)  
5. Not excluded by suspension  

**Locked funds (pending withdrawal):** **still earn** (explicit product policy).

---

## 5. Formulas

```
base = (returnBasis == BALANCE) ? wallet.balance : wallet.invested_amount
profit_raw = base * (return_pct / 100)
profit = round_half_up(profit_raw, 2)   // ledger boundary
```

Negative days: apply loss but **clamp** so resulting balance ≥ 0.

`maxDailyReturnPct` (default 5%): reject apply if `|return_pct|` exceeds unless SUPER_ADMIN override with reason (product decision — default **hard reject** for ADMIN).

---

## 6. Idempotency layers (mandatory)

1. HTTP `Idempotency-Key` on apply  
2. `UNIQUE(daily_return_runs.trading_day_id)`  
3. `UNIQUE(profit_distributions.run_id, user_id)`  
4. Ledger `idempotency_key = profit_dist:{runId}:{userId}`  
5. Postgres advisory lock during apply  

Re-running apply for same day → no-op / CONFLICT `RETURN_ALREADY_APPLIED`.

---

## 7. Side effects (after money committed)

| Effect | Channel |
|--------|---------|
| In-app notification | Outbox → notifications |
| Email | Outbox → email_logs |
| Audit | `daily_return.apply` with totals |
| Optional broadcast suppress | Don’t double-email if digest covers same day |

Money transaction **must commit before** side effects. Side effect failure retries via outbox — never roll back ledger for email failure.

---

## 8. Reversal (SUPER_ADMIN)

```
For each ProfitDistribution with ledger_entry:
  post PROFIT_REVERSAL compensating entry
Mark run REVERSED
Mark day PUBLISHED (not DRAFT)
Allow a NEW apply as a new run only if product allows re-open
  (recommended: new trading_day revision policy — see docs/12)
```

Every reversal requires reason + audit.

---

## 9. Failure & resume

If run `FAILED` mid-batch:

- Already-posted distributions remain (ledger idempotent)  
- Resume continue from missing `profit_distributions` / missing ledger keys  
- Never double-pay  

---

## 10. Preview vs apply

| | Preview | Apply |
|--|---------|-------|
| Writes | None | Run + distributions + ledger + wallet |
| Auth | ADMIN | ADMIN + confirm phrase |
| Output | CSV-like rows for UI | Run id + counts |

UI MUST disable Apply until Preview loaded for same parameters.

---

## 11. Observability

- Metrics: apply duration, eligible count, total distributed, failure count  
- Alert: reconciliation drift after apply  
- Log: requestId, runId, actorId (no full wallet dumps)

---

## 12. Open decision (do not invent at code time)

`docs/12` TODO: confirm **additive** trade `return_pct` sum vs position-weighted aggregation **before** Phase 7 implementation. Record decision in ADR when coding starts.
