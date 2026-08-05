# Production Migration Report — Module 6: Withdrawal API requests

**Date:** 2026-08-05  
**Module:** Withdraw modal creates real withdrawal requests  
**Status:** Complete  

## Changes

| File | Change |
|------|--------|
| `withdraw-modal.tsx` | `useCreateWithdrawal` + `usePayoutMethods`; balance already from `useWallet` |

## Behavior

1. Load investor payout methods from API  
2. `POST /withdrawals` with amount + payoutMethodId + idempotency key  
3. Fail clearly if no payout method exists  
4. Invalidate wallet + withdrawal queries  

## Note

Local “add bank/wallet” UI still exists for UX continuity but does not invent ledger money; withdrawal requires a server payout method id.
