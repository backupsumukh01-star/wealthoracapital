# Production Migration Report — Module 5: Deposit API requests

**Date:** 2026-08-05  
**Module:** Deposit modal creates real deposit requests  
**Status:** Complete  

## Changes

| File | Change |
|------|--------|
| `deposit-modal.tsx` | `useCreateDeposit` + `useUploadDepositProof` + `useDepositMethods` |

## Behavior

1. Resolve active payment method (bank / mobile / crypto preference)  
2. `POST /deposits` with amount + methodId + idempotency key  
3. Optional proof upload to `/deposits/:id/proof`  
4. Invalidate wallet + deposit queries  

## Note

UI still shows static INR/crypto instructional copy from demo constants when CMS methods lack account details. Submission itself is API-backed.
