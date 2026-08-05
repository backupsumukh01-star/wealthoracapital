# Production Migration Report — Module 3: Dashboard live API data

**Date:** 2026-08-05  
**Module:** Dashboard loads live API wallet/summary data  
**Status:** Complete  

## Changes

| File | Change |
|------|--------|
| `lib/account-access.ts` | KYC gate helper from API status |
| `wealth-home.tsx` | Session KYC gate (no lifecycle) |
| `portfolio-hero.tsx` | `useWalletSummary` balances |
| `overview-cards.tsx` | `useWalletSummary` KPIs |
| `account-status-banner.tsx` | Session KYC banner |
| `welcome-section.tsx` | Session identity only |
| `active-investment-card.tsx` | Live wallet summary |
| `live-performance-chart.tsx` | Summary chart points / wallet |
| `growth-chart.tsx` | Summary chart points / wallet |

## P0 cleared

Dashboard money figures no longer read `growzy_investor_lifecycle_v2`.
