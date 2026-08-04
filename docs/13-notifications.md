# 13 — Notifications

One API for the application, several delivery channels behind it, and a design that keeps a slow
email server from ever affecting a wallet balance.

---

## 1. Architecture

```
Business code
    │
    │  notifications.notify(userId, 'DAILY_PROFIT', payload)
    ▼
┌──────────────────────────────────────────────────────────┐
│ NotificationService                                       │
│  1. Resolve the user's preferences for this event         │
│  2. Write the Notification row (the in-app record)        │
│  3. For each enabled channel → enqueue a delivery job     │
│  4. Return immediately — never blocks the caller          │
└───────────────────────┬──────────────────────────────────┘
                        │
              ┌─────────┴──────────┬─────────────┬──────────────┐
              ▼                    ▼             ▼              ▼
      ┌──────────────┐    ┌──────────────┐  ┌──────────┐  ┌──────────┐
      │ InAppChannel │    │ EmailChannel │  │ Telegram │  │ WhatsApp │
      │  (immediate) │    │ (Nodemailer) │  │  (stub)  │  │  (stub)  │
      └──────────────┘    └──────────────┘  └──────────┘  └──────────┘
              │                    │
              └────────┬───────────┘
                       ▼
            NotificationDelivery rows
            status · attempts · lastError · sentAt
```

### The channel interface

```ts
interface NotificationChannel {
  readonly name: NotificationChannelName
  isAvailable(user: User): Promise<boolean>     // e.g. has a verified email / linked Telegram
  send(user: User, payload: NotificationPayload): Promise<DeliveryResult>
}
```

Adding Telegram later means implementing this interface, registering it, and adding a preference
row type. No calling code changes, because business code only ever says *what happened*, never
*how to tell someone*.

### Two rules that shape everything

1. **Notifications never block business logic.** They are emitted after commit, dispatched
   asynchronously, and a failure is logged and retried — never propagated to the caller. A failing
   SMTP server must not prevent a deposit from being credited.
2. **Fan-out is queued, never inline.** A daily-return run notifying 10,000 users writes 10,000
   outbox rows inside its transactions and returns. The worker drains them afterwards.

---

## 2. Event catalogue

| Event | In-app | Email | User can disable | Trigger |
|-------|:------:|:-----:|:----------------:|---------|
| `DEPOSIT_RECEIVED` | ✓ | ✓ | Email | User submits a deposit |
| `DEPOSIT_APPROVED` | ✓ | ✓ | Email | Admin approves |
| `DEPOSIT_REJECTED` | ✓ | ✓ | Email | Admin rejects |
| `WITHDRAWAL_REQUESTED` | ✓ | ✓ | Email | User requests |
| `WITHDRAWAL_APPROVED` | ✓ | ✓ | Email | Admin approves |
| `WITHDRAWAL_REJECTED` | ✓ | ✓ | Email | Admin rejects |
| `WITHDRAWAL_PAID` | ✓ | ✓ | Email | Admin marks paid |
| `DAILY_PROFIT` | ✓ | ✓ | Email | Daily return applied, positive |
| `DAILY_LOSS` | ✓ | ✓ | Email | Daily return applied, negative |
| `RETURN_REVERSED` | ✓ | ✓ | **No** | A run is reversed |
| `BALANCE_ADJUSTED` | ✓ | ✓ | **No** | Admin adjusts a balance manually |
| `MONTHLY_STATEMENT` | — | ✓ | ✓ | Monthly job |
| `EMAIL_VERIFICATION` | — | ✓ | **No** | Registration |
| `WELCOME` | ✓ | ✓ | ✓ | Email verified |
| `PASSWORD_RESET` | — | ✓ | **No** | Reset requested |
| `PASSWORD_CHANGED` | ✓ | ✓ | **No** | Password changed |
| `NEW_DEVICE_LOGIN` | ✓ | ✓ | **No** | Login from an unrecognised device |
| `SESSIONS_REVOKED` | ✓ | ✓ | **No** | Refresh-token reuse detected |
| `ACCOUNT_SUSPENDED` | ✓ | ✓ | **No** | Admin suspends |
| `ANNOUNCEMENT` | ✓ | ✓ | Email | Admin broadcast |

Security and money-movement events cannot be disabled. A user who has opted out of email must still
be told that their password changed or that an admin altered their balance.

---

## 3. Preferences

Stored per user, per event type, per channel in `NotificationPreference`. Absent rows default to
enabled. The preferences page renders a matrix:

```
                              In-app    Email
Deposit updates                 ✓         ✓
Withdrawal updates              ✓         ✓
Daily profit & loss             ✓         ✓
Monthly statement               —         ✓
Announcements                   ✓         ☐
Security alerts                 ✓         ✓     (always on, shown disabled)
```

In-app notifications for money events cannot be disabled either — the record must exist in the
user's history even if they never open it, because it is the trail for a future dispute.

Every non-security email carries a one-click unsubscribe link and the `List-Unsubscribe` header,
which materially improves deliverability as well as being the right behaviour.

---

## 4. Email

### Delivery

Nodemailer with a pooled SMTP transport (5 connections, 100 messages per connection), a global
send-rate limit configured to stay inside the provider's quota, and per-recipient throttling of at
most 10 emails per hour outside of security events.

Retry uses exponential backoff — 1min, 5min, 15min, 1h, 6h — up to five attempts. A permanent
failure (hard bounce, invalid address) is dead-lettered immediately rather than retried, and
repeated hard bounces mark the address undeliverable and surface a banner to the user in-app.

### Templates

Built with React Email, rendered to HTML with an automatically generated plain-text alternative.
Fifteen templates, all sharing one layout: logo, single-column 600px, dark-mode-safe colours,
button as a bulletproof table cell, footer with support contact and unsubscribe.

| Template | Subject | Core content |
|----------|---------|--------------|
| `verify-email` | Verify your email address | CTA button, 24h expiry note, raw link fallback |
| `welcome` | Welcome to Meridian FX | What happens next, deposit CTA |
| `reset-password` | Reset your password | CTA, 1h expiry, "ignore if this wasn't you" |
| `password-changed` | Your password was changed | Time, IP, "wasn't you" action link |
| `new-device-login` | New sign-in to your account | Device, location, time, revoke link |
| `deposit-received` | We received your deposit request | Reference, amount, next steps, review SLA |
| `deposit-approved` | Your deposit of $X has been approved | Amount credited, new balance, when it starts earning |
| `deposit-rejected` | About your deposit request | Reason, how to correct it, support link |
| `withdrawal-requested` | Withdrawal request received | Reference, amount, destination, review SLA |
| `withdrawal-approved` | Your withdrawal has been approved | Amount, destination, expected arrival |
| `withdrawal-rejected` | About your withdrawal request | Reason, funds returned to balance, support link |
| `withdrawal-paid` | Your withdrawal has been sent | Transaction reference, amount, destination |
| **`daily-profit`** | Your daily return: +0.70% | **The day's trades, their earning, new balance** |
| `monthly-statement` | Your July statement | Opening/closing balance, profit, return %, PDF attached |
| `broadcast` | *(admin-defined)* | Announcement body with optional CTA |

### The daily profit email — the one that matters

This email is the product's daily touchpoint. It is the reason users trust the platform, or don't.

```
Subject: Your daily return: +0.70% (+$8.76)

  Hi Ayesha,

  Today's trading is settled.

  ┌──────────────────────────────────────────────┐
  │  Today's return          +0.70%              │
  │  Your earning            +$8.76              │
  │  New balance          $1,259.51              │
  └──────────────────────────────────────────────┘

  Today's trades

  EUR/USD   BUY    1.1700 → 1.1782    +0.70%
  "London session breakout above 1.1695 resistance."

  [ View your dashboard ]

  Your balance of $1,250.75 earned 0.70% today.
  ─────────────────────────────────────────────
  Past performance does not guarantee future results.
  Manage email preferences · Unsubscribe
```

The penultimate line — stating the base balance and the percentage — is what makes the number
self-verifying. A user can check the arithmetic in their head, and that is precisely why they will
believe the next one.

**On a losing day** the same template renders with `−0.32%` and `−$4.00`, in the loss colour, with
the same prominence and the same trade detail. Subject: *"Your daily return: −0.32% (−$4.00)"*. No
softening, no burying. Consistency on bad days is what makes the good days credible.

---

## 5. In-app notifications

- A bell in the topbar with an unread count, polled every 60 seconds via
  `GET /notifications/unread-count` (a single cheap indexed count).
- The dropdown shows the 10 most recent, with type icon, title, relative time and unread emphasis.
- `/notifications` is the full list: type filter, unread filter, mark one or all read, dismiss,
  infinite scroll.
- Clicking a notification navigates to its `actionUrl` and marks it read.
- Retention is 12 months, then archived.

`TODO(owner)`: 60-second polling is the right v1 choice — it is trivial, works behind any proxy,
and costs one indexed count query per user per minute. Switch to server-sent events when concurrent
sessions exceed roughly 500, at which point polling load becomes noticeable.

---

## 6. Broadcast

```
Compose  →  Segment  →  Preview  →  Test send  →  Send / Schedule  →  Stats
```

Segments compose from: all users, by status, funded vs unfunded, balance range, country,
registration date range, and last-active window. The preview resolves the segment to a recipient
count and a sample rendered message; a test send goes only to the composing admin.

Sends are queued through the outbox and throttled to stay within provider limits. Marketing
broadcasts respect the marketing opt-out; operational announcements (maintenance windows, policy
changes) do not, and the composer makes the admin choose which kind it is.

Stats track sent, failed and opened counts. Failures are listed and individually retryable.

---

## 7. Reliability: the outbox pattern

The reason a daily-return run can safely notify 10,000 users:

```
Inside the distribution transaction:
    UPDATE wallets …
    INSERT ledger_entries …
    INSERT outbox_events (event_type, payload, status = PENDING)
COMMIT                                   ← notification intent is now durable

Outbox worker, every 10 seconds:
    SELECT … WHERE status = PENDING AND (next_retry_at IS NULL OR next_retry_at <= now())
             ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED
    dispatch each → on success mark DONE
                  → on failure attempts++, next_retry_at = backoff, status back to PENDING
                  → after 5 attempts → DEAD, visible in the admin UI, manually retryable
```

`FOR UPDATE SKIP LOCKED` means multiple workers can drain the queue concurrently without
processing the same row twice — which matters the moment a second API instance exists.

Guarantees: at-least-once delivery; no notification is lost if the process crashes mid-run; a
notification is never sent for a transaction that rolled back, because the outbox row rolled back
with it.

---

## 8. Future channels

Both stubs implement `NotificationChannel` and are registered but disabled, so wiring them up is
configuration plus an adapter rather than a refactor.

### Telegram
Bot API. The user links their account by messaging the bot with a one-time code from their
settings page; the resulting chat ID is stored on the user. Best suited to `DAILY_PROFIT` and
security alerts, which are short and time-sensitive.

### WhatsApp
Cloud API. Requires pre-approved message templates and explicit opt-in with a verified phone
number, and messages outside a 24-hour customer-service window must use an approved template.
These constraints are business ones, not technical, which is exactly why the channel is deferred
rather than half-built.

Both are gated behind a per-channel feature flag, and both respect the same preference matrix as
email.

---

## 9. Testing

| Test | Assertion |
|------|-----------|
| Preference resolution | Disabled channels are skipped; security events ignore preferences |
| Fan-out | 10,000 notifications enqueue without blocking the calling run |
| Outbox retry | A transient failure retries with backoff and eventually succeeds |
| Dead-lettering | Five failures move the event to `DEAD` and surface it in admin |
| Transactional integrity | A rolled-back transaction sends nothing |
| Template rendering | All 15 templates render with real and with missing/edge data |
| Email client compatibility | Gmail, Outlook, Apple Mail, mobile — light and dark |
| Unsubscribe | The link works and is honoured on the next send |
| Rate limiting | Per-recipient throttle holds under a burst |
