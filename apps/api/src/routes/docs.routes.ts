import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Router, type Request, type Response } from 'express'

import { issueCsrfCookie } from '../utils/csrf-cookie.js'
import { asyncHandler } from '../utils/async-handler.js'
import { notFound } from '../utils/errors.js'

/**
 * Serves OpenAPI artifacts + interactive docs (Swagger UI / Redoc).
 * Spec files live in `apps/api/openapi/` (copied by `node scripts/generate-openapi.mjs`).
 *
 * Spec URL is path-absolute (`/api/openapi.json`) so Swagger/Redoc work behind
 * the Nginx `/api` reverse proxy without hard-coding host or protocol.
 */
export const docsRouter = Router()

/** Canonical browser-facing path for the OpenAPI JSON document. */
export const OPENAPI_JSON_PATH = '/api/openapi.json'
export const CSRF_BOOTSTRAP_PATH = '/api/v1/csrf'

function resolveOpenApiFile(filename: string): string {
  const candidates = [
    path.resolve(process.cwd(), 'openapi', filename),
    path.resolve(process.cwd(), 'apps', 'api', 'openapi', filename),
    path.resolve(process.cwd(), '..', 'openapi', filename),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  throw notFound(`OpenAPI file not found: ${filename}`)
}

function readOpenApi(filename: string): string {
  return readFileSync(resolveOpenApiFile(filename), 'utf8')
}

function swaggerHtml(bootstrapCsrfToken: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Wealthora API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    body { margin: 0; background: #07090B; }
    .topbar { display: none; }
    .swagger-ui .info .title { color: #e8eef7; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    function readCsrfCookie() {
      var match = document.cookie.match(/(?:^|; )mfx_csrf=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : '';
    }

    function rememberCsrfToken(token) {
      if (token && typeof token === 'string') {
        window.__growzyCsrf = token;
      }
    }

    function currentCsrfToken() {
      return window.__growzyCsrf || readCsrfCookie() || '';
    }

    // Token from Set-Cookie on this HTML response (and embedded for immediate use).
    rememberCsrfToken(${JSON.stringify(bootstrapCsrfToken)});
    rememberCsrfToken(readCsrfCookie());

    function mountSwagger() {
      window.ui = SwaggerUIBundle({
        url: ${JSON.stringify(OPENAPI_JSON_PATH)},
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        deepLinking: true,
        persistAuthorization: true,
        tryItOutEnabled: true,
        displayRequestDuration: true,
        filter: true,
        withCredentials: true,
        responseInterceptor: function (res) {
          try {
            var payload = res.body;
            if (typeof payload === 'string') {
              payload = JSON.parse(payload);
            }
            var token = payload && payload.data && payload.data.csrfToken;
            rememberCsrfToken(token);
          } catch (e) { /* ignore non-JSON */ }
          rememberCsrfToken(readCsrfCookie());
          return res;
        },
        requestInterceptor: function (req) {
          var token = currentCsrfToken();
          if (token) {
            if (!req.headers) req.headers = {};
            req.headers['X-CSRF-Token'] = token;
          }
          return req;
        }
      });
    }

    // Refresh CSRF via dedicated GET so the cookie is definitely present before Try-it-out.
    fetch(${JSON.stringify(CSRF_BOOTSTRAP_PATH)}, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    })
      .then(function (r) { return r.json(); })
      .then(function (body) {
        if (body && body.data && body.data.csrfToken) {
          rememberCsrfToken(body.data.csrfToken);
        }
        rememberCsrfToken(readCsrfCookie());
      })
      .catch(function () { /* keep bootstrap token */ })
      .finally(mountSwagger);
  </script>
</body>
</html>`
}

function redocHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Wealthora API — Redoc</title>
  <style>body { margin: 0; padding: 0; }</style>
</head>
<body>
  <redoc spec-url="${OPENAPI_JSON_PATH}" expand-responses="200,201" hide-download-button="false"></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`
}

docsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const csrfToken = issueCsrfCookie(res)
    res.type('html').send(swaggerHtml(csrfToken))
  }),
)

docsRouter.get(
  '/json',
  asyncHandler(async (_req, res) => {
    sendOpenApiJson(_req, res)
  }),
)

docsRouter.get(
  '/yaml',
  asyncHandler(async (_req, res) => {
    res.type('application/yaml').send(readOpenApi('openapi.yaml'))
  }),
)

/** Mounted at `/api/openapi.json` and also available as `/api/docs/json`. */
export function sendOpenApiJson(_req: Request, res: Response): void {
  issueCsrfCookie(res)
  res.type('application/json').send(readOpenApi('openapi.json'))
}

/** Mounted separately at `/api/redoc`. */
export function sendRedoc(_req: Request, res: Response): void {
  res.type('html').send(redocHtml())
}
