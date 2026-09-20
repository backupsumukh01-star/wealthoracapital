# Wealthora Capital — Render Production Deployment

This guide deploys the Wealthora Capital monorepo on [Render](https://render.com) with:

- **Next.js** frontend (`@meridian/web`)
- **Express** API (`@meridian/api`)
- **Render PostgreSQL**
- **GitHub auto-deploy** via Blueprint (`render.yaml`)

No VPS, PM2, or Nginx is required. Render terminates TLS and injects `PORT`.

---

## Critical: Render dashboard settings (fix build failures)

If logs show:

```text
Running build command 'pnpm install && pnpm prisma generate && pnpm build'
devDependencies: skipped because NODE_ENV is set to production
postinstall: sh: 1: prisma: not found
```

the service is **not** using the Blueprint commands from `render.yaml`. Fix in Render → **growzy-api** → Settings:

| Setting | Required value |
|---------|----------------|
| **Root Directory** | leave **empty** (repo root `.`) — do **not** use `apps/api` |
| **Build Command** | see table below |
| **Pre-Deploy Command** | `pnpm --filter @meridian/api run db:migrate:deploy` |
| **Start Command** | `pnpm --filter @meridian/api start` |

`prisma` / `tsup` are now **production dependencies** of `@meridian/api`, so installs still work even when Render sets `NODE_ENV=production`. Prefer `--prod=false` so the full workspace tooling installs cleanly.

---

## Architecture

| Service | Type | Role |
|---------|------|------|
| `growzy-web` | Web | Next.js UI (historical Render name) |
| `growzy-api` | Web | Express API + Swagger (historical Render name) |
| `growzy-db` | PostgreSQL | Primary database (historical Render name) |
| `growzy-worker` | Worker (optional) | BullMQ consumer — enable when using Redis |

Default Blueprint uses in-process jobs (`JOB_DRIVER=memory`) so a worker/Redis is not required for the first production cut.

**Cookie auth on split hosts:** use a shared parent domain, e.g.

- App: `https://wealthoracapital.net` (or `https://www.wealthoracapital.net`)
- API: `https://api.wealthoracapital.net`
- `COOKIE_DOMAIN=.wealthoracapital.net`
- `CORS_ORIGIN=https://wealthoracapital.net`

---

## 1. GitHub auto deployment

1. Push this repository to GitHub.
2. In Render: **New → Blueprint**.
3. Select the repo and confirm `render.yaml`.
4. Render creates `growzy-db`, `growzy-api`, and `growzy-web`.
5. Fill every `sync: false` secret in the dashboard (listed below).
6. Enable **Auto-Deploy** on each web service (already `autoDeploy: true` in the Blueprint).

Every push to the connected branch rebuilds and redeploys.

---

## 2. Exact service settings

### PostgreSQL — `growzy-db`

| Setting | Value |
|---------|--------|
| Plan | Basic 256 MB (or higher) |
| Version | 16 |
| Database | `Wealthora Capital` |

Copy the **Internal Database URL** into `DATABASE_URL` on the API (Blueprint wires this automatically via `fromDatabase`).

### API — `growzy-api`

| Setting | Value |
|---------|--------|
| Runtime | Node |
| Region | Oregon (or nearest) |
| Root directory | `.` (repo root) |
| Build command | `corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --frozen-lockfile --prod=false && pnpm --filter @meridian/api run db:generate && pnpm --filter @meridian/api... build` |
| Pre-deploy command | `pnpm --filter @meridian/api run db:migrate:deploy` |
| Start command | `pnpm --filter @meridian/api start` |
| Health check path | `/api/health` |
| Instance | Starter+ |

> **Important:** Always pass `--prod=false` (or unset `NODE_ENV` during install). Render sets `NODE_ENV=production`, which would otherwise skip workspace `devDependencies`. `--frozen-lockfile` requires `pnpm-lock.yaml` to match every `package.json` — regenerate with `pnpm install` after dependency changes and commit the lockfile.

### If Root Directory is `apps/api` (not recommended)

Use these instead:

| Setting | Value |
|---------|--------|
| Root Directory | `apps/api` |
| Build Command | `corepack enable && pnpm install --prod=false && pnpm run render:build` |
| Start Command | `pnpm start` |
| Pre-Deploy | `pnpm run db:migrate:deploy` |

Prefer repo-root deploys so `@meridian/shared` and the web app stay consistent.

Equivalent root scripts:

```bash
pnpm install --frozen-lockfile --prod=false
pnpm render:build:api    # prisma generate (postinstall) + tsup build
pnpm render:migrate      # prisma migrate deploy
pnpm render:start:api    # node dist/server.js — listens on process.env.PORT
```

### Frontend — `growzy-web`

| Setting | Value |
|---------|--------|
| Runtime | Node |
| Root directory | `.` (empty) |
| Build command | `corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --frozen-lockfile --prod=false && pnpm --filter @meridian/web... build` |
| Start command | `pnpm --filter @meridian/web start` |
| Health check path | `/` |

```bash
pnpm install --frozen-lockfile --prod=false
pnpm render:build:web
pnpm render:start:web    # node .next/standalone/apps/web/server.js (HOSTNAME=0.0.0.0, PORT)
```

`@meridian/web` uses Next.js `output: 'standalone'`. The build copies `.next/static` and `public` into the standalone tree; **do not** use `next start` (it warns and is unsupported with standalone).

`NEXT_PUBLIC_*` variables are inlined at **build** time — set them before the first web build (or clear build cache after changing them).

---

## 3. Environment variables

Full checklist: [`env.render.example`](./env.render.example).

### Frontend (`growzy-web`)

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_API_URL` | `https://api.wealthoracapital.net/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://wealthoracapital.net` |
| `NEXT_PUBLIC_PLATFORM_NAME` | `Wealthora Capital` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `update@wealthoracapital.net` |
| `NEXT_PUBLIC_ENABLE_REFERRALS` | `false` |
| `NEXT_PUBLIC_ENABLE_ROUTE_GUARDS` | `true` |

`NEXTAUTH_SECRET` is **not used**. Auth is Express cookie JWT (`mfx_at` / `mfx_rt` / `mfx_csrf`).

### API (`growzy-api`)

| Variable | Example / notes |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `APP_ENV` | `production` |
| `PORT` | Injected by Render — do not set |
| `APP_URL` | `https://wealthoracapital.net` |
| `API_URL` | `https://api.wealthoracapital.net` |
| `DATABASE_URL` | From Render Postgres (SSL) |
| `JWT_ACCESS_SECRET` | ≥32 chars random |
| `JWT_REFRESH_SECRET` | ≥32 chars random |
| `CORS_ORIGIN` | `https://wealthoracapital.net` |
| `COOKIE_DOMAIN` | `.wealthoracapital.net` |
| `COOKIE_SECURE` | `true` |
| `EMAIL_TRANSPORT` | `resend` |
| `RESEND_API_KEY` | Resend dashboard |
| `SMTP_FROM_NAME` | `Wealthora Capital` |
| `SMTP_FROM_ADDRESS` | Verified sender domain |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client |
| `GOOGLE_CLIENT_SECRET` | Google Cloud secret |
| `GOOGLE_CALLBACK_URL` | `https://api.wealthoracapital.net/api/v1/auth/google/callback` |
| `CACHE_DRIVER` | `memory` (or `redis`) |
| `JOB_DRIVER` | `memory` (or `bullmq`) |
| `ENABLE_API_DOCS` | `true` |
| `CSRF_PROTECTION` | `true` |

Production rejects `localhost` in `APP_URL`, `API_URL`, and `CORS_ORIGIN`.

---

## 4. Domain setup

1. In Render → each web service → **Custom Domains**:
   - Web: `wealthoracapital.net` / `www.wealthoracapital.net`
   - API: `api.wealthoracapital.net`
2. Add the DNS records Render shows (CNAME / ALIAS).
3. Wait for TLS certificates.
4. Set env vars to those HTTPS URLs and **redeploy web** (so `NEXT_PUBLIC_*` rebuild).
5. Google Cloud Console → OAuth redirect URI = `GOOGLE_CALLBACK_URL`.
6. Resend → verify `wealthoracapital.net` and use `SMTP_FROM_ADDRESS` on that domain.

---

## 5. Security (kept in production)

- Helmet + CSP (API) / Next security headers (web)
- Rate limiting
- Double-submit CSRF (`mfx_csrf` + `X-CSRF-Token`)
- JWT access/refresh cookies (`Secure`, `SameSite=Lax` / refresh `Strict`)
- Swagger UI + OpenAPI at `/api/docs`, `/api/redoc`, `/api/openapi.json`

---

## 6. Post-deployment verification

```bash
# API liveness / readiness
curl -sS https://api.wealthoracapital.net/api/health
curl -sS https://api.wealthoracapital.net/api/health/live

# Docs
curl -sI https://api.wealthoracapital.net/api/docs
curl -sS https://api.wealthoracapital.net/api/openapi.json | head -c 200
curl -sS https://api.wealthoracapital.net/api/v1/csrf

# Frontend
curl -sI https://wealthoracapital.net/
```

Manual checks:

1. Open `https://api.wealthoracapital.net/api/docs` — Swagger loads; `mfx_csrf` is set.
2. Register / login from the web app — session cookies appear under `.wealthoracapital.net`.
3. Trigger a password-reset email — Resend dashboard shows delivery.
4. (If enabled) Google OAuth callback hits `GOOGLE_CALLBACK_URL`.
5. Confirm Prisma migrations applied (pre-deploy logs show `migrate deploy`).

---

## 7. Scaling to Redis + worker

1. Add a Render **Key Value** (Redis) instance.
2. Set on API + worker: `REDIS_URL`, `JOB_DRIVER=bullmq`, `CACHE_DRIVER=redis`, `RATE_LIMIT_STORE=redis`, `REDIS_REQUIRED=true`.
3. Uncomment the `growzy-worker` service in `render.yaml`.
4. Redeploy.

---

## 8. Local parity (optional)

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Adjust local URLs back to http://127.0.0.1 for development only
docker compose up -d   # Postgres (+ Redis if needed)
pnpm install --frozen-lockfile --prod=false
pnpm --filter @meridian/api exec prisma migrate deploy
pnpm --filter @meridian/api dev
pnpm --filter @meridian/web dev
```

### Lockfile maintenance

After any `package.json` change:

```bash
pnpm install
git add pnpm-lock.yaml package.json apps/*/package.json packages/*/package.json
git commit -m "chore: sync pnpm lockfile"
```

CI and Render both use `pnpm install --frozen-lockfile` (Render adds `--prod=false`). An outdated lockfile fails the build with `ERR_PNPM_OUTDATED_LOCKFILE`.

Docker Compose / Nginx files remain in the repo for optional self-hosting; **Render production does not use them**.

---

## 9. Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Web build fails on env validation | Missing/`localhost` `NEXT_PUBLIC_*` in production |
| API boots then exits | `DATABASE_URL` / JWT secrets / localhost URLs |
| CORS errors | `CORS_ORIGIN` must match the exact browser origin |
| Cookies missing after login | Set `COOKIE_DOMAIN=.yourdomain.com` and `COOKIE_SECURE=true` |
| CSRF 403 in Swagger | Open `/api/docs` first (issues `mfx_csrf`), then login |
| `ERR_PNPM_OUTDATED_LOCKFILE` | Run `pnpm install`, commit updated `pnpm-lock.yaml`, redeploy |
| Prisma/tsup missing on build | Ensure install uses `--prod=false` (see build command above) |
| Emails not sent | `EMAIL_TRANSPORT=resend` + valid `RESEND_API_KEY` + verified domain |
| Uploads disappear | Attach Render Persistent Disk at `/data` and set `UPLOAD_ROOT=/data/uploads` (see `render.yaml` `disk:`). Or set `STORAGE_DRIVER=s3`. |
