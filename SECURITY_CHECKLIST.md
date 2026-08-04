# Growzy — Security Checklist (Production Gate)

**Scope:** Final security gate before real money and real PII.  
**Companion:** Detailed controls in `docs/14-security-checklist.md`.  
**Status:** Frontend demo is intentionally insecure (client-side passwords, cookies). Items below are **required for production**.

---

## 1. Authentication & sessions

| # | Control | Done |
|---|---------|------|
| 1 | Passwords hashed with argon2id (or equivalent); never stored in localStorage | ☐ |
| 2 | Access + refresh tokens; refresh rotation and reuse detection | ☐ |
| 3 | HttpOnly, Secure, SameSite cookies; CSRF protection on mutating routes | ☐ |
| 4 | OTP / email verification via real delivery (not hardcoded `123456`) | ☐ |
| 5 | Admin realm separated from investor realm; distinct cookies / audience claims | ☐ |
| 6 | Lockout / rate limit on login, OTP, password reset | ☐ |
| 7 | Optional / required 2FA enforced from System Settings | ☐ |

---

## 2. Authorization (RBAC)

| # | Control | Done |
|---|---------|------|
| 1 | Role + permission flags enforced **server-side** (UI matrix is not enough) | ☐ |
| 2 | Super Admin / Finance / KYC / Trading / Support / Content / Viewer mapped to routes | ☐ |
| 3 | Money mutations require elevated role + audit reason | ☐ |
| 4 | Ownership checks on every user-scoped resource | ☐ |
| 5 | Viewer cannot mutate; Content Manager cannot approve withdrawals | ☐ |

---

## 3. Money & ledger integrity

| # | Control | Done |
|---|---------|------|
| 1 | Ledger posts in DB transactions with row locks | ☐ |
| 2 | Idempotency keys on deposit approve, withdraw payout, daily return | ☐ |
| 3 | Unique constraint preventing double return application | ☐ |
| 4 | Soft-close users; never hard-delete financial history | ☐ |
| 5 | Deposit / withdrawal limits from System Settings enforced server-side | ☐ |
| 6 | Feature flags (deposit/withdrawal/trading) enforced on API | ☐ |

---

## 4. CMS, media & uploads

| # | Control | Done |
|---|---------|------|
| 1 | CMS publish requires `cms.publish` permission + audit row | ☐ |
| 2 | Draft vs published separation; rollback audited | ☐ |
| 3 | Uploads: magic-byte validation, size limits, virus scan where required | ☐ |
| 4 | KYC / proof files outside public web root; signed URLs | ☐ |
| 5 | XSS-safe rendering of CMS HTML; sanitize rich text | ☐ |

---

## 5. Audit & insider risk

| # | Control | Done |
|---|---------|------|
| 1 | Immutable audit log: admin, IP, UA, action, old/new, user, reason | ☐ |
| 2 | Audit searchable / exportable (matches Audit Center UI) | ☐ |
| 3 | Failed login attempts recorded and visible on System Health | ☐ |
| 4 | Privileged actions require typed reason where money moves | ☐ |

---

## 6. Application hardening

| # | Control | Done |
|---|---------|------|
| 1 | Strict CSP; no unsafe inline in production where possible | ☐ |
| 2 | Security headers via nginx / Next config | ☐ |
| 3 | Dependency audit in CI; lockfile committed | ☐ |
| 4 | Secrets only via env / vault — never in repo or CMS | ☐ |
| 5 | Maintenance mode blocks investor money routes | ☐ |
| 6 | SSL certificate monitoring (System Health widget) | ☐ |

---

## 7. Privacy & compliance UX

| # | Control | Done |
|---|---------|------|
| 1 | Terms / Privacy / Risk disclaimer published and versioned in CMS | ☐ |
| 2 | PII minimized in logs and analytics | ☐ |
| 3 | Data retention + export/delete process documented | ☐ |
| 4 | Support channel URLs validated (no open redirects) | ☐ |

---

## 8. Demo-mode decommission

Before production traffic:

| # | Action | Done |
|---|--------|------|
| 1 | Remove or gate demo credentials (`investor@growzy.com`, `admin@growzy.com`) | ☐ |
| 2 | Disable localStorage Admin OS / lifecycle as source of truth | ☐ |
| 3 | Clear demo OTP and client-side password fields | ☐ |
| 4 | Confirm System Health environment shows `production` | ☐ |

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering lead | | |
| Security / compliance | | |
| Product owner | | |

*UI surfaces (Audit Center, Roles matrix, Feature toggles, System Health) are ready to consume backend enforcement — they do not replace it.*
