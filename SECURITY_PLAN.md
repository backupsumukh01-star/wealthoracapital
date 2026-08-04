# Growzy — Security Plan

**Phase:** Architecture (no implementation herein)  
**Detail checklist:** `docs/14-security-checklist.md` (98 controls)  
**Auth detail:** `docs/08-authentication-flow.md`

---

## 1. Threat model (summary)

| Asset | Threat | Primary control |
|-------|--------|-----------------|
| Wallet balances | Tampering, race, double-pay | Ledger + FOR UPDATE + idempotency |
| Sessions | Theft, fixation | httpOnly cookies, short access TTL, refresh rotation |
| Admin | Privilege abuse | RBAC, 2FA, audit log |
| Uploads | Malware, XSS via SVG | Magic bytes, no SVG, private storage |
| APIs | IDOR, injection, CSRF | Ownership checks, Zod, parameterized SQL, CSRF token |

**Compliance:** Not a licensed brokerage by default — resolve custody/jurisdiction before real funds (`docs/00` §8).

---

## 2. Password hashing

- Algorithm: **argon2id** (memory-hard).  
- Never log passwords or hashes in application logs.  
- Reset tokens: high-entropy, single-use, hashed at rest, short TTL.  
- Password change revokes other sessions (recommended).

---

## 3. JWT / session design

| Token | Form | Storage | TTL |
|-------|------|---------|-----|
| Access | JWT (signed) | Cookie `gz_at` httpOnly Secure SameSite=Lax | ~15m |
| Refresh | Opaque random | Cookie `gz_rt` httpOnly Secure SameSite=Strict | days; **hashed in DB** |
| CSRF | Double-submit | Cookie `gz_csrf` (JS-readable) + header | session |

**Also accept** `Authorization: Bearer` for non-browser clients later.

**Refresh reuse detection:** If a revoked/rotated refresh is presented → revoke entire family.

> Note: Frontend demo today uses cookie presence `mfx_at` only. Replace entirely when backend auth ships.

**Auth.js:** Optional adapter later; v1 preferred path is custom Express auth module (matches existing docs). Do not mix two session systems.

---

## 4. Session security

- Bind session id in access token claims.  
- Track user agent / IP for admin anomaly (soft).  
- Absolute + idle timeouts for admin sessions (stricter).  
- Logout = revoke refresh + clear cookies.

---

## 5. CSRF

- Required on all cookie-authenticated state-changing requests.  
- Header `X-CSRF-Token` must match cookie.  
- Safe methods exempt.  
- SameSite alone is **not** sufficient for all browsers/cases.

---

## 6. XSS

- React default escaping.  
- Strict CSP (Helmet) — no `unsafe-inline` in production where feasible.  
- Never render user HTML in admin notes without sanitization.  
- Uploads never served as `text/html`.

---

## 7. Rate limiting

| Surface | Suggested limit |
|---------|-----------------|
| Global IP | 300 / min |
| Login | 5 / email + 10 / IP per 15 min |
| Register | 3 / IP per hour |
| Forgot password | 3 / email per hour |
| Deposit create | 10 / user / hour |
| Withdraw create | 5 / user / hour |
| Uploads | 20 / user / hour |
| Admin mutations | 100 / admin / min |

Return `429` + `Retry-After`.

---

## 8. Input validation

- Zod at the edge for every request.  
- Shared schemas with frontend where possible.  
- Reject unknown fields.  
- Money as strings → Decimal.js only inside services.  
- UUID path params validated.

---

## 9. SQL injection prevention

- Prisma parameterized queries only.  
- No raw SQL string concatenation.  
- If `$queryRaw`, use tagged template parameters exclusively.

---

## 10. Helmet & HTTP headers

Enable Helmet defaults plus:

- `Content-Security-Policy`  
- `X-Content-Type-Options: nosniff`  
- `Referrer-Policy: strict-origin-when-cross-origin`  
- `Permissions-Policy` restrictive  
- HSTS at Nginx in production  

---

## 11. Secure cookies

| Flag | Value |
|------|-------|
| HttpOnly | access + refresh |
| Secure | true in production |
| SameSite | Lax (AT) / Strict (RT) |
| Path | `/` |
| Domain | site apex as configured |

---

## 12. RBAC

| Role | Power |
|------|-------|
| USER | Own resources |
| ADMIN | Money review, publish, apply return, broadcast, view audit |
| SUPER_ADMIN | Adjust balance, reverse return, settings, staff, export audit |

Rules:

- Role from server session only.  
- IDOR: every query scoped by `userId` unless admin.  
- Admin UI hides links; API still enforces.

---

## 13. Audit logging

- All admin mutations → `audit_logs` with before/after.  
- Include IP, userAgent, requestId.  
- No update/delete API for audit rows.  
- Export limited to SUPER_ADMIN + rate limited.

---

## 14. File upload security

- Size cap 5MB.  
- Allowlist MIME + magic-byte verify.  
- Deny SVG/HTML/XML.  
- Strip EXIF; store outside public root.  
- Authenticated download endpoints only.  
- Virus scan optional later (ClamAV) for production hardening.

---

## 15. Ledger & money security

- Single writer module (`wallet`).  
- `SELECT … FOR UPDATE` on wallet rows.  
- Idempotency keys on deposit/withdraw/apply/adjust.  
- Hourly reconciliation job; P0 alert on drift.  
- Negative balance impossible via CHECKs + clamp.

---

## 16. Secrets & config

- Env-only secrets; Zod boot validation.  
- Separate JWT secrets for access vs refresh hashing salt.  
- Rotate secrets with dual-key window.  
- Never put secrets in `NEXT_PUBLIC_*`.

---

## 17. Dependency & supply chain

- `pnpm audit` in CI.  
- Lockfile committed.  
- No install of packages without license review for money path.

---

## 18. Pre-production security gate

- [ ] Penetration test on auth + money routes  
- [ ] CSRF verified on staging  
- [ ] Rate limits verified  
- [ ] Admin 2FA enforced  
- [ ] Backup restore drill  
- [ ] Compliance checklist owner signed (`docs/00` §8)  

---

## 19. Frontend demo vs production

| Demo (today) | Production (target) |
|--------------|---------------------|
| Cookie presence guard | Signed JWT + hashed refresh |
| Hardcoded demo password | argon2id |
| No CSRF | Double-submit CSRF |
| Client “session” helpers | API `/auth/me` as source of truth |
