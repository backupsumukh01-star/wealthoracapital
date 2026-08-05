# Production Migration Report — Module 4: Wallet live balances

**Date:** 2026-08-05  
**Module:** Wallet Center uses live balances and deposit/withdrawal lists  
**Status:** Complete  

## Changes

| File | Change |
|------|--------|
| `wallet-summary.tsx` | `useWallet` |
| `wallet-center.tsx` | `useWallet` + `useDeposits` + `useWithdrawals` + session KYC gate |

## P0 cleared

Wallet page balances and recent money moves come from API, not localStorage.
