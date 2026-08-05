# Email QA Report — Growzy

**Date:** 2026-08-05  
**Scope:** All transactional / lifecycle / broadcast / admin alert emails  
**Mode:** Report only — no fixes  
**Environments:** Code inventory + DNS for `growzycapital.com` + Render email env shape  

---

## Executive verdict

| Area | Status |
|------|--------|
| Auth emails (verify / reset / welcome / security) | **Live send path** (static templates → Resend if keyed) |
| Deposit / Withdrawal / KYC / Support / Daily profit | **Templates seeded; never sent** on domain events |
| Broadcast EMAIL | Raw `sendRaw` only — not template/outbox |
| Admin alerts | **None** |
| Premium HTML studio | Preview-only — **not wired to API** |
| Deliverability DNS | SPF Google-only; Resend DKIM present; **DMARC missing** |

**Do not treat the polished email studio or DB template library as production mail.** Users only get auth/security messages today (when Resend works).

---

## System architecture (3 disconnected layers)

| Layer | What | Sends mail? |
|-------|------|-------------|
| **A. Static auth** | `apps/api/src/emails/templates/index.ts` via `email.service.ts` | **Yes** (auth.service) |
| **B. DB templates + outbox** | `default-templates.ts` → DB; admin test / queue | Seeded; **not** event-triggered |
| **C. Premium studio** | `apps/web/src/lib/premium-email-templates.ts` (25 layouts) | **Preview only** |

---

## Per-email checklist

Legend: ✅ pass · ⚠️ partial · ❌ fail · 🚫 missing · — N/A / not sendable

### Registration / welcome

| Check | Static live | DB seed | Premium preview |
|-------|:-----------:|:-------:|:---------------:|
| Exists | ✅ welcome + registration-attempt | ✅ | ✅ |
| Triggered on event | ✅ after verify / dup register | ❌ | ❌ |
| Subject | `Welcome to ${APP_NAME}` / registration attempt | `{{companyName}}` | Growzy Capital |
| From | `SMTP_FROM_*` | same if sent | — |
| HTML | ⚠️ minimal | ⚠️ minimal | ✅ rich |
| Mobile | ❌ no viewport/tables | ❌ | ✅ |
| Spam risk | ⚠️ bare HTML, few links | ⚠️ | ⚠️ marketing-heavy |
| Broken links | ✅ absolute `APP_URL` (auth) | ⚠️ if vars omitted | sample `growzy.com` |
| Images | — none | — | logo/socials |
| Branding | Growzy via APP_NAME | `{{companyName}}` literal risk | Growzy Capital |
| DKIM/SPF/DMARC | See DNS section | | |

### Email verification

| Check | Result |
|-------|--------|
| Template | Static `email-verification` — **live** |
| Subject | `Verify your ${APP_NAME} email` |
| Link | `${APP_URL}/verify-email?token=…` absolute ✅ |
| HTML / Mobile | Minimal / **not** mobile-optimized ❌ |
| Text | Plain CTA — low spam signals if domain auth OK |
| Images | None |
| Branding | Footer `— ${APP_NAME}` |
| DB twin `verify-email` | Not used by auth path |

### Password reset

| Check | Result |
|-------|--------|
| Template | Static `password-reset` — **live** |
| Subject | `Reset your ${APP_NAME} password` |
| Link | `${APP_URL}/reset-password?token=…` ✅ |
| Expiry copy | 1 hour in body ✅ |
| HTML / Mobile | Minimal / ❌ |
| Spam | Short transactional — OK if auth DNS aligned |
| Branding | Growzy |

### Deposit

| Variant | Seeded DB | Event triggers email? | In-app notify |
|---------|:---------:|:---------------------:|:-------------:|
| Submitted | ✅ `deposit-submitted` | ❌ | ✅ |
| Approved | ✅ `deposit-approved` | ❌ | ✅ |
| Rejected | ✅ `deposit-rejected` | ❌ | ✅ |
| Info / cancelled | 🚫 | ❌ | partial |

| Check | Result |
|-------|--------|
| HTML (seed) | Minimal wrap — not premium |
| Mobile | ❌ |
| Links | Template vars only if ever enqueued |
| Branding | `{{companyName}}` |
| **Overall** | **FAIL — no send** |

### Withdrawal

| Variant | Seeded | Email sent? |
|---------|:------:|:-----------:|
| Submitted | ✅ | ❌ |
| Approved | ✅ | ❌ |
| Paid | ✅ | ❌ |
| Rejected | ✅ | ❌ |
| Info / cancelled | 🚫 | ❌ |

Same HTML/mobile/branding gaps as deposits. **FAIL — no send.**

### KYC

| Variant | Seeded | Premium preview | Email sent? |
|---------|:------:|:---------------:|:-----------:|
| Submitted / started | 🚫 | ✅ | ❌ |
| Approved | ✅ | ✅ | ❌ |
| Rejected | ✅ | ✅ | ❌ |
| Need info | ✅ | ✅ | ❌ |
| Suspend / expire | 🚫 | partial | ❌ |

**FAIL — no send** (in-app notifications only).

### Support

| Variant | Seeded | Email sent? | Notes |
|---------|:------:|:-----------:|-------|
| Ticket created | ✅ | ❌ | Create also skips in-app notify |
| Agent reply | ✅ | ❌ | In-app only |
| Closed | 🚫 | ❌ | |

**FAIL — no send.**

### Broadcast

| Check | Result |
|-------|--------|
| Channel EMAIL | `sendRaw` with `<p>${body}</p>` |
| Uses DB/premium template | ❌ |
| Outbox / retry / tracking | ❌ |
| HTML escape | ❌ **HIGH** — body injected raw |
| Mobile / branding | Depends on operator paste |
| Subject | Caller-supplied |
| **Overall** | ⚠️ Dangerous / incomplete |

### Admin alerts

| Event | Email |
|-------|-------|
| New deposit pending | 🚫 |
| New withdrawal pending | 🚫 |
| New KYC queue item | 🚫 |
| New support ticket | 🚫 |
| System / reconciliation drift | 🚫 |

**FAIL — no admin alert emails.**

### Security extras (live)

| Email | Trigger | Status |
|-------|---------|--------|
| `security-alert` | Lockout / password change | Live static |
| `registration-attempt` | Register existing email | Live static |

---

## Cross-cutting quality matrix (live auth HTML)

| Criterion | Live static templates | Premium studio (unused) |
|-----------|----------------------|-------------------------|
| **HTML** | Bare `<body>` + Arial | Table layout, dark scheme |
| **Mobile** | No viewport / media queries | `@media max-width:620px` |
| **Spam score** | Not lab-scored; short transactional helps; **SPF mismatch risk** hurts | Marketing blocks raise score |
| **Broken links** | Built from `APP_URL` — OK if env correct | Sample `https://growzy.com/...` (may ≠ prod domain) |
| **Images** | None | Logo + socials |
| **Branding** | Growzy via `APP_NAME` | Growzy Capital |
| **Subject** | Clear transactional | Varied catalog |
| **From address** | `SMTP_FROM_NAME` + `SMTP_FROM_ADDRESS` (intended `Growzy` / `noreply@growzycapital.com`) | — |
| **Text part** | ✅ multipart text+html | Studio HTML-focused |

**Spam score:** No Litmus/Mail-Tester run in this pass. Predicted issues: missing DMARC, SPF not authorizing Resend, sparse HTML, possible `noreply@` reputation.

---

## From address & transport

| Setting | Production intent (`render.yaml` / examples) |
|---------|-----------------------------------------------|
| `EMAIL_TRANSPORT` | `resend` |
| `SMTP_FROM_NAME` | Growzy (secret/env) |
| `SMTP_FROM_ADDRESS` | `noreply@growzycapital.com` (example) |
| `RESEND_API_KEY` | Required secret |

| Transport | Implementation |
|-----------|----------------|
| `resend` | Live HTTP when API key set |
| `console` | Log only (default local) |
| `smtp` / `sendgrid` / `ses` / `mailgun` | **Stubs** (log / deferred) — do not use in prod |

App does **not** sign DKIM itself — relies on ESP + DNS.

---

## DKIM / SPF / DMARC (DNS audit — `growzycapital.com`)

| Record | Observed | Assessment |
|--------|----------|------------|
| **MX** | `smtp.google.com` (pri 10) | Inbound Google Workspace-style |
| **SPF** | `v=spf1 include:_spf.google.com ~all` | Authorizes **Google only**; soft fail `~all` |
| **DKIM (Resend)** | `resend._domainkey` → RSA public key present | ✅ Selector published |
| **DKIM (Google)** | `google._domainkey` present | ✅ For Google mail |
| **DMARC** | `_dmarc.growzycapital.com` **not found** | ❌ **HIGH** |
| App DKIM | None | Expected for Resend |

### Deliverability finding (HIGH / CRITICAL for inboxing)

Production sends via **Resend**, but SPF includes **only Google**. Unless Resend is covered by another mechanism (custom Return-Path / Resend-managed domain alignment), receivers may:

- Fail SPF alignment for `From: …@growzycapital.com` via Resend  
- Soft-fail (`~all`) rather than reject — still spam-folder risk  
- With **no DMARC**, no policy enforcement or aggregate reporting

**CRITICAL if** Resend is the live sender and SPF does not include Resend’s include — auth emails may land in spam or be untrusted.

Verify in Resend dashboard: domain status “Verified”, and SPF should typically include Resend’s published include (or send from a Resend subdomain with aligned SPF).

---

## Broken links / images

| Source | Risk |
|--------|------|
| Auth verify/reset | Links use `APP_URL` — broken if `APP_URL` wrong in Render |
| DB templates | `{{verifyUrl}}` / `{{resetUrl}}` only if enqueue supplies vars — currently unused |
| Premium CTAs | Hardcoded `growzy.com` samples — wrong if prod is `growzycapital.com` |
| Open pixel | Absolute `API_URL/api/v1/emails/o/:token` when outbox sends |
| Click wrap | Tokens stored; **links not rewritten** to click tracker |
| Images in live mail | None (no broken image risk) |

---

## Subject / From matrix (live)

| Email | Subject pattern | From |
|-------|-----------------|------|
| Verify | `Verify your {APP_NAME} email` | SMTP_FROM_* |
| Reset | `Reset your {APP_NAME} password` | SMTP_FROM_* |
| Welcome | `Welcome to {APP_NAME}` | SMTP_FROM_* |
| Registration attempt | `Registration attempt on your {APP_NAME} account` | SMTP_FROM_* |
| Security alert | `{APP_NAME} security alert` | SMTP_FROM_* |
| Deposit / KYC / Support / etc. | Seeded subjects | **Never sent** |

---

## Scorecard by product email

| Email | Sent? | HTML | Mobile | Links | Brand | Subject | From | Auth DNS* |
|-------|:-----:|:----:|:------:|:-----:|:-----:|:-------:|:----:|:---------:|
| Registration / welcome | ✅ | ⚠️ | ❌ | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| Verification | ✅ | ⚠️ | ❌ | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| Password reset | ✅ | ⚠️ | ❌ | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| Deposit * | ❌ | ⚠️ seed | ❌ | — | ⚠️ | ✅ seed | — | — |
| Withdrawal * | ❌ | ⚠️ | ❌ | — | ⚠️ | ✅ | — | — |
| KYC * | ❌ | ⚠️ | ❌ | — | ⚠️ | ✅ | — | — |
| Support * | ❌ | ⚠️ | ❌ | — | ⚠️ | ✅ | — | — |
| Broadcast | ⚠️ raw | ❌ | ❌ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ |
| Admin alerts | 🚫 | — | — | — | — | — | — | — |
| Premium catalog | Preview | ✅ | ✅ | ⚠️ samples | ✅ | ✅ | — | — |

\*Auth DNS = SPF/DKIM/DMARC alignment for Resend From domain.

---

## CRITICAL / HIGH / MEDIUM

### CRITICAL
1. **Lifecycle emails never send** — deposit, withdrawal, KYC, support, daily profit only notify in-app; `emailOutbox.enqueue` has no domain callers.  
2. **SPF does not authorize Resend** (Google-only) while transport is Resend — high risk of spam/reject for the only live emails (auth). Confirm Resend domain verification.  

### HIGH
3. **No DMARC** record on `growzycapital.com`.  
4. **SMTP/other ESP transports are stubs** — misconfig = silent non-delivery.  
5. **Triple template systems** diverge (static ≠ DB ≠ premium); editing studio/DB does not change auth mail.  
6. **Broadcast** unescaped HTML + skips outbox/templates.  
7. **No admin alert emails** for money/KYC/support queues.  
8. Admin UI shows polished previews — operators may believe mail is live.

### MEDIUM
9. Live HTML not mobile-friendly.  
10. Click tracking incomplete.  
11. Missing seeds: KYC submitted, deposit/withdraw info-requested, support closed, admin alerts.  
12. `{{companyName}}` not defaulted on enqueue.  
13. Premium sample links use `growzy.com` ≠ `growzycapital.com`.

---

## Manual lab still required

Not executed in this pass (need mailbox + Mail-Tester / Litmus):

- [ ] Send real verify/reset to Gmail/Outlook/Apple Mail  
- [ ] Mail-Tester / Google Postmaster spam score  
- [ ] Open on iPhone + Android clients  
- [ ] Confirm Resend domain “Verified” + SPF include in Resend UI  
- [ ] Add and validate DMARC `p=none` → `quarantine`  

---

## Gate recommendation

1. Align SPF (and ideally DMARC) with Resend before relying on auth mail.  
2. Wire domain events → outbox using DB (or premium) templates for deposit/withdraw/KYC/support.  
3. Connect admin email UI to `emailAdminService` or remove misleading preview-as-production UX.  
4. Replace live auth HTML with mobile-safe branded layout (or render premium templates).  
5. Escape broadcast bodies; route through templates + outbox.

---

## Key paths

| Asset | Path |
|-------|------|
| Static templates | `apps/api/src/emails/templates/index.ts` |
| DB seeds | `apps/api/src/emails/default-templates.ts` |
| Transports | `apps/api/src/emails/transports/` |
| Outbox | `apps/api/src/services/email/email-outbox.service.ts` |
| Premium studio | `apps/web/src/lib/premium-email-templates.ts` |
| Auth senders | `apps/api/src/services/auth.service.ts` |

---

*DNS checked live for `growzycapital.com` on 2026-08-05. No messages were injected into production inboxes in this audit.*
