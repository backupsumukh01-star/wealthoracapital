# RBAC Audit Report — Growzy

**Date:** 2026-08-05  
**Scope:** API permission matrix, admin roles, unauthorized access, frontend route protection  
**Mode:** Report only — no fixes  

---

## Executive verdict

| Layer | Verdict |
|-------|---------|
| API permission matrix (specialty staff) | **Mostly solid** — FINANCE/SUPPORT/KYC/CONTENT/VIEWER least-privilege |
| API admin router | Authenticate + `requireAdminAccess` + per-route `requirePermission` |
| Investor → `/api/v1/admin/*` | **Blocked (403)** — covered by OWASP tests |
| Frontend `/admin` edge gate | **Cookie only** — not role-aware |
| Frontend fine-grained RBAC | **Scaffold only** — unused stubs; all admins see all nav |
| Roles named Compliance / Operations | **Do not exist** — closest: KYC, CONTENT/VIEWER |

**Unauthorized investors cannot operate the API admin console** if cookies are valid investor sessions. They **can** receive `/admin` HTML before client redirect. Fine-grained staff differences are **API-only**; the web UI does not hide restricted links.

---

## Role catalog (actual enums)

### Account class — `User.role`

| Enum | Label | Notes |
|------|-------|-------|
| `USER` | Investor | Default registration |
| `ADMIN` | Admin | **All 39 permissions** |
| `SUPER_ADMIN` | Super Admin | All permissions + can assign `role` / `staffRole` |

### Staff specialty — `User.staffRole` (nullable)

| Enum | Label | Maps to user request? |
|------|-------|------------------------|
| `SUPER_ADMIN` | Super Admin | Yes |
| `ADMIN` | Admin | Yes |
| `FINANCE` | Finance | Yes |
| `SUPPORT` | Support | Yes |
| `KYC` | KYC / Compliance-like | **No separate `COMPLIANCE`** |
| `CONTENT` | Content | **No separate `OPERATIONS`** |
| `VIEWER` | Viewer | Read-mostly ops |

**Requested vs actual**

| Requested | Actual |
|-----------|--------|
| Super Admin | `Role.SUPER_ADMIN` and/or `StaffRole.SUPER_ADMIN` |
| Admin | `Role.ADMIN` / `StaffRole.ADMIN` |
| Support | `StaffRole.SUPPORT` (typically `Role.USER` + staffRole) |
| Finance | `StaffRole.FINANCE` |
| Compliance | **Missing** → use `KYC` |
| Operations | **Missing** → closest `CONTENT` or `VIEWER` |

Staff admission: `isStaffUser` = `role ∈ {ADMIN, SUPER_ADMIN}` **OR** `staffRole ≠ null`.

---

## Permission matrix

**39 permissions.** Legend: ● = granted · ○ = denied

Resolution (`resolvePermissions`):

- `role=SUPER_ADMIN` → all  
- `role=ADMIN` → all (staffRole cannot reduce)  
- `role=USER` + `staffRole` → specialty map only  
- `role=USER` + null → investor set  

| Permission | Super Admin | Admin | Finance | Support | KYC | Content | Viewer | Investor |
|------------|:-----------:|:-----:|:-------:|:-------:|:---:|:-------:|:------:|:--------:|
| dashboard.view | ● | ● | ● | ● | ● | ● | ● | ○ |
| users.view | ● | ● | ● | ● | ● | ● | ● | ○ |
| users.edit | ● | ● | ○ | ● | ● | ○ | ○ | ○ |
| users.suspend | ● | ● | ○ | ● | ○ | ○ | ○ | ○ |
| users.delete | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| users.restore | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| audit.view | ● | ● | ● | ○ | ○ | ○ | ● | ○ |
| activity.view | ● | ● | ● | ● | ● | ● | ● | ○ |
| roles.view | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| profile.view | ● | ● | ● | ● | ● | ● | ● | ● |
| profile.edit | ● | ● | ● | ● | ● | ● | ○ | ● |
| sessions.manage | ● | ● | ● | ● | ● | ● | ● | ● |
| kyc.view | ● | ● | ● | ● | ● | ○ | ● | ● |
| kyc.submit | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| kyc.review | ● | ● | ○ | ○ | ● | ○ | ○ | ○ |
| wallet.view | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| deposits.view | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| deposits.create | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| withdrawals.view | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| withdrawals.create | ● | ● | ○ | ○ | ○ | ○ | ○ | ● |
| finance.view | ● | ● | ● | ○ | ○ | ○ | ● | ○ |
| finance.review | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| finance.manage | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| finance.adjust | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| trades.view | ● | ● | ● | ○ | ○ | ○ | ● | ● |
| trades.manage | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| performance.view | ● | ● | ● | ○ | ○ | ○ | ● | ● |
| returns.manage | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| cms.view | ● | ● | ○ | ○ | ○ | ● | ● | ○ |
| cms.manage | ● | ● | ○ | ○ | ○ | ● | ○ | ○ |
| media.manage | ● | ● | ○ | ○ | ○ | ● | ○ | ○ |
| emails.manage | ● | ● | ○ | ● | ○ | ● | ○ | ○ |
| support.view | ● | ● | ○ | ● | ○ | ○ | ● | ● |
| support.manage | ● | ● | ○ | ● | ○ | ○ | ○ | ○ |
| reports.view | ● | ● | ● | ○ | ○ | ○ | ● | ● |
| reports.manage | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| broadcasts.manage | ● | ● | ○ | ● | ○ | ● | ○ | ○ |
| settings.manage | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| notifications.view | ● | ● | ● | ● | ○ | ● | ● | ● |

**Admin-only in practice** (specialty staff lack): `users.delete`, `users.restore`, `roles.view`, `trades.manage`, `settings.manage`.

---

## API authorization tests

### Automated (present)

| Test | Expectation | Status |
|------|-------------|--------|
| Investor → `GET /admin/dashboard` | 403 FORBIDDEN | ✅ `tests/security/owasp.test.ts` |
| Investor → `GET /admin/users` | 403 | ✅ |
| Investor cannot escalate via register body (`staffRole`) | Ignored / null | ✅ |
| Investor platform-wide report export | Blocked / scoped | ✅ (related OWASP) |

### Expected behavior by actor (API)

| Actor | `GET /admin/dashboard` | `POST /admin/deposits/:id/approve` | `POST /admin/kyc/:id/approve` | `PUT /admin/settings` |
|-------|------------------------|-------------------------------------|-------------------------------|------------------------|
| Anonymous | 401 | 401 | 401 | 401 |
| Investor (USER, no staff) | 403 | 403 | 403 | 403 |
| SUPPORT staff | 200 (has dashboard.view) | **403** (no finance.review) | **403** (no kyc.review) | **403** |
| FINANCE staff | 200 | 200 | **403** | **403** |
| KYC staff | 200 | **403** | 200 | **403** |
| CONTENT staff | 200 | **403** | **403** | **403** |
| VIEWER | 200 | **403** | **403** | **403** |
| ADMIN / SUPER_ADMIN | 200 | 200 | 200 | 200 |

### Middleware stack (admin)

```
authenticate → requireAdminAccess → requirePermission(<key>)
```

| Guard | Used on admin routes? |
|-------|------------------------|
| `authenticate` | ✅ |
| `requireAdminAccess` | ✅ router-wide |
| `requirePermission` | ✅ per-route |
| `requireRoles` / `requireStaffRoles` | ❌ defined, **unused** |

CMS staff paths (`/api/v1/cms/*` manage): permission-only, **no** `requireAdminAccess` (MEDIUM defense-in-depth gap).

---

## Frontend route protection

| Control | What it checks | Role-aware? | Result |
|---------|----------------|-------------|--------|
| Next middleware `/admin/*` | `mfx_at` cookie present | ❌ | Investor with cookie **allowed** at edge |
| Next middleware `/dashboard/*` | cookie present | ❌ (any auth) | Intended for investors |
| `AdminSessionGate` | `/auth/me` → `isAdmin` (ADMIN \| SUPER_ADMIN) | Partial | Redirects non-admin after load |
| `ProtectedRoute` | `isAuthenticated` only | ❌ | Any logged-in user |
| `PermissionGate` / `StaffRoleGate` | Stubs | ❌ unused | Every admin treated as SUPER_ADMIN |
| Admin sidebar | Static `ADMIN_NAV` | ❌ | **All links shown to all operators** |
| `getServerSession` | Always `null` | — | No SSR role gate |
| Admin login form | Rejects non-ADMIN/SUPER_ADMIN | ✅ | Then logout |

**Investor with valid cookie visiting `/admin`:**

1. Middleware allows (cookie exists)  
2. Admin layout HTML + JS load  
3. Gate shows “Checking operator session…”  
4. `/auth/me` → not admin → client redirect to `/admin/login`  
5. API admin calls would 403 if attempted  

**Gap:** `AdminSessionGate` treats only `role` ADMIN/SUPER_ADMIN as admin. A legitimate operator with `role=USER` + `staffRole=FINANCE` is **staff on API** (`isStaffUser=true`) but may be **rejected by the frontend gate** (false negative) — verify product intent. Conversely specialty staff who somehow get past UI still hit API permissions correctly.

---

## Privilege escalation & rank guards

| Control | Status |
|---------|--------|
| Only Super Admin can change `role` / `staffRole` | ✅ Service-gated |
| Cannot self-suspend / self-delete | ✅ |
| `assertCanManageTarget` on edit/suspend/delete | ✅ Rank ladder |
| Register cannot set elevated roles | ✅ |
| `forceLogout` privilege rank check | ❌ **HIGH** — SUPPORT can force-logout higher ranks |
| Demotion revokes access JWT immediately | ❌ **CRITICAL** — authz uses JWT claims until expiry/refresh |
| `role=ADMIN` least-privilege via staffRole | ❌ ADMIN always all permissions |

Privilege ranks (service): SUPER_ADMIN 100 → ADMIN 80 → FINANCE 60 → SUPPORT/KYC/CONTENT 40 → VIEWER 20 → investor 0.

---

## Findings by severity

### CRITICAL

1. **Stale JWT after demotion** — Middleware authorizes from access-token claims. Stripping `staffRole` / demoting without forcing logout leaves elevated access until token TTL or refresh.

### HIGH

2. **`forceLogout` skips rank checks** — Holders of `users.suspend` (SUPPORT) can revoke Super Admin sessions.  
3. **Frontend admin edge is role-blind** — Shared `mfx_at`; investor loads `/admin` document.  
4. **`role=ADMIN` ≡ unrestricted permissions** — Indistinguishable from Super Admin except role-assignment power.  
5. **UI shows all admin nav to every operator** — Relies entirely on API 403; bad UX and attack surface discovery.  
6. **Possible staff false-negative on web** — `USER`+`staffRole` may fail `AdminSessionGate` while API allows.

### MEDIUM

7. **No Compliance / Operations roles** — Product naming mismatch; KYC/CONTENT used instead.  
8. **PermissionGate / StaffRoleGate unused stubs** — Hardcode every admin as SUPER_ADMIN.  
9. **CMS manage routes lack `requireAdminAccess`** — Permission-only.  
10. **`requireRoles` / `requireStaffRoles` dead code**.

### LOW

11. Investor support/notifications/export often `authenticate` only (ownership must hold in controllers).  
12. Super Admin may manage peer Super Admins (no dual control).

---

## Unauthorized access summary

| Scenario | Frontend | API |
|----------|----------|-----|
| Anonymous → admin pages | Redirect login | 401 |
| Investor → admin pages | HTML loads → client redirect | **403** ✅ |
| Investor → admin mutations | N/A / blocked UI | **403** ✅ |
| SUPPORT → finance approve | Link visible | **403** ✅ |
| FINANCE → KYC approve | Link visible | **403** ✅ |
| FINANCE → wallet adjust | Link visible | **200** if permitted ✅ |
| Demoted admin within access TTL | May still look admin until me refresh | **May still pass until JWT expires** ❌ |

---

## Gate recommendations (report only)

1. Revoke all sessions (or rotate) on role/staffRole demotion.  
2. Add privilege-rank check to `forceLogout`.  
3. Make middleware role-aware **or** accept HTML leak and harden AdminSessionGate for `staffRole` staff.  
4. Wire `PermissionGate` to real `resolvePermissions` and filter `ADMIN_NAV`.  
5. Decide product roles: add Compliance/Operations enums **or** document KYC/CONTENT as those roles.  
6. Consider making `role=ADMIN` use specialty map when `staffRole` set (breaking change — product decision).

---

## Source map

| Artifact | Path |
|----------|------|
| Permission catalog + maps | `apps/api/src/config/permissions.ts` |
| Admin router gates | `apps/api/src/routes/admin*.ts` |
| Authz middleware | `apps/api/src/middlewares/require-permission.ts`, `authorize.ts` |
| Privilege rank | `apps/api/src/services/admin-users.service.ts` |
| OWASP RBAC tests | `apps/api/tests/security/owasp.test.ts` |
| Edge middleware | `apps/web/src/middleware.ts` |
| AdminSessionGate | `apps/web/src/components/admin/admin-topbar.tsx` |
| UI gates (unused) | `apps/web/src/features/auth/guards.tsx` |
| Session `isAdmin` | `apps/web/src/providers/session-provider.tsx` |

---

*Read-only audit. Automated investor→admin API denials verified via existing security tests; specialty role matrix derived from `STAFF_PERMISSION_MAP`.*
