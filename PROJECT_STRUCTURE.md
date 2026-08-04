# Growzy — Project Structure (Backend-Ready)

**Updated:** 2026-08-03 · Architecture refactor (no UI redesign)

---

## 1. Monorepo

```
fund managment/
├── apps/
│   ├── web/                 # Next.js 15 — investor + admin UI
│   └── api/                 # Express scaffold (implement next)
├── packages/
│   ├── shared/              # ROUTES, API_ROUTES, DTOs, enums, utils
│   └── config/              # Shared TS/ESLint base
├── docs/                    # Numbered product docs 00–15
├── infra/                   # nginx, pm2, monitoring sketches
└── *.md                     # Architecture & handoff reports
```

---

## 2. `apps/web/src` enterprise layout

```
src/
├── app/                     # Next.js App Router (pages) — DO NOT move
├── components/              # Presentational UI by surface
│   ├── admin/
│   ├── auth/
│   ├── dashboard/           # investor
│   ├── marketing/
│   ├── wallet/
│   ├── ui/                  # design system primitives
│   ├── common/
│   └── motion/
├── features/                # Domain data layer (api + hooks + guards)
│   ├── auth/
│   ├── wallet/
│   ├── deposits/
│   ├── withdrawals/
│   ├── trades/
│   ├── notifications/
│   ├── performance/
│   └── admin/
├── services/                # Typed API clients (call apiClient)
│   ├── auth.service.ts
│   ├── wallet.service.ts
│   ├── deposit.service.ts
│   ├── withdraw.service.ts
│   ├── trade.service.ts
│   ├── notification.service.ts
│   ├── report.service.ts
│   ├── settings.service.ts
│   ├── support.service.ts
│   ├── kyc.service.ts
│   ├── admin.service.ts
│   ├── cms.service.ts
│   ├── http.ts
│   └── index.ts
├── types/                   # Central models (+ re-export @meridian/shared)
│   ├── domain.ts
│   └── index.ts
├── config/                  # Brand, cookies, flags, permissions, appConfig
├── constants/               # Barrel of routes / limits / flags
├── stores/                  # Store contracts / keys (API integration map)
├── mocks/                   # All demo fixtures (single location)
├── errors/                  # ApiError → view-state mapping
├── modules/                 # Optional barrels (admin / investor / cms)
├── shared/                  # Cross-cutting helpers (cn, …)
├── providers/               # React context (demo business state today)
├── hooks/                   # Shared UI hooks
├── lib/                     # Utilities + demo shims + stores (Admin OS)
├── styles/
└── middleware.ts            # Investor + admin cookie guards
```

### Mapping to requested folders

| Requested | Location |
|-----------|----------|
| components / layouts | `components/` + `app/**/layout.tsx` |
| features | `features/` |
| modules | `modules/` |
| providers / hooks | `providers/`, `hooks/` |
| services | `services/` |
| stores | `stores/` (+ live demo in `providers/` / `lib/*-store`) |
| lib / types / config / constants | as named |
| emails | `lib/premium-email-templates.ts` (seed) + future `services` |
| cms / admin / investor | `components/*` + `modules/*` + Admin OS |
| shared | `shared/` + `packages/shared` |

UI components were **not** mass-moved (avoids import churn and layout regressions). New architecture layers sit beside them.

---

## 3. `packages/shared`

```
packages/shared/src/
├── constants/   routes, API_ROUTES, limits, error-codes, currency-pairs
├── types/       entities, enums (Role, StaffRole, …), api envelopes
├── schemas/     Zod common schemas
└── utils/       money display, dates
```

---

## 4. Import rules (backend-ready)

1. Components → hooks / providers (demo) — never `apiClient` directly  
2. Hooks → `features/*/api` → `services/*` → `apiClient`  
3. Types → `@/types` or `@meridian/shared`  
4. Config → `@/config` / `appConfig`  
5. Mocks → `@/mocks` (legacy `@/lib/*-data` shims remain)

---

## 5. Related docs

- `DATA_FLOW.md`
- `API_INTEGRATION_GUIDE.md`
- `STATE_MANAGEMENT_GUIDE.md`
- `FRONTEND_HANDOFF.md`
- `BACKEND_READY_REPORT.md`
