# API Documentation Completion Report

**Date:** 2026-08-05  
**Scope:** OpenAPI 3.1, Swagger UI, Redoc, Postman, Insomnia, changelog  
**Constraint:** No business logic, schema, auth, permission, or frontend changes (docs + docs routes only)

---

## Verification

| Check | Result |
|-------|--------|
| OpenAPI version | **3.1.0** |
| Paths | **200** |
| Operations | **233** (unique operationIds) |
| Schemas | **54** reusable components |
| Error responses | 400 / 401 / 403 / 404 / 409 / 422 / 429 / 500 documented with examples |
| Security schemes | cookieAuth, refreshCookie, csrfCookie, bearerAuth |
| `pnpm --filter @meridian/api typecheck` | Pass |
| `pnpm --filter @meridian/api lint` | Pass |
| `pnpm --filter @meridian/api build` | Pass |
| `GET /api/docs` (Swagger UI) | 200 · HTML contains swagger-ui |
| `GET /api/docs/json` | 200 · `openapi: 3.1.0` |
| `GET /api/docs/yaml` | 200 |
| `GET /api/redoc` | 200 · HTML contains redoc |
| Postman collection | Valid v2.1 · 32 folders |
| Insomnia export | Format 4 · 267 resources |

---

## Deliverables

| Artifact | Location |
|----------|----------|
| OpenAPI JSON | [`docs/openapi/openapi.json`](./openapi.json) · served from `apps/api/openapi/` |
| OpenAPI YAML | [`docs/openapi/openapi.yaml`](./openapi.yaml) |
| Swagger UI | `/api/docs` |
| Spec JSON | `/api/docs/json` |
| Spec YAML | `/api/docs/yaml` |
| Redoc | `/api/redoc` |
| Postman collection | [`collections/growzy.postman_collection.json`](./collections/growzy.postman_collection.json) |
| Postman environment | [`collections/growzy.postman_environment.json`](./collections/growzy.postman_environment.json) |
| Insomnia collection | [`collections/growzy.insomnia.json`](./collections/growzy.insomnia.json) |
| Changelog | [`API_CHANGELOG.md`](./API_CHANGELOG.md) |
| Generator | `scripts/generate-openapi.mjs` |

---

## Interactive docs

With the API running on `:4000`:

- Swagger UI — http://localhost:4000/api/docs  
- Redoc — http://localhost:4000/api/redoc  
- JSON — http://localhost:4000/api/docs/json  

Helmet CSP was extended only to allow Swagger/Redoc CDN assets (unpkg, redoc.ly, jsDelivr, Google Fonts). No auth or RBAC behavior changed.

---

## Coverage notes

- Every mounted Express route from Phases 1-6 is present in the OpenAPI document.
- Permissions are surfaced via `x-permission` and operation descriptions.
- Admin routes document staff gate + permission.
- Multipart uploads (avatar, KYC, deposit proof, media) include form-data schemas.
- Signed download query params (`key`, `expires`, `signature`) documented for KYC and files.
- Email open pixel / click redirect documented as binary / 302 responses.
- Pagination: cursor (`cursor` / `nextCursor`) and offset (`page` / `limit`) parameters and schemas.

---

## Sync process

1. Change routes/validators in `apps/api`.
2. Update `scripts/generate-openapi.mjs` if new endpoints or schemas are needed.
3. Run `node scripts/generate-openapi.mjs` (or `pnpm --filter @meridian/api openapi:generate`).
4. Commit regenerated `docs/openapi/**` and `apps/api/openapi/**`.

---

## Out of scope (unchanged)

Business services, Prisma schema, JWT issuance, permission maps, and the Next.js frontend were not modified for this documentation phase (aside from README links to OpenAPI).
