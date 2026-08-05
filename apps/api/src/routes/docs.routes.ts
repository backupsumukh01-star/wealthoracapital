import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Router, type Request, type Response } from 'express'

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

function swaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Growzy API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    body { margin: 0; background: #0b1220; }
    .topbar { display: none; }
    .swagger-ui .info .title { color: #e8eef7; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
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
      withCredentials: true
    });
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
  <title>Growzy API — Redoc</title>
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
    res.type('html').send(swaggerHtml())
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
  res.type('application/json').send(readOpenApi('openapi.json'))
}

/** Mounted separately at `/api/redoc`. */
export function sendRedoc(_req: Request, res: Response): void {
  res.type('html').send(redocHtml())
}
