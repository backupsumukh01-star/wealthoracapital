# API Documentation — Phase 3 (KYC Engine)

Base: `http://localhost:4000/api/v1`

---

## Investor KYC

| Method | Path | Permission |
|--------|------|------------|
| GET | `/kyc/status` | `kyc.view` |
| GET | `/kyc/me` | `kyc.view` (alias) |
| PATCH | `/kyc/update` | `kyc.submit` |
| POST | `/kyc/submit` | `kyc.submit` |
| POST | `/kyc` | `kyc.submit` (compat submit) |
| POST | `/kyc/upload` | `kyc.submit` (multipart `file`, `documentType`, `side`) |
| GET | `/kyc/history` | `kyc.view` |
| GET | `/kyc/documents` | `kyc.view` |
| DELETE | `/kyc/document/:id` | `kyc.submit` |
| GET | `/kyc/files/download` | signed URL query (`key`, `expires`, `signature`) |

### Submit body / update body

```json
{
  "country": "US",
  "dateOfBirth": "1990-01-15",
  "nationality": "US",
  "addressLine1": "1 Market St",
  "city": "San Francisco",
  "postalCode": "94105",
  "occupation": "Engineer",
  "primaryDocumentType": "PASSPORT"
}
```

Age must be ≥ 18. Required docs depend on ID type (passport: FRONT + SELFIE; others: FRONT + BACK + SELFIE).

---

## Admin KYC

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/kyc` | `kyc.view` |
| GET | `/admin/kyc/metrics` | `kyc.view` |
| GET | `/admin/kyc/:id` | `kyc.view` (submission id or user id) |
| POST | `/admin/kyc/:id/approve` | `kyc.review` |
| POST | `/admin/kyc/:id/reject` | `kyc.review` |
| POST | `/admin/kyc/:id/request-information` | `kyc.review` |
| POST | `/admin/kyc/:id/expire` | `kyc.review` |
| POST | `/admin/kyc/:id/reopen` | `kyc.review` |
| POST | `/admin/kyc/:id/suspend` | `kyc.review` |
| POST | `/admin/kyc/:id/review` | `kyc.review` (compat APPROVE/REJECT) |

### List filters

`q`, `status`, `country`, `riskLevel`, `reviewerId`, `documentType`, `from`, `to`, `page`, `limit`, `cursor`, `sortOrder`

### Metrics

Pending KYC, approved today, rejected today, average review hours, reviewer performance, risk distribution.

---

## Statuses

`NOT_STARTED` · `PENDING` · `SUBMITTED` · `UNDER_REVIEW` · `NEED_MORE_INFO` · `APPROVED` · `REJECTED` · `EXPIRED` · `SUSPENDED`

## Document types

Passport, National ID, Driving License, Residence Permit, Proof of Address, Selfie, Bank Statement, Utility Bill

## Risk levels

`LOW` · `MEDIUM` · `HIGH` · `CRITICAL`
