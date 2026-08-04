# Growzy — Deployment Guide

**Audience:** Platform engineers deploying Growzy Capital to staging / production  
**Status:** Frontend demo is complete; API is scaffold — follow this guide when wiring the live stack  
**Related:** `docs/15-deployment-checklist.md`, `infra/`, `SYSTEM_ARCHITECTURE.md`

---

## 1. Prerequisites

| Requirement | Notes |
|-------------|--------|
| Node.js | `>= 22` (see `.nvmrc`) |
| pnpm | Workspace package manager |
| PostgreSQL | 16+ for production ledger |
| Object storage | S3-compatible for KYC, proofs, CMS media |
| SMTP / ESP | Transactional email |
| TLS certificates | Public HTTPS only |
| Secrets store | Never commit `.env` production values |

---

## 2. Repository build

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

Web app: `apps/web` (Next.js). API: `apps/api` (Express scaffold — enable when models land).

---

## 3. Environment variables (planned)

### Web (`apps/web`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | REST base URL |
| `NEXT_PUBLIC_APP_URL` | Canonical public origin |
| `NEXT_PUBLIC_GA_ID` | Optional analytics (prefer CMS SEO field) |

### API (`apps/api`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Session signing |
| `COOKIE_DOMAIN` | Shared auth cookie domain |
| `S3_ENDPOINT` / `S3_BUCKET` / keys | Media + KYC storage |
| `SMTP_*` or ESP API key | Outbound email |
| `ADMIN_BOOTSTRAP_EMAIL` | First Super Admin seed |
| `NODE_ENV` | `production` |

Demo mode today does **not** require these; production must.

---

## 4. Topology

```
Internet → CDN / WAF → nginx
                      ├─ /        → Next.js (apps/web)
                      └─ /api/v1  → Express (apps/api)
PostgreSQL · Object storage · Email · (optional Redis workers)
```

Sketches: `infra/nginx`, `infra/pm2`, `infra/systemd`.

---

## 5. Database

1. Apply Prisma migrations when models exist (`DATABASE_SCHEMA.md`).  
2. Seed Super Admin, default feature toggles, CMS bootstrap content.  
3. Enable automated backups (see Backup Center UI + DB dump cron).  
4. Verify restore on staging before go-live.

---

## 6. CMS & Admin OS cutover

| Demo (localStorage) | Production |
|---------------------|------------|
| `growzy_admin_os_v4` | CMS + settings tables via API |
| `growzy_investor_lifecycle_v2` | Users, wallets, ledger |
| Publish / rollback in browser | Server revisions + audit rows |

Cutover steps:

1. Export full Admin OS JSON from Backup Center (content baseline).  
2. Import via admin bootstrap script into CMS tables.  
3. Point providers at REST (`/cms/public`, `/admin/cms/*`).  
4. Disable demo persistence flags.

---

## 7. Health & monitoring

Wire System Health widgets (`/admin/system-health`) to real probes:

- DB ping, API latency, queue depth, SSL expiry, disk/CPU/mem  
- Pending KYC / deposits / withdrawals counts from queues  
- Failed logins, recent errors, audit volume  

Alerting: uptime checks + error budget on money endpoints.

---

## 8. Release process

1. Merge to `main` after CI green (`typecheck`, `lint`, `build`, tests).  
2. Deploy API migrations first (backward-compatible).  
3. Deploy web.  
4. Smoke: login (investor + admin), deposit queue, CMS publish, health page.  
5. Confirm maintenance mode toggle works.  
6. Tag release (`Growzy Web x.y.z` matches System Health version field).

---

## 9. Rollback

| Layer | Action |
|-------|--------|
| Web | Redeploy previous image / artifact |
| API | Previous image + migrate down only if safe |
| CMS content | Admin revision rollback (no redeploy) |
| Data | Restore from Backup Center / DB dump |

---

## 10. Go-live gate

- [ ] TLS valid; HSTS on  
- [ ] Demo credentials disabled  
- [ ] Feature toggles reviewed  
- [ ] Backups scheduled + tested restore  
- [ ] Security checklist signed (`SECURITY_CHECKLIST.md`)  
- [ ] Support channels and limits set in System Settings  
- [ ] Risk / Terms / Privacy published from CMS  

---

*This guide is production-oriented. Demo localStorage mode is for UX validation only.*
