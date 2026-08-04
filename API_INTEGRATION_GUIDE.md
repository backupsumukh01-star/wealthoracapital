# Growzy — API Integration Guide

**Stack:** `apps/web` services + `packages/shared` contracts + `apps/api` (to build)  
**Base URL:** `NEXT_PUBLIC_API_URL` (default `http://localhost:4000/api/v1`)

---

## 1. Principles

1. All HTTP goes through `apiClient` (`@/services/http` → `@/lib/api-client`).  
2. Domain methods live in `@/services/*.service.ts`.  
3. Feature folders re-export services (`features/*/api.ts`).  
4. React Query hooks (fill `features/*/hooks.ts`) wrap services.  
5. Money is always a **string**.  
6. Auth uses **httpOnly cookies** (`credentials: 'include'`).  
7. Money POSTs send `Idempotency-Key`.

---

## 2. Service map

| Service | File | Primary routes |
|---------|------|----------------|
| Auth | `auth.service.ts` | `API_ROUTES.auth.*` |
| Wallet | `wallet.service.ts` | `API_ROUTES.wallet.*` |
| Deposit | `deposit.service.ts` | `API_ROUTES.deposits.*` |
| Withdraw | `withdraw.service.ts` | `API_ROUTES.withdrawals.*` |
| Trade | `trade.service.ts` | `API_ROUTES.trades.*` |
| Notification | `notification.service.ts` | `API_ROUTES.notifications.*` |
| Report | `report.service.ts` | performance + `API_ROUTES.reports.*` |
| Settings | `settings.service.ts` | settings + feature flags |
| KYC | `kyc.service.ts` | `API_ROUTES.kyc.*` + admin KYC |
| Support | `support.service.ts` | tickets |
| Admin | `admin.service.ts` | `API_ROUTES.admin.*` |
| CMS | `cms.service.ts` | `API_ROUTES.cms.*` |

Full path list: `packages/shared/src/constants/routes.ts` → `API_ROUTES`.  
Detailed contracts: `API_DOCUMENTATION.md`.

---

## 3. Wiring a screen (example)

```ts
// features/wallet/hooks.ts
import { useQuery } from '@tanstack/react-query'
import { walletService } from '@/features/wallet/api'

export const walletKeys = {
  summary: ['wallet', 'summary'] as const,
}

export function useWalletSummary() {
  return useQuery({
    queryKey: walletKeys.summary,
    queryFn: () => walletService.summary(),
  })
}
```

Then replace demo reads in the component with the hook. Keep UI unchanged.

---

## 4. Session cutover

| Today | Tomorrow |
|-------|----------|
| `mfx_at` / `growzy_admin_at` demo cookies | Real access/refresh cookies |
| `SessionProvider` session=`null` | Layout calls `authService.me` (RSC or client) |
| `hasDemoSession()` in `ProtectedRoute` | Query `['session','me']` success |
| Admin `AdminSessionGate` cookie | Admin `/auth/me` + `StaffRole` |

Cookie names: `@/config/cookies.config`.

---

## 5. Multipart uploads

`depositService.uploadProof` and `kycService.uploadDocument` intentionally return **501** until a multipart-capable transport is added (do not JSON-encode `FormData` through `apiClient`).

---

## 6. Error handling

```ts
import { viewStateFromError, userMessageFromError } from '@/errors'

try {
  await depositService.create(body)
} catch (e) {
  const state = viewStateFromError(e)
  toast.error(userMessageFromError(e))
}
```

---

## 7. Feature flags & maintenance

- Defaults: `@/config/feature-flags.config`  
- Runtime (demo): Admin OS toggles  
- Runtime (prod): `settingsService.public()` / `featureFlags()`  
- Enforce on **API**; UI only hides.

---

## 8. Do not

- Call `fetch` from components  
- Duplicate DTO interfaces in components  
- Trust client role for money mutations  
- Remove demo providers until the matching service is green in staging  
