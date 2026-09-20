# Google OAuth setup (Wealthora Capital)

Production Google Sign-In for investor login/register. The API handles the OAuth code flow, issues the same HttpOnly JWT cookies as password login (`mfx_at`, `mfx_rt`, `mfx_csrf`), and redirects the browser to the web app callback.

## Flow

1. Web: user clicks **Continue with Google** → `GET {API}/api/v1/auth/google?redirect={SITE}/oauth/callback`
2. API: sets `mfx_oauth_state` (nonce) + redirects to Google consent
3. Google: redirects to `GOOGLE_CALLBACK_URL` with `code` + `state`
4. API: validates state, exchanges code, loads OpenID profile, creates/links user, sets JWT cookies, clears OAuth state, redirects to `{SITE}/oauth/callback`
5. Web: calls `GET /auth/me` (and optionally `/auth/refresh`) with credentials → dashboard or onboarding
6. Logout: `POST /auth/logout` revokes session + clears cookies
7. Refresh: `POST /auth/refresh` rotates refresh token using `mfx_rt`

## Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project (e.g. `wealthora-production`)
3. **APIs & Services → OAuth consent screen**
   - User type: **External** (or Internal for Workspace-only)
   - App name: Wealthora Capital
   - User support email + developer contact: your ops email
   - Scopes: `openid`, `email`, `profile` (default for Sign in with Google)
   - Test users: add yourself while the app is in **Testing**
   - Publish the app when ready for production users
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Wealthora API`
   - **Authorized JavaScript origins** (optional for this server flow; safe to add):
     - Local: `http://localhost:3000`
     - Prod: `https://wealthoracapital.net` (and `https://www.wealthoracapital.net` if used)
   - **Authorized redirect URIs** (required — must match `GOOGLE_CALLBACK_URL` exactly):
     - Local: `http://localhost:4000/api/v1/auth/google/callback`
     - Production: `https://api.wealthoracapital.net/api/v1/auth/google/callback`
5. Copy **Client ID** and **Client secret**

## Environment variables

### API (`apps/api/.env` / Render)

```env
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-....
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback

APP_URL=http://localhost:3000
API_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:3000
COOKIE_SECURE=false
COOKIE_DOMAIN=
```

Production example:

```env
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-....
GOOGLE_CALLBACK_URL=https://api.wealthoracapital.net/api/v1/auth/google/callback

APP_URL=https://wealthoracapital.net
API_URL=https://api.wealthoracapital.net
CORS_ORIGIN=https://wealthoracapital.net,https://www.wealthoracapital.net
COOKIE_SECURE=true
COOKIE_DOMAIN=.wealthoracapital.net
```

`COOKIE_DOMAIN=.wealthoracapital.net` lets access/CSRF cookies work across `wealthoracapital.net` and `api.wealthoracapital.net`. Leave empty for localhost.

### Web (`apps/web/.env.local` / Render)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Production:

```env
NEXT_PUBLIC_API_URL=https://api.wealthoracapital.net/api/v1
NEXT_PUBLIC_SITE_URL=https://wealthoracapital.net
```

## Local test checklist

1. Apply migration: `pnpm --filter @meridian/api db:migrate:deploy` (or `db:migrate`)
2. Set Google env vars in `apps/api/.env` (use local redirect URI in Cloud Console)
3. Start API + web: `pnpm --filter @meridian/api dev` and `pnpm --filter @meridian/web dev`
4. Open `http://localhost:3000/login` → **Continue with Google**
5. Complete consent → land on `/oauth/callback` → onboarding or dashboard
6. Confirm cookies in DevTools (API host): `mfx_at`, `mfx_rt`, `mfx_csrf`
7. Hard-refresh dashboard → session persists via cookies / refresh
8. Logout → `/auth/me` returns 401
9. Automated: `pnpm --filter @meridian/api test:integration -- google-oauth`

## Production test checklist

1. Add **production** redirect URI in Google Cloud Console
2. Set Render secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
3. Admin allowlist (Google-only admin login at `/admin/login`):
   - `GOOGLE_SUPER_ADMIN_EMAILS=you@gmail.com`
   - `GOOGLE_ADMIN_EMAILS=ops@company.com`
   Only those Google accounts can open the operator console. No email/password fields on admin login.
4. Confirm `COOKIE_DOMAIN`, `COOKIE_SECURE=true`, `CORS_ORIGIN`, `APP_URL`, `API_URL`
5. Run migrate deploy on API
6. Incognito: production `/admin/login` → Google (allowlisted email) → admin console
7. Verify HTTPS-only Secure cookies
8. Confirm OAuth-only users (no password) cannot password-login; linking works if they later register the same email then Google (or vice versa)

## Error codes (query `?error=` / `?oauth=`)

| Code | Meaning |
|------|---------|
| `access_denied` | User cancelled Google consent |
| `not_configured` | Missing Google env on API |
| `invalid_state` | CSRF/state mismatch or expired |
| `account_suspended` | User blocked/suspended |
| `forbidden` | Email not verified at Google / link conflict |
| `oauth_failed` | Token exchange or other failure |

## Security notes

- State is HMAC-signed and bound to an HttpOnly nonce cookie
- Redirect URLs are limited to `/oauth/callback` on `APP_URL` / CORS origins
- Google `email_verified` must be true
- New Google users are created `ACTIVE` with `emailVerifiedAt` set (no password)
- Existing email accounts are linked by setting `googleId`
- Same session/JWT/refresh/logout path as password auth
