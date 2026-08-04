# Phase 6 Backend Completion Report

**Date:** 2026-08-04
**Scope:** CMS, media manager, reports, email engine (DB templates + outbox + tracking),
notifications, support desk, broadcasts, platform settings/feature flags, admin ops metrics.
**Auth / KYC / Wallet / Trading:** Untouched — all Phase 6 work is additive (new tables, new
routers, new permissions).

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @meridian/shared typecheck` | Pass (package has no build step; consumed as TS source) |
| `pnpm --filter @meridian/api db:generate` | Pass |
| `pnpm --filter @meridian/api db:migrate:deploy` | Pass — `20260804260000_phase6_ops` applied |
| `pnpm --filter @meridian/api typecheck` | Pass |
| `pnpm --filter @meridian/api lint` | Pass |
| `pnpm --filter @meridian/api build` (tsup) | Pass |
| API boot + smoke tests (below) | Pass |

## Migration

`apps/api/prisma/migrations/20260804260000_phase6_ops` — additive only: new enums
(`CmsDocumentKey`, `CmsStatus`, `CmsRevisionAction`, `MediaKind`, `ReportType`, `ReportFormat`,
`ReportStatus`, `EmailOutboxStatus`, `SupportTicketStatus`, `PriorityLevel`, `SupportCategory`,
`SupportMessageAuthorType`, `AnnouncementType`, `AnnouncementDisplayPage`, `BroadcastChannel`,
`BroadcastStatus`, `BroadcastAudience`), extended `ActivityKind`/`NotificationKind`, and 14 new
tables (`CmsDocument`, `CmsRevision`, `CmsFaq`, `CmsTestimonial`, `Announcement`, `CmsPage`,
`MediaAsset`, `ReportJob`, `EmailTemplate`, `EmailTemplateVersion`, `EmailOutbox`,
`SupportTicket`, `SupportMessage`, `Broadcast`, `PlatformSetting`, `FeatureFlag`). No existing
column was dropped, renamed, or retyped.

---

## Modules

### CMS (`docs/API_PHASE6_CMS.md`)
`GET /api/v1/cms/public` (bootstrap), landing/platform draft-publish-schedule-rollback, FAQs,
testimonials, announcements, static pages, publish log, version history, soft delete/restore,
autosave. Seeds default landing/platform copy matching the frontend mocks so a fresh DB renders
identically to the current static site.

### Media manager (`docs/API_PHASE6_REPORTS.md` covers shared file-download plumbing)
`/api/v1/admin/media` — upload (multipart, `media.manage`), list/search/folders, rename, move,
metadata, soft delete/restore/permanent delete. New `media` and `reports` `StorageCategory`
values alongside existing `avatars`/`documents`/`kyc`/`deposits`.

### Reports
`POST /api/v1/reports/export` (investor, own data) and
`/api/v1/admin/reports` list/generate/get (all `ReportType`s). CSV/JSON/XLSX(SpreadsheetML)/PDF
(hand-rolled minimal PDF, no new binary deps). Files served through a new generic signed-download
endpoint (`/api/v1/files/download`) shared with media.

### Email engine
`EMAIL_TRANSPORT` now supports `console|smtp|resend|sendgrid|ses|mailgun` (last four are
warn-and-log stubs ready for real credentials). New DB-managed template library + outbox:
preview, versioning, variable interpolation, scheduling, retry, a manual/queued processor, and
open/click tracking pixels+redirects. 19 default templates seeded on boot. Existing
`emailService.send(...)` calls for auth/KYC/finance are untouched.

### Notifications
`/api/v1/notifications*` (list with cursor pagination, unread count, mark read/all-read,
archive) now backed by `notificationService.notify()`, which maps Prisma `NotificationKind` →
the shared `Notification` DTO's `type`/`actionUrl` and dispatches DATABASE + EMAIL channels
(PUSH/SMS/WHATSAPP/TELEGRAM are typed no-op stubs for a future phase).

### Broadcast
`/api/v1/admin/broadcasts` — create/update/cancel/send/list, audience filters (all / by KYC
status / by role), channels EMAIL + IN_APP + ANNOUNCEMENT + (popup/banner via CMS
`homepagePopup`/announcements), immediate or scheduled send via the job queue.

### Support (`docs/API_PHASE6_SUPPORT.md`)
Investor ticket create/list/reply; admin assign/priority/category/internal-notes/merge/
transfer/close/reopen/metrics, all on top of the existing notification + audit plumbing.

### Settings
`/api/v1/settings/public`, `/settings/me`, `/api/v1/admin/settings`, `/api/v1/admin/feature-flags`
— a `PlatformSetting` singleton row + a `FeatureFlag` table, lazily initialized with sane
defaults on first read.

### Admin ops metrics
`GET /api/v1/admin/ops/metrics` — open/pending tickets, generated/failed reports, sent/queued/
failed emails, delivered notifications, CMS publish count + recent log, sent broadcasts, media
asset count. Single aggregation service, no new tables.

---

## Security

Every new admin route is gated by `authenticate` + `requireAdminAccess` (router-level, existing
middleware) plus a specific `requirePermission(...)` per route
(`cms.view/manage`, `media.manage`, `emails.manage`, `support.view/manage`, `reports.view/manage`,
`broadcasts.manage`, `settings.manage`). New permissions were added to `STAFF_PERMISSION_MAP`:
`CONTENT` → cms/media, `SUPPORT` → support.*, `FINANCE` → reports.view (plus existing finance
perms), `KYC` unchanged, `VIEWER` → read-only view perms. Investor-facing routes reuse the
existing `authenticate` middleware only (no elevated permission required — ownership is enforced
in the service layer by scoping queries to `req.user.id`). All mutations call
`auditService.record(...)`; CMS additionally versions every draft save/publish/rollback as a
`CmsRevision`.

---

## Jobs (in-memory, no Redis/BullMQ)

Extended `src/jobs/index.ts` with three handlers registered on the existing minute-interval
scheduler: `email-outbox-process` (drains due outbox items with retry/backoff),
`cms-scheduled-publish` (promotes documents whose `scheduledAt` has passed), and
`broadcast-scheduled-send` (dispatches broadcasts whose `scheduledAt` has passed).

---

## Frontend wiring

- `apps/web/src/services/cms.service.ts`, `support.service.ts`, `notification.service.ts`,
  `report.service.ts`, `settings.service.ts` — contracts preserved; now backed by real endpoints
  instead of mocks.
- New thin clients: `apps/web/src/services/media.service.ts` (incl. multipart upload helper),
  `email-admin.service.ts` (templates + outbox), `broadcast.service.ts`.
- `packages/shared/src/types/enums.ts` — `NotificationType` extended with support/broadcast/
  marketing/KYC-decision variants used by the new notification mapping.

---

## Smoke tests performed

Registered + activated a test investor, logged in (session cookie), then as investor: created a
support ticket, listed notifications + unread count, read `/settings/me`, exported an `audit`
report as JSON and downloaded it via the signed `/files/download` URL. Promoted the same user to
`SUPER_ADMIN` in the DB, re-logged in, then as admin: `/admin/ops/metrics`, `/admin/media`
list/upload/rename/soft-delete, `/admin/support` ticket list, `/cms/landing` (seeded content
verified against `seedLanding`/`createDefaultCmsExtras` shape), `/admin/settings`,
`/admin/feature-flags`, `/admin/broadcasts`, `/admin/email-templates` (19 seeded templates
confirmed after wiring `emailTemplateService.ensureSeeded()` into `server.ts` boot). Reverted the
test user back to `USER` role afterward.

---

## Documentation

- [`docs/API_PHASE6_CMS.md`](./docs/API_PHASE6_CMS.md)
- [`docs/API_PHASE6_REPORTS.md`](./docs/API_PHASE6_REPORTS.md)
- [`docs/API_PHASE6_EMAIL.md`](./docs/API_PHASE6_EMAIL.md)
- [`docs/API_PHASE6_SUPPORT.md`](./docs/API_PHASE6_SUPPORT.md)

---

## Known follow-ups (not required by scope, flagged for later)

- Resend/SendGrid/SES/Mailgun transports are credential-aware stubs (log + no-op send) — swap in
  real HTTP calls when a provider is chosen.
- Push/SMS/WhatsApp/Telegram notification channels are typed no-ops in `notificationService.notify`.
- No admin-side full-text search across modules beyond per-list `search` query params.
- XLSX export is SpreadsheetML XML (`.xls`), not OOXML `.xlsx` — opens correctly in Excel/Sheets
  but isn't a true zip-based `.xlsx`; upgrade if a strict `.xlsx` MIME/extension is required.

Redis, BullMQ, WebSockets, Cloudflare, CI/CD, and perf testing remain out of scope per Phase 6
instructions.
