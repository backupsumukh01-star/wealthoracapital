# Growzy Permission Matrix (Production RBAC)

**Source of truth:** `apps/api/src/config/permissions.ts` (`buildPermissionMatrix()`)  
**Generated:** 2026-08-05  
**API:** `GET /api/v1/admin/roles` → `{ items, matrix }`

Legend: ● = granted · ○ = denied

## Resolution rules

| Condition | Permissions |
|-----------|-------------|
| `role = SUPER_ADMIN` | All permissions |
| `role = ADMIN` | All permissions (staff specialty cannot reduce) |
| `role = USER` + `staffRole` set | Specialty map only |
| `role = USER` + `staffRole = null` | Investor set |

Staff console admission (`isStaffUser`): `role ∈ {ADMIN, SUPER_ADMIN}` **OR** `staffRole ≠ null`.

## Privilege hierarchy (force logout / manage user)

Strictly higher rank required to manage a target:

| Rank | Roles |
|-----:|-------|
| 100 | SUPER_ADMIN (`role` or `staffRole`) |
| 80 | ADMIN (`role` or `staffRole`) |
| 60 | FINANCE |
| 40 | SUPPORT, KYC, CONTENT |
| 20 | VIEWER |
| 0 | Investor (no staff) |

Only Super Admin may change `role` / `staffRole`. Changing either **revokes all sessions** for that user (JWT invalidated). Suspend / block / delete also revoke sessions. Force logout uses the same hierarchy and cannot target self.

## Matrix

| Permission | Super Admin | Admin | Finance | Support | KYC / Compliance | Content | Viewer | Investor |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `dashboard.view` | ● | ● | ● | ● | ● | ● | ● | ○ |
| `users.view` | ● | ● | ● | ● | ● | ● | ● | ○ |
| `users.edit` | ● | ● | ○ | ● | ● | ○ | ○ | ○ |
| `users.suspend` | ● | ● | ○ | ● | ○ | ○ | ○ | ○ |
| `users.delete` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| `users.restore` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| `audit.view` | ● | ● | ● | ○ | ○ | ○ | ● | ○ |
| `activity.view` | ● | ● | ● | ● | ● | ● | ● | ○ |
| `roles.view` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| `profile.view` | ● | ● | ● | ● | ● | ● | ● | ● |
| `profile.edit` | ● | ● | ● | ● | ● | ● | ○ | ● |
| `sessions.manage` | ● | ● | ● | ● | ● | ● | ● | ● |
| `kyc.view` | ● | ● | ● | ● | ● | ○ | ● | ● |
| `kyc.submit` | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| `kyc.review` | ● | ● | ○ | ○ | ● | ○ | ○ | ○ |
| `wallet.view` | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| `deposits.view` | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| `deposits.create` | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| `withdrawals.view` | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| `withdrawals.create` | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| `finance.view` | ● | ● | ● | ○ | ○ | ○ | ● | ○ |
| `finance.review` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| `finance.manage` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| `finance.adjust` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| `trades.view` | ● | ● | ● | ○ | ○ | ○ | ● | ● |
| `trades.manage` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| `performance.view` | ● | ● | ● | ○ | ○ | ○ | ● | ● |
| `returns.manage` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| `cms.view` | ● | ● | ○ | ○ | ○ | ● | ● | ○ |
| `cms.manage` | ● | ● | ○ | ○ | ○ | ● | ○ | ○ |
| `media.manage` | ● | ● | ○ | ○ | ○ | ● | ○ | ○ |
| `emails.manage` | ● | ● | ○ | ● | ○ | ● | ○ | ○ |
| `support.view` | ● | ● | ○ | ● | ○ | ○ | ● | ● |
| `support.manage` | ● | ● | ○ | ● | ○ | ○ | ○ | ○ |
| `reports.view` | ● | ● | ● | ○ | ○ | ○ | ● | ● |
| `reports.manage` | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| `broadcasts.manage` | ● | ● | ○ | ● | ○ | ● | ○ | ○ |
| `settings.manage` | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| `notifications.view` | ● | ● | ● | ● | ○ | ● | ● | ● |

## Frontend enforcement

| Surface | Behavior |
|---------|----------|
| Admin sidebar / settings nav / command palette | Hide items lacking permission |
| Admin routes | `AdminPermissionRouteGuard` redirects to `/admin` |
| Investor sidebar / mobile / settings nav | Hide items lacking permission |
| Investor routes | `InvestorPermissionRouteGuard` redirects to `/dashboard` |
| Session | `/auth/me` returns live `permissions`; tab focus re-fetches |
| Role change | Sessions revoked server-side; UI refresh on focus / after self-edit |

API remains the security boundary; UI gates are UX only.
