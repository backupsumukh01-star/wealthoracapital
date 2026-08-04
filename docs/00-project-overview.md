# 00 — Project Overview

## 1. What we are building

Meridian FX is a managed Forex investment platform. Investors deposit funds, the operator's
trading desk publishes the results of its daily Forex activity, and the platform distributes the
resulting percentage return across every funded wallet automatically. Investors get a premium,
transparent dashboard showing exactly what was traded, when, and what it earned them.

The product has two faces:

- **The investor product** — a marketing site that converts, and a dashboard that builds trust
  through transparency: today's profit, total profit, ROI, the actual trades behind the numbers,
  and a performance curve that can be exported.
- **The operator product** — an admin console where the desk records trades, applies the daily
  return, approves deposits and withdrawals, broadcasts announcements, and audits everything.

## 2. Who uses it

| Persona | Role | Primary need |
|---------|------|--------------|
| **Investor (Ayesha)** | `USER` | Deposit easily, see profit accrue daily, trust the numbers, withdraw without friction |
| **Trading desk operator (Bilal)** | `ADMIN` | Record the day's trades in under two minutes, apply the return, move on |
| **Finance / support (Zara)** | `ADMIN` (finance scope) | Verify deposit screenshots, approve withdrawals, answer "where is my money" |
| **Platform owner (Omar)** | `SUPER_ADMIN` | Full oversight, settings, staff management, audit trail, reversals |

## 3. The money model

This is the single most important section of the documentation. Everything else follows from it.

### 3.1 Balance definition

Each user has exactly one `Wallet` in v1 with three tracked figures:

| Figure | Meaning |
|--------|---------|
| `balance` | Total spendable value: principal + accrued profit − withdrawals |
| `investedAmount` | Sum of approved deposits still in the programme (the principal base) |
| `totalProfit` | Lifetime sum of all profit distributions, positive and negative |

`balance` is a **projection**. It is always equal to the sum of every `LedgerEntry.amount` for
that wallet. A reconciliation job verifies this nightly and alerts on drift.

### 3.2 The ledger

Every event that changes money writes an immutable append-only `LedgerEntry`:

```
DEPOSIT_APPROVED      +1,000.00000000   ref: Deposit#412
PROFIT_DISTRIBUTION      +7.00000000    ref: DailyReturnRun#88
PROFIT_DISTRIBUTION      -3.20000000    ref: DailyReturnRun#89   (losing day)
WITHDRAWAL_LOCKED       -250.00000000   ref: Withdrawal#77
WITHDRAWAL_REFUNDED     +250.00000000   ref: Withdrawal#77       (rejected)
ADJUSTMENT_CREDIT        +5.00000000    ref: AuditLog#901        (goodwill)
```

Entries are **never updated or deleted**. A mistake is corrected by writing a compensating entry,
which keeps the history honest and makes disputes resolvable.

### 3.3 How the daily return works

The operator records one or more trades for a date, each with a percentage return. The platform
computes a **net daily return percentage** for that trading day, then applies it to every eligible
wallet:

```
profit = wallet.balance × (netDailyReturnPct / 100)
```

Two policy questions must be answered before implementation. They are recorded here as explicit
decisions, not left implicit in code:

- **Q1 — Compounding.** Is the return applied to `balance` (compounding, profit earns profit) or
  to `investedAmount` (simple, only principal earns)? **Decision: compounding on `balance`, configurable
  via `Settings.returnBasis`.** Simple mode ships as a setting because operators change their mind.
- **Q2 — Eligibility.** A deposit approved at 3pm — does it earn that day's return?
  **Decision: a wallet is eligible for trading day `D` if it had a positive balance at the start of
  `D` (00:00 platform timezone).** Deposits approved during `D` earn from `D+1`. This is stored per
  distribution as `eligibleBalance` so the calculation is auditable years later.

Both answers are written into `Settings` and displayed in the admin UI so nobody has to read code
to know how their money behaves.

### 3.4 Rounding

All arithmetic is performed at 8 decimal places and rounded **half-up to 2 decimals** only at the
point of writing a ledger entry. The rounding remainder across all users in a run is recorded on
the `DailyReturnRun` as `roundingDelta` so the books stay explainable.

### 3.5 Precision rule

> No monetary value is ever stored, transmitted or computed as a JavaScript `number`.

- Postgres: `DECIMAL(20, 8)`
- Prisma: `Decimal`
- Node: `Prisma.Decimal` / `decimal.js`
- JSON over the wire: **string** (`"1000.00"`), never a JSON number
- Frontend: parse to `Decimal` for any arithmetic, format with `Intl.NumberFormat` for display

## 4. Scope

### In scope for v1

- Marketing landing page and legal pages
- Email + password auth, Google OAuth, email verification, password reset
- Investor dashboard with live figures, performance chart, recent trades
- Manual deposits with screenshot proof and admin approval
- Withdrawal requests with admin approval and balance locking
- Trade recording and the daily return engine
- Permanent trade and profit history with filter, sort, CSV and PDF export
- Monthly / yearly / lifetime performance views
- In-app notifications and transactional email
- Admin console: dashboard, users, deposits, withdrawals, daily profit, trades, notifications,
  email broadcast, settings
- Audit logging and role-based access control

### Explicitly out of scope for v1

| Deferred | Why | Where it plugs in later |
|----------|-----|-------------------------|
| Automated payment gateway / crypto rails | Manual review is the trust model for v1 | `PaymentProvider` interface behind the deposit module |
| Live broker/MT5 integration | Trades are operator-entered in v1 | `TradeSource` enum already includes `IMPORTED` |
| Telegram / WhatsApp notifications | Channel abstraction ships now, adapters later | `NotificationChannel` registry |
| Multi-currency wallets | Schema stays USD-only; adding it is a migration | `Wallet.currency` column reserved |
| Referral / affiliate programme | Not core to trust loop | New module, no schema conflict |
| Two-factor authentication for investors | Admin 2FA ships in v1; investor 2FA in v1.1 | `User.twoFactorSecret` reserved |
| Mobile apps | The dashboard is fully responsive instead | API is already client-agnostic |

## 5. Non-functional targets

| Dimension | Target |
|-----------|--------|
| Landing page LCP | < 1.8s on 4G, Lighthouse performance ≥ 90 |
| Dashboard API p95 | < 300ms |
| Daily return run | 10,000 wallets in < 60s, fully transactional |
| Uptime | 99.5% (single VPS, documented upgrade path to HA) |
| Data retention | Trades, ledger and audit logs retained **forever**; never hard-deleted |
| Backup RPO / RTO | RPO 24h via nightly dump (target 1h via WAL), RTO 2h documented and rehearsed |
| Accessibility | WCAG 2.1 AA on all authenticated pages |
| Browser support | Last 2 versions of Chrome, Safari, Firefox, Edge |

## 6. Design philosophy

The visual bar is set by the best fintech products on the web — FundedNext, Ramp, Deel, Linear,
Stripe. What we take from them is **discipline**, not design:

- Generous, consistent vertical rhythm instead of cramped sections
- One accent colour used sparingly, so it means something when it appears
- Motion that clarifies hierarchy and never blocks reading — 150–400ms, ease-out, reduced-motion
  respected
- Numbers as the hero element, set in a tabular-figure typeface
- Dark-first surface palette with real depth from layered elevation, not drop shadows everywhere

What we do **not** take: markup, CSS, assets, illustrations, copy, colour values, section order,
brand language or component libraries lifted from any of them. Our layout, palette, typographic
pairing and motion language are defined independently in
[Design System](./10-design-system.md), and every section of the landing page has an original
structure documented in [UI Page List](./09-ui-pages.md).

## 7. Tech stack (locked)

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | Next.js 15 (App Router), TypeScript | React Server Components for marketing, client components for dashboard |
| Styling | Tailwind CSS v4 | Design tokens as CSS variables, consumed by Tailwind theme |
| Animation | Framer Motion | Scroll reveals, page transitions, number counters |
| Data fetching | TanStack React Query v5 | Cache, optimistic updates, background refetch |
| Forms | React Hook Form + Zod resolver | Shared schemas with backend |
| Charts | Recharts | SSR-friendly, small, composable |
| Backend | Node.js 22 LTS, Express 5, TypeScript | Modular monolith |
| ORM | Prisma 6 | Migrations under version control |
| Database | PostgreSQL 16 | Single primary, nightly logical backups |
| Auth | JWT access + rotating refresh, Google OAuth, argon2id hashing | httpOnly cookies |
| Email | Nodemailer + React Email templates | SMTP provider swappable |
| Queue/Jobs | `node-cron` in v1, BullMQ + Redis when volume demands | Documented upgrade trigger |
| Storage | Local disk behind `StorageProvider`; S3 adapter later | Never touch `fs` in domain code |
| Logging | Pino → JSON → file → logrotate | Correlation ID per request |
| Deployment | VPS + Nginx + PM2 | Zero-downtime reload, systemd-managed PM2 |

## 8. Compliance posture

**This must be resolved by the operator before the platform accepts a single real deposit.**

Pooling third-party money and distributing returns is a regulated activity in most jurisdictions.
The software does not make it legal. Before go-live the operator MUST have:

- [ ] Legal opinion on licensing in the operating and target-customer jurisdictions
- [ ] A decision on whether the platform holds custody of funds or merely records them
- [ ] KYC/AML policy and, if required, a KYC provider integrated (schema hooks reserved on `User`)
- [ ] Terms of Service, Privacy Policy, Risk Disclosure and Refund Policy drafted by counsel
- [ ] Explicit, prominent risk disclosure on the landing page and at deposit time — losses are
      possible and past performance is not indicative of future results
- [ ] Clarity on tax reporting obligations for distributed returns

Engineering will build the hooks (KYC status fields, document storage, risk-disclosure acceptance
tracking, jurisdiction blocking). Engineering cannot supply the licence.

`TODO(owner)`: resolve all boxes above and record the outcome in `docs/16-compliance.md`.
