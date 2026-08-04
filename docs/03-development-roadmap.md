# 03 — Development Roadmap

Ten phases. Each has a **deliverable**, an **exit criterion** and a **demo** — the thing you can
show someone at the end. Nothing is "done" because the code is written; it is done when the exit
criterion is verifiably met.

Estimates assume **one full-stack engineer working full time**. Scale accordingly; the
dependencies, not the hours, are the important part.

---

## Timeline at a glance

```
Phase  0  Foundation & tooling                 ▓▓▓            3 d
Phase  1  Database & Prisma                    ▓▓▓            3 d
Phase  2  Auth system                          ▓▓▓▓▓▓         6 d
Phase  3  Design system & UI kit               ▓▓▓▓▓          5 d
Phase  4  Landing page                         ▓▓▓▓▓          5 d
Phase  5  Wallet & ledger core                 ▓▓▓▓           4 d
Phase  6  Deposits & withdrawals               ▓▓▓▓▓▓         6 d
Phase  7  Trading & daily return engine        ▓▓▓▓▓▓▓        7 d   ← highest risk
Phase  8  Dashboard, history, exports          ▓▓▓▓▓▓         6 d
Phase  9  Admin console                        ▓▓▓▓▓▓▓        7 d
Phase 10  Notifications & email                ▓▓▓▓           4 d
Phase 11  Hardening, QA, deployment            ▓▓▓▓▓▓         6 d
                                               ─────────────────
                                               ≈ 62 working days (~12–13 weeks)
```

Phases 3–4 can run in parallel with 5–6 if a second engineer is available; the design system is
the only shared dependency.

---

## Phase 0 — Foundation & tooling (3 days)

**Goal:** a repo where `pnpm dev` starts both apps and CI is green on an empty project.

- pnpm workspace, Turborepo pipeline, `.nvmrc` (Node 22)
- `apps/web` (Next.js 15, TS strict, Tailwind v4), `apps/api` (Express 5, TS strict, tsx watch)
- `packages/shared` and `packages/config` with shared ESLint/tsconfig/prettier
- Docker Compose for local Postgres 16 + Mailhog
- Zod-validated `env.ts` in both apps, `.env.example` files
- Pino logger, request-id middleware, error handler, `/health`
- Husky + lint-staged; Conventional Commits enforced
- GitHub Actions: typecheck, lint, test, build

**Exit criterion:** clean clone → `pnpm i && docker compose up -d && pnpm dev` → web on :3000,
API `/health` returns `{ ok: true }`, CI green.
**Demo:** the health endpoint and a green pipeline.

---

## Phase 1 — Database & Prisma (3 days)

**Goal:** the full schema exists, migrates and seeds.

- Every model from [04 — Database Schema](./04-database-schema.md)
- Indexes and unique constraints, especially the idempotency keys on `DailyReturnRun`
- Initial migration committed
- Seeds: settings, super-admin, email templates, currency pairs; dev-only demo data
  (40 users, 90 days of trades and distributions) so the dashboard has something real to show
- `withTransaction` helper; Prisma singleton; `Decimal` configured
- Nightly reconciliation job skeleton

**Exit criterion:** `db:reset && db:seed` produces a queryable database with 90 days of coherent
demo history where each wallet's balance equals the sum of its ledger entries.
**Demo:** Prisma Studio showing a seeded user whose ledger reconciles.

---

## Phase 2 — Auth system (6 days)

**Goal:** every path in [08 — Authentication Flow](./08-authentication-flow.md) works.

Backend: register, verify email, login, refresh with rotation + reuse detection, logout,
logout-all, forgot/reset password, Google OAuth (PKCE, state), argon2id hashing, session table,
per-route rate limits, `authenticate`/`authorize` middleware.
Frontend: all `(auth)` pages, `middleware.ts` route guard, session provider, api-client with
silent refresh, protected-route redirects preserving `next`.

**Exit criterion:** integration suite covers register→verify→login→refresh→logout, wrong password
lockout, expired/used/tampered tokens, refresh-token reuse revoking the family, and OAuth account
linking to an existing verified email.
**Demo:** register with email, verify from Mailhog, log in; then log in with Google into the same
account.

---

## Phase 3 — Design system & UI kit (5 days)

**Goal:** the visual language exists as code before any page is built.

- `tokens.css`: colour ramps, spacing scale, radii, elevation, motion durations/easings
- Tailwind theme wired to the tokens; dark-first with light theme
- Typography: display + text pairing, tabular figures for all numerics
- All `components/ui/*` primitives with focus-visible, keyboard and ARIA support
- All `components/motion/*` wrappers, gated on `prefers-reduced-motion`
- `Money`, `Percent`, `DateTime`, `DataTable`, `EmptyState`, `StatusBadge`
- Storybook (or a `/kitchen-sink` dev route) showing every primitive in every state

**Exit criterion:** the kitchen sink renders every component in default/hover/focus/disabled/
error/loading, passes axe with zero violations, and looks correct at 360px, 768px and 1440px.
**Demo:** the kitchen sink page, and toggling reduced motion.

---

## Phase 4 — Landing page (5 days)

**Goal:** the marketing site, at the quality bar set in [00](./00-project-overview.md#6-design-philosophy).

- Hero with original animated equity-curve visual
- Statistics band with count-up on scroll
- Performance showcase (real aggregate data via ISR, cached 15 min)
- How It Works — four steps with an original scroll-linked progression
- Advantages grid
- Testimonials (real, attributed, with consent — placeholders clearly marked until then)
- FAQ accordion with `FAQPage` structured data
- Risk-disclosure banner, CTA band, footer
- Legal pages, `sitemap.ts`, `robots.ts`, OG image generation
- Responsive pass, Lighthouse pass

**Exit criterion:** Lighthouse ≥ 90/95/100/100 on mobile emulation, LCP < 1.8s on throttled 4G,
CLS < 0.05, zero axe violations, and a written originality check confirming no layout, copy,
palette or asset was taken from another product.
**Demo:** the live landing page on a staging URL.

---

## Phase 5 — Wallet & ledger core (4 days)

**Goal:** the money primitives that everything else builds on. **No feature depends on getting
this "mostly right".**

- `ledger.service`: `credit`, `debit`, `lock`, `unlock`, `adjust` — all transaction-bound
- Wallet projection update inside the same transaction, with row-level locking
  (`SELECT ... FOR UPDATE`) to serialise concurrent writes to one wallet
- Money utilities: `Decimal` arithmetic, half-up rounding at 2dp, string serialisation
- Reconciliation job comparing projection to ledger sum
- `GET /wallet`, `GET /wallet/transactions`

**Exit criterion:** a concurrency test firing 50 simultaneous debits against one wallet ends with
a correct balance, zero negative balances, and a ledger that reconciles exactly. Rounding test
over 10,000 distributions accounts for every cent.
**Demo:** the concurrency test running green, and the reconciliation job output.

---

## Phase 6 — Deposits & withdrawals (6 days)

**Goal:** money can enter and leave, with human review.

- `StorageProvider` interface + local implementation; magic-byte validation, image
  re-encode/strip-EXIF, size limits, per-user upload rate limit
- Deposit: create (pending) → upload proof → admin approve (credit + ledger) / reject (reason)
- Withdrawal: request → **lock funds immediately** → admin approve (debit) / reject (unlock)
- Payout methods on the user profile
- Authorised file-serving endpoint (ownership or admin only, signed short-lived URL)
- User-facing deposit and withdrawal pages + history tables
- Admin review drawers with proof viewer

**Exit criterion:** a user cannot withdraw more than their unlocked balance under concurrent
requests; a rejected withdrawal restores the exact locked amount; an approved deposit is
idempotent under a double-click; proof files are inaccessible without authorisation.
**Demo:** full deposit and withdrawal round trip across two browser sessions.

---

## Phase 7 — Trading & daily return engine (7 days) ⚠ highest risk

**Goal:** the feature the whole product exists for. See [12 — Trading Engine](./12-trading-engine.md).

- Trade CRUD: date, pair, direction, entry, exit, return %, lot/volume, notes, tags
- `TradingDay` aggregation and net daily return computation
- `distribution.engine`: pure, deterministic, exhaustively unit-tested
- Preview / dry run: exact per-user impact table before anything is written
- Apply: batched transaction, idempotent via unique `(tradingDayId)` on `DailyReturnRun`,
  advisory lock preventing concurrent runs, progress tracking, rounding-delta capture
- Reversal: compensating entries, never deletion, requires `SUPER_ADMIN` + reason
- Outbox events for the notification fan-out
- Admin UI: trade form, daily-return panel, preview table, type-to-confirm dialog, run summary

**Exit criterion:** all of the following pass — applying twice changes nothing; two concurrent
applies produce one run; a negative return debits correctly and never drives a balance below
zero; a reversal restores every wallet to its pre-run value exactly; 10,000 wallets complete in
under 60s; rounding delta is recorded and reconciles.
**Demo:** record three trades, preview the impact, apply, watch balances move, then reverse it.

---

## Phase 8 — Dashboard, history & exports (6 days)

**Goal:** the investor's daily experience.

- Dashboard: balance, today's profit, total profit, invested, ROI, equity chart, recent trades,
  recent activity, notifications
- Performance page: monthly grid, yearly summary, lifetime ROI, best/worst day, win rate
- Trade history: server-side search, filter (date range, pair, direction, outcome), sort,
  pagination, URL-synced state
- Transactions page: the full personal ledger
- CSV export (streamed) and PDF statement (branded, with disclaimer)
- Skeletons, empty states, error states for every view

**Exit criterion:** dashboard p95 < 300ms with 90 days of seeded history; every number on screen
is traceable to a ledger entry; exports match the on-screen filtered set exactly.
**Demo:** filter to one month, export CSV and PDF, verify the totals match the UI.

---

## Phase 9 — Admin console (7 days)

**Goal:** the operator can run the business without touching the database.

- Ops dashboard: AUM, pending queues, today's P&L, new users, alerts
- Users: search, filter, detail view with wallet, ledger, deposits, withdrawals, sessions;
  suspend/activate; manual adjustment (reason mandatory, audited)
- Deposits and withdrawals queues with bulk actions
- Trades and daily-return management (from Phase 7)
- Notification centre and email broadcast (segmented, previewed, throttled, test-send first)
- Audit log viewer with actor/action/target filters and before/after diff
- Settings: platform, payment methods, staff & roles, email templates
- Reports: AUM over time, deposit/withdrawal volume, user growth

**Exit criterion:** every admin mutation writes an audit row containing actor, IP, before and
after; a non-admin session receives 403 on every admin route (verified by test, not by hiding
buttons); destructive actions require type-to-confirm.
**Demo:** approve a deposit, adjust a balance, then find both in the audit log with full diffs.

---

## Phase 10 — Notifications & email (4 days)

**Goal:** users hear about what matters, on the channels they chose.

- `NotificationChannel` registry; in-app and email adapters; Telegram/WhatsApp stubs
- Notification centre UI: unread badge, mark read, mark all, filter by type
- All 15 transactional templates, responsive, dark-mode safe, plain-text fallback
- Preferences page with per-event channel toggles
- Daily profit email with the day's trades and the user's earning
- Monthly statement job
- Outbox worker with retry/backoff and a dead-letter view for admins

**Exit criterion:** a daily-return run notifies 10,000 users without blocking the run, respecting
preferences and unsubscribe; every template renders correctly in Gmail, Outlook and Apple Mail;
failed sends are retried and visible.
**Demo:** apply a return, watch the notification bell and inbox populate.

---

## Phase 11 — Hardening, QA & deployment (6 days)

**Goal:** it survives contact with the internet.

- Full security checklist from [14](./14-security-checklist.md), including an authenticated
  dependency and header scan
- Load test: 200 concurrent dashboard users, plus a daily-return run at scale
- Playwright E2E suite in CI
- VPS provisioning: hardened SSH, UFW, fail2ban, non-root app user, Postgres tuning
- Nginx: TLS via Certbot with auto-renew, HSTS, security headers, gzip/brotli, upload limits,
  rate limiting
- PM2 cluster for the API, systemd-managed, zero-downtime reload
- Nightly encrypted offsite backups **plus a rehearsed restore**
- Uptime monitoring, error alerting, log rotation
- Staging environment mirroring production
- Runbooks: deploy, rollback, restore, secret rotation, incident response

**Exit criterion:** a restore drill rebuilds the database from the previous night's backup into
staging and passes reconciliation; deploy and rollback both succeed with zero downtime; all
checklist boxes ticked with evidence.
**Demo:** deploy to production, then roll back, without dropping a request.

---

## Post-v1 backlog (prioritised)

| Priority | Item | Trigger |
|----------|------|---------|
| P0 | Investor 2FA (TOTP) | First 100 real users |
| P0 | KYC provider integration | Legal requirement |
| P1 | S3 migration | Uploads exceed 20 GB or a second app server is added |
| P1 | Redis + BullMQ | Notification fan-out exceeds 30s or a second API instance is added |
| P1 | Telegram & WhatsApp channels | User demand |
| P2 | Automated payment rails | Manual review exceeds 2h/day of staff time |
| P2 | Referral programme | Growth phase |
| P2 | Broker/MT5 trade import | Manual entry becomes error-prone |
| P3 | Multi-currency wallets | Non-USD market entry |
| P3 | Mobile apps | Dashboard mobile usage > 60% |

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Double-applied daily return corrupts balances | Medium | **Critical** | Unique constraint + advisory lock + idempotency test suite (Phase 7 exit) |
| Float arithmetic creeps into money code | Medium | **Critical** | `Decimal` everywhere, lint rule, code review checklist, reconciliation job |
| Regulatory intervention | Medium | **Critical** | Compliance gate in [00](./00-project-overview.md#8-compliance-posture) before accepting funds |
| Deposit-proof forgery | High | High | Human review, EXIF strip + re-encode, reference matching, audit trail |
| Single VPS failure | Low | High | Rehearsed restore, documented HA upgrade path, offsite backups |
| Notification fan-out blocks the run | Medium | Medium | Outbox pattern from day one (Phase 7) |
| Scope creep into automated payments | High | Medium | Explicit out-of-scope list, `PaymentProvider` seam ready |
| Design accidentally derivative | Low | High | Originality review at Phase 4 exit, documented token system |
