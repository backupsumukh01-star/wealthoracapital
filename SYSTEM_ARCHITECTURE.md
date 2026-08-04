# Growzy — System Architecture

**Product:** Growzy Capital — managed Forex investment platform  
**Repo:** pnpm + Turbo monorepo (`meridian-fx` package name; UI brand is Growzy)  
**Document type:** Technical architecture (read-only snapshot)  
**Current runtime mode:** Frontend-complete demo (localStorage / cookies); API is scaffold only  

---

## 1. Purpose

Growzy lets retail investors:

1. Discover the programme on a public marketing site  
2. Register, verify email, complete KYC, fund a wallet  
3. Receive published daily returns against eligible balances  
4. Inspect published trades and performance  
5. Request withdrawals  

Operators (admin) review KYC/money, publish trades and daily returns, manage CMS content, support tickets, and platform settings — without redeploying for content changes (CMS publish model).

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│  Browser (Next.js App Router) · future mobile consumers          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│  apps/web  (@meridian/web)                                       │
│  Next.js 15 · React 19 · Tailwind 4 · TanStack Query             │
│  Route groups: marketing | auth | dashboard | admin              │
│  Demo state: InvestorLifecycle + Admin OS (localStorage)         │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST (planned) · shared DTOs
┌────────────────────────────▼────────────────────────────────────┐
│  packages/shared  (@meridian/shared)                             │
│  ROUTES · API_ROUTES · enums · entity DTOs · Zod · money utils   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  apps/api  (@meridian/api) — SCAFFOLD                            │
│  Express + TypeScript modular monolith · Prisma → PostgreSQL     │
│  (No business routes yet)                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   PostgreSQL 16        Object storage        Email / SMS
   (ledger truth)       (KYC, proofs, CMS)    (transactional)
```

**Today:** Almost all investor and admin behaviour runs in the browser against demo stores. Shared types and `API_ROUTES` define the contract for the future backend.

---

## 3. Applications & packages

| Unit | Path | Role |
|------|------|------|
| Web UI | `apps/web` | All 84 App Router pages; marketing, investor, admin |
| API | `apps/api` | Express scaffold; Prisma schema empty of models |
| Shared contracts | `packages/shared` | Routes, enums, entity DTOs, schemas, utils |
| Shared config | `packages/config` | Base TypeScript / ESLint |
| Docs | `docs/`, root `*.md` | Architecture and ops documentation |
| Infra | `infra/` | nginx, pm2, systemd, monitoring sketches |

---

## 4. Frontend architecture

### 4.1 Rendering model

| Surface | Rendering | Notes |
|---------|-----------|-------|
| Marketing | Server Components + client islands | SEO-critical; CMS applied via client Admin OS after hydrate |
| Auth | Client forms in auth layout | Demo OTP `123456` |
| Investor dashboard | Client shells + workspaces | Guarded by demo cookie / lifecycle session |
| Admin | Client OS workspaces | Guarded by admin cookie + soft role UI |

### 4.2 Provider stack (outer → inner)

```
ThemeProvider
  QueryProvider
    SessionProvider              ← future /auth/me (often null today)
      InvestorLifecycleProvider  ← demo investor domain
        AdminOsProvider          ← demo CMS + ops
          AuthModalProvider
            NotificationsProvider
              MotionConfig · Tooltip · Toast · LogoIntro
```

### 4.3 Demo persistence

| Store | Key | Scope |
|-------|-----|--------|
| Investor lifecycle | `growzy_investor_lifecycle_v2` | localStorage |
| Admin OS / CMS | `growzy_admin_os_v4` | localStorage |
| Notifications | `growzy_notifications_v2` | sessionStorage |
| Investor session cookie | `mfx_at` | cookie |
| Admin session cookie | `growzy_admin_at` | cookie |

When the API is live, these providers become thin clients over REST; shapes already mirror `@meridian/shared` entities.

### 4.4 Design system

- Dark emerald / cyan glass aesthetic (`tokens.css`, `globals.css`)  
- Radix primitives + custom `components/ui`  
- Framer Motion for marketing motion; reduced-motion respected  
- Money displayed as strings (`MoneyString`) — never JSON numbers for balances  

---

## 5. Domain modules

### 5.1 Identity & access

- Investor: register, login, OTP verify, password reset, optional OAuth stub, 2FA UI  
- Admin: separate login at `/admin/login`, roles prepared (Super Admin, Finance, Support, KYC, Trading, Content, Viewer)  
- Middleware (`apps/web/src/middleware.ts`) demo-guards protected paths  

### 5.2 KYC

- Investor onboarding wizard uploads demo documents  
- Admin KYC queue approve/reject mutates lifecycle store  
- Status drives account banners and deposit eligibility  

### 5.3 Wallet & money

- Single wallet per user (demo snapshot on account)  
- Deposit: method selection → proof upload → pending → admin approve/reject  
- Withdraw: amount + payout destination → pending → admin pay/reject  
- Ledger principle (backend): append-only; wallet is cache  

### 5.4 Trading & daily returns

- Admin records / publishes trades  
- Admin creates daily return runs and distributes to eligible wallets  
- Investor sees equity, calendar, trade history (CMS published trades merged)  

### 5.5 CMS & growth

- Landing draft → preview → publish → rollback (revision history with author / publishDate)  
- Ticker, performance charts, FAQs, testimonials, announcements, media folders, SEO, reports  
- **Platform CMS** — dashboard, wallet, trades, performance, support, marketing nav, risk disclaimer  
- Feature toggles: registration, login, deposits, withdrawals, KYC, trading, reports, notifications, support, referrals, email, maintenance  
- Publish updates marketing + investor surfaces via Admin OS context  

### 5.5b Admin ops shell (final pass)

| Capability | Route |
|------------|-------|
| System Health | `/admin/system-health` |
| Global Search | `/admin/search` |
| Command palette | Ctrl/Cmd+K (admin layout) |
| Activity Center | `/admin/activity-center` |
| Platform CMS | `/admin/cms/platform` |
| Audit Center | `/admin/audit-log` |
| Roles matrix | `/admin/settings/roles` |
| Backup Center | `/admin/cms/backup` |
| Advanced Reports | `/admin/reports` |

### 5.6 Communications

- 25 premium HTML email templates (admin editable)  
- In-app notifications + `growzy:notify` events  
- Broadcast / campaigns workspaces (demo)  
- Support tickets (investor create / admin reply)  

---

## 6. Backend target architecture (planned)

Modular Express monolith (`apps/api`):

| Module | Responsibility |
|--------|----------------|
| Auth | Sessions, JWT/refresh, OTP, OAuth |
| Users / KYC | Profiles, document review |
| Wallet | Balances, ledger posts |
| Deposits / Withdrawals | Queues, proofs, payouts |
| Trading | Trades, trading days |
| Returns | Daily return engine (idempotent) |
| Notifications / Email | In-app + transactional send |
| CMS | Landing, pages, media, ticker, announcements |
| Admin / Audit | RBAC, immutable audit log |
| Settings | Feature toggles, limits, maintenance |

**Cross-cutting:** request IDs, idempotency keys on money ops, rate limits, soft-close users (`CLOSED`), never hard-delete ledger history.

---

## 7. Data architecture principles

1. **Ledger is truth; wallet is cache** — reconstructable balances  
2. **Money as `DECIMAL` / string DTOs** — no floating point over the wire  
3. **Idempotency** on deposits, withdrawals, return runs  
4. **Immutable audit** for admin mutations  
5. **CMS publish** separates draft from live content  

Canonical schema design: `DATABASE_SCHEMA.md` and `docs/04-database-schema.md`.

---

## 8. Security architecture (target)

| Control | Intent |
|---------|--------|
| Separate admin auth cookie / realm | Reduce XSS session confusion |
| RBAC on every admin route | Viewer read-only |
| Proof / KYC files in private object storage | Signed URLs |
| CSRF + SameSite cookies | Browser session safety |
| Rate-limit auth and money endpoints | Abuse resistance |
| Maintenance mode | Block investor money flows when enabled |
| Risk disclosure on marketing | Regulatory UX |

See `docs/14-security-checklist.md` and `SECURITY_PLAN.md`.

---

## 9. Deployment topology (planned)

```
CDN / nginx → apps/web (Node Next)
           → apps/api (Node Express)
PostgreSQL (primary)
Redis (sessions / queues — optional Phase 2+)
S3-compatible storage (media, KYC, reports)
SMTP / ESP (emails)
```

Infra sketches live under `infra/`. Checklist: `docs/15-deployment-checklist.md`.

---

## 10. Current vs production gap

| Layer | Current | Production |
|-------|---------|------------|
| Auth | Demo cookies + localStorage passwords | Real hashing, refresh tokens, OTP delivery |
| Money | Simulated ledger in lifecycle store | PostgreSQL ledger + concurrency |
| CMS | Admin OS v4 localStorage | CMS tables + public bootstrap API |
| Files | URL fields / `#` placeholders | Uploaded objects + CDN |
| Email | Preview studio | Queued ESP delivery |
| API | Scaffold | Full modular routes |

The frontend is structured so providers and `@meridian/shared` DTOs can swap to live APIs without redesigning page IA.

---

## 11. Related documents

| File | Focus |
|------|-------|
| `PROJECT_STRUCTURE.md` | Folder and page inventory |
| `FRONTEND_COMPONENT_MAP.md` | Components and page→component wiring |
| `BACKEND_REQUIREMENTS.md` | APIs, entities, admin/user flows for backend |
| `CMS_COMPLETION_REPORT.md` | CMS module completion |
| `DEPLOYMENT_GUIDE.md` | Production deploy runbook |
| `SECURITY_CHECKLIST.md` | Root security gate checklist |
| `FINAL_PROJECT_AUDIT.md` | Final frontend readiness score |
| `DATABASE_SCHEMA.md` | PostgreSQL entity design |
| `docs/00`–`15` | Numbered architecture series |
