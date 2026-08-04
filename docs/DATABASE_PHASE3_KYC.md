# Database Documentation — Phase 3 KYC

## Models

| Model | Table | Purpose |
|-------|-------|---------|
| `KycSubmission` | `kyc_submissions` | Investor verification case + risk fields |
| `KycDocument` | `kyc_documents` | Uploaded files (checksum, mime, virus status) |
| `KycReview` | `kyc_reviews` | Reviewer decisions / notes |
| `KycHistory` | `kyc_histories` | Immutable timeline |

`DocumentType` is modeled as Prisma enum `KycDocumentType`.

## Extended enums

- `KycStatus` — workflow statuses including Under Review / Need More Info / Expired / Suspended
- `ActivityKind` — KYC_* events
- `KycRiskLevel`, `KycReviewDecision`, `KycHistoryAction`, `KycDocumentSide`, `KycDocumentStatus`

## Migration

`20260804230000_phase3_kyc`

```bash
pnpm --filter @meridian/api db:migrate:deploy
```
