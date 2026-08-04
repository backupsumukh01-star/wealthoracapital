# 14 — Security Checklist

A platform that holds other people's money is a target from day one. Every item below has a
**verification** column, because a checklist you cannot prove is a checklist you have not done.

---

## 1. Threat model

| Threat | Impact | Primary controls |
|--------|--------|------------------|
| Credential stuffing | Account takeover, theft | Rate limits, lockout, breached-password blocking, new-device alerts |
| Session hijacking (XSS) | Full account access | `httpOnly` cookies, strict CSP, output encoding, no `dangerouslySetInnerHTML` |
| CSRF | Unauthorised transactions | Double-submit token, `SameSite`, origin validation |
| SQL injection | Total data compromise | Prisma parameterised queries; no raw SQL with interpolation |
| **Broken access control** | Users reading/altering others' data | Ownership checks on every resource; role checks server-side; integration tests |
| **Privilege escalation** | Admin takeover | Role never trusted from the client; 👑 gate on money-affecting admin actions |
| **Race conditions on balance** | Double withdrawal, double credit | `SELECT … FOR UPDATE`, idempotency keys, DB constraints |
| **Double return application** | Fund-wide corruption | Unique constraint + advisory lock + idempotency (see [12 §4](./12-trading-engine.md#4-idempotency-and-concurrency)) |
| Malicious file upload | RCE, stored XSS | Magic-byte validation, re-encode, non-executable storage outside the web root |
| Deposit-proof forgery | Fraudulent credit | Human review, EXIF strip, user history context, audit trail |
| Insider misuse | Theft, manipulation | Audit log, role separation, 👑 gates, reason requirements |
| Data exfiltration | PII/financial leak | Least-privilege DB user, encrypted backups, no PII in logs |
| DoS | Downtime | Nginx + application rate limiting, fail2ban, body size limits |
| Dependency compromise | Arbitrary code | Lockfile, `pnpm audit` in CI, Dependabot, minimal dependencies |

The four bold rows are the ones specific to this product. Everything else is standard web security;
those four are where a generic checklist would let us down.

---

## 2. Authentication & sessions

| # | Control | Verification |
|---|---------|--------------|
| 1 | argon2id hashing, OWASP params, benchmarked on production hardware | Unit test asserts params; benchmark recorded in deploy notes |
| 2 | Passwords ≥10 chars, zxcvbn ≥3, checked against HaveIBeenPwned (k-anonymity) | Integration test with a known-breached password |
| 3 | No plaintext password is ever logged, even at debug level | Log scan in CI for password field names |
| 4 | Access tokens 15 min; refresh opaque, hashed at rest, rotated every use | Integration test |
| 5 | Refresh reuse revokes the whole family and emails the user | Integration test |
| 6 | Cookies `httpOnly` + `Secure` + `SameSite` + `__Host-` prefix in production | Header assertion test |
| 7 | Account lockout after 5 failures for 15 min, with an email | Integration test |
| 8 | Identical response and comparable timing for unknown email vs wrong password | Timing test with tolerance |
| 9 | Registration does not disclose whether an email exists | Response assertion test |
| 10 | Password reset/change revokes sessions; tokens issued before `passwordChangedAt` rejected | Integration test |
| 11 | Verification and reset tokens: single-use, hashed, time-limited | Integration test |
| 12 | OAuth uses PKCE + state; ID token signature/`iss`/`aud`/`exp` verified | Integration test with a forged token |
| 13 | Google account linking requires `email_verified: true` | Integration test |
| 14 | Admin accounts require 2FA; no admin registration route exists | Route inventory + manual check |
| 15 | Session list shows device/IP; user can revoke individually or all | Manual test |

---

## 3. Authorisation

| # | Control | Verification |
|---|---------|--------------|
| 16 | Every endpoint declares its required role explicitly — no implicit public routes | Route inventory audit |
| 17 | Ownership verified on every user-scoped resource, in the query, not after fetch | Integration test: user A requests user B's deposit → 404 |
| 18 | Role is read from the verified token and the database, never from a request body or header | Code review + test |
| 19 | 👑 gate on balance adjustment, role change, settings, reversal, staff management | Integration test per route |
| 20 | Admin routes return 404 to non-admins, not 403 | Response assertion test |
| 21 | Frontend route guards are UX only; the API re-verifies everything | Test: direct API call with a user token to an admin route |
| 22 | IDOR sweep across every `/:id` route | Automated test iterating all parameterised routes |

Item 17 deserves emphasis: ownership must be part of the `WHERE` clause
(`findFirst({ where: { id, userId } })`), not a check performed after fetching by ID. The latter
leaks existence through timing and is easy to forget in a later refactor.

---

## 4. Input validation & injection

| # | Control | Verification |
|---|---------|--------------|
| 23 | Zod validation on body, query and params for every endpoint | Route inventory audit |
| 24 | Unknown fields are stripped or rejected — never passed through to Prisma | Test with extra fields incl. `role` |
| 25 | Prisma only; no raw SQL with string interpolation | Lint rule banning `$queryRawUnsafe` |
| 26 | Body size limit 1 MB (JSON), 5 MB (uploads) | Request test |
| 27 | Pagination `limit` capped at 100 | Test with `limit=100000` |
| 28 | Sort fields validated against an allowlist | Test with `sortBy=password_hash` |
| 29 | Rich text sanitised server-side with an allowlist (broadcast bodies) | XSS payload test |
| 30 | No `eval`, `Function`, or dynamic `require` anywhere | Lint rule |

Item 24 prevents mass assignment — the classic version of this bug is a user sending
`{"role":"SUPER_ADMIN"}` to a profile update endpoint that spreads the body into a Prisma update.

---

## 5. Financial integrity

The controls unique to this product. These are the ones that must never fail.

| # | Control | Verification |
|---|---------|--------------|
| 31 | All money is `Decimal(20,8)` in Postgres and `Decimal` in code — no `number` arithmetic | Lint rule on money fields; unit tests |
| 32 | Money crosses the network as a string, never a JSON number | Contract test on serialisation |
| 33 | Every balance change writes a `LedgerEntry` inside the same transaction | Code review; reconciliation job |
| 34 | `balance_after = balance_before + amount` enforced by a `CHECK` constraint | Migration test attempting a violation |
| 35 | `LedgerEntry` is append-only, enforced by a database trigger | Test attempting `UPDATE` and `DELETE` |
| 36 | `balance >= 0` and `0 <= locked <= balance` enforced by `CHECK` constraints | Migration test |
| 37 | `SELECT … FOR UPDATE` on every wallet mutation | Concurrency test: 50 parallel debits |
| 38 | Idempotency keys on every money-moving operation | Duplicate-request test |
| 39 | Unique constraint prevents a second daily-return run per trading day | Concurrency test: two simultaneous applies |
| 40 | Advisory lock prevents concurrent distribution runs | Concurrency test |
| 41 | Withdrawal funds lock at request time, not approval time | Test: two withdrawals exceeding the balance |
| 42 | Nightly reconciliation of wallet projections against ledger sums, alerting on drift | Job test with a deliberately corrupted balance |
| 43 | Negative distributions clamp at zero balance | Unit test |
| 44 | Reversals compensate; they never delete | Test asserting the original run persists |
| 45 | Manual balance adjustment requires 👑, a reason, and is audited and user-visible | Integration test |

---

## 6. File uploads

| # | Control | Verification |
|---|---------|--------------|
| 46 | Content type validated by **magic bytes**, not by extension or declared MIME | Test uploading `shell.php` renamed to `.jpg` |
| 47 | Allowlist: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | Test with `.svg` (XSS vector) → rejected |
| 48 | Max 5 MB per file, enforced by multer and by Nginx | Test with 50 MB |
| 49 | Images re-encoded to WebP via sharp, stripping EXIF and any embedded payload | Test with an EXIF-laden and a polyglot file |
| 50 | Storage keys are generated server-side; user filenames are never used in paths | Test with `../../etc/passwd` as a filename |
| 51 | Upload directory is outside the web root and never served statically | Nginx config review + direct URL fetch test |
| 52 | Files served only through an authorised endpoint checking ownership or admin role | Test: user A fetches user B's proof → 404 |
| 53 | Signed URLs are short-lived (5 min) and single-purpose | Test with an expired signature |
| 54 | Per-user upload rate limit (20/hour) | Rate limit test |
| 55 | Orphaned files cleaned up nightly | Job test |

Item 47 specifically excludes SVG. SVG is XML, can contain JavaScript, and is a stored-XSS vector
whenever it is rendered inline — there is no reason to accept it for a payment screenshot.

---

## 7. Transport, headers & CORS

| # | Control | Verification |
|---|---------|--------------|
| 56 | TLS 1.2+ only, modern cipher suite, valid certificate with auto-renewal | SSL Labs grade A or better |
| 57 | HSTS with `max-age=31536000; includeSubDomains; preload` | Header test |
| 58 | HTTP redirects to HTTPS | Request test |
| 59 | CSP with no `unsafe-eval`; nonce-based scripts; `frame-ancestors 'none'` | Header test + browser console clean |
| 60 | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` | Header test |
| 61 | `Permissions-Policy` denying camera, microphone, geolocation, payment | Header test |
| 62 | CORS allowlist of exact origins — never `*`, never reflecting the Origin header | Test with a foreign origin |
| 63 | `Access-Control-Allow-Credentials: true` only with an explicit origin allowlist | Config review |
| 64 | Server version headers removed (`X-Powered-By`, Nginx tokens off) | Header test |

---

## 8. Rate limiting & abuse

| # | Control | Verification |
|---|---------|--------------|
| 65 | Global per-IP limit at Nginx and in the application | Load test |
| 66 | Strict limits on login, register, forgot-password, resend | Test each |
| 67 | Per-user limits on deposits, withdrawals, uploads, exports | Test each |
| 68 | fail2ban on repeated 401/403/429 patterns | Manual verification |
| 69 | Contact form protected by honeypot + captcha + rate limit | Manual test |
| 70 | Rate limit responses include `Retry-After` and do not leak whether an account exists | Response assertion |

---

## 9. Data protection

| # | Control | Verification |
|---|---------|--------------|
| 71 | Database user has least privilege — no superuser, no DDL in production | `\du` review |
| 72 | Postgres bound to localhost only; no public port | `ss -tlnp` + external port scan |
| 73 | Backups encrypted at rest and in transit, stored offsite | Manual verification of an encrypted artefact |
| 74 | Payout method details encrypted at the application layer | Database inspection shows ciphertext |
| 75 | No PII in application logs — emails redacted, tokens never logged | Automated log scan |
| 76 | Error responses never leak stack traces, SQL, or file paths in production | Test forcing a 500 |
| 77 | Secrets in `/etc/meridian/.env`, mode `0600`, owned by the app user, never in git | `git log -S` scan + file permission check |
| 78 | `.env*` in `.gitignore`; a pre-commit secret scanner is installed | Deliberate commit attempt |
| 79 | GDPR erasure redacts PII while retaining pseudonymised financial records | Manual procedure test |
| 80 | Data retention policy implemented as jobs, not as intentions | Job tests |

---

## 10. Application security

| # | Control | Verification |
|---|---------|--------------|
| 81 | No `dangerouslySetInnerHTML` except on server-sanitised admin content | Lint rule with an explicit allowlist |
| 82 | External links use `rel="noopener noreferrer"` | Lint rule |
| 83 | No secrets in client bundles — only `NEXT_PUBLIC_*` reaches the browser | Bundle grep in CI |
| 84 | Source maps not published in production | Build artefact check |
| 85 | Dependencies audited in CI; builds fail on high/critical | CI run |
| 86 | Lockfile committed; `pnpm install --frozen-lockfile` in CI and deploy | CI config review |
| 87 | Node and Postgres on supported, patched versions | Version check in the deploy script |
| 88 | Graceful shutdown drains in-flight requests before exit | Restart test under load |

---

## 11. Operational security

| # | Control | Verification |
|---|---------|--------------|
| 89 | SSH: key-only, root login disabled, non-standard port, fail2ban | Config review + login attempt |
| 90 | UFW default-deny inbound; only 80, 443 and the SSH port open | `ufw status` |
| 91 | Application runs as a non-root user with no shell | `ps aux` review |
| 92 | Automatic security updates enabled | `unattended-upgrades` status |
| 93 | Every admin action audited with actor, IP, before/after, request ID | Audit log inspection |
| 94 | Audit log append-only and never deleted | Test attempting deletion |
| 95 | Alerting on: reconciliation drift, failed runs, dead-lettered events, error-rate spikes | Trigger each alert deliberately |
| 96 | Incident response runbook written and rehearsed | Tabletop exercise |
| 97 | Secret rotation procedure documented and tested | Rotate one secret in staging |
| 98 | Backup restore rehearsed end to end, not merely configured | Full restore drill into staging |

---

## 12. Pre-launch security gate

Nothing goes live until every box is ticked with evidence recorded.

- [ ] All 98 controls above verified, with test names or evidence links recorded
- [ ] Penetration test performed (external if budget allows; OWASP ASVS L2 self-assessment as a
      minimum) and all high and critical findings resolved
- [ ] Automated OWASP Top 10 sweep run against staging with zero high findings
- [ ] The financial integrity suite (§5) passing in CI, and required for merge
- [ ] Load test at 3× expected peak, with no errors and no balance drift afterwards
- [ ] Backup restore drill completed and reconciliation passing on the restored data
- [ ] Rollback drill completed with zero downtime
- [ ] Compliance gate from [00 §8](./00-project-overview.md#8-compliance-posture) satisfied
- [ ] Risk disclosure displayed and acceptance recorded at registration and at deposit
- [ ] Support escalation path defined, with a named on-call owner

---

## 13. Ongoing

| Cadence | Activity |
|---------|----------|
| Continuous | Dependency scanning; error alerting; reconciliation job |
| Weekly | Review audit log anomalies, failed logins, dead-lettered events |
| Monthly | Dependency updates; access review — who still needs admin? |
| Quarterly | Restore drill; secret rotation; review rate limits against real traffic |
| Annually | Penetration test; full threat-model review; disaster-recovery exercise |
