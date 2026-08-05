# Final Production Security Audit — Growzy

**Date:** 2026-08-05  
**Scope:** API + web edge guards — OWASP Top 10, rate limiting, CSRF, XSS, SQLi, JWT, cookies, headers, file upload, admin routes  
**Mode:** Audit + automatic remediation of High/Critical  

Review subagent: [Security Review](3e0190bb-124c-4dea-a4dd-cd4b1582386f) (branch diff) + full-surface verification in this pass.

---

## Executive verdict

| Area | Status |
|------|--------|
| OWASP Top 10 | Hardened — no open Critical in production-configured posture |
| Rate limiting | Global + auth + **webhook** limiters; Redis store optional |
| CSRF | Double-submit cookie; on by default outside tests |
| XSS | React default escaping; email HTML escaped; **SVG uploads blocked** |
| SQL injection | Prisma parameterized + tagged `$executeRaw` only |
| JWT | HS256 **algorithm pinned** on sign/verify; DB session + live roles |
| Cookies | httpOnly access/refresh; Secure in prod; SameSite=Lax; CSRF readable |
| Headers | Helmet CSP/HSTS/CORP in production |
| File upload | MIME allowlists + **magic-byte verification** |
| Admin routes | `authenticate` + `requireAdminAccess` + `requirePermission` |

**Production posture after fixes:** High/Critical items from this audit are remediated. Remaining Medium items are optional hardening (OAuth step-up linking, docs IP allowlist if re-enabled).

---

## Findings & remediation

### CRITICAL / HIGH — Fixed

| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| H1 | High | Unsigned payment webhooks accepted whenever secret empty outside production | Require `PAYMENT_WEBHOOK_ALLOW_UNSIGNED=true` explicitly; refuse unsigned otherwise; **blocked in production** at env parse |
| H2 | High | `PAYMENT_AUTO_CONFIRM_DEPOSITS` without secret could credit ledger on misconfigured hosts | Production startup fails if auto-confirm is on without `PAYMENT_WEBHOOK_SECRET` |
| H3 | High | JWT `verify` did not pin `algorithms` (alg confusion class) | `algorithms: ['HS256']` + `algorithm: 'HS256'` on sign (`token.service.ts`) |
| H4 | High | API docs defaulted **on** (incl. production if unset); Render had docs `true` | Default docs **off** in production; `render.yaml` → `ENABLE_API_DOCS=false` |
| H5 | High | Upload MIME trusted from client (polyglot / content-type spoof) | `assertUploadMagicBytes` on KYC, deposit proof, avatar, media |
| H6 | High | SVG media uploads enable stored XSS when served | Removed `image/svg+xml` from media allowlist |
| H7 | High | Payment webhooks only shared global rate limit | Dedicated `webhookRateLimiter` (60/min) on `/api/v1/webhooks/*` |

### MEDIUM — Accepted / tracked

| ID | Severity | Finding | Notes |
|----|----------|---------|-------|
| M1 | Medium | Google OAuth links existing password accounts without step-up | Standard OAuth; requires Google `email_verified`; optional future OTP/password confirm |
| M2 | Medium | Edge middleware gates `/admin` on cookie presence only | Documented; API enforces RBAC; client `AdminSessionGate` redirects non-staff |
| M3 | Medium | Virus scan is non-blocking / SKIPPED in Phase 3 | Magic bytes + MIME reduce risk; enable real AV before high-volume KYC |

### LOW / informational

| ID | Notes |
|----|-------|
| L1 | `trust proxy` + rate-limit: `validate.trustProxy=false` to silence bypass warning while trusting Render hop |
| L2 | Metrics endpoint token-gated in production when `METRICS_TOKEN` set |
| L3 | Private `/uploads/{kyc,deposits,reports,avatars}` blocked publicly |

---

## OWASP Top 10 mapping

| # | Risk | Growzy control |
|---|------|----------------|
| A01 Broken Access Control | Admin router requires staff + permission; investor blocked (OWASP tests); force-logout hierarchy |
| A02 Cryptographic Failures | JWT HS256 secrets ≥32 chars; prod rejects `change-me`; cookies Secure in prod |
| A03 Injection | Prisma ORM; no string-concat SQL; prototype-key sanitizer on body/query |
| A04 Insecure Design | Ledger idempotency; webhook duplicate unique key; deposit credit cap |
| A05 Security Misconfiguration | Helmet; docs off in prod; CSRF on; unsigned webhooks opt-in only |
| A06 Vulnerable Components | CI `security.yml` fails on critical advisories |
| A07 Identification & Auth Failures | Auth rate limit; lockout; refresh rotation; session revoke on role change |
| A08 Software/Data Integrity | Webhook HMAC over raw body; OAuth signed state + nonce cookie |
| A09 Logging & Monitoring | Pino request logs; audit log; admin health + reconciliation |
| A10 SSRF | Email click tracker rejects external open redirects (OWASP test) |

---

## Control checklist

### Rate limiting
- [x] Global limiter (`RATE_LIMIT_MAX` / window)
- [x] Auth limiter (`AUTH_RATE_LIMIT_MAX`)
- [x] Webhook limiter (60/min)
- [x] Optional Redis store

### CSRF
- [x] Double-submit `mfx_csrf` + `X-CSRF-Token`
- [x] Enabled when not under Vitest
- [x] Safe methods skipped; unauthenticated POSTs (login/webhooks) skipped appropriately

### XSS
- [x] React text escaping
- [x] Email templates use `escapeHtml` / `escapeAttr`
- [x] JSON-LD only intentional `dangerouslySetInnerHTML`
- [x] SVG upload blocked

### SQL injection
- [x] Parameterized Prisma / tagged templates
- [x] Login injection payload test (no 500)

### JWT & cookies
- [x] HS256 pinned
- [x] Issuer + audience validated
- [x] Access httpOnly; refresh path-scoped; CSRF readable Lax
- [x] Live DB role/permissions on each authenticated request

### Headers
- [x] Helmet CSP, HSTS (prod), CORP, referrer-policy

### File upload
- [x] Size limits (KYC 8MB, proof 5MB, avatar 2MB, media 20MB)
- [x] MIME allowlists
- [x] Magic-byte checks
- [x] Path traversal blocked on storage keys / uploads proxy

### Admin routes
- [x] `requireAdminAccess` + fine-grained permissions
- [x] Investor → `/admin/*` = 403 (automated)

---

## Production env requirements (must set)

```bash
NODE_ENV=production
COOKIE_SECURE=true
CSRF_PROTECTION=true
ENABLE_API_DOCS=false
PAYMENT_WEBHOOK_SECRET=<strong-random>
PAYMENT_WEBHOOK_ALLOW_UNSIGNED=false
PAYMENT_AUTO_CONFIRM_DEPOSITS=false   # only true with trusted provider + secret
METRICS_TOKEN=<optional-but-recommended>
```

---

## Tests

- `tests/security/owasp.test.ts` — access control, SQLi, XSS register, mass assignment, path traversal, open redirect, private uploads  
- `tests/integration/payment-webhooks.test.ts` — webhook auth / duplicates  
- `tests/integration/rbac.test.ts` — privilege hierarchy  

---

## Residual risk

No Critical findings remain for a correctly configured production deploy. Highest residual: **compromised Google account linking** (M1) and **edge cookie-only admin HTML gate** (M2) — both mitigated by API authorization.
