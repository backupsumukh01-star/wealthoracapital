# API Health Report

**Generated:** 2026-08-05T10:39:33.841Z

| Check | Expectation |
|-------|-------------|
| `GET /api/health` | 200 or 503 with envelope |
| `GET /api/docs/json` | OpenAPI 3.1 |
| Public CMS / settings / trades | 200 |
| Authenticated surfaces without cookie | 401 |

See Vitest integration suites under `apps/api/tests/integration`.
