# Architecture — Phase 2

```mermaid
flowchart TB
  subgraph clients [Clients]
    Web[Next.js Web]
  end

  subgraph api [Express API]
    MW[Auth + Permission Middleware]
    Profile[Profile Controllers]
    Admin[Admin Controllers]
    Svc[Services]
    Repo[Repositories]
  end

  subgraph data [Data]
    PG[(PostgreSQL)]
    FS[Local Upload Storage]
    Cache[Memory Cache / Redis-ready]
  end

  Web -->|cookies /api/v1| MW
  MW --> Profile
  MW --> Admin
  Profile --> Svc
  Admin --> Svc
  Svc --> Repo
  Svc --> Cache
  Svc --> FS
  Repo --> PG
```

## Layers

1. **Routes** — versioned REST under `/api/v1`
2. **Controllers** — HTTP adapters only
3. **Services** — business rules, audit/activity side effects
4. **Repositories** — Prisma data access
5. **Abstractions infra** — `storage` (local→S3 later), `cache` (memory→Redis later), `notificationService` (DB only)

## Security

- Every admin route: `authenticate` → `requireAdminAccess` → `requirePermission(...)`
- Soft delete only (`deletedAt` + `ARCHIVED`)
- Ownership checks on profile/session mutations
- Admin actions write `AuditLog` + `ActivityLog`
