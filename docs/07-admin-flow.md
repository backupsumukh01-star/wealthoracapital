# 07 — Admin Flow

The operator's job is to run the platform without ever opening a database client. Everything
below is designed around one insight: **the daily routine happens every single day, so it must
take minutes, not an hour — while remaining impossible to get catastrophically wrong.**

---

## 1. Roles and permissions

| Capability | `USER` | `ADMIN` | `SUPER_ADMIN` |
|-----------|:------:|:-------:|:-------------:|
| View admin dashboard | — | ✓ | ✓ |
| View / search users | — | ✓ | ✓ |
| Suspend / activate a user | — | ✓ | ✓ |
| Change a user's role | — | — | ✓ |
| **Manually adjust a balance** | — | — | ✓ |
| Approve / reject deposits | — | ✓ | ✓ |
| Approve / reject withdrawals | — | ✓ | ✓ |
| Mark a withdrawal paid | — | ✓ | ✓ |
| Record / edit trades | — | ✓ | ✓ |
| Publish a trading day | — | ✓ | ✓ |
| **Apply the daily return** | — | ✓ | ✓ |
| **Reverse a daily return** | — | — | ✓ |
| Send broadcasts | — | ✓ | ✓ |
| Edit platform settings | — | — | ✓ |
| Manage payment methods | — | — | ✓ |
| Manage staff | — | — | ✓ |
| View audit log | — | ✓ | ✓ |
| Export audit log | — | — | ✓ |

The four 👑-only capabilities are exactly those that can change money without a corresponding
user action, or that change who else can. Everything else is routine operations.

**Admin accounts are created by invitation only.** There is no admin registration route. The first
`SUPER_ADMIN` is created by the seed script from environment variables and its password must be
changed at first login. Admin accounts require 2FA in v1.

---

## 2. The daily routine (the flow that matters most)

This happens once per trading day and should take under five minutes.

```
  1. Open /admin                       See: pending deposits 4 · withdrawals 2 · today not settled
        │
  2. Clear the deposit queue           Review proof → approve or reject → next
        │                              (bulk approve for obvious repeat depositors)
        │
  3. Clear the withdrawal queue        Verify destination → approve → pay externally → mark paid
        │
  4. /admin/trades/new                 Record each trade of the day
        │                              date · pair · direction · entry · exit · return% · notes
        │
  5. /admin/daily-return               Day shows: 3 trades, computed net +0.70%
        │
  6. Click PREVIEW ─────────────────►  DRY RUN. Nothing is written.
        │                              1,284 eligible wallets
        │                              base $2,841,500.00 → distributing $19,890.50
        │                              per-user sample table, warnings, rounding delta
        │
  7. Review the preview                Does the total look right? Any warnings?
        │
  8. Click APPLY DAILY RETURN ──────►  Type-to-confirm dialog: "APPLY-2026-08-02"
        │
  9. Execution ─────────────────────►  Progress bar: 1,284 / 1,284 wallets
        │                              Wallets credited · ledger written · history stored
        │                              Outbox queued: 1,284 notifications + emails
        │
 10. Run summary                       Distributed $19,890.50 · rounding delta $0.14
                                       Export CSV · view per-user distributions
```

### Why preview-then-apply, and never apply directly

The apply step is irreversible in the sense that reversal, while supported, is an incident. The
preview costs the operator ten seconds and catches the two mistakes that actually happen in
practice: a decimal-place error (`7.0%` instead of `0.70%`) and applying to the wrong date. The
preview shows the total dollar amount leaving the fund, which is the number a human can sanity-check
instantly.

### Guard rails on the apply step

| Guard | What it prevents |
|-------|-----------------|
| Type-to-confirm token containing the date | Clicking apply on the wrong day |
| `financial.maxDailyReturnPct` cap (default 5%) | Fat-finger decimal errors |
| Unique constraint on `DailyReturnRun.tradingDayId` | Double application, structurally |
| Postgres advisory lock during the run | Two admins applying simultaneously |
| `Idempotency-Key` required on the endpoint | Network retries duplicating the run |
| Warning if the day has zero trades | Distributing a return with nothing behind it |
| Warning if the return sign differs from the trades' net | Entering `+0.7` on a losing day |

Full technical detail in [12 — Trading Engine](./12-trading-engine.md).

---

## 3. Admin dashboard — `/admin`

The landing screen answers "what needs me right now?" before anything else.

**Action queues (top, largest):**
- Pending deposits with the oldest wait time
- Pending withdrawals with total amount requested
- Today's trading day status: *not recorded* / *recorded, not distributed* / *distributed*

**Financial overview:**
- Assets under management, with change vs yesterday
- Total distributed profit, lifetime and this month
- Deposits vs withdrawals, this month
- Net platform flow

**User overview:**
- Total, active, new this week
- Funded wallets vs registered accounts (the activation number that actually matters)

**Alerts (red, above everything if present):**
- Reconciliation drift detected between ledger and wallet balances
- Failed daily-return run
- Dead-lettered notification events
- A withdrawal pending more than 48 hours
- Unusual activity: a single user's deposit above a configured threshold

---

## 4. Deposit review — `/admin/deposits`

### The queue

Default filter `status=PENDING`, oldest first, with age highlighted in amber past 4 hours and red
past 24. Columns: reference, user, amount, method, proof indicator, age.

### Review drawer

Opening a deposit sets it to `UNDER_REVIEW` so two admins don't act on the same row. The drawer
shows everything needed to decide, side by side:

- The proof image in a zoomable viewer (rotate, zoom, open full size)
- The claimed amount, method, and the user's transaction reference
- **The user's history**: previous deposits, previous rejections, account age, current balance —
  context that turns a judgement call into an informed one
- Approve (with an editable credited amount and an optional note) or Reject (with a reason chosen
  from a list plus free text)

### What happens on approve

Inside one transaction:
1. `Deposit.status = APPROVED`, reviewer and timestamp recorded
2. `LedgerEntry(DEPOSIT_APPROVED, +amount)` written
3. `Wallet.balance`, `investedAmount`, `totalDeposited` updated
4. `AuditLog` row with before/after
5. Commit — **then** notification and email are emitted

Eligibility note: the credited wallet becomes eligible for the daily return from the **next**
trading day, per the policy in [00 §3.3](./00-project-overview.md#33-how-the-daily-return-works).

### Rejection reasons (structured, not free-text-only)

`Proof unreadable` · `Amount mismatch` · `Payment not received` · `Duplicate submission` ·
`Wrong account` · `Suspected fraud` · `Other`

Structured reasons make the rejection rate analysable, which tells the operator whether the
instructions on the deposit page need fixing.

---

## 5. Withdrawal review — `/admin/withdrawals`

Withdrawals are the highest-risk operation on the platform. The flow reflects that.

### Review drawer shows

- Amount, fee, net payable
- The **destination snapshot** taken at request time — not the user's current saved details
- A red flag if the payout method was added or edited within 24 hours of the request
- The user's balance, deposit history and whether they have ever withdrawn before
- Whether the account has had a recent password change or new-device login

### Two-step completion

1. **Approve** — converts the existing lock into a real debit. The money is now formally out of the
   user's balance. Status `APPROVED`.
2. **Mark paid** — after the operator actually sends the funds externally, they attach a
   transaction reference and optionally a payment receipt. Status `PAID`.

Separating these two matters: approval is a bookkeeping act, payment is a real-world act, and they
happen minutes or hours apart. Collapsing them into one button loses the ability to answer "was it
approved but not yet sent?", which is the single most common support question about withdrawals.

### On reject

The locked amount is refunded via a `WITHDRAWAL_REFUNDED` ledger entry for exactly the locked
amount, the reason is shown to the user, and both are audited. There is no path where a rejection
leaves funds locked.

---

## 6. Trade management — `/admin/trades`

### Recording a trade

The form is optimised for speed because it is used many times a day:

| Field | Behaviour |
|-------|-----------|
| Date | Defaults to today; a date picker for backfill |
| Pair | Searchable combobox of the major/minor/exotic list, keyboard-first |
| Direction | Two large toggle buttons, BUY / SELL |
| Entry price | Decimal input with pair-appropriate precision |
| Exit price | Same |
| Return % | **Auto-suggested** from entry/exit and direction, editable |
| Lot size | Optional |
| Opened / closed at | Optional timestamps |
| Notes | The reasoning, shown to investors — this is the transparency payload |
| Public | Whether investors see this trade (default yes) |
| Chart image | Optional screenshot of the setup |

After saving, the form resets keeping the date and focus in the pair field, so recording three
trades is three quick passes rather than three page loads.

### The auto-suggest, and why it only warns

The server computes a suggested return from the price movement, but real return depends on
position size relative to the fund. So the field is pre-filled and a mismatch beyond tolerance
raises a **warning**, never an automatic overwrite. The operator's number wins; the system just
makes sure they saw the discrepancy.

### Trading day lifecycle

```
DRAFT ──────────► PUBLISHED ──────────► DISTRIBUTED ──────────► REVERSED
  │                  │                       │                     │
trades being     visible to             daily return           compensated,
recorded         investors              applied                original preserved
  │                  │                       │
edits allowed    edits allowed          ❌ edits BLOCKED
```

Once a day is `DISTRIBUTED`, its trades are immutable. Changing the inputs to a completed
financial calculation would make the history a lie. A genuine error requires a reversal.

---

## 7. Applying the daily return — `/admin/daily-return`

### The screen

Left: today's trading day — trades listed, computed net return, status.
Right: the apply panel.

```
┌─ Trading day 2 August 2026 ─────────────────────────────────────┐
│ EUR/USD  BUY   1.17000 → 1.17820   +0.70%   WIN                 │
│ GBP/USD  SELL  1.28400 → 1.28210   +0.15%   WIN                 │
│ USD/JPY  BUY   149.200 → 149.050   −0.15%   LOSS                │
│                                                                  │
│ Computed net return                              +0.70%          │
│ Override                                    [ ] with reason      │
└─────────────────────────────────────────────────────────────────┘

┌─ Apply return ──────────────────────────────────────────────────┐
│ Return to distribute       [ 0.70 ] %                            │
│ Basis                      Compounding (on balance)   ← setting  │
│                                                                  │
│           [ Preview impact ]        [ Apply daily return ]       │
│                                      ↑ disabled until previewed  │
└─────────────────────────────────────────────────────────────────┘
```

**Apply is disabled until a preview has been run for the current parameters.** Change the
percentage and the button disables again. This is the cheapest possible enforcement of "look
before you leap".

### The preview

```
Eligible wallets              1,284      (41 zero-balance, 3 suspended excluded)
Total base amount        $2,841,500.00
Total to distribute         $19,890.50
Rounding delta                   $0.14

Sample impact (first 10 of 1,284)
  Ayesha K.     $1,250.75  →  +$8.76  →  $1,259.51
  Bilal R.      $8,400.00  →  +$58.80 →  $8,458.80
  ...

⚠ Warnings
  • 3 suspended wallets will be skipped.
  • This return is 2.3× the 30-day average of 0.31%.
```

That last warning is the useful one. A rate that is wildly out of line with recent history is
almost always a data-entry error, and the system should say so out loud.

### Execution and progress

Applying returns `202 Accepted` with a run ID; the UI polls progress. For a few thousand wallets
this completes in seconds, but the design assumes it may not, so the operator always sees a
determinate progress state and can navigate away and come back.

### Reversal — `SUPER_ADMIN` only

Reversal writes `PROFIT_REVERSAL` entries that exactly negate the original distributions. The
original run and its distributions remain in the database forever, marked reversed.

Required: a written reason of at least 20 characters, a type-to-confirm, and a decision on
whether to notify affected users (default yes). The reversal appears in the audit log and on the
user's own transaction history — because a user who saw +$8.75 yesterday and doesn't see it today
deserves an explanation in the interface, not silence.

---

## 8. User management — `/admin/users`

### List

Search by name, email or reference. Filter by status, role, KYC status, balance range,
registration date, funded/unfunded. Sort by balance, profit, join date. Export the filtered set.

### Detail page

Tabs: **Overview** (profile, wallet, quick actions) · **Ledger** (full transaction history) ·
**Deposits** · **Withdrawals** · **Distributions** · **Sessions** · **Activity** (audit entries
for this user).

### Manual balance adjustment — 👑 only

The most dangerous button in the product, so it is treated accordingly:

- Requires `SUPER_ADMIN`
- Requires a reason of at least 10 characters, ideally referencing a support ticket
- Shows a preview: current balance → adjustment → resulting balance
- Requires type-to-confirm
- Writes an `ADJUSTMENT_CREDIT`/`ADJUSTMENT_DEBIT` ledger entry, an audit row with before/after,
  and notifies the user by default
- Appears in the user's own transaction history with the description — nothing is done to a user's
  money that the user cannot see

### Suspension

Suspending blocks login, deposits and withdrawals, and excludes the wallet from daily-return
distribution. It does **not** touch the balance. The reason is recorded and shown to the user on
their next login attempt, because a silent lockout generates a furious support ticket every time.

---

## 9. Notifications & broadcast — `/admin/broadcast`

The send flow is deliberately slow at the front and fast at the back:

```
1. Compose            subject, rich body, optional CTA link
2. Segment            all · active · funded · balance range · country · joined between
3. Preview  ────────► "This will reach 1,284 people." + a sample rendered message
4. Test send  ──────► goes only to the composing admin
5. Send / Schedule  ► type-to-confirm, then queued through the outbox with throttling
6. Stats            sent, failed, opened; failures visible and retryable
```

A broadcast cannot be sent without a preview and a test send. Email is the one action with no undo,
so the friction is intentional.

---

## 10. Settings — `/admin/settings` 👑

| Group | Settings |
|-------|----------|
| Platform | Name, logo, support email, timezone (defines the trading-day boundary), maintenance mode |
| Financial | Return basis (compounding/simple), min deposit, min withdrawal, withdrawal fee, cooldown hours, max daily return %, allow negative returns |
| Payment methods | Add/edit/deactivate deposit channels with instructions and account details |
| Email | Sender name and address, SMTP status, template editing with preview |
| Notifications | Daily digest hour, which events are mandatory |
| Security | Session lifetimes, login attempt limits, admin 2FA enforcement |

Every settings change is audited with before/after values. Changing the timezone or the return
basis shows a prominent warning explaining the effect on future calculations, since both silently
alter how money is computed.

---

## 11. Audit log — `/admin/audit-log`

Filterable by actor, action, target type, target ID and date range. Each row expands to a
before/after diff.

What is guaranteed to be in there: every deposit and withdrawal decision, every balance
adjustment, every daily-return application and reversal, every role change, every settings change,
every user suspension, every login by an admin account.

The audit log is append-only and is never deleted. If a dispute reaches a lawyer, this table is
the answer.

---

## 12. Admin safety principles

1. **Preview before mutate** for anything affecting more than one user.
2. **Reason required** for anything a user might later question.
3. **Type-to-confirm** for anything irreversible or wide-reaching.
4. **Two-person separation for the riskiest actions**: the person who records trades should not be
   the only one who can reverse a distribution. Enforced by role, not by policy alone.
5. **Never edit distributed history.** Compensate forward.
6. **Every admin action is attributable** — actor, IP, timestamp, request ID.
7. **The admin UI never shows a raw database ID as the primary identifier.** References like
   `DEP-2026-000412` are what appear in support conversations.
