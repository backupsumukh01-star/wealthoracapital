# Production Migration — Module 10: Remove Admin OS mock persistence

**Date:** 2026-08-05  
**Scope:** Stop `growzy_admin_os_v5` localStorage as source of truth; hydrate CMS from APIs; mount production admin trades/audit/health.

## Goal

Remove Admin OS mock state that made publish/success toasts look real without a database write. Money and trades must never come from browser storage.

## Changes

| Area | Change |
|------|--------|
| `lib/admin-os-store.ts` | `loadAdminOs` / `saveAdminOs` purge `growzy_admin_os_v5` and never write |
| `providers/admin-os-provider.tsx` | Hydrates from `cmsService.publicBootstrap()`; in-memory drafts only; `publishLanding` / `publishPlatformCms` call CMS publish APIs |
| `lib/cms-bootstrap-map.ts` | Maps bootstrap → landing/platform/FAQ/testimonials/toggles |
| Admin trades page | Mounts `AdminTradesWorkspace` (API), not `AdminTradeOsWorkspace` |
| Live trades preview | `usePublicTrades` + `useTradeStats` |
| Wallet / welcome / wealth home | Platform copy from `useCmsBootstrap` |
| Audit / system health | `useAdminAudit` / `useAdminHealth` only |

## P0 cleared

- Admin OS no longer persists to localStorage (key deleted on load/save).
- Admin trades desk is ledger/API-backed.
- Marketing trade feed no longer invents desk activity from Admin OS trades.
- Landing/platform publish attempts hit CMS APIs.

## Remaining (non-blocking / follow-up)

- Some CMS editor workspaces still use in-memory `useAdminOs` draft helpers for UX; they do **not** write localStorage. Prefer CMS/settings APIs for every mutator over time.
- Media library / support ticket OS / email template studio may still be draft-only until dedicated endpoints are wired.
- Static instructional deposit bank copy may still use `investor-demo-data` constants (display only).

## Verification

- [x] `pnpm exec tsc --noEmit` in `apps/web` passes
- [ ] Manual: Application Storage has no `growzy_admin_os_v5` after browsing admin + marketing
- [ ] Manual: Publish landing updates API CMS (second browser sees content)
- [ ] Manual: Admin → Trades lists API trades; publish updates investor feed

## Commit

Module 10 commit on `main` after this report.
