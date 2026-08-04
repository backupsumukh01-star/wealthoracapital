# Phase 6 — Email Engine

Two layers coexist by design:

1. **Static transactional templates** (`src/emails/templates/*`) — unchanged from Phases 1–5.
   Used directly by auth/KYC/finance flows (`emailService.send('welcome', ...)`, etc.).
2. **DB-managed template library + outbox** (new) — editable/versioned templates for anything an
   admin should be able to tweak without a deploy (support acks, broadcasts, marketing), queued
   through an outbox with retry, and open/click tracking.

## Transports

`EMAIL_TRANSPORT` env selects the active transport: `console` (default, logs only) \| `smtp` \|
`resend` \| `sendgrid` \| `ses` \| `mailgun`. SMTP is fully implemented (nodemailer); the four
provider transports are thin, warn-on-missing-credentials stubs ready to fill in real HTTP calls
(`src/emails/transports/*.transport.ts`) — swapping them in is a one-file change, no interface
changes needed elsewhere.

## Admin API (`emails.manage`)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/admin/email-templates` | List, filter by `category`/`search` |
| POST | `/api/v1/admin/email-templates` | Create (key must be unique, lowercase-kebab) |
| GET/PATCH | `/api/v1/admin/email-templates/:id` | Update bumps `version` and writes an `EmailTemplateVersion` snapshot |
| GET | `/api/v1/admin/email-templates/:id/versions` | Version history |
| POST | `/api/v1/admin/email-templates/:id/preview` | Renders `{{variable}}` placeholders against sample data |
| POST | `/api/v1/admin/email-templates/:id/send-test` | Enqueues a real outbox send to an arbitrary address |
| GET | `/api/v1/admin/email-outbox` | Paginated outbox, filter by `status` |
| GET | `/api/v1/admin/email-outbox/:id` | Item detail (attempts, error, opens, clicks) |
| POST | `/api/v1/admin/email-outbox/:id/retry` \| `/cancel` | Manual controls |
| POST | `/api/v1/admin/email-outbox/process` | Manually trigger a queue drain (also runs every minute via the job scheduler) |

## Tracking

`GET /api/v1/emails/o/:token` returns a 1×1 transparent pixel and records `openedAt`.
`GET /api/v1/emails/c/:token?url=...` records `clickedAt` and redirects. Tokens are opaque,
per-outbox-item, generated at enqueue time.

## Seeding

19 default templates (welcome, registration alert, verify email, forgot password, security alert,
deposit/withdrawal submitted/approved/rejected/paid, KYC approved/rejected/info-requested, support
ticket created/replied, daily profit, generic broadcast) are defined in
`src/emails/default-templates.ts` and seeded idempotently on API boot (`server.ts` →
`emailTemplateService.ensureSeeded`).

## Data model

`EmailTemplate` (key, subject/body, variables, version) · `EmailTemplateVersion` (immutable
snapshots) · `EmailOutbox` (to, templateId\|raw subject/body, status, attempts, tokens,
openedAt/clickedAt, scheduledAt).
