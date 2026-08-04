# Database Documentation — Phase 2

## New / extended models

| Model | Table | Purpose |
|-------|-------|---------|
| `User` | `users` | Extended statuses `BLOCKED`, `ARCHIVED`; indexes for search |
| `Session` | `sessions` | User sessions (refresh tokens) — Phase 1 |
| `UserProfile` | `user_profiles` | Address, language, bio (1:1 with User) |
| `AuditLog` | `audit_logs` | Admin actions with old/new JSON snapshots |
| `ActivityLog` | `activity_logs` | Timeline events (login, profile, admin, etc.) |
| `Notification` | `notifications` | In-app DB notifications only |

## Enums added

- `UserStatus`: `BLOCKED`, `ARCHIVED`
- `ActivityKind`: login/logout/password/profile/admin/session/avatar/registration
- `NotificationKind`: `SYSTEM`, `SECURITY`, `ACCOUNT`, `ADMIN`

## Migration

```bash
pnpm --filter @meridian/api db:migrate:deploy
```

Migration name: `20260804220000_phase2_user_admin`
