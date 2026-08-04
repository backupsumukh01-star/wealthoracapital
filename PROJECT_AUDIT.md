# Growzy — Project Audit (Phase 2 Preparation)

**Date:** 2026-08-02  
**Scope:** Full monorepo read-only audit  
**Constraint:** No code changes · no backend implementation  

---

## 1. Current state summary

| Area | Status |
|------|--------|
| Marketing frontend | Production-quality UI (Growzy branded) |
| Auth UI | Complete demo flows (cookie `mfx_at`) |
| Dashboard / Admin UI | Routes + shells; many `Placeholder` screens |
| API (`apps/api`) | Scaffold only — empty `app.ts` / `server.ts` |
| Prisma | Schema file may exist under `apps/api`; **do not treat as live** until Phase 2 backend starts |
| Docs (`docs/`) | Complete Meridian-era architecture (00–15); brand outdated |
| Phase 2 SoT (this prep) | Root `*_ARCHITECTURE.md` / `MASTER_PROJECT_PLAN.md` |

**Brand split:** User-facing UI = **Growzy**. Packages, docs, cookies, API env still use **Meridian / MFX**.

---

## 2. Monorepo structure

```
fund managment/
├── apps/web          # @meridian/web — Next.js 15
├── apps/api          # @meridian/api — Express stub
├── packages/shared   # @meridian/shared
├── packages/config   # @meridian/config
├── docs/             # Legacy Meridian planning (still valuable)
├── infra/            # Mostly empty scaffolds
├── _tmp_premium_extract/   # TEMP — delete before backend sprint
└── *.md (root)       # Audits + Phase 2 prep docs
```

---

## 3. Old branding / Meridian references

### User-facing (OK — Growzy)
- `apps/web/src/lib/constants.ts`, env defaults, brand components, login demo copy

### Must track for rename backlog (not blocking backend start)

| Location | Issue |
|----------|--------|
| Root `package.json` | name `meridian-fx` |
| `apps/*/package.json`, `packages/*/package.json` | `@meridian/*` |
| `docs/**` | Meridian FX, meridianfx.com, mfx_* cookies |
| `apps/web/src/lib/demo-auth.ts` | Cookie `mfx_at` |
| `apps/web/src/middleware.ts` | Cookie `mfx_at` |
| `apps/web/src/lib/auth-server.ts` | Looks for `mfx_session` (**inconsistent** with `mfx_at`) |
| `apps/api/.env.example` | DB user/db `meridian`, SMTP_FROM_NAME Meridian FX |
| Register placeholder / older docs | `MFX7K2QA` (UI partly updated to `GRZ*`) |

**Recommendation:** Keep package names through Phase 2 week 1 if rename risk is high; introduce cookies `gz_at` / `gz_rt` when real auth ships. Update `docs/README.md` brand line when Master Plan is adopted.

---

## 4. Temporary / dead files

| Path | Action |
|------|--------|
| `_tmp_premium_extract/` | **Delete** before backend work (large reconstructed marketing dump) |
| Unused marketing: `why-choose-us.tsx`, `portfolio-preview.tsx`, `live-activity-bar.tsx` | Candidates for removal or archive |
| `oauth-buttons.tsx` | Deprecated re-export — remove when convenient |
| `kyc-banner.tsx` | Never mounted — keep until KYC phase or delete |
| Common unused: `filter-bar`, `confirm-dialog`, `data-table` (no page imports yet) | Keep — needed when dashboard tables go live |
| `date-range-picker.tsx` | Keep for admin reports |

---

## 5. Duplicate / overlapping UI

| Cluster | Notes |
|---------|--------|
| Performance narrative | `performance-highlights` + `showcase` + `proof` all on homepage — intentional marketing depth, not bugs |
| Why Growzy | Unused `why-choose-us` vs live `advantages-grid` |
| Live activity | Orphan `live-activity-bar` vs shell `live-activity-toasts` |
| Market widgets | Multiple market/trade surfaces across home/performance/technology — OK if IA stays |

---

## 6. Console / TODO / debug

| Check | Result |
|-------|--------|
| `console.log` / `debug` / `warn` in `apps/web/src` | **None** |
| Intentional `console.error` | `error.tsx`, `error-boundary.tsx` |
| `TODO` / `FIXME` in app source | **None** (Placeholder component is deliberate visible stub) |
| API source | Empty stubs |

---

## 7. Placeholder pages (await backend)

**Dashboard:** deposit (+history), withdraw (+history), trades (+detail), my-performance, transactions, notifications, settings (profile, security, payout, preferences)

**Admin:** overview, users, deposits, withdrawals, trades, daily-return, notifications, broadcast, audit-log, reports, settings (platform, payment methods, staff, email templates)

**Marketing:** About team profiles; How-it-works annotated extras (partial)

---

## 8. Auth / guard inconsistencies

1. Demo cookie `mfx_at` vs `auth-server.ts` expecting `mfx_session`.
2. Guards are cookie **presence** only — not security.
3. `NEXT_PUBLIC_ENABLE_ROUTE_GUARDS=true` in `.env.local`.

---

## 9. Broken imports

- Web typecheck reported **pass** in prior audits.
- No obvious missing modules found.

---

## 10. Repeated patterns to consolidate in backend era

- Money display: always via `<Money>` / shared `MoneyString` — never invent float math in UI.
- Form wiring: `FormField` + Zod (already on auth/contact).
- Admin/dashboard tables: prefer shared `DataTable` + `EmptyState` when APIs land.

---

## 11. Cleanup checklist (optional, before/during Phase 2)

- [ ] Delete `_tmp_premium_extract/`
- [ ] Remove unused marketing components listed above
- [ ] Align cookie helper names (`mfx_at` vs `mfx_session`) when replacing demo auth
- [ ] Rebrand docs index to Growzy (or point to `MASTER_PROJECT_PLAN.md`)
- [ ] Decide package rename (`@growzy/*`) vs keep `@meridian/*` for stability

---

## 12. Audit conclusion

Frontend is ready as the **UI contract**. API is empty. Documentation in `docs/` is architecturally strong but Meridian-branded. Phase 2 prep documents at repo root supersede brand naming and become the working source of truth for backend build order.
