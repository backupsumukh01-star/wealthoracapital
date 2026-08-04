# 01 — Complete Folder Structure

The project is a **pnpm workspace monorepo**. One repository, three packages, one deploy pipeline.
This keeps types and validation schemas shared between the API and the web app without publishing
anything to a registry.

```
meridian-fx/
├── apps/
│   ├── web/                      # Next.js 15 frontend
│   └── api/                      # Express 5 backend
├── packages/
│   ├── shared/                   # Types, Zod schemas, constants, money utils
│   └── config/                   # Shared eslint / tsconfig / prettier bases
├── docs/                         # ← you are here
├── infra/                        # Nginx, PM2, systemd, backup scripts
├── .github/workflows/            # CI
├── .editorconfig
├── .gitignore
├── .nvmrc                        # 22
├── package.json                  # workspace root scripts
├── pnpm-workspace.yaml
├── turbo.json                    # task pipeline (build/lint/test caching)
└── README.md
```

---

## 1. `apps/web` — Next.js 15 frontend

```
apps/web/
├── public/
│   ├── fonts/                          # self-hosted variable fonts (woff2)
│   ├── brand/                          # our own logo, wordmark, favicon set
│   ├── illustrations/                  # original SVGs only
│   └── og/                             # generated OG images
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # root: fonts, providers, theme
│   │   ├── globals.css                 # tailwind layers + design tokens
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   ├── loading.tsx
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   ├── opengraph-image.tsx
│   │   │
│   │   ├── (marketing)/                # public, server-rendered, SEO-critical
│   │   │   ├── layout.tsx              # marketing nav + footer
│   │   │   ├── page.tsx                # ← landing page
│   │   │   ├── how-it-works/page.tsx
│   │   │   ├── performance/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── faq/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   └── legal/
│   │   │       ├── terms/page.tsx
│   │   │       ├── privacy/page.tsx
│   │   │       ├── risk-disclosure/page.tsx
│   │   │       └── refund-policy/page.tsx
│   │   │
│   │   ├── (auth)/                     # centred card layout, no chrome
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   ├── verify-email/page.tsx
│   │   │   ├── verify-email/sent/page.tsx
│   │   │   └── oauth/callback/page.tsx
│   │   │
│   │   ├── (dashboard)/                # authenticated investor area
│   │   │   ├── layout.tsx              # sidebar + topbar + auth guard
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── deposit/
│   │   │   │   ├── page.tsx            # new deposit + method instructions
│   │   │   │   └── history/page.tsx
│   │   │   ├── withdraw/
│   │   │   │   ├── page.tsx
│   │   │   │   └── history/page.tsx
│   │   │   ├── trades/
│   │   │   │   ├── page.tsx            # filterable trade history
│   │   │   │   └── [tradeId]/page.tsx
│   │   │   ├── performance/page.tsx    # monthly / yearly / lifetime ROI
│   │   │   ├── transactions/page.tsx   # full ledger view
│   │   │   ├── notifications/page.tsx
│   │   │   ├── referrals/page.tsx      # v1.1 placeholder route (hidden)
│   │   │   └── settings/
│   │   │       ├── profile/page.tsx
│   │   │       ├── security/page.tsx
│   │   │       ├── payout-methods/page.tsx
│   │   │       └── preferences/page.tsx
│   │   │
│   │   └── (admin)/                    # operator console
│   │       ├── layout.tsx              # admin guard + distinct chrome
│   │       └── admin/
│   │           ├── page.tsx            # ops dashboard
│   │           ├── users/
│   │           │   ├── page.tsx
│   │           │   └── [userId]/page.tsx
│   │           ├── deposits/
│   │           │   ├── page.tsx
│   │           │   └── [depositId]/page.tsx
│   │           ├── withdrawals/
│   │           │   ├── page.tsx
│   │           │   └── [withdrawalId]/page.tsx
│   │           ├── trades/
│   │           │   ├── page.tsx
│   │           │   ├── new/page.tsx
│   │           │   └── [tradeId]/page.tsx
│   │           ├── daily-return/
│   │           │   ├── page.tsx        # ← apply daily return
│   │           │   └── [runId]/page.tsx
│   │           ├── notifications/page.tsx
│   │           ├── broadcast/page.tsx
│   │           ├── audit-log/page.tsx
│   │           ├── reports/page.tsx
│   │           └── settings/
│   │               ├── platform/page.tsx
│   │               ├── payment-methods/page.tsx
│   │               ├── staff/page.tsx
│   │               └── email-templates/page.tsx
│   │
│   ├── components/
│   │   ├── ui/                         # primitives (our own, shadcn-inspired)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── table.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── accordion.tsx
│   │   │   ├── date-picker.tsx
│   │   │   ├── date-range-picker.tsx
│   │   │   ├── file-dropzone.tsx
│   │   │   ├── empty-state.tsx
│   │   │   └── copy-button.tsx
│   │   │
│   │   ├── motion/                     # Framer Motion wrappers
│   │   │   ├── fade-in.tsx
│   │   │   ├── stagger-group.tsx
│   │   │   ├── reveal-on-scroll.tsx
│   │   │   ├── count-up.tsx            # animated number, tabular figures
│   │   │   ├── marquee.tsx
│   │   │   ├── magnetic.tsx
│   │   │   ├── page-transition.tsx
│   │   │   └── motion-config.tsx       # respects prefers-reduced-motion
│   │   │
│   │   ├── marketing/
│   │   │   ├── nav-bar.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   ├── hero.tsx
│   │   │   ├── hero-visual.tsx         # original animated equity curve
│   │   │   ├── trust-strip.tsx
│   │   │   ├── stats-band.tsx
│   │   │   ├── performance-showcase.tsx
│   │   │   ├── how-it-works.tsx
│   │   │   ├── advantages-grid.tsx
│   │   │   ├── live-trades-preview.tsx
│   │   │   ├── testimonials.tsx
│   │   │   ├── faq-accordion.tsx
│   │   │   ├── cta-band.tsx
│   │   │   ├── risk-banner.tsx
│   │   │   └── footer.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   ├── notification-bell.tsx
│   │   │   ├── stat-card.tsx
│   │   │   ├── balance-card.tsx
│   │   │   ├── profit-today-card.tsx
│   │   │   ├── roi-card.tsx
│   │   │   ├── equity-chart.tsx
│   │   │   ├── monthly-bars.tsx
│   │   │   ├── recent-trades-table.tsx
│   │   │   ├── recent-activity.tsx
│   │   │   └── kyc-banner.tsx
│   │   │
│   │   ├── deposits/
│   │   │   ├── deposit-form.tsx
│   │   │   ├── method-instructions.tsx
│   │   │   ├── proof-uploader.tsx
│   │   │   ├── deposit-status-badge.tsx
│   │   │   └── deposit-table.tsx
│   │   │
│   │   ├── withdrawals/
│   │   │   ├── withdraw-form.tsx
│   │   │   ├── payout-method-picker.tsx
│   │   │   └── withdrawal-table.tsx
│   │   │
│   │   ├── trades/
│   │   │   ├── trade-filters.tsx
│   │   │   ├── trade-table.tsx
│   │   │   ├── trade-row.tsx
│   │   │   ├── trade-detail.tsx
│   │   │   ├── pair-badge.tsx
│   │   │   ├── direction-badge.tsx
│   │   │   └── export-menu.tsx         # CSV + PDF
│   │   │
│   │   ├── admin/
│   │   │   ├── admin-sidebar.tsx
│   │   │   ├── metric-tile.tsx
│   │   │   ├── user-table.tsx
│   │   │   ├── user-detail-panel.tsx
│   │   │   ├── deposit-review-drawer.tsx
│   │   │   ├── proof-viewer.tsx        # zoomable screenshot
│   │   │   ├── withdrawal-review-drawer.tsx
│   │   │   ├── trade-form.tsx
│   │   │   ├── daily-return-panel.tsx
│   │   │   ├── daily-return-preview.tsx  # dry-run impact table
│   │   │   ├── confirm-apply-dialog.tsx  # type-to-confirm
│   │   │   ├── run-result-summary.tsx
│   │   │   ├── broadcast-composer.tsx
│   │   │   └── audit-log-table.tsx
│   │   │
│   │   └── common/
│   │       ├── money.tsx               # <Money value="1234.50" />
│   │       ├── percent.tsx
│   │       ├── date-time.tsx
│   │       ├── status-badge.tsx
│   │       ├── data-table.tsx          # generic sortable/paginated table
│   │       ├── filter-bar.tsx
│   │       ├── page-header.tsx
│   │       ├── error-boundary.tsx
│   │       ├── theme-toggle.tsx
│   │       └── seo.tsx
│   │
│   ├── features/                       # feature-scoped hooks + api clients
│   │   ├── auth/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts                # useLogin, useRegister, useSession
│   │   │   └── guards.tsx
│   │   ├── wallet/{api.ts,hooks.ts}
│   │   ├── deposits/{api.ts,hooks.ts}
│   │   ├── withdrawals/{api.ts,hooks.ts}
│   │   ├── trades/{api.ts,hooks.ts}
│   │   ├── performance/{api.ts,hooks.ts}
│   │   ├── notifications/{api.ts,hooks.ts}
│   │   └── admin/{api.ts,hooks.ts}
│   │
│   ├── lib/
│   │   ├── api-client.ts               # fetch wrapper: cookies, refresh, errors
│   │   ├── query-client.ts
│   │   ├── auth-server.ts              # server-side session read
│   │   ├── format.ts                   # money/percent/date formatters
│   │   ├── money.ts                    # Decimal helpers
│   │   ├── export-csv.ts
│   │   ├── export-pdf.ts
│   │   ├── cn.ts
│   │   ├── constants.ts
│   │   └── env.ts                      # Zod-validated public env
│   │
│   ├── providers/
│   │   ├── query-provider.tsx
│   │   ├── theme-provider.tsx
│   │   ├── toast-provider.tsx
│   │   └── session-provider.tsx
│   │
│   ├── hooks/
│   │   ├── use-media-query.ts
│   │   ├── use-debounce.ts
│   │   ├── use-reduced-motion.ts
│   │   ├── use-intersection.ts
│   │   ├── use-pagination.ts
│   │   └── use-table-filters.ts        # syncs filters to URL params
│   │
│   ├── styles/
│   │   ├── tokens.css                  # the design system, as CSS variables
│   │   └── typography.css
│   │
│   ├── types/
│   │   └── index.ts                    # re-export from @meridian/shared
│   │
│   └── middleware.ts                   # route protection, role gate
│
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── .env.example
└── package.json
```

---

## 2. `apps/api` — Express 5 backend

The API is a **modular monolith**. Each business capability lives in one folder and owns its
routes, validation, service logic and repository access.

```
apps/api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│       ├── index.ts
│       ├── settings.seed.ts
│       ├── admin.seed.ts
│       ├── email-templates.seed.ts
│       └── demo-data.seed.ts           # dev only, guarded by NODE_ENV
│
├── src/
│   ├── server.ts                       # http listen, graceful shutdown
│   ├── app.ts                          # express instance, middleware chain
│   ├── container.ts                    # simple DI wiring
│   │
│   ├── config/
│   │   ├── env.ts                      # Zod-validated, fails fast at boot
│   │   ├── constants.ts
│   │   ├── cors.ts
│   │   ├── rate-limits.ts
│   │   └── logger.ts                   # pino instance
│   │
│   ├── db/
│   │   ├── prisma.ts                   # singleton client
│   │   └── transaction.ts              # withTransaction helper
│   │
│   ├── middleware/
│   │   ├── authenticate.ts             # verify access token → req.user
│   │   ├── authorize.ts                # requireRole / requirePermission
│   │   ├── validate.ts                 # Zod body/query/params
│   │   ├── rate-limit.ts
│   │   ├── error-handler.ts            # single exit point for errors
│   │   ├── not-found.ts
│   │   ├── request-id.ts
│   │   ├── request-logger.ts
│   │   ├── upload.ts                   # multer + magic-byte check
│   │   ├── audit.ts                    # auto-audit admin mutations
│   │   └── security-headers.ts         # helmet config
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts
│   │   │   ├── token.service.ts        # sign/verify/rotate
│   │   │   ├── password.service.ts     # argon2id
│   │   │   ├── google-oauth.service.ts
│   │   │   ├── session.repository.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.routes.ts         # /me endpoints
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.schema.ts
│   │   │   └── users.repository.ts
│   │   │
│   │   ├── wallet/
│   │   │   ├── wallet.routes.ts
│   │   │   ├── wallet.controller.ts
│   │   │   ├── wallet.service.ts
│   │   │   ├── ledger.service.ts       # ← the only writer of LedgerEntry
│   │   │   ├── wallet.repository.ts
│   │   │   └── wallet.schema.ts
│   │   │
│   │   ├── deposits/
│   │   │   ├── deposits.routes.ts
│   │   │   ├── deposits.controller.ts
│   │   │   ├── deposits.service.ts
│   │   │   ├── deposits.schema.ts
│   │   │   ├── deposits.repository.ts
│   │   │   └── deposit-proof.service.ts
│   │   │
│   │   ├── withdrawals/
│   │   │   ├── withdrawals.routes.ts
│   │   │   ├── withdrawals.controller.ts
│   │   │   ├── withdrawals.service.ts
│   │   │   ├── withdrawals.schema.ts
│   │   │   └── withdrawals.repository.ts
│   │   │
│   │   ├── trades/
│   │   │   ├── trades.routes.ts
│   │   │   ├── trades.controller.ts
│   │   │   ├── trades.service.ts
│   │   │   ├── trades.schema.ts
│   │   │   └── trades.repository.ts
│   │   │
│   │   ├── daily-return/               # ← the core engine
│   │   │   ├── daily-return.routes.ts
│   │   │   ├── daily-return.controller.ts
│   │   │   ├── daily-return.service.ts
│   │   │   ├── distribution.engine.ts  # pure calculation, unit-tested
│   │   │   ├── distribution.repository.ts
│   │   │   ├── reversal.service.ts
│   │   │   └── daily-return.schema.ts
│   │   │
│   │   ├── performance/
│   │   │   ├── performance.routes.ts
│   │   │   ├── performance.controller.ts
│   │   │   ├── performance.service.ts  # monthly/yearly/lifetime aggregates
│   │   │   └── performance.repository.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── notifications.routes.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── notifications.repository.ts
│   │   │   └── channels/
│   │   │       ├── channel.interface.ts
│   │   │       ├── in-app.channel.ts
│   │   │       ├── email.channel.ts
│   │   │       ├── telegram.channel.ts   # stub, v1.1
│   │   │       └── whatsapp.channel.ts   # stub, v1.1
│   │   │
│   │   ├── exports/
│   │   │   ├── exports.routes.ts
│   │   │   ├── exports.controller.ts
│   │   │   ├── csv.service.ts
│   │   │   └── pdf.service.ts          # pdfkit, streamed
│   │   │
│   │   ├── admin/
│   │   │   ├── admin.routes.ts         # aggregate router
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── dashboard.service.ts
│   │   │   ├── users-admin.controller.ts
│   │   │   ├── users-admin.service.ts
│   │   │   ├── broadcast.controller.ts
│   │   │   ├── broadcast.service.ts
│   │   │   └── reports.service.ts
│   │   │
│   │   ├── settings/
│   │   │   ├── settings.routes.ts
│   │   │   ├── settings.controller.ts
│   │   │   ├── settings.service.ts     # cached, invalidated on write
│   │   │   └── settings.schema.ts
│   │   │
│   │   ├── audit/
│   │   │   ├── audit.routes.ts
│   │   │   ├── audit.controller.ts
│   │   │   ├── audit.service.ts
│   │   │   └── audit.repository.ts
│   │   │
│   │   └── health/
│   │       ├── health.routes.ts
│   │       └── health.controller.ts    # /health, /health/ready
│   │
│   ├── services/                       # cross-cutting infrastructure
│   │   ├── storage/
│   │   │   ├── storage.interface.ts
│   │   │   ├── local.storage.ts
│   │   │   ├── s3.storage.ts           # implemented but unused in v1
│   │   │   └── index.ts                # factory from env
│   │   ├── email/
│   │   │   ├── mailer.ts               # nodemailer transport
│   │   │   ├── email.service.ts
│   │   │   ├── template.renderer.ts
│   │   │   └── templates/
│   │   │       ├── layout.tsx
│   │   │       ├── verify-email.tsx
│   │   │       ├── welcome.tsx
│   │   │       ├── reset-password.tsx
│   │   │       ├── password-changed.tsx
│   │   │       ├── new-device-login.tsx
│   │   │       ├── deposit-received.tsx
│   │   │       ├── deposit-approved.tsx
│   │   │       ├── deposit-rejected.tsx
│   │   │       ├── withdrawal-requested.tsx
│   │   │       ├── withdrawal-approved.tsx
│   │   │       ├── withdrawal-rejected.tsx
│   │   │       ├── daily-profit.tsx    # ← the daily report
│   │   │       ├── monthly-statement.tsx
│   │   │       └── broadcast.tsx
│   │   ├── queue/
│   │   │   ├── queue.interface.ts
│   │   │   ├── inline.queue.ts         # v1: in-process with retry
│   │   │   └── bullmq.queue.ts         # v2 drop-in
│   │   └── cache/
│   │       ├── cache.interface.ts
│   │       └── memory.cache.ts
│   │
│   ├── jobs/
│   │   ├── scheduler.ts                # node-cron registration
│   │   ├── send-daily-digest.job.ts
│   │   ├── reconcile-balances.job.ts   # ledger vs wallet drift check
│   │   ├── expire-tokens.job.ts
│   │   ├── monthly-statement.job.ts
│   │   ├── backup-verify.job.ts
│   │   └── cleanup-uploads.job.ts      # orphaned proof files
│   │
│   ├── utils/
│   │   ├── api-error.ts                # typed error classes
│   │   ├── async-handler.ts
│   │   ├── response.ts                 # success/paginated envelopes
│   │   ├── money.ts                    # Decimal helpers, rounding policy
│   │   ├── date.ts                     # trading-day boundaries, TZ
│   │   ├── pagination.ts
│   │   ├── crypto.ts                   # token generation, hashing
│   │   ├── slug.ts
│   │   └── sanitize.ts
│   │
│   └── types/
│       ├── express.d.ts                # augment Request with user, id
│       └── index.ts
│
├── tests/
│   ├── setup.ts
│   ├── factories/
│   ├── unit/
│   │   ├── distribution.engine.spec.ts
│   │   ├── money.spec.ts
│   │   └── token.service.spec.ts
│   ├── integration/
│   │   ├── auth.spec.ts
│   │   ├── deposits.spec.ts
│   │   ├── withdrawals.spec.ts
│   │   └── daily-return.spec.ts        # incl. idempotency + concurrency
│   └── e2e/
│       └── investor-lifecycle.spec.ts
│
├── uploads/                            # gitignored; local storage root
│   ├── deposits/
│   ├── avatars/
│   └── kyc/
├── logs/                               # gitignored
├── .env.example
├── ecosystem.config.js                 # PM2
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## 3. `packages/shared`

The contract between frontend and backend. **Zero runtime dependencies on either app.**

```
packages/shared/
├── src/
│   ├── index.ts
│   ├── schemas/                # Zod — the single source of validation truth
│   │   ├── auth.schema.ts
│   │   ├── user.schema.ts
│   │   ├── deposit.schema.ts
│   │   ├── withdrawal.schema.ts
│   │   ├── trade.schema.ts
│   │   ├── daily-return.schema.ts
│   │   ├── notification.schema.ts
│   │   ├── settings.schema.ts
│   │   └── common.schema.ts    # pagination, sort, date range
│   ├── types/
│   │   ├── api.ts              # ApiResponse<T>, Paginated<T>, ApiError
│   │   ├── entities.ts         # DTO shapes returned by the API
│   │   └── enums.ts            # Role, DepositStatus, TradeDirection...
│   ├── constants/
│   │   ├── currency-pairs.ts
│   │   ├── error-codes.ts
│   │   ├── limits.ts           # min deposit, max upload size...
│   │   └── routes.ts
│   └── utils/
│       ├── money.ts            # shared Decimal formatting rules
│       └── date.ts
├── tsconfig.json
└── package.json
```

---

## 4. `infra` and CI

```
infra/
├── nginx/
│   ├── meridian.conf                # server blocks, TLS, proxy, uploads
│   └── security-headers.conf
├── pm2/
│   └── ecosystem.config.js          # api cluster + web
├── systemd/
│   └── pm2-meridian.service
├── scripts/
│   ├── provision-vps.sh             # first-run hardening
│   ├── deploy.sh                    # pull, build, migrate, reload
│   ├── rollback.sh
│   ├── backup-db.sh                 # pg_dump → encrypted → offsite
│   ├── restore-db.sh
│   └── health-check.sh
└── monitoring/
    ├── uptime-check.md
    └── logrotate.conf

.github/workflows/
├── ci.yml                           # typecheck, lint, test, build
├── migrate-check.yml                # migration drift detection
└── deploy.yml                       # manual dispatch → VPS over SSH
```

---

## 5. Root scripts

```jsonc
// package.json (root)
{
  "scripts": {
    "dev":            "turbo run dev",
    "build":          "turbo run build",
    "lint":           "turbo run lint",
    "typecheck":      "turbo run typecheck",
    "test":           "turbo run test",
    "db:migrate":     "pnpm --filter api prisma migrate dev",
    "db:deploy":      "pnpm --filter api prisma migrate deploy",
    "db:studio":      "pnpm --filter api prisma studio",
    "db:seed":        "pnpm --filter api prisma db seed",
    "db:reset":       "pnpm --filter api prisma migrate reset"
  }
}
```

## 6. Rules that keep the tree honest

1. A file inside `modules/x` MUST NOT import from `modules/y/*.repository.ts`. Cross-module access
   goes through the other module's **service**, never its data layer.
2. `components/ui/*` MUST NOT import from `features/*`. Primitives stay dumb.
3. Nothing outside `services/storage` may import `node:fs`.
4. Nothing outside `modules/wallet/ledger.service.ts` may write to the `LedgerEntry` table.
5. Any type crossing the network boundary lives in `packages/shared`, not duplicated.
6. `apps/web` MUST NOT import from `apps/api`. Ever. They share only `packages/shared`.
