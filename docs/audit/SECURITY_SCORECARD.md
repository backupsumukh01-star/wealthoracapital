# SECURITY SCORECARD — Growzy

**Date:** 2026-08-05  
**Overall security score: 7.0 / 10**

## OWASP Top 10 mapping

| OWASP | Rating | Evidence |
|-------|--------|----------|
| A01 Broken Access Control | 7/10 | Permission middleware + investor blocked from admin in tests; keep auditing IDOR on object IDs |
| A02 Cryptographic Failures | 6/10 | JWT + bcrypt; TLS not complete at edge |
| A03 Injection | 8/10 | Prisma parameterized; Zod validation; SQL injection test |
| A04 Insecure Design | 6/10 | CSRF was missing (now fixed); distribution design risk |
| A05 Security Misconfiguration | 6/10 | Docs/metrics hardened; staging Redis weak; HSTS deferred |
| A06 Vulnerable Components | 4/10 | Critical/high transitive advisories (`tar`, `postcss`, `sharp`) |
| A07 Auth Failures | 8/10 | httpOnly cookies, refresh rotation patterns, rate limits |
| A08 Software/Data Integrity | 6/10 | CI builds; no signed images / SBOM yet |
| A09 Logging/Monitoring Failures | 7/10 | Pino JSON + metrics; Sentry optional |
| A10 SSRF | 8/10 | Email redirect hardened earlier |

## Control checklist

| Control | Status |
|---------|--------|
| CSRF double-submit | **Pass** (enabled outside tests) |
| Secure cookies | **Pass** when `COOKIE_SECURE`/prod |
| Helmet CSP/HSTS | **Pass** (HSTS prod API; Nginx HSTS deferred) |
| Rate limiting | **Pass** (memory/redis) |
| Metrics auth | **Pass** (token / prod hide + Nginx deny) |
| API docs in prod | **Pass** (default off) |
| File upload MIME | **Partial** (media allowlist; KYC allowlist; AV noop) |
| Secrets in git | **Pass** (`.env` gitignored; examples only) |
| RBAC | **Pass** (baseline) |

## Findings severity counts (post safe-fix)

- Critical remaining: 2 infra/deps (TLS, tar) + FinTech design items tracked separately  
- High: ~8  
- Medium: ~12  
- Low: ~10  

See main audit report for IDs.
