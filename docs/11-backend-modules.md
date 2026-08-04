# 11 — Backend Modules

Each module is a bounded capability. This document states, for each one, what it owns, what it
exposes to other modules, and the rules it enforces. The invariants listed are the things that must
never be false — they are what the tests exist to prove.

---

## Module map

```
                            ┌──────────┐
                            │  health  │
                            └──────────┘
  ┌──────┐   ┌───────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐
  │ auth │──►│ users │──►│  wallet  │◄──│ settings │   │  audit  │
  └──────┘   └───────┘   └────┬─────┘   └──────────┘   └─────────┘
                              │ ▲ ▲                          ▲
        ┌─────────────────────┘ │ └────────────┐             │
        │                       │              │             │
  ┌──────────┐          ┌──────────────┐  ┌──────────────┐   │
  │ deposits │          │ withdrawals  │  │ daily-return │───┘
  └──────────┘          └──────────────┘  └──────┬───────┘
                                                  │
                                            ┌─────▼─────┐
                                            │  trades   │
                                            └───────────┘
  ┌───────────────┐   ┌─────────────┐   ┌─────────┐   ┌───────┐
  │ notifications │   │ performance │   │ exports │   │ admin │
  └───────────────┘   └─────────────┘   └─────────┘   └───────┘

  Infrastructure: storage · email · queue · cache · jobs
```

Arrows point toward the dependency. `wallet` is depended on by everything that moves money, and
depends on nothing but the database — which is why it is the module to get right first.

---

## 1. `auth`

**Owns:** `Session`, `VerificationToken`, `OAuthAccount`
**Exposes:** `issueTokens`, `verifyAccessToken`, `rotateRefresh`, `revokeSession`,
`revokeAllForUser`, `revokeFamily`

| Concern | Implementation |
|---------|----------------|
| Hashing | argon2id, OWASP params, rehash on login when params change |
| Access token | JWT HS256, 15 min, `sub`/`role`/`sid`/`jti` |
| Refresh token | Opaque 256-bit, SHA-256 stored, rotated on every use |
| Reuse detection | A revoked token presented again revokes the whole `familyId` |
| Google OAuth | Authorization Code + PKCE + state; ID token fully verified |
| Lockout | 5 failures → 15 min lock + security email |

**Invariants**
1. A raw refresh token is never stored — only its hash.
2. A password change or reset revokes sessions and invalidates access tokens issued before it.
3. Account existence is never disclosed by response body, status code or timing.
4. Google account linking requires `email_verified: true` from Google.

---

## 2. `users`

**Owns:** `User`
**Exposes:** `findById`, `findByEmail`, `updateProfile`, `setStatus`, `setRole`, `search`

Handles profile, avatar (via `StorageProvider`), preferences, payout methods, account closure
requests, and admin-side user search and filtering.

**Invariants**
1. Users are soft-deleted; financial history survives deletion under a pseudonymised subject.
2. A suspended user cannot authenticate, transact, or receive a daily-return distribution.
3. Email changes require verification of the new address before taking effect.

---

## 3. `wallet` — the money core

**Owns:** `Wallet`, `LedgerEntry`
**Exposes:** `getWallet`, `getAvailableBalance`, `credit`, `debit`, `lock`, `unlock`, `adjust`,
`getTransactions`, `reconcile`

This is the most important module in the system. Every other money-moving module calls it; it calls
nobody.

### The write API

```ts
// specification — every method requires an explicit transaction handle
interface LedgerService {
  credit(tx, params: {
    walletId: string
    amount: Decimal            // positive
    type: LedgerEntryType
    reference?: { type: string; id: string }
    idempotencyKey?: string
    description: string
    createdById?: string
  }): Promise<LedgerEntry>

  debit(tx, params): Promise<LedgerEntry>   // positive amount, stored negative
  lock(tx, params): Promise<LedgerEntry>    // moves balance → lockedBalance
  unlock(tx, params): Promise<LedgerEntry>
}
```

### How a write executes

```
1. BEGIN (caller's transaction)
2. SELECT * FROM wallets WHERE id = $1 FOR UPDATE      ← serialises concurrent writers
3. Check idempotencyKey → if it exists, return the existing entry, do nothing
4. balanceBefore = wallet.balance
5. Validate: debits must not exceed available balance
6. balanceAfter = balanceBefore + signedAmount
7. INSERT ledger_entries (…, balance_before, balance_after)
8. UPDATE wallets SET balance = balanceAfter, version = version + 1
9. COMMIT (by the caller)
```

Step 2 is what makes concurrent withdrawals safe. Without the row lock, two requests can both read
a $500 balance and both succeed at withdrawing $400.

**Invariants**
1. `balance` always equals `SUM(ledger_entries.amount)` for that wallet. Verified nightly.
2. `balance_after = balance_before + amount` on every entry. Enforced by a `CHECK` constraint.
3. `balance >= 0` and `0 <= lockedBalance <= balance`. Enforced by `CHECK` constraints.
4. Ledger rows are never updated or deleted. Enforced by a database trigger.
5. Every ledger write happens inside a caller-supplied transaction — no implicit auto-commit.
6. The same `idempotencyKey` never produces two entries.

---

## 4. `deposits`

**Owns:** `Deposit`, `PaymentMethod`
**Depends on:** `wallet`, `storage`, `notifications`, `audit`

Create → upload proof → admin review → approve (credit) or reject.

**Approval, transactionally:**
```
BEGIN
  lock the deposit row; abort with CONFLICT if not PENDING/UNDER_REVIEW
  status = APPROVED, reviewer + timestamp
  ledger.credit(tx, DEPOSIT_APPROVED, idempotencyKey = `deposit:${id}:approve`)
  wallet.investedAmount += amount; wallet.totalDeposited += amount
  audit.record(tx, 'deposit.approve', before, after)
COMMIT
→ then emit deposit.approved  (notification + email)
```

**Invariants**
1. A deposit can be approved exactly once. The idempotency key guarantees it even under retry.
2. A rejected deposit never touches the balance.
3. Proof files are only readable by the owner or an admin, through an authorised endpoint.
4. Uploads are validated by magic bytes, re-encoded, and stripped of EXIF before storage.

---

## 5. `withdrawals`

**Owns:** `Withdrawal`, `PayoutMethod`
**Depends on:** `wallet`, `settings`, `notifications`, `audit`

**Request, transactionally:**
```
BEGIN
  SELECT wallet FOR UPDATE
  validate: amount ≥ minWithdrawal, ≤ availableBalance, cooldown satisfied
  ledger.lock(tx, WITHDRAWAL_LOCKED, −amount)
  create Withdrawal(PENDING) with a frozen destinationSnapshot
COMMIT
```

**Approve:** the lock becomes a real debit (`WITHDRAWAL_COMPLETED`), `totalWithdrawn` increases.
**Reject / cancel:** `WITHDRAWAL_REFUNDED` restores exactly the locked amount.
**Mark paid:** records the external transaction reference and optional receipt. No ledger effect —
the money already left at approval.

**Invariants**
1. Funds are locked at request time, never at approval time.
2. The sum of locks for pending withdrawals never exceeds the wallet balance.
3. A rejection refunds exactly the locked amount — never more, never less.
4. `destinationSnapshot` is immutable once written.

---

## 6. `trades`

**Owns:** `Trade`, `TradingDay`
**Depends on:** `audit`

Recording a trade creates the `TradingDay` if it doesn't exist, recomputes `computedReturnPct`,
`tradeCount`, `winCount` and `lossCount`, and suggests a return from entry/exit prices.

**Suggested return:**
```
BUY :  (exit − entry) / entry × 100
SELL:  (entry − exit) / entry × 100
```
This is a *suggestion*. Actual return depends on position sizing relative to the fund, so the
operator's entered value wins; a divergence beyond tolerance produces a warning, not an overwrite.

**Invariants**
1. One `TradingDay` per calendar date — a unique constraint.
2. Trades on a `DISTRIBUTED` day cannot be created, edited or deleted.
3. `computedReturnPct` is recomputed on every trade mutation.
4. `isPublic = false` trades are invisible to investors on every endpoint.

---

## 7. `daily-return` — the engine

**Owns:** `DailyReturnRun`, `ProfitDistribution`
**Depends on:** `wallet`, `trades`, `settings`, `notifications`, `audit`

Full specification in [12 — Trading Engine](./12-trading-engine.md). Summary of the surface:

| Method | Behaviour |
|--------|-----------|
| `preview(date, returnPct?)` | Pure calculation, **zero writes**. Returns totals, per-user sample, warnings |
| `apply(date, returnPct, idempotencyKey)` | Advisory lock → create run → batch distribute → mark complete → queue notifications via outbox |
| `getProgress(runId)` | Processed vs eligible wallet counts |
| `reverse(runId, reason)` | Compensating `PROFIT_REVERSAL` entries; original preserved |

**Invariants**
1. One completed run per trading day — a unique constraint on `tradingDayId`.
2. Applying twice is a no-op that returns the existing run.
3. Two concurrent applies produce exactly one run; the second gets `409 RUN_IN_PROGRESS`.
4. A wallet's `eligibleBalance` at the time of calculation is stored on its distribution.
5. The sum of all distributions equals the recorded `totalDistributed` ± `roundingDelta`.
6. A negative return can never drive a balance below zero.
7. A reversal restores every affected wallet to its exact pre-run balance.

---

## 8. `performance`

**Owns:** nothing — read-only aggregation over `ProfitDistribution` and `LedgerEntry`.

Provides lifetime summary, equity series, monthly and yearly rollups, and the public aggregate feed
for the landing page.

Monthly and yearly aggregates are computed with SQL `date_trunc` grouping and cached for 5 minutes
per user; the public aggregate is cached for 15 minutes globally.

**Invariants**
1. Every figure is derivable from the ledger. Nothing is stored as a separate "performance" total
   that could drift.
2. `GET /performance/public` never exposes per-user data — only non-identifying aggregates.

---

## 9. `notifications`

**Owns:** `Notification`, `NotificationDelivery`, `NotificationPreference`
**Depends on:** `email`, `queue`

See [13 — Notifications](./13-notifications.md).

```ts
interface NotificationChannel {
  readonly name: 'IN_APP' | 'EMAIL' | 'TELEGRAM' | 'WHATSAPP'
  isAvailable(user: User): Promise<boolean>
  send(user: User, payload: NotificationPayload): Promise<DeliveryResult>
}
```

One call — `notify(userId, event, payload)` — resolves the user's preferences, writes the in-app
record, and dispatches to each enabled channel through the queue.

**Invariants**
1. Security notifications ignore preferences and are always delivered.
2. A channel failure never fails the calling business operation.
3. Fan-out to N users is queued, never executed inline in a request.
4. Every send attempt is recorded with its status and error.

---

## 10. `exports`

**Owns:** nothing. Streams CSV and PDF.

- CSV via a streaming writer — never builds the whole file in memory.
- PDF via PDFKit, streamed, with the platform brand, the applied filters printed in the header, and
  the risk disclaimer in the footer.
- Both accept the identical filter query string as the corresponding list endpoint.

**Invariants**
1. An export contains exactly the rows the equivalent list endpoint would return for the same
   filters and the same actor.
2. A user can only export their own data. Admin exports are audited.
3. Generation is streamed; a 100k-row export must not exhaust memory.

---

## 11. `admin`

**Owns:** nothing directly — it composes other modules' services and adds admin-only aggregation
(dashboard metrics, reports, bulk operations, broadcast).

**Invariants**
1. Every route requires `ADMIN` or `SUPER_ADMIN` and passes through the audit middleware.
2. Balance adjustments, role changes, settings changes and reversals require `SUPER_ADMIN`.
3. Bulk operations process items independently and return a per-item result — one failure does not
   silently abort the rest.

---

## 12. `settings`

**Owns:** `Setting`

Typed accessors (`getDecimal`, `getBoolean`, `getNumber`, `getString`) over a JSON-valued table,
cached in memory and invalidated on write. Public settings are exposed unauthenticated; everything
else requires admin.

**Invariants**
1. Every setting has a schema-validated type and a default; a missing row never crashes a request.
2. Changes are audited with before and after values.
3. Changing `financial.returnBasis` or `platform.timezone` warns the operator about the effect on
   future calculations.

---

## 13. `audit`

**Owns:** `AuditLog`

```ts
audit.record({ actorId, actorRole, action, targetType, targetId,
               before, after, reason, ip, userAgent, requestId })
```

Called explicitly inside transactions for financial operations, and automatically by middleware for
all other admin mutations.

**Invariants**
1. Append-only. Never updated, never deleted.
2. Every admin mutation produces exactly one entry.
3. Financial audit entries are written **inside** the same transaction as the change, so an audit
   row cannot exist without its effect, or vice versa.

---

## 14. Infrastructure services

### `storage`

```ts
interface StorageProvider {
  put(key: string, buffer: Buffer, meta: { contentType: string }): Promise<StoredFile>
  get(key: string): Promise<Readable>
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}
```

Local implementation writes under `UPLOAD_ROOT` with keys like `deposits/2026/08/<uuid>.webp`, and
signs URLs with an HMAC + expiry served by an authorised endpoint. S3 implementation ships in v1
but is unused; switching is one environment variable plus a copy script.

**Rules:** the upload directory is outside the web root and never served statically; keys are
generated server-side (never derived from a user-supplied filename); path traversal is impossible
because the key is validated against a strict pattern.

### `email`

Nodemailer with a pooled SMTP transport, React Email templates rendered to HTML plus a plain-text
alternative, per-recipient rate limiting, retry with exponential backoff, and an unsubscribe link
on everything except security mail.

In development the transport points at Mailhog. Templates are stored in the database
(`EmailTemplate`) so an operator can edit copy without a deploy, falling back to the file-based
default if a row is missing.

### `queue`

```ts
interface Queue {
  enqueue(job: JobName, payload: unknown, opts?: { delayMs?, maxAttempts? }): Promise<string>
  process(job: JobName, handler: (payload) => Promise<void>): void
}
```

v1 is an in-process queue backed by the `OutboxEvent` table: enqueue writes a row inside the
caller's transaction, a worker polls and dispatches with exponential backoff, and permanent
failures go to a dead-letter state visible in the admin UI. Swapping to BullMQ + Redis is an
implementation change behind the same interface — triggered when fan-out exceeds 30 seconds or a
second API instance is added.

### `cache`

An in-memory TTL cache for settings, public performance aggregates and per-user dashboard
summaries. Interface-based so Redis can replace it. **Nothing that affects a balance calculation is
ever read from cache** — the engine always reads live from the database inside its transaction.

### `jobs` (cron)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `reconcile-balances` | 02:00 daily | Compare wallet projections to ledger sums; alert on drift |
| `send-daily-digest` | Configurable hour | Daily profit email for users who opted in |
| `expire-tokens` | Hourly | Delete expired sessions and verification tokens |
| `monthly-statement` | 1st of month, 06:00 | Generate and email statements |
| `cleanup-uploads` | 03:00 daily | Remove orphaned proof files with no database reference |
| `outbox-worker` | Every 10s | Dispatch pending outbox events |
| `backup-verify` | 04:00 daily | Confirm the nightly dump exists, is non-trivial in size, and restores |

`reconcile-balances` is the canary for the entire money model. If it ever alerts, that is a P0
incident: it means the ledger and the projection disagree, and every displayed balance is suspect
until the cause is found.
