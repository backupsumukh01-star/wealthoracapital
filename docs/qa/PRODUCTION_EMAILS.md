# Production emails — Growzy

**Date:** 2026-08-05  
**Transport:** Resend (`EMAIL_TRANSPORT=resend` + `RESEND_API_KEY`)  
**Tests:** `pnpm --filter @meridian/api exec vitest run tests/integration/production-emails.test.ts` → **3/3 passed**  
**Screenshots:** `docs/qa/email-screenshots/*-{desktop,mobile}.png` (24 files)  
**HTML previews:** `docs/qa/email-previews/*.html`

---

## Checklist

| Email | Template | Trigger | Responsive HTML | Resend path | Tested | Screenshot |
|-------|----------|---------|-----------------|-------------|--------|------------|
| Deposit Submitted | `deposit-submitted` | `deposit.service` create | ✅ | ✅ | ✅ | ✅ |
| Deposit Approved | `deposit-approved` | deposit approve | ✅ | ✅ | ✅ | ✅ |
| Deposit Rejected | `deposit-rejected` | deposit reject | ✅ | ✅ | ✅ | ✅ |
| Withdrawal Submitted | `withdrawal-submitted` | withdrawal create | ✅ | ✅ | ✅ | ✅ |
| Withdrawal Approved | `withdrawal-approved` | withdrawal approve | ✅ | ✅ | ✅ | ✅ |
| Withdrawal Rejected | `withdrawal-rejected` | withdrawal reject | ✅ | ✅ | ✅ | ✅ |
| KYC Submitted | `kyc-submitted` | KYC submit | ✅ | ✅ | ✅ | ✅ |
| KYC Approved | `kyc-approved` | KYC approve | ✅ | ✅ | ✅ | ✅ |
| KYC Rejected | `kyc-rejected` | KYC reject | ✅ | ✅ | ✅ | ✅ |
| Support Reply | `support-reply` | agent reply | ✅ | ✅ | ✅ | ✅ |
| Admin Alerts | `admin-alert` | deposit/withdraw/KYC submit → `ADMIN_ALERT_EMAILS` | ✅ | ✅ | ✅ | ✅ |
| Broadcast | `broadcast` | admin broadcast EMAIL channel | ✅ | ✅ | ✅ | ✅ |

---

## Resend setup

```env
EMAIL_TRANSPORT=resend
RESEND_API_KEY=re_xxxx
SMTP_FROM_NAME=Wealthora Capital
SMTP_FROM_ADDRESS=update@wealthoracapital.net
ADMIN_ALERT_EMAILS=update@wealthoracapital.net
```

1. Verify domain in [Resend](https://resend.com/domains) (SPF/DKIM/DMARC).
2. Use a from-address on that domain.
3. Restart API.

Local default remains `EMAIL_TRANSPORT=console` (logs HTML).

---

## Architecture

- Responsive layout: `apps/api/src/emails/layout.ts` (table + viewport + mobile media query)
- Templates: `apps/api/src/emails/templates/index.ts`
- Dispatch: `email.service.ts` → Resend/console/etc.
- Safe triggers: `emails/transactional.ts` (never blocks finance/KYC on mail failure)
- Wired in: deposit, withdrawal, KYC, support, broadcast services

---

## Regenerate screenshots

```bash
pnpm --filter @meridian/api exec vitest run tests/integration/production-emails.test.ts
node scripts/shot-email-previews.mjs
```
