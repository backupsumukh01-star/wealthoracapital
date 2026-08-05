# Security Report

**Generated:** 2026-08-05T10:39:33.841Z

## Automated checks (Vitest `tests/security`)

| Control | Result |
|---------|--------|
| Broken authorization (investor → admin) | Covered |
| SQL injection login payloads | Covered (no 500) |
| XSS in register names | Covered (no 500) |
| Mass assignment role elevation | Covered |
| Path traversal signed downloads | Covered |
| Open redirect email click | Covered |

## OWASP Top 10 mapping

| Risk | Coverage |
|------|----------|
| A01 Broken Access Control | Integration + security tests |
| A02 Cryptographic Failures | JWT cookie auth documented; unit crypto utils |
| A03 Injection | Payload fuzz on auth |
| A04 Insecure Design | RBAC unit tests |
| A05 Security Misconfiguration | Helmet/CSP smoke via docs |
| A07 Identification & Auth Failures | Auth integration suite |
| A08 Software & Data Integrity | Idempotency checks in finance suite |
| Others | Expand with ZAP/Burp in staging |

## Critical / High

No critical or high severity defects were confirmed by the automated suite in this run.
Manual review items are listed in the Bug Report.
