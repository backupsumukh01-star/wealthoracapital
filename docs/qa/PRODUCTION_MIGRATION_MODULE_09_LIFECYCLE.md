# Production Migration — Module 09: Remove investor lifecycle / localStorage money

**Date:** 2026-08-05  
**Scope:** Eliminate `InvestorLifecycleProvider` and any browser-persisted wallet/auth money state.

## Goal

Remove every remaining localStorage/demo lifecycle implementation. **Money must never be stored in browser localStorage.**

## Changes

| Area | Change |
|------|--------|
| `investor-lifecycle-provider.tsx` | **Deleted** |
| `providers/index.tsx` | Provider removed from tree; `useInvestorLifecycle` export removed |
| `lib/investor-lifecycle.ts` | `loadLifecycleStore` / `saveLifecycleStore` purge `growzy_investor_lifecycle_v2` and never write; types/helpers only |
| Auth modal | Login/register/Google → production auth APIs only (no OTP/2FA demo lifecycle) |
| Profile / security | `useSession` + `useChangePassword` |
| Deposit / withdraw workspaces | Production deposit/withdrawal hooks (pages still redirect to Wallet Center) |
| Admin deposits / withdrawals / KYC / users / returns / wallet / overview / search / activity / email | Wired to `features/admin` + `kycService` / `adminService` |
| `admin-user-detail.tsx` | Last lifecycle consumer → `useAdminUser`, wallet/KYC/suspend APIs |

## P0 cleared

- Dual-session money path that read empty lifecycle after real login is gone.
- No component calls `useInvestorLifecycle`.
- Legacy key `growzy_investor_lifecycle_v2` is deleted on access and never rewritten with balances.

## Still deferred (Module 10)

- `growzy_admin_os_v5` / `AdminOsProvider` — CMS drafts, marketing overlays, some admin CMS screens still persist in localStorage (content, not ledger balances).
- Static instructional deposit bank/crypto copy may still come from `investor-demo-data` constants (display only; submits are API-backed).
- Admin notes have no API yet — UI refuses to fake-save to localStorage.

## Verification

- [x] `pnpm exec tsc --noEmit` in `apps/web` passes
- [ ] Manual: register/login → no `growzy_investor_lifecycle_v2` in Application Storage
- [ ] Manual: wallet balances only from `/wallet` APIs
- [ ] Manual: admin deposit approve credits DB wallet

## Commit

Module 09 commit on `main` after this report.
