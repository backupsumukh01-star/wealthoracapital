# Growzy OpenAPI Specification

Machine-readable API contract for every Express endpoint (Phases 1-6).

| File | Format |
|------|--------|
| [`openapi.yaml`](./openapi.yaml) | OpenAPI **3.1.0** (YAML) |
| [`openapi.json`](./openapi.json) | OpenAPI **3.1.0** (JSON) |
| [`API_CHANGELOG.md`](./API_CHANGELOG.md) | Version history & deprecation policy |
| [`API_DOCUMENTATION_COMPLETION_REPORT.md`](./API_DOCUMENTATION_COMPLETION_REPORT.md) | Completion report |

**Coverage:** 200 paths · 233 operations · 54 schemas

## Live docs (API running)

| UI | URL |
|----|-----|
| Swagger UI | http://localhost:4000/api/docs |
| Redoc | http://localhost:4000/api/redoc |
| JSON | http://localhost:4000/api/docs/json |
| YAML | http://localhost:4000/api/docs/yaml |

## Collections

| Tool | File |
|------|------|
| Postman | [`collections/growzy.postman_collection.json`](./collections/growzy.postman_collection.json) |
| Postman env | [`collections/growzy.postman_environment.json`](./collections/growzy.postman_environment.json) |
| Insomnia | [`collections/growzy.insomnia.json`](./collections/growzy.insomnia.json) |

Import into Postman/Insomnia, set `baseUrl` to `http://localhost:4000`, then login via Auth endpoints (cookies are the primary session mechanism).

## Regenerate

```bash
node scripts/generate-openapi.mjs
# or from apps/api:
pnpm --filter @meridian/api openapi:generate
```

Do not hand-edit generated JSON/YAML/collections — edit the generator, then re-run.

## Auth summary

| Mechanism | Name | Status |
|-----------|------|--------|
| Access JWT cookie | `mfx_at` | **Runtime primary** |
| Refresh JWT cookie | `mfx_rt` | Runtime (path `/api/v1/auth`) |
| CSRF cookie | `mfx_csrf` | Set; validation planned |
| Bearer JWT | `Authorization: Bearer` | Documented; cookie validated today |

## Response envelope

```json
{ "success": true, "data": {}, "meta": { "requestId": "…", "timestamp": "…" } }
```

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…" }, "meta": { "requestId": "…", "timestamp": "…" } }
```
