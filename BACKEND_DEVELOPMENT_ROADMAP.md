# Growzy — Backend Development Roadmap

**Scope:** `apps/api` + PostgreSQL + integrations (email, storage, jobs)  
**Assumption:** Frontend demo UI already exists (Admin OS **v4** final pass); this roadmap replaces localStorage with real APIs per `API_DOCUMENTATION.md` and `DATABASE_SCHEMA.md`  
**Estimates:** one backend-focused engineer, full-time working days (complexity-adjusted). Parallelism notes included.  
**Document type:** Planning only — no implementation in this file  

> Add milestone work for System Health probes, global search, activity feed, platform CMS publish/rollback, RBAC matrix enforcement, backup jobs, and audit export — UI already shipped.

---

## 1. Guiding principles

1. **Ledger before features** — never ship deposits/withdrawals/returns without an immutable ledger.  
2. **Contract first** — implement against `API_DOCUMENTATION.md` envelopes and `@meridian/shared` DTOs.  
3. **Idempotency everywhere money moves.**  
4. **Vertical slices** — each milestone ends with a demoable API path + tests, not only schema.  
5. **Wire frontend last per domain** — swap providers after the milestone’s exit criterion passes.  

---

## 2. Complexity legend

| Level | Meaning | Typical effort |
|-------|---------|----------------|
| **S** | Straightforward CRUD / config | 1–3 days |
| **M** | Multi-table flows, auth, uploads | 3–6 days |
| **L** | Concurrency, money correctness, jobs | 5–10 days |
| **XL** | Highest risk (daily return engine, hardening) | 8–14 days |

Dependencies are **hard blockers** unless marked *soft* (can stub).

---

## 3. Milestone map (summary)

```
M0  Foundation & API shell              S–M     3–4 d
M1  Database & Prisma                   M       4–5 d
M2  Authentication & sessions           L       6–8 d
M3  Wallet & ledger core                L       5–7 d
M4  Deposits                            L       5–7 d
M5  Withdrawals                         L       5–7 d
M6  Daily return engine                 XL      8–12 d
M7  Notifications                       M       3–5 d
M8  Emails                              M       4–6 d
M9  Reports & exports                   M       3–5 d
M10 Admin APIs (ops + CMS)              L–XL    10–14 d
M11 Support                             M       3–5 d
M12 Testing hardening                   L       5–8 d
M13 Deployment                          M       4–6 d
                                        ─────────────
                                        ≈ 68–99 working days
                                        (~14–20 weeks solo)
```

With 2 backend engineers after M3: **~10–14 weeks** calendar time.

---

## 4. Recommended implementation order

```
M0 Foundation
 └─► M1 Database
      └─► M2 Authentication
           └─► M3 Wallet & ledger
                ├─► M4 Deposits ──────┐
                └─► M5 Withdrawals ───┼─► M6 Daily return
                                      │
                M7 Notifications ◄────┤  (can start after M2 with stubs)
                M8 Emails ◄───────────┤  (after M2; templates after M1 seed)
                                      │
                M10 Admin (ops) ◄─────┴─ needs M4–M6 for money screens
                M10 CMS APIs ◄── can parallel after M2 (content-only)
                M11 Support ◄── after M2 (parallel with M7)
                M9 Reports ◄── after M4–M6 data exists
                M12 Testing (continuous; surge before deploy)
                M13 Deployment (staging from M3 onward; prod after M12)
```

### Critical path

**M0 → M1 → M2 → M3 → M4/M5 → M6 → M10 (ops) → M12 → M13**

Everything else (CMS, support, notifications polish, reports) can fan out once auth exists.

---

## 5. Milestones in detail

---

### M0 — Foundation & API shell

**Complexity:** S–M · **Estimate:** 3–4 days  

**Deliverables**
- Express app bootstrap in `apps/api`
- Config validation (`DATABASE_URL`, JWT/cookie secrets, CORS, env schema)
- Request ID, structured logging, global error → API envelope
- `GET /health`, `GET /health/ready`
- Docker Compose: Postgres 16 (+ Mailhog / MinIO optional)
- Shared package import working from API

**Dependencies:** Monorepo tooling already present (*soft*)  

**Exit criterion:** API serves health; CI typechecks API  

**Demo:** Health JSON + green typecheck  

---

### M1 — Database

**Complexity:** M · **Estimate:** 4–5 days  

**Deliverables**
- Prisma models matching `DATABASE_SCHEMA.md`
- Migrations + seed: SUPER_ADMIN, settings, feature toggles, email template keys, payment method stubs
- Transaction helper; Decimal handling; no-float money policy
- Ledger immutability policy (DB grants / trigger plan)

**Suggested split**
1. Identity + wallet + ledger + auth tables  
2. Deposits / withdrawals / documents  
3. Trading days / trades / return runs  
4. Notifications / email / support / audit / settings  
5. CMS tables (may defer to start of M10 if timeline tight)

**Dependencies:** M0  

**Exit criterion:** `db:migrate` + `db:seed`; sample wallet reconciles `SUM(ledger) = balance`  

**Demo:** Prisma Studio showing seeded admin + reconciled demo investor  

---

### M2 — Authentication

**Complexity:** L · **Estimate:** 6–8 days  

**Deliverables**
- Register, login, logout, refresh (rotation + reuse detection)
- Email verify + resend; forgot/reset password
- `GET /auth/me`; session list / revoke
- Cookie + Bearer support; CSRF for cookie mutations
- Password hashing (argon2id); rate limits on auth routes
- Admin auth realm (`/admin/auth/*`) + 2FA setup/confirm for staff
- Middleware: `authenticate`, `requireVerifiedEmail`, `requireStaff`, RBAC helper

**Dependencies:** M1  
**Soft:** M8 for real email — use console/Mailhog stub  

**Exit criterion:** Full auth flow via HTTP; admin cannot use investor cookie for admin routes  

**Demo:** Register → verify → login → refresh → `/auth/me`; admin login + 2FA  

**Risks:** Cookie domains, CSRF, refresh reuse attacks  

---

### M3 — Wallet & ledger

**Complexity:** L · **Estimate:** 5–7 days  

**Deliverables**
- Auto-create wallet on user verify/activate
- Ledger post service (single write path for all balance changes)
- Optimistic concurrency on `wallet.version`
- `GET /wallet`, `/wallet/summary`, `/wallet/transactions`
- Idempotency key store for money POSTs
- Reconciliation job/script (nightly skeleton)

**Dependencies:** M2  

**Exit criterion:** Ledger posts reconcile; duplicate idempotency key returns same result  

**Demo:** Transaction list; forced double-submit is idempotent  

**Risks:** Race conditions; partial transactions  

---

### M4 — Deposit

**Complexity:** L · **Estimate:** 5–7 days  

**Deliverables**
- Payment methods read API
- `POST /deposits` + proof upload (signed URL → object storage)
- Investor list/detail/cancel
- Admin queue: approve (ledger credit) / reject
- Outbox hooks for notifications + email
- Audit log on admin decisions
- KYC gate (configurable)

**Dependencies:** M3 · storage · *soft* M7/M8 via outbox  

**Exit criterion:** Deposit → approve credits once; reject leaves balance unchanged  

**Demo:** End-to-end deposit with proof in object storage  

---

### M5 — Withdrawal

**Complexity:** L · **Estimate:** 5–7 days  

**Deliverables**
- Payout method CRUD (soft delete; masked details)
- Limits API (min/max/daily/cooldown)
- `POST /withdrawals` locks funds
- Cancel / admin reject unlocks
- Admin approve → mark-paid
- Audit + outbox events

**Dependencies:** M3 · M4 patterns · *soft* KYC  

**Exit criterion:** Lock → pay and lock → reject both reconcile; cooldown enforced  

**Demo:** Full withdrawal lifecycle in API tests  

**Order note:** After or parallel with M4 once M3 is stable — never before ledger.  

---

### M6 — Daily return

**Complexity:** XL · **Estimate:** 8–12 days  

**Deliverables**
- Trading day + trade admin CRUD/publish
- Public/investor trade & performance read APIs
- Daily return run: create → preview → process → reverse
- Per-user distributions + ledger posts / reversals
- Idempotent process; one completed run per trading day
- Rounding delta accounting

**Dependencies:** M3 (hard) · M4/M5 *soft* for realistic balances  

**Exit criterion:** Process many wallets without double-pay; reverse restores; second process → `RETURN_ALREADY_APPLIED`  

**Demo:** Preview → process → investor distributions → reverse  

**Risks:** Highest financial risk — property tests + reconciliation required before prod  

---

### M7 — Notifications

**Complexity:** M · **Estimate:** 3–5 days  

**Deliverables**
- Notification helper for domain services
- List, unread count, read, read-all, archive
- Preferences GET/PATCH
- Admin campaign create/send (ALL / SINGLE)
- Outbox → in-app persistence

**Dependencies:** M2 · outbox  
**Soft:** WebSocket (poll REST first)  

**Exit criterion:** Deposit approve creates investor-visible notification  

**Demo:** Unread count increments after admin approve  

---

### M8 — Emails

**Complexity:** M · **Estimate:** 4–6 days  

**Deliverables**
- Provider interface (SMTP/ESP); Mailhog in dev
- Template CRUD + HTML renderer
- `email_logs` + outbox send worker
- Admin outbox + manual send
- Wire: welcome, verify, reset, KYC, deposit/withdraw, daily return, support reply

**Dependencies:** M1 seed · M2 · domain events from M4–M6, M11  

**Exit criterion:** Auth + money emails deliver; failures retry  

**Demo:** Mailhog timeline for investor happy path  

---

### M9 — Reports

**Complexity:** M · **Estimate:** 3–5 days  

**Deliverables**
- Admin aggregates (deposits, withdrawals, distributions, users)
- CSV/XLSX export with rate limits
- Optional investor monthly statement meta
- Report library download counters (or under M10 CMS)

**Dependencies:** M4–M6 data · M2 admin auth  

**Exit criterion:** Export matches DB aggregates for a date range  

**Demo:** Deposits CSV for last 30 days  

---

### M10 — Admin

**Complexity:** L–XL · **Estimate:** 10–14 days (split)

#### M10a — Ops admin (critical path)

**Estimate:** 5–7 days · **Complexity:** L  

Users 360, suspend/activate, notes, timeline, wallet adjust, payment methods, settings/toggles, audit list, analytics overview, roles/staff invites  

**Dependencies:** M2–M6  

#### M10b — CMS admin (parallelizable)

**Estimate:** 5–7 days · **Complexity:** L  

Landing draft/publish, pages, FAQ, testimonials, media, ticker, performance CMS, announcements, activity, site SEO, revisions, backup export, public bootstrap  

**Dependencies:** M2 · storage · independent of M6 (*soft*)  

**Exit criterion:** Ops queues work on real data; CMS publish updates `/cms/public/bootstrap` and is audited  

**Demo:** Hero title publish → bootstrap; deposit approve from admin against API  

---

### M11 — Support

**Complexity:** M · **Estimate:** 3–5 days  

**Deliverables**
- Investor ticket create/list/reply + attachments
- Admin assign/reply/internal note/close/priority
- Email/notification on staff reply
- Audit on status changes

**Dependencies:** M2 · uploads · *soft* M7/M8  

**Exit criterion:** Round-trip ticket; internal notes hidden from investor  

**Demo:** Investor ticket → admin reply → investor sees message  

---

### M12 — Testing

**Complexity:** L · **Estimate:** 5–8 days (plus continuous tests each milestone)  

**Deliverables**
- Unit: ledger math, eligibility, idempotency  
- Integration: auth, deposit/withdraw, daily return (Postgres testcontainers)  
- Contract: envelopes + error codes  
- Load smoke: return process N wallets  
- Security: RBAC, CSRF, rate limits  
- Reconciliation suite in CI  

**Dependencies:** Features under test (from M2 onward)  

**Exit criterion:** CI fails on ledger mismatch; money-module coverage agreed  

**Demo:** CI money + auth suites green  

---

### M13 — Deployment

**Complexity:** M · **Estimate:** 4–6 days  

**Deliverables**
- Staging: API + Postgres + object storage + ESP sandbox (+ Redis optional)
- Migrate-on-deploy; rollback plan
- Secrets, TLS, CORS locked to web origin
- Nginx/`infra` wiring
- Backups + restore drill
- Observability: metrics, errors, `/health/ready`
- Production runbook; maintenance mode
- Web `API_URL` cutover; demo stores behind flag

**Dependencies:** M12 critical tests · M10a operable  

**Exit criterion:** Staging full happy path; backup restore once; checklist signed  

**Demo:** Staging investor journey without localStorage  

---

## 6. Dependency matrix

| Milestone | Hard dependencies | Soft / parallel with |
|-----------|-------------------|----------------------|
| M0 Foundation | — | — |
| M1 Database | M0 | — |
| M2 Auth | M1 | M8 stub |
| M3 Wallet | M2 | — |
| M4 Deposit | M3 | M7, M8, storage |
| M5 Withdrawal | M3 | M4, M7, M8 |
| M6 Daily return | M3 | M4, M5 |
| M7 Notifications | M2 | M4+ events |
| M8 Emails | M1, M2 | domain events |
| M9 Reports | M4–M6 | M10 |
| M10a Admin ops | M2–M6 | M9 |
| M10b CMS | M2 | storage; ≠ M6 |
| M11 Support | M2 | M7, M8 |
| M12 Testing | continuous | surge before M13 |
| M13 Deploy | M12, M10a | M10b, M11 |

---

## 7. Complexity at a glance (requested domains)

| Domain | Milestone | Complexity | Why |
|--------|-----------|------------|-----|
| Authentication | M2 | **L** | Sessions, refresh reuse, CSRF, admin realm, 2FA |
| Database | M1 | **M** | Large schema; money constraints; seeds |
| Wallet | M3 | **L** | Concurrency, idempotency, single writer |
| Deposit | M4 | **L** | Uploads, admin state machine, ledger credit |
| Withdrawal | M5 | **L** | Locks, cooldowns, unlock/pay paths |
| Daily Return | M6 | **XL** | Batch money, reverse, idempotency under load |
| Notifications | M7 | **M** | Event fan-in, prefs, campaigns |
| Emails | M8 | **M** | Templates, provider, retries |
| Reports | M9 | **M** | Aggregates + safe exports |
| Admin | M10 | **L–XL** | Broad surface; split ops vs CMS |
| Support | M11 | **M** | Threads, attachments, visibility rules |
| Testing | M12 | **L** | Money invariants harder than CRUD |
| Deployment | M13 | **M** | Ops maturity, not algorithmic risk |

---

## 8. Suggested calendar

### Solo engineer

| Week | Focus |
|------|-------|
| 1 | M0 + M1 (core schema) |
| 2–3 | M2 Auth |
| 4 | M3 Wallet |
| 5 | M4 Deposits |
| 6 | M5 Withdrawals |
| 7–8 | M6 Daily return |
| 9 | M7 + M8 |
| 10 | M10b CMS + public bootstrap |
| 11 | M10a Admin ops + M11 Support |
| 12 | M9 Reports + M12 surge |
| 13–14 | M13 Staging → production hardening |

### Two engineers (after M2)

| Engineer A (critical path) | Engineer B (parallel) |
|----------------------------|------------------------|
| M3 → M4 → M5 → M6 → M10a | M7 → M8 → M10b → M11 → M9 |
| Shared: M12 surge, M13 | |

---

## 9. Definition of done (per domain)

| Domain | Done when |
|--------|-----------|
| Authentication | `/auth` + `/admin/auth` complete; RBAC enforced |
| Database | Migrations reproducible; seed reconciles |
| Wallet | Single ledger writer; idempotent posts |
| Deposit | Proof + approve credits exactly once |
| Withdrawal | Lock/pay/reject reconcile |
| Daily return | Process/reverse safe under concurrency tests |
| Notifications | Domain events appear in inbox |
| Emails | Templates editable; auth + money mail deliver |
| Reports | Aggregates + export match DB |
| Admin | Ops queues + CMS publish drive real frontend |
| Support | Full ticket lifecycle |
| Testing | CI guards money invariants |
| Deployment | Staging parity; backups; runbook |

---

## 10. Non-goals (this roadmap)

- Frontend redesign  
- WebSockets before REST polling works  
- Multi-currency beyond schema readiness  
- Live MT5 bridge  
- Referral reward economics (unless newly scoped)  

---

## 11. Related documents

| Document | Use |
|----------|------|
| `API_DOCUMENTATION.md` | Endpoint contracts |
| `DATABASE_SCHEMA.md` | Tables & constraints |
| `BACKEND_REQUIREMENTS.md` | Flows & entities |
| `SYSTEM_ARCHITECTURE.md` | Topology |
| `docs/03-development-roadmap.md` | Full-stack historical plan |
| `docs/12-trading-engine.md` | Return engine rules |
| `docs/14-security-checklist.md` | Pre-prod security |
| `docs/15-deployment-checklist.md` | Launch checklist |

---

## 12. Immediate next actions

1. Start **M0** — API shell + Compose Postgres.  
2. Implement **M1** core money/auth tables (defer some CMS tables if needed).  
3. Finish **M2** before any wallet UI cutover.  
4. Do not schedule **M6** until **M3** ledger tests are green.  
5. Run **M10b CMS** in parallel to unlock “edit site without redeploy” earlier.  
