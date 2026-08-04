# 15 — Deployment Checklist

Target: a single VPS running Nginx, PM2 and PostgreSQL. Sized for the first few thousand users,
with a documented upgrade path rather than premature distribution.

---

## 1. Target topology

```
                        Internet
                            │  443
                            ▼
              ┌──────────────────────────────┐
              │            Nginx             │
              │  TLS · HTTP/2 · brotli       │
              │  rate limit · security hdrs  │
              └────────┬────────────┬────────┘
                       │            │
              /        │            │  /api/*
                       ▼            ▼
        ┌──────────────────┐  ┌────────────────────────┐
        │ PM2: mfx-web     │  │ PM2: mfx-api           │
        │ next start :3000 │  │ cluster, 2 inst. :4000 │
        │ fork mode        │  │ + cron in instance 0   │
        └──────────────────┘  └───────────┬────────────┘
                                          │
                    ┌─────────────────────┼──────────────────┐
                    ▼                     ▼                  ▼
          ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐
          │  PostgreSQL 16   │  │ /var/lib/meridian│  │ SMTP        │
          │  localhost only  │  │ /uploads         │  │ (external)  │
          └──────────────────┘  └──────────────────┘  └─────────────┘
                    │                     │
                    └──────── nightly ────┴──► encrypted → offsite
```

**Recommended VPS:** 4 vCPU, 8 GB RAM, 100 GB NVMe, Ubuntu 24.04 LTS. Minimum viable is 2 vCPU /
4 GB, which will handle the first few hundred users but leaves no headroom for a distribution run
concurrent with normal traffic.

**Cron placement matters:** scheduled jobs must run in exactly one process. With PM2 cluster mode,
guard the scheduler with `if (process.env.NODE_APP_INSTANCE === '0')`. Skipping this is how you end
up sending the daily digest twice.

---

## 2. Directory layout on the server

```
/var/www/meridian/            app (git checkout, owned by the meridian user)
  ├── apps/api/dist
  ├── apps/web/.next
  └── node_modules
/var/lib/meridian/uploads/    user files — outside the web root, never served statically
/var/log/meridian/            application logs
/etc/meridian/.env            secrets, 0600, owned by meridian
/var/backups/meridian/        local backup staging before offsite sync
```

---

## 3. Provisioning (once)

- [ ] Ubuntu 24.04 LTS, fully updated, `unattended-upgrades` enabled
- [ ] Non-root `meridian` user created; app never runs as root
- [ ] SSH hardened: key-only, root login disabled, non-standard port, `fail2ban` installed
- [ ] UFW: default deny inbound; allow only the SSH port, 80 and 443
- [ ] Timezone set to UTC (the platform timezone is a database setting, not the OS clock)
- [ ] Node 22 LTS via nvm or NodeSource; pnpm installed globally
- [ ] PostgreSQL 16 installed, bound to `localhost` only
- [ ] Nginx installed
- [ ] PM2 installed globally and registered with systemd (`pm2 startup`)
- [ ] Swap configured (2 GB) so a memory spike degrades rather than OOM-kills
- [ ] `logrotate` configured for application and Nginx logs
- [ ] NTP synchronised — trading-day boundaries depend on an accurate clock

### PostgreSQL

- [ ] Dedicated `meridian` database and role; **no superuser**, no DDL rights in production
      (migrations run as a separate role during deploy)
- [ ] `scram-sha-256` authentication; strong password stored only in `/etc/meridian/.env`
- [ ] Tuned for 8 GB RAM: `shared_buffers=2GB`, `effective_cache_size=6GB`,
      `work_mem=16MB`, `maintenance_work_mem=512MB`, `max_connections=100`
- [ ] `log_min_duration_statement=1000` to catch slow queries
- [ ] WAL archiving configured if targeting an RPO better than 24 hours
- [ ] Connection pool sized so `instances × pool ≤ max_connections − headroom`

---

## 4. Nginx

- [ ] Server blocks for the apex and `www`, redirecting HTTP → HTTPS
- [ ] TLS via Certbot with auto-renewal, and a **renewal hook that reloads Nginx**
- [ ] TLS 1.2+ only, modern cipher suite, OCSP stapling
- [ ] HTTP/2 enabled
- [ ] `/` proxies to `127.0.0.1:3000`; `/api/` proxies to `127.0.0.1:4000`
- [ ] Proxy headers: `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Host`
- [ ] `client_max_body_size 6M` (above the 5 MB app limit, so the app produces the error message)
- [ ] Timeouts: `proxy_read_timeout 120s` for long-running distribution runs
- [ ] gzip and brotli for text assets
- [ ] Long-cache immutable `_next/static`; never cache `/api/`
- [ ] Security headers per [14 §7](./14-security-checklist.md#7-transport-headers--cors)
- [ ] Rate limiting zones: general, and a tighter one for `/api/v1/auth/`
- [ ] `server_tokens off`
- [ ] The uploads directory is **not** exposed by any location block
- [ ] Custom 502/503 pages so an outage looks intentional rather than broken

---

## 5. Application configuration

- [ ] `/etc/meridian/.env` populated from `.env.example` — every key present, none placeholder
- [ ] File mode `0600`, owned by `meridian`
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are distinct, ≥32 bytes, from a CSPRNG
- [ ] `NODE_ENV=production` in both apps
- [ ] `DATABASE_URL` points at the local socket with the least-privilege role
- [ ] `UPLOAD_ROOT=/var/lib/meridian/uploads`, `STORAGE_DRIVER=local`
- [ ] SMTP credentials verified with a live test send
- [ ] Google OAuth production credentials with the exact production redirect URI registered
- [ ] `NEXT_PUBLIC_*` variables contain nothing secret
- [ ] Env validation passes at boot — a missing key must crash startup, not fail at runtime

### PM2

```js
// ecosystem.config.js — specification
module.exports = {
  apps: [
    { name: 'mfx-api', script: 'apps/api/dist/server.js',
      instances: 2, exec_mode: 'cluster',
      max_memory_restart: '600M', kill_timeout: 10000, wait_ready: true,
      error_file: '/var/log/meridian/api-error.log',
      out_file:   '/var/log/meridian/api-out.log' },
    { name: 'mfx-web', script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000', cwd: 'apps/web',
      instances: 1, exec_mode: 'fork', max_memory_restart: '800M' },
  ],
}
```

- [ ] `wait_ready` with `process.send('ready')` after the server is listening, so PM2 never routes
      traffic to a process that isn't accepting it
- [ ] `kill_timeout` long enough for in-flight requests to drain
- [ ] Graceful shutdown on `SIGINT`/`SIGTERM`: stop accepting, drain, close the Prisma client, exit
- [ ] `pm2 save` and `pm2 startup` so the stack survives a reboot
- [ ] `pm2-logrotate` installed

---

## 6. Deploy procedure

```bash
# infra/scripts/deploy.sh — specification
set -euo pipefail

1. Pre-flight     confirm the target commit, confirm CI is green, confirm a fresh DB backup exists
2. Snapshot       pg_dump → /var/backups/meridian/pre-deploy-$(date +%s).sql.gz
3. Fetch          git fetch && git checkout <tag>
4. Install        pnpm install --frozen-lockfile --prod=false
5. Migrate        pnpm db:deploy          # prisma migrate deploy — BEFORE the new code starts
6. Build          pnpm build              # shared → api → web
7. Reload API     pm2 reload mfx-api      # rolling, zero downtime
8. Health gate    poll /api/v1/health/ready until 200, up to 60s — abort and roll back on failure
9. Reload web     pm2 reload mfx-web
10. Smoke test    landing page 200 · login 200 · authenticated dashboard call 200
11. Verify        run the reconciliation job; abort and alert on any drift
12. Record        write the deploy to the log: who, when, which commit
```

### Rules

- **Migrations run before the new code starts**, and must be backward compatible with the currently
  running version — otherwise the rolling reload serves errors from the old instances.
- **Destructive schema changes are split across two releases**: expand (add the new column, write
  both) → migrate (backfill, switch reads) → contract (drop the old column, next release). This is
  what makes rollback safe.
- **Roll back if the health gate fails**, automatically. `rollback.sh` checks out the previous tag,
  rebuilds and reloads; if the failed release included a migration, restore the pre-deploy dump.
- **Never deploy on a Friday afternoon**, and never immediately before a scheduled daily-return run.

---

## 7. Backups

| Aspect | Specification |
|--------|--------------|
| Database | `pg_dump -Fc` nightly at 02:00, plus before every deploy |
| Uploads | Nightly incremental sync of `/var/lib/meridian/uploads` |
| Encryption | age or GPG with a key stored **off** the server |
| Destination | Offsite object storage in a different provider or region |
| Retention | 7 daily · 4 weekly · 12 monthly |
| Verification | Nightly job asserts the dump exists, is plausibly sized, and lists its tables |
| **Restore drill** | **Quarterly, into staging, followed by a reconciliation run** |
| RPO / RTO | 24h / 2h with nightly dumps; 1h / 2h with WAL archiving |

- [ ] Backup script tested end to end
- [ ] Restore script tested end to end — **a backup you have not restored is not a backup**
- [ ] Encryption key stored securely off-server and its recovery documented
- [ ] Monitoring alerts if a backup does not appear by 03:00
- [ ] Restore procedure documented step by step, executable by someone who did not write it

---

## 8. Monitoring & alerting

| Signal | Tool | Alert threshold |
|--------|------|-----------------|
| Uptime | External HTTP check on `/` and `/api/v1/health` | 2 consecutive failures |
| Error rate | Log aggregation on 5xx | >1% over 5 minutes |
| Response time | Nginx access log analysis | p95 > 1s over 10 minutes |
| CPU / memory / disk | node_exporter or the provider's monitoring | >85% sustained; disk >80% |
| Postgres connections | pg_stat | >80% of `max_connections` |
| **Reconciliation drift** | Nightly job | **Any drift — P0** |
| Failed daily-return run | Job status | Any failure — P0 |
| Dead-lettered outbox events | Job | >10 in an hour |
| Backup freshness | Backup verify job | No backup by 03:00 |
| TLS certificate expiry | Certbot + external check | <14 days |
| Pending withdrawal age | Application metric | Any older than 48 hours |

- [ ] Alerts route to a channel that is actually watched, with a named on-call owner
- [ ] Every alert has a runbook entry describing the first three diagnostic steps
- [ ] Alert thresholds tuned after two weeks of real traffic — an alert that cries wolf is worse
      than no alert

---

## 9. Staging

- [ ] A separate VPS (or an isolated environment on the same host) mirroring production
- [ ] Its own database, seeded with anonymised production-shaped data — **never real user PII**
- [ ] Behind HTTP basic auth and `noindex`, so it can never be found or indexed
- [ ] Separate OAuth credentials and a separate SMTP sandbox
- [ ] Every release deploys to staging first and passes smoke tests there
- [ ] Restore drills target staging

---

## 10. Go-live checklist

### Infrastructure
- [ ] Provisioning complete, all §3 boxes ticked
- [ ] DNS A/AAAA records pointing at the VPS, TTL lowered 24h beforehand for a fast rollback
- [ ] TLS live and auto-renewing; SSL Labs grade A or better
- [ ] Nginx configuration reviewed and tested
- [ ] PM2 running both apps and surviving a reboot test

### Application
- [ ] Latest tagged release deployed and smoke-tested
- [ ] Migrations applied; schema matches the migration history
- [ ] Seeds run: settings, super-admin, email templates, payment methods
- [ ] **Super-admin password changed from the seeded value; 2FA enabled**
- [ ] Demo/test data absent from the production database
- [ ] Maintenance mode tested in both directions

### Verification
- [ ] Full E2E suite green against production: register → verify → login → deposit → approve →
      apply return → withdraw → approve
- [ ] Real email delivered to Gmail, Outlook and Apple Mail without landing in spam
- [ ] Google OAuth works with production credentials
- [ ] File upload and authorised retrieval work; direct URL access is blocked
- [ ] A daily-return run executes correctly on production infrastructure with a test cohort
- [ ] Reconciliation passes
- [ ] CSV and PDF exports open correctly in Excel, Numbers and a PDF reader
- [ ] Mobile tested on real iOS and Android devices, not only in an emulator

### Security & compliance
- [ ] Every item in [14 — Security Checklist](./14-security-checklist.md) verified
- [ ] Compliance gate from [00 §8](./00-project-overview.md#8-compliance-posture) satisfied
- [ ] Legal pages published and linked; risk disclosure acceptance recorded at registration
- [ ] Privacy policy matches actual data practice, including retention

### Operations
- [ ] Backups running, verified and restored at least once
- [ ] Monitoring and alerting live, with alerts tested by deliberate trigger
- [ ] Runbooks written: deploy, rollback, restore, secret rotation, incident response
- [ ] Support inbox monitored, with a stated response-time commitment
- [ ] Admin staff trained on the daily routine and on the reversal procedure

### Launch day
- [ ] Deploy during low-traffic hours with the team available
- [ ] Watch logs and metrics for the first two hours
- [ ] Have the rollback command ready and tested
- [ ] Announce only after the smoke tests pass

---

## 11. Scaling triggers

Do none of this before the trigger fires. Premature distribution buys complexity, not capacity.

| Trigger | Action |
|---------|--------|
| API CPU sustained >70% | Increase PM2 instances; then move to a larger VPS |
| Distribution run >120s | Larger batch sizes and bulk inserts; then a dedicated worker process |
| Notification fan-out >30s | Introduce Redis + BullMQ behind the existing `Queue` interface |
| Uploads >20 GB, or adding a second app server | Migrate to S3 by flipping `STORAGE_DRIVER` |
| Database CPU sustained >70% | Add a read replica for reporting and performance queries |
| Uptime requirement above 99.5% | Two app servers behind a load balancer, managed Postgres with failover |
| Users >50,000 | Table partitioning on `ledger_entries` and `profit_distributions` by month |

Each trigger has a corresponding seam already in the architecture ([02 §8](./02-project-architecture.md#8-extension-points-designed-in-from-day-one)),
so each is a contained change rather than a rewrite.
