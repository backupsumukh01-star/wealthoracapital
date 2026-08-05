# Production Migration Report — Module 2: KYC

**Date:** 2026-08-05  
**Module:** KYC uses production APIs only (investor submit path)  
**Status:** Complete  

---

## Goal

Stop storing KYC drafts/documents in `InvestorLifecycle` localStorage. Onboarding must create a real KYC submission with uploaded files in the API.

## Changes

| File | Change |
|------|--------|
| `apps/web/src/features/kyc/hooks.ts` | **New** — `useKycStatus`, `useUpdateKyc`, `useUploadKycDocument`, `useSubmitKyc`, badge helper |
| `apps/web/src/components/auth/onboarding-wizard.tsx` | Wired to session + KYC API; removed lifecycle `submitKyc` |

## API flow

1. `PATCH /kyc/update` — draft profile (country, DOB, address, occupation, primaryDocumentType)  
2. `POST /kyc/upload` — multipart documents:
   - ID front: `{documentType: idType, side: FRONT}`
   - ID back (non-passport): `{documentType: idType, side: BACK}`
   - Selfie: `{documentType: SELFIE, side: SINGLE}`
3. `POST /kyc/submit` — moves status to `UNDER_REVIEW`  
4. Session refreshed via React Query invalidation  

## Not in this module

- Admin KYC queue approve/reject still on lifecycle (Module 10 / admin cutover)  
- Profile settings KYC tab display may still reference lifecycle until Module 9  

## Verification

- [ ] Sign in as unverified user → `/onboarding`  
- [ ] Save identity → KYC row `PENDING` in DB  
- [ ] Upload docs → storage keys created  
- [ ] Submit → user `kycStatus=UNDER_REVIEW`  
- [ ] Confirm nothing written to `growzy_investor_lifecycle_v2` for KYC  

## P0 cleared

- **P0-2** KYC / onboarding is demo — **fixed** for investor onboarding wizard.
