# API Documentation — Phase 2 (Users, Admin, Profile, Audit)

Base: `http://localhost:4000/api/v1`  
Auth: httpOnly cookies from Phase 1. Admin routes require staff access + permission checks.

---

## Profile (`/profile`)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/profile` | `profile.view` | Current user + profile fields |
| PATCH | `/profile` | `profile.edit` | Update name, phone, address, country, timezone, language |
| POST | `/profile/avatar` | `profile.edit` | multipart `avatar` image (≤2MB) |
| GET | `/profile/sessions` | `sessions.manage` | Active sessions |
| GET | `/profile/sessions/current` | `sessions.manage` | Current session |
| DELETE | `/profile/sessions/others` | `sessions.manage` | Terminate all other sessions |
| DELETE | `/profile/sessions/:id` | `sessions.manage` | Terminate one session |

---

## Admin users (`/admin/users`)

Requires admin/staff access.

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/users` | `users.view` |
| GET | `/admin/users/:id` | `users.view` |
| PATCH | `/admin/users/:id` | `users.edit` |
| POST | `/admin/users/:id/enable` | `users.suspend` |
| POST | `/admin/users/:id/disable` | `users.suspend` |
| POST | `/admin/users/:id/suspend` | `users.suspend` |
| POST | `/admin/users/:id/block` | `users.suspend` |
| POST | `/admin/users/:id/delete` | `users.delete` |
| DELETE | `/admin/users/:id` | `users.delete` |
| POST | `/admin/users/:id/restore` | `users.restore` |
| POST | `/admin/users/:id/force-logout` | `users.suspend` |

### List query params

`page`, `limit`, `cursor`, `q`, `status`, `role`, `country`, `phone`, `referralCode`, `emailVerified`, `kycStatus`, `from`, `to`, `includeDeleted`, `sortBy`, `sortOrder`

Search (`q`) matches email, name, phone, referral code, country.

---

## Admin dashboard / activity / audit

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/dashboard` | `dashboard.view` |
| GET | `/admin/activity` | `activity.view` |
| GET | `/admin/audit` | `audit.view` |
| GET | `/admin/roles` | `roles.view` |

Dashboard returns user counts, pending KYC, zeroed deposit/withdrawal/revenue placeholders (later phases), and recent activities.

---

## Account statuses

`PENDING_VERIFICATION` · `ACTIVE` · `SUSPENDED` · `BLOCKED` · `CLOSED` · `ARCHIVED`

---

## RBAC roles

Super Admin · Admin · Finance · Support · KYC · Content · Viewer · Investor  

Permissions are enforced per endpoint via `requirePermission`.
