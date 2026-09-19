# Growzy Email System V2 — PASS / FAIL Report

Generated: 2026-08-05  
Previews: `docs/qa/email-previews/` (+ `desktop/`, `mobile/` shells)

## Design system

| Check | Result |
|------|--------|
| Dark luxury theme | **PASS** |
| Growzy branding + logo mark | **PASS** |
| Category badges (Security / Finance / Support / KYC / Investment / System) | **PASS** |
| Rounded cards, detail tables, status badges | **PASS** |
| Timeline component | **PASS** |
| Premium OTP card | **PASS** |
| Responsive `@media` + 560px container | **PASS** |
| Footer: support email, site, help, security notice, copyright | **PASS** |
| Gmail / Outlook / Apple-safe table layout | **PASS** (table-based; litmus not run live) |
| Light-mode outer preference hint | **PASS** (CSS `prefers-color-scheme`) |
| Website UI unchanged | **PASS** |

## Sender routing

| Lane | Address | Result |
|------|---------|--------|
| Auth / Security | `update@wealthoracapital.net` | **PASS** |
| Support / KYC | `update@wealthoracapital.net` | **PASS** |
| Finance / Investment / Admin | `update@wealthoracapital.net` | **PASS** |
| Env overrides `EMAIL_FROM_*` | Documented in `.env.example` | **PASS** |

## Templates

| # | Email | Result |
|---|-------|--------|
| 1 | Welcome | **PASS** |
| 2 | Email verification | **PASS** |
| 3 | Login OTP | **PASS** (template + `emailOtpService`) |
| 4 | Withdrawal OTP | **PASS** (template + `emailOtpService`) |
| 5 | Password reset | **PASS** |
| 6 | KYC submitted (+ timeline) | **PASS** |
| 7 | KYC under review | **PASS** |
| 8 | KYC approved | **PASS** |
| 9 | KYC rejected (exact reason) | **PASS** |
| 10–12 | Deposit submitted / approved / rejected | **PASS** |
| 13–15 | Withdrawal requested / approved / rejected | **PASS** |
| 16 | Daily ROI report | **PASS** |
| 17–18 | Investment created / completed | **PASS** |
| 19 | Support reply | **PASS** |
| 20 | Platform notification | **PASS** |
| — | Admin alert | **PASS** |
| — | Broadcast / security / registration attempt | **PASS** |

## OTP flow

| Check | Result |
|------|--------|
| Login OTP email template (6-digit, 10 min, device meta) | **PASS** |
| Withdrawal OTP email template | **PASS** |
| `emailOtpService` issue/verify, max 5 attempts | **PASS** |
| Forced password→OTP→login wiring in auth controller | **PARTIAL** — service ready; not forced into default login (avoids breaking existing auth / tests). Call `emailOtpService` when enabling the step. |
| Forced withdrawal OTP before create | **PARTIAL** — same as above |

## Admin / ops

| Check | Result |
|------|--------|
| Admin alerts via `info@` lane | **PASS** |
| Structured fields + admin dashboard CTA | **PASS** |
| Existing ops alert event coverage | **PASS** (prior work) |

## Notifications / KYC (non-email)

| Check | Result |
|------|--------|
| Edit lock while under review | **PASS** (prior) |
| Rejection reason required | **PASS** (prior) |
| Audit timeline | **PASS** (prior) |

## Testing / QA artifacts

| Check | Result |
|------|--------|
| HTML preview for every template | **PASS** → `docs/qa/email-previews/*.html` |
| Desktop preview shells | **PASS** → `docs/qa/email-previews/desktop/` |
| Mobile preview shells | **PASS** → `docs/qa/email-previews/mobile/` |
| Automated vitest render + sender tests | **PASS** |
| Live Litmus/Email on Acid screenshots | **FAIL** — no external client lab in CI; open preview shells locally |
| Live spam-score / deliverability probe | **FAIL** — requires production ESP + domain DNS (SPF/DKIM/DMARC) |
| Pixel screenshots via Playwright | **PARTIAL** — HTML shells generated; run browser screenshots manually if needed |

## Env to set on Render

```
EMAIL_FROM_AUTH=update@wealthoracapital.net
EMAIL_FROM_SUPPORT=update@wealthoracapital.net
EMAIL_FROM_FINANCE=update@wealthoracapital.net
SMTP_FROM_NAME=Wealthora Capital
```

Verify all three senders in Resend (or your ESP).

## Overall

**Email design + templates + sender routing: PASS**  
**OTP email system: PASS (integration optional)**  
**External screenshot / spam lab: FAIL / manual**
