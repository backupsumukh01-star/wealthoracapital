# Phase 6 — Support API

## Investor (`support.view` implicit for own tickets)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/support/tickets` | My tickets, paginated |
| GET | `/api/v1/support/tickets/:id` | My ticket + message thread |
| POST | `/api/v1/support/tickets` | Create — `{ subject, body, category?, attachments? }` |
| POST | `/api/v1/support/tickets/:id/reply` | Append a message as the ticket owner |

## Admin (`support.view` / `support.manage`)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/admin/support/tickets` | Filter by `status`, `priority`, `category`, `assigneeId`, `search` |
| GET | `/api/v1/admin/support/tickets/:id` | Full thread incl. internal notes |
| POST | `/api/v1/admin/support/tickets/:id/reply` | Staff reply (notifies investor by email + in-app) |
| POST | `/api/v1/admin/support/tickets/:id/assign` | `{ assigneeId }` |
| POST | `/api/v1/admin/support/tickets/:id/priority` | `{ priority: LOW\|NORMAL\|HIGH\|URGENT }` |
| POST | `/api/v1/admin/support/tickets/:id/category` | `{ category }` |
| POST | `/api/v1/admin/support/tickets/:id/notes` | Internal note, never visible to investor |
| POST | `/api/v1/admin/support/tickets/:id/close` \| `/reopen` | Lifecycle |
| POST | `/api/v1/admin/support/tickets/:id/merge` | `{ targetId }` — merges messages into target, marks source `mergedIntoId` |
| POST | `/api/v1/admin/support/tickets/:id/transfer` | `{ assigneeId }` alias with an audit-friendly label |
| GET | `/api/v1/admin/support/metrics` | Open/pending/closed counts, avg first-response time |

Attachments are stored as media asset references (array of `{ name, key, url }`) on the ticket or
message row — no separate upload endpoint; upload via `/api/v1/admin/media/upload` (or a future
investor media endpoint) first, then attach the resulting key.

## Data model

`SupportTicket` (reference, subject, status, priority, category, assigneeId, internalNotes,
mergedIntoId) · `SupportMessage` (ticketId, authorType `USER`\|`STAFF`\|`SYSTEM`, body,
attachments JSON).

## Notifications

Every ticket create/reply/assign/close dispatches through `notificationService.notify` (DATABASE +
EMAIL channels) using the `support-ticket-created` / `support-ticket-replied` DB-managed email
templates.
