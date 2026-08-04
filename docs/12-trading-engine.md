# 12 — Trading & Daily Return Engine

This is the feature the platform exists for, and the one place where a bug costs real money. It
gets its own document.

---

## 1. What it does

An admin records the day's trades, then clicks **Apply Daily Return**. The system must:

1. Update every eligible user's wallet
2. Store the history permanently
3. Send a notification
4. Send an email
5. Update every dashboard

…and it must be impossible to do twice, safe under concurrency, reversible without deleting
history, and auditable three years later.

---

## 2. Worked example

The example from the brief, traced all the way through.

**Admin records:**

| Date | Pair | Direction | Entry | Exit | Return |
|------|------|-----------|-------|------|--------|
| 2026-08-02 | EUR/USD | BUY | 1.1700 | 1.1782 | +0.70% |

The system computes a suggested return of `(1.1782 − 1.1700) / 1.1700 × 100 = 0.7008%` and
pre-fills `0.70`. The operator confirms.

**`TradingDay` 2026-08-02:** `computedReturnPct = 0.700000`, `tradeCount = 1`, status `DRAFT`.

**Admin previews.** No writes occur:

```
Eligible wallets            1,284
Total base amount     $2,841,500.00
Distributing             $19,890.50
Rounding delta                $0.14
```

**Admin applies.** For one user, Ayesha, with a balance of $1,250.75:

```
gross    = 1250.75 × (0.70 / 100)
         = 8.75525
amount   = round_half_up(8.75525, 2)
         = 8.76
balance  = 1250.75 + 8.76 = 1259.51
```

**Written, atomically:**

```
LedgerEntry        type PROFIT_DISTRIBUTION
                   amount +8.76
                   balance_before 1250.75  balance_after 1259.51
                   reference DailyReturnRun#88
                   idempotency_key "run:88:wallet:a3f1…"

ProfitDistribution runId 88, userId …, eligibleBalance 1250.75,
                   returnPct 0.700000, grossAmount 8.75525, amount 8.76,
                   balanceAfter 1259.51

Wallet             balance 1259.51, totalProfit += 8.76
```

**Then emitted (after commit):**

- In-app notification: *"Today's return: +0.70% · +$8.76"*
- Email with the day's trades, her earning and her new balance
- Her dashboard shows the new figures on next load

Three years later, "why $8.76 on 2 August 2026?" is answered by one row: base $1,250.75 × 0.70%,
rounded half-up. No reconstruction required.

---

## 3. Return calculation

### Net daily return

When a day has multiple trades, the day's return is the **sum** of the individual trade returns,
because each trade's percentage is already expressed as a percentage of fund equity:

```
computedReturnPct = Σ trade.returnPct
```

For the day in [07](./07-admin-flow.md#7-applying-the-daily-return--admindaily-return):
`+0.70 + 0.15 − 0.15 = +0.70%`.

The operator may **override** the computed value — for instance to retain a reserve — but an
override requires a written reason, and both the computed and the applied values are stored
permanently on the `TradingDay`.

`TODO(owner)`: confirm that additive aggregation matches the desk's actual accounting. If trade
returns are instead expressed relative to position size rather than fund equity, this becomes a
weighted calculation and the `Trade` model needs an allocation weight column. Resolve before
Phase 7.

### Per-wallet distribution

```
base   = returnBasis == BALANCE  ? wallet.balance        // compounding (default)
                                 : wallet.investedAmount // simple

gross  = base × (returnPct / 100)          // 8 decimal places
amount = roundHalfUp(gross, 2)
```

### Eligibility

A wallet participates in trading day `D` when **all** of the following hold:

- The user's status is `ACTIVE` (not suspended, not closed)
- The wallet's balance at the start of `D` is greater than zero
- The user's first approved deposit was credited **before** `D` began

The last rule is the "deposits earn from the next day" policy from
[00 §3.3](./00-project-overview.md#33-how-the-daily-return-works). It is checked against ledger
history, not against the current balance, so backfilling an older trading day still produces the
historically correct answer.

Locked funds (pending withdrawals) **do** earn — the money is still in the fund until it is paid
out. This is a policy decision worth stating explicitly, since the alternative is defensible too.

### Rounding

Arithmetic runs at 8 decimal places; only the final credited `amount` is rounded, half-up, to 2
decimals. Both the unrounded `grossAmount` and the rounded `amount` are stored.

```
roundingDelta = Σ amount − Σ grossAmount
```

Recorded on the run. It will be a few cents either way across a thousand wallets. Recording it
means the books explain themselves rather than showing an unexplained discrepancy.

### Negative days

Losing days are first-class. `returnPct` may be negative, producing a debit. Two guards:

1. `financial.allowNegativeReturns` must be true (default true).
2. `amount` is clamped so no wallet can go below zero:
   `amount = max(amount, −wallet.balance)`. A wallet with $5.00 facing a −$8.00 distribution is
   debited $5.00, and the clamp is recorded in the distribution's metadata for audit.

---

## 4. Idempotency and concurrency

Five independent layers. Any one of them alone would mostly work; together, double application is
structurally impossible.

| # | Layer | Prevents |
|---|-------|----------|
| 1 | `UNIQUE(trading_day_id)` on `daily_return_runs` | A second run for the same day, at the database level |
| 2 | Postgres advisory lock `pg_advisory_xact_lock(hashtext('daily-return'))` | Two runs executing simultaneously, for any dates |
| 3 | `Idempotency-Key` header, required on the endpoint | Network retries and double-clicks re-executing |
| 4 | `UNIQUE(run_id, user_id)` on `profit_distributions` | Double-crediting one user within a run |
| 5 | Per-entry `idempotencyKey` on `LedgerEntry` | A duplicate ledger row under any retry path |

```
POST /admin/daily-returns/apply
  │
  ├─ BEGIN
  ├─ SELECT pg_advisory_xact_lock(hashtext('daily-return'))   ← blocks other runs
  │
  ├─ SELECT run WHERE tradingDayId = ?
  │     ├─ COMPLETED  → COMMIT, return 409 RETURN_ALREADY_APPLIED { existingRunId }
  │     └─ PROCESSING → COMMIT, return 409 RUN_IN_PROGRESS
  │
  ├─ Validate: day exists, has trades, |returnPct| ≤ maxDailyReturnPct,
  │            confirmToken matches the date
  ├─ INSERT DailyReturnRun (status PROCESSING)   ← unique constraint fires here on a race
  ├─ COMMIT      ← the run now exists and is claimed; the lock is released
  │
  ├─ Distribute in batches (see §5)
  │
  └─ Mark COMPLETED, TradingDay → DISTRIBUTED, enqueue outbox notifications
```

The advisory lock is transaction-scoped, so it releases automatically on commit or on crash — there
is no lock to clean up if the process dies mid-run.

---

## 5. Execution

### Batching

Ten thousand wallets in a single transaction would hold locks for an unacceptable duration and risk
a timeout rolling back the entire distribution. Instead, wallets are processed in batches of 500,
each batch in its own transaction.

```
for each batch of 500 eligible wallets:
  BEGIN
    SELECT * FROM wallets WHERE id = ANY($ids) ORDER BY id FOR UPDATE   ← ordered: no deadlocks
    for each wallet:
      compute gross, amount, balanceAfter
      INSERT ledger_entries  (idempotency_key = `run:${runId}:wallet:${walletId}`)
      INSERT profit_distributions
      UPDATE wallets SET balance = …, total_profit = …, version = version + 1
    UPDATE daily_return_runs SET processed_wallets = processed_wallets + n
  COMMIT
```

Ordering the `FOR UPDATE` by primary key is what prevents deadlocks between the distribution run
and a concurrent withdrawal request touching the same rows.

### Partial failure

If batch 7 of 20 fails, batches 1–6 are already committed. The run is marked `FAILED` with the
error and the last processed offset. **Resume** re-runs from the failure point; the per-entry
idempotency keys make already-processed wallets no-ops, so a resume can safely re-attempt an
uncertain batch.

The engine never leaves a run half-applied and unmarked. Either it completes, or it is visibly
`FAILED` with a resume action in the admin UI.

### Notifications

Notifications are **not** sent inside the distribution transactions. Each batch writes
`OutboxEvent` rows in the same transaction as its wallet updates; the outbox worker dispatches them
afterwards with retry and backoff.

This is the difference between "the SMTP server was slow, so 4,000 users didn't get credited" and
"the SMTP server was slow, so 4,000 emails arrived a few minutes late".

### Performance target

10,000 wallets in under 60 seconds — 20 batches of 500. Measured in Phase 7; if it misses, the fix
is a larger batch size and a bulk `INSERT ... SELECT`, not a change to the safety model.

---

## 6. Preview (dry run)

The preview runs the identical calculation code as the apply path — the same
`distribution.engine` module — with writes disabled. Using different code for preview and apply
would defeat the purpose, because the preview would then be a guess rather than a rehearsal.

It returns eligible and excluded wallet counts, total base, total distribution, rounding delta, a
sample of per-user impacts, and warnings:

| Warning | Trigger |
|---------|---------|
| Return exceeds the configured cap | `|returnPct| > maxDailyReturnPct` |
| Return is unusually large | More than 3× the 30-day average |
| Sign mismatch | Entered return is positive but the day's trades net negative |
| No trades recorded | The day has zero trades |
| Wallets will be clamped | Some balances are smaller than the negative distribution |
| Suspended wallets skipped | Count of excluded accounts |
| Day already published | Informational |

---

## 7. Reversal

Mistakes happen. The response is **never** to delete a run.

```
POST /admin/daily-returns/:id/reverse        SUPER_ADMIN only
  { reason: "…at least 20 characters…", notifyUsers: true }

BEGIN (per batch)
  for each ProfitDistribution in the run:
    INSERT ledger_entries  type PROFIT_REVERSAL
                           amount = −original.amount
                           idempotency_key = `reversal:${runId}:wallet:${walletId}`
    UPDATE wallets SET balance = balance − amount, total_profit = total_profit − amount
    UPDATE profit_distributions SET is_reversed = true
COMMIT

UPDATE daily_return_runs SET status = REVERSED, reversed_at, reversed_by_id, reversal_reason
UPDATE trading_days SET status = PUBLISHED       ← the day can be corrected and re-applied
```

Guarantees:

1. Every wallet returns to its **exact** pre-run balance. Reversing the rounded `amount`, not
   recomputing from the percentage, is what makes this exact.
2. The original run and all its distributions remain in the database, marked reversed.
3. The reversal is visible in the user's own transaction history with its reason — a user who saw
   +$8.76 yesterday and doesn't see it today gets an explanation in the interface.
4. Reversal is audited with the actor, reason and full impact.
5. After reversal the trading day returns to `PUBLISHED`, so the trades can be corrected and the
   day re-applied — creating a **new** run, never overwriting the old one.

---

## 8. Test matrix

The engine is the one module with a mandatory 100% unit-test line and branch requirement.

### Unit — `distribution.engine`

| Case | Expected |
|------|----------|
| Standard positive return | Correct amount, correct rounding |
| Negative return | Correct debit |
| Zero return | No distributions written |
| Balance smaller than a negative distribution | Clamped to zero, clamp recorded |
| Zero-balance wallet | Excluded |
| Suspended user | Excluded |
| Deposit approved earlier today | Excluded from today, included tomorrow |
| Compounding vs simple basis | Different bases, both correct |
| Rounding across 10,000 wallets | `Σ amount − Σ gross` equals the recorded delta exactly |
| Very small balance ($0.01) at 0.70% | Rounds to $0.00, distribution still recorded for audit |
| Very large balance | No precision loss at `Decimal(20,8)` |

### Integration

| Case | Expected |
|------|----------|
| Apply twice, same day | Second returns 409, no additional writes |
| Two concurrent applies | Exactly one run; the other gets 409 |
| Apply while a withdrawal is being requested | Both succeed, ledger reconciles |
| Batch failure mid-run | Run marked `FAILED`; resume completes it correctly |
| Reverse then verify | Every wallet exactly matches its pre-run balance |
| Reverse then re-apply | A new run is created; the old one is preserved |
| Apply to a day with no trades | Blocked with a warning |
| Return exceeding the cap | Rejected with a validation error |
| 10,000 wallets | Completes under 60s; reconciliation passes |
| Notifications | Queued via the outbox, not sent inline; SMTP failure doesn't affect balances |

### Property-based

For randomly generated wallet sets and return percentages, assert invariantly:

- `Σ ledger entries for the run == run.totalDistributed`
- Every wallet's `balance == Σ its ledger entries`
- No balance is negative
- Reversal restores every balance exactly

---

## 9. Historical data guarantees

The brief requires history stored forever, filterable, sortable, exportable, with monthly, yearly
and total ROI views. What makes that possible:

| Requirement | Mechanism |
|-------------|-----------|
| Stored forever | `Trade`, `TradingDay`, `DailyReturnRun`, `ProfitDistribution` and `LedgerEntry` are never deleted, including on account closure |
| Filter and sort | Indexed on date, pair, direction, user and run; server-side filtering with URL-synced state |
| Export | CSV and PDF streamed from the same query as the on-screen table |
| Monthly performance | `date_trunc('month', …)` aggregation over `ProfitDistribution`, cached 5 minutes |
| Yearly performance | Same, by year |
| Total ROI | `totalProfit / totalDeposited × 100`, computed from the ledger |
| Explaining any past figure | `ProfitDistribution` stores `eligibleBalance`, `returnPct`, `grossAmount` and `amount` — the full input set |

The last row is the important one. Storing only the output means every historical question requires
reconstructing state that has since changed. Storing the inputs means every past number is
self-explanatory forever.
