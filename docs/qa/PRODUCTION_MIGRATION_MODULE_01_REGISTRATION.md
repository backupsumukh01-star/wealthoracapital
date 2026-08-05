# Production Migration Report — Module 1: Registration

**Date:** 2026-08-05  
**Module:** Registration creates real users in the database  
**Status:** Complete  

---

## Goal

Stop creating investor accounts in browser `localStorage`. Registration must call `POST /api/v1/auth/register` and persist users in Postgres.

## Changes

| File | Change |
|------|--------|
| `apps/web/src/components/auth/register-form.tsx` | Uses `useRegister` → `authService.register`; Google → real OAuth URL |
| `apps/web/src/components/auth/auth-modal.tsx` | Register + Google paths use API (modal login still demo — later modules) |
| `apps/web/src/services/auth.service.ts` | `RegisterBody` includes `acceptTerms` / `acceptRisk` |
| `apps/web/src/lib/auth-schemas.ts` | Password requires special character (matches API) |
| `apps/web/eslint.config.mjs` | Allow `features/*` imports from `auth` / `wallet` shells |

## Behavior

1. User submits register form (page or marketing modal).  
2. Client validates (name, email, phone, password rules, terms).  
3. API creates user + wallet side-effects; returns `{ userId }`.  
4. Verification email is sent by the API.  
5. UI navigates to `/verify-email?email=…&from=register` (no fake OTP).  
6. Duplicate emails follow API anti-enumeration (success-shaped response).

## Not in this module

- Auth modal **email login / OTP / 2FA** still use `InvestorLifecycleProvider` (Module 9 / follow-on).  
- Dedicated `/login` page was already API-wired.  
- KYC / wallet / money paths unchanged.

## Verification

- [ ] Register with a new email against staging/prod API  
- [ ] Confirm row in `User` table and empty wallet  
- [ ] Confirm verification email arrives  
- [ ] Confirm no new account appears only in `growzy_investor_lifecycle_v2`  
- [ ] Password without special character is rejected client-side  

## P0 cleared

- **P0-1** Registration does not call API — **fixed** for register page + modal register.
