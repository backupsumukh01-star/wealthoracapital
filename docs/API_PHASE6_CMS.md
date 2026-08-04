# Phase 6 — CMS API

Document-based CMS for the public landing page and platform-wide copy, plus FAQs, testimonials,
announcements, and static pages. Every document has a **draft**, a **published**, and an optional
**scheduled** version; every save/publish/rollback is versioned as a `CmsRevision` and audited.

## Public

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/cms/public` | `CmsPublicBootstrap` — published landing + platform content, active FAQs, testimonials, announcements |
| GET | `/api/v1/cms/public/revisions/:revisionId` | Revision snapshot |
| POST | `/api/v1/cms/public/revisions/:revisionId/rollback` | Staff-only; restores a prior revision as the new draft (or publishes immediately if `publish: true`) |

## Staff (`cms.view` / `cms.manage`)

| Method | Path | Notes |
|---|---|---|
| GET/PUT | `/api/v1/cms/landing` | Draft content; PUT autosaves a new revision |
| POST | `/api/v1/cms/landing/publish` | Promotes draft → published |
| POST | `/api/v1/cms/landing/schedule` | Publish at a future `scheduledAt` (picked up by `cms-scheduled-publish` job) |
| GET/PUT | `/api/v1/cms/platform` | Platform-wide copy (legal, footer, support contact, popups, etc.) |
| POST | `/api/v1/cms/platform/publish` / `/schedule` | Same publish/schedule flow as landing |
| GET | `/api/v1/cms/:key/revisions` | Version history (`landing` \| `platform`) |
| GET | `/api/v1/cms/publish-logs` | Cross-document publish audit trail |
| POST | `/api/v1/cms/:key/autosave` | Debounced draft autosave from the editor |
| CRUD | `/api/v1/cms/faqs` | `GET/POST/:id PATCH/DELETE`, `+ /:id/restore` |
| CRUD | `/api/v1/cms/testimonials` | Same shape as FAQs |
| CRUD | `/api/v1/cms/announcements` | Same shape; also exposed under `/api/v1/admin/announcements` |
| CRUD | `/api/v1/cms/pages` | Static pages (slug, title, body, SEO) |

Soft-deleted rows keep `deletedAt`; list endpoints accept `includeDeleted=true` and expose `/restore`.

## Seed defaults

`src/services/cms/cms-defaults.ts` mirrors the frontend mocks so a fresh database renders the same
landing page copy as `apps/web/src/lib/admin-os-store.ts` (`seedLanding`) and platform copy as
`apps/web/src/lib/admin-cms-extras.ts` (`createDefaultCmsExtras`). Documents are lazily created on
first read (`cmsService.getOrInitDocument`), so no manual seed script is required.

## Data model

`CmsDocument` (key: `LANDING` \| `PLATFORM`, draft/published/scheduled JSON + status) ·
`CmsRevision` (immutable snapshot per save/publish/rollback, `action`, `createdBy`) · `CmsFaq` ·
`CmsTestimonial` · `Announcement` · `CmsPage`.
