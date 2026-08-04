# 06 — User Flow

The investor's journey, end to end. Each flow lists the happy path, the failure paths, and the
state changes the system records — because a flow that only documents success is a flow that will
be implemented badly.

---

## 1. The lifecycle in one picture

```
  Discover          Convert           Fund              Earn              Realise
 ┌────────┐      ┌──────────┐    ┌───────────┐    ┌────────────┐    ┌────────────┐
 │Landing │─────►│ Register │───►│  Deposit  │───►│  Daily     │───►│  Withdraw  │
 │  page  │      │ + Verify │    │ + Proof   │    │  Return    │    │            │
 └────────┘      └──────────┘    └─────┬─────┘    └─────┬──────┘    └─────┬──────┘
                                       │                │                 │
                                  admin review     admin applies     admin approves
                                       │                │                 │
                                       ▼                ▼                 ▼
                                  wallet credited   wallet grows      funds paid
                                       │                │                 │
                                       └────────────────┴─────────────────┘
                                                        │
                                                        ▼
                                              notification + email
                                              every single time
```

---

## 2. Discovery → registration

### Happy path

1. Visitor lands on `/` from search, ad or referral.
2. Hero states the proposition in one sentence with a single primary CTA (**Start investing**) and
   a secondary, lower-commitment CTA (**See performance**).
3. They scroll: statistics band → performance showcase → how it works → advantages → testimonials
   → FAQ. Each section answers the next objection in order.
4. The risk disclosure is visible before the final CTA, not buried in the footer.
5. They click **Start investing** → `/register`.

### Design intent

The landing page is a sequence of objections and answers:

| Section | The visitor's unspoken question |
|---------|-------------------------------|
| Hero | "What is this?" |
| Statistics | "Is anyone else using it?" |
| Performance | "Does it actually work?" |
| How it works | "What do I have to do?" |
| Advantages | "Why you and not someone else?" |
| Testimonials | "Do real people trust it?" |
| FAQ | "What happens if…?" |
| Risk + CTA | "Am I comfortable starting?" |

### Failure paths

| Situation | Behaviour |
|-----------|-----------|
| Visitor is already logged in | Nav shows **Dashboard** instead of Login/Register |
| Slow connection | Above-the-fold content is server-rendered; animations never gate content |
| Reduced motion enabled | All reveals resolve instantly to their final state |
| JS disabled | Landing content is fully readable; only interactivity is lost |

---

## 3. Registration → first login

Full detail in [08 — Authentication Flow](./08-authentication-flow.md). Summary from the user's
side:

```
/register
   ├─ Email + password  ──► verification email ──► /verify-email?token=… ──► /login
   └─ Continue with Google ──► consent ──► account created & verified ──► /dashboard
```

State: `User.status = PENDING_VERIFICATION` → `ACTIVE`, `Wallet` created with zero balance on
verification (not on registration — an unverified account has no wallet to attack).

### What the user sees when things go wrong

| Situation | What we show |
|-----------|-------------|
| Email already registered | "An account with this email already exists." + link to login and to reset password. We do **not** reveal whether it was verified |
| Weak password | Live strength meter and a specific reason ("This password has appeared in a data breach") |
| Verification link expired | "This link has expired." + a **Resend** button that works without logging in |
| Verification link already used | "Your email is already verified." + link to login. Not an error |
| Login before verifying | Redirect to `/verify-email/sent` with a resend option, not a dead-end error |

---

## 4. First-run experience

A newly verified user with a zero balance must not land on an empty dashboard full of zeroes. The
dashboard renders an **onboarding state**:

1. A three-step checklist: *Verify email* ✓ → *Make your first deposit* → *Earn your first return*
2. Real, non-fake platform performance so the empty account still shows what the programme does
3. A single primary action: **Make your first deposit**

Empty states elsewhere follow the same principle: explain what will appear here and give the one
action that makes it appear.

---

## 5. Deposit flow

```
/deposit
  │
  ├─ 1. Choose amount        validated against financial.minDeposit
  ├─ 2. Choose method        bank transfer / crypto / mobile wallet (admin-configured)
  ├─ 3. See instructions     account details, copy buttons, exact reference to quote
  │
  ├─ 4. Submit  ──────────►  Deposit created  status = PENDING
  │                          reference DEP-2026-000412 generated
  │                          ⚠ no money has moved yet — stated plainly on screen
  │
  ├─ 5. Pay externally       (outside the platform)
  │
  ├─ 6. Upload proof ──────► screenshot/PDF, ≤5MB, magic-byte validated,
  │                          EXIF stripped, re-encoded, stored by key
  │
  └─ 7. Wait  ────────────►  admin review (SLA shown: "usually within 2 hours")
                                 │
                    ┌────────────┴─────────────┐
                    ▼                          ▼
              APPROVED                     REJECTED
     wallet credited (ledger)        reason shown to user
     investedAmount increased        no balance change
     notification + email            notification + email
     eligible for return from D+1    can correct and resubmit
```

### State transitions

| From | Event | To | Side effects |
|------|-------|----|--------------|
| — | user submits | `PENDING` | Reference generated, admin queue notified |
| `PENDING` | proof uploaded | `PENDING` | `proofKey` set; admin queue flagged ready |
| `PENDING` | admin opens | `UNDER_REVIEW` | Soft lock so two admins don't both act |
| `PENDING`/`UNDER_REVIEW` | approve | `APPROVED` | Ledger credit, wallet + invested updated, notify |
| `PENDING`/`UNDER_REVIEW` | reject | `REJECTED` | Reason stored, notify, **no** balance change |
| `PENDING` | user cancels | `CANCELLED` | Nothing financial |

### Failure paths

| Situation | Behaviour |
|-----------|-----------|
| Amount below minimum | Blocked client-side and server-side with the actual minimum in the message |
| Upload too large / wrong type | Rejected before storage with a specific reason; the deposit stays `PENDING` so they can retry |
| User closes the tab after step 4 | Deposit persists as `PENDING`; dashboard shows a banner "1 deposit awaiting proof" with a resume link |
| Double submit | `Idempotency-Key` returns the original deposit, not a second one |
| Admin approves twice | Second attempt returns `409 CONFLICT`; the ledger is untouched |

### The trust requirement

At every step the user must know exactly where their money is. The deposit detail page shows a
timeline: *Submitted → Proof uploaded → Under review → Approved*, with real timestamps. Ambiguity
here is what generates support tickets and destroys confidence.

---

## 6. The daily return — the user's experience

This is the core loop, and it happens without the user doing anything.

```
Evening (platform timezone)
  │
  │  Admin records the day's trades and applies the return
  ▼
User receives:
  • In-app notification            "Today's return: +0.70% · +$8.75"
  • Email (if enabled)             the day's trades, their earning, new balance
  │
Next time they open the dashboard:
  • Today's profit card animates from 0 to $8.75
  • Total profit and ROI update
  • Equity chart gains a point
  • Recent trades table shows EUR/USD BUY 1.1700 → 1.1782 +0.70%
```

### On a losing day

The product must handle losses with the same clarity as gains, or it is not trustworthy.

- The notification reads "Today's result: −0.32% · −$4.00" — no euphemism, no hiding.
- The profit card is red, with the same prominence as a green day.
- The trade that caused it is visible with its actual entry, exit and reasoning notes.
- The equity chart dips. It is never smoothed or truncated to hide drawdown.

### If no return has been applied yet today

The dashboard says so explicitly: *"Today's return hasn't been published yet. Trading days are
usually settled by 6:00 PM UTC."* An unexplained zero looks like a bug and prompts a support
ticket; a stated pending state does not.

---

## 7. Viewing history and performance

### Trade history — `/trades`

- Default: last 30 days, newest first
- Filters: date range, pair, direction, outcome, return range, free-text search
- All filter state lives in the URL, so a view is shareable and survives refresh
- Sort by date, pair or return
- Server-side pagination, 20 per page
- Each row expands to show entry, exit, stop, lots, timestamps and the desk's notes
- Export: **CSV** (raw data) or **PDF** (branded report with the applied filters printed on it)

The exported file always matches the filtered view exactly. A mismatch between the screen and the
download is a bug of the highest severity, because users reconcile these against their own records.

### Performance — `/performance`

| View | Content |
|------|---------|
| Lifetime | Total invested, total profit, ROI %, active days, win rate |
| Yearly | One row per year: return %, profit, best month, worst month |
| Monthly | A grid of months with return %, profit and active days; click through to that month's days |
| Equity curve | Balance over time with range toggles (7d / 30d / 90d / 1y / all) |
| Distribution log | Every profit distribution the user received, with the base balance used |

The distribution log is the transparency backstop: for any date, the user can see the balance the
return was applied to, the percentage, and the resulting amount. That triple makes every number on
the dashboard independently checkable, which is precisely what a suspicious investor wants.

---

## 8. Withdrawal flow

```
/withdraw
  │
  ├─ 1. Available balance shown        balance − locked, computed server-side
  ├─ 2. Enter amount                   validated: ≥ minimum, ≤ available, cooldown respected
  ├─ 3. Choose payout method           saved methods, or add a new one
  ├─ 4. Review                         amount, fee, net amount, destination
  ├─ 5. Confirm  ─────────────────►    ⚠ FUNDS LOCK IMMEDIATELY
  │                                    LedgerEntry(WITHDRAWAL_LOCKED, −250.00)
  │                                    status = PENDING, ref WDR-2026-000077
  │                                    available balance drops right away
  │
  └─ 6. Wait  ────────────────────►    admin review
                                          │
                          ┌───────────────┴────────────────┐
                          ▼                                ▼
                      APPROVED                         REJECTED
              lock → WITHDRAWAL_COMPLETED       WITHDRAWAL_REFUNDED (+250.00)
              totalWithdrawn increased          available balance restored exactly
              later: marked PAID with txn ref   reason shown to the user
              notification + email              notification + email
```

**Why funds lock at request time, not at approval:** if they did not, a user could request three
withdrawals for their full balance in quick succession and, depending on approval timing, be paid
three times. Locking at request makes over-withdrawal structurally impossible rather than
dependent on admin vigilance.

### Failure paths

| Situation | Behaviour |
|-----------|-----------|
| Amount > available | `422 INSUFFICIENT_BALANCE` with available and requested in the message |
| Within cooldown after a deposit | `422 WITHDRAWAL_COOLDOWN` with the exact time it becomes available |
| No payout method | The form routes to "Add a payout method" first |
| Two concurrent requests | Row-level lock serialises them; the second sees the reduced available balance |
| User cancels while pending | Funds unlock immediately via a refund entry |
| Admin rejects | Funds unlock, reason is shown, the user can resubmit |

---

## 9. Notifications

| Event | In-app | Email | User can disable? |
|-------|--------|-------|-------------------|
| Deposit approved / rejected | ✓ | ✓ | Email only |
| Withdrawal approved / rejected / paid | ✓ | ✓ | Email only |
| Daily profit or loss | ✓ | ✓ | Email only |
| Monthly statement | — | ✓ | ✓ |
| Password changed | ✓ | ✓ | **No** — security |
| New device login | ✓ | ✓ | **No** — security |
| Admin announcement | ✓ | ✓ | Email only |

Security notifications are not optional. Everything else respects per-event, per-channel
preferences on `/settings/preferences`.

---

## 10. Account settings

| Page | Actions |
|------|---------|
| Profile | Name, phone, country, timezone, avatar |
| Security | Change password, active sessions with device and IP, revoke one or all, 2FA (v1.1) |
| Payout methods | Add, edit, delete, set default |
| Preferences | Notification toggles per event and channel, theme, number format |

Changing a password revokes every other session and sends a security email. A user who has lost
control of their account can recover it themselves.

---

## 11. Support and dead ends

Every error state the user can reach must offer a next action:

| Dead end | Escape hatch |
|----------|-------------|
| Deposit rejected | The reason, plus a **Submit a new deposit** button |
| Withdrawal rejected | The reason, plus **Contact support** with the reference pre-filled |
| Account suspended | The reason category and a support contact — never a blank 403 |
| Verification email not received | Resend, plus a note to check spam, plus support contact |
| Any 500 | The request ID displayed, so support can find the exact log line |

---

## 12. Mobile

Dashboard traffic will be majority mobile. Non-negotiables:

- Bottom-anchored primary actions within thumb reach on the deposit and withdraw forms
- Tables collapse into cards below 768px — never horizontal scroll for financial data
- The balance card is the first thing visible, no scrolling required
- Charts are touch-friendly with tap-to-inspect rather than hover
- File upload uses the native camera picker so a user can photograph a receipt directly
