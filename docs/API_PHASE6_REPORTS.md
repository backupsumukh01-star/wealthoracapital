# Phase 6 — Reports API

## Investor

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/reports/export` | Body: `{ type, format, from?, to? }`. Generates synchronously for the current user's own data and returns a signed `downloadUrl` (via `/api/v1/files/download`). |

Supported `type`: `portfolio` \| `performance` \| `investor` (own activity) \| `audit` (own audit
trail). Supported `format`: `csv` \| `json` \| `xlsx` \| `pdf`.

## Admin (`reports.view` / `reports.manage`)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/admin/reports` | Paginated list of generated `ReportJob` rows |
| POST | `/api/v1/admin/reports/generate` | Body: `{ type, format, from?, to?, userId? }` — any `ReportType` (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`, `INVESTOR`, `PORTFOLIO`, `PERFORMANCE`, `FINANCE`, `KYC`, `AUDIT`) |
| GET | `/api/v1/admin/reports/:id` | Job status + signed download URL once `COMPLETED` |

## Formats

- **CSV / JSON** — plain data export (`utils/tabular-export.ts`).
- **XLSX** — SpreadsheetML 2003 XML (`.xls`, opens natively in Excel/Sheets) to avoid a binary
  zip dependency.
- **PDF** — minimal single-page text PDF built by hand (`utils/simple-pdf.ts`), no external
  PDF library.

## Storage & download

Generated files are written through the existing local `storage` driver under a new `reports`
`StorageCategory` and served through a generic signed download endpoint,
`GET /api/v1/files/download?key&expires&signature`, shared by reports and media so KYC-style
signed URLs didn't need to be duplicated per feature (`services/files.service.ts`).

## Data model

`ReportJob` (`type`, `format`, `status`, `params` JSON, `resultKey`, `requestedById`, `error`).
