import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Router, type Request, type Response } from 'express'

import { asyncHandler } from '../utils/async-handler.js'
import { notFound } from '../utils/errors.js'

/**
 * Serves OpenAPI artifacts + interactive docs (Swagger UI / Redoc).
 * Spec files live in `apps/api/openapi/` (copied by `node scripts/generate-openapi.mjs`).
 */
export const docsRouter = Router()

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

function swaggerHtml(req: Request): string {
  const jsonUrl = `${req.protocol}://${req.get('host')}/api/docs/json`
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
      url: ${JSON.stringify(jsonUrl)},
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

function redocHtml(req: Request): string {
  const jsonUrl = `${req.protocol}://${req.get('host')}/api/docs/json`
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Growzy API — Redoc</title>
  <style>body { margin: 0; padding: 0; }</style>
</head>
<body>
  <redoc spec-url="${jsonUrl}" expand-responses="200,201" hide-download-button="false"></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`
}

docsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.type('html').send(swaggerHtml(req))
  }),
)

docsRouter.get(
  '/json',
  asyncHandler(async (_req, res) => {
    res.type('application/json').send(readOpenApi('openapi.json'))
  }),
)

docsRouter.get(
  '/yaml',
  asyncHandler(async (_req, res) => {
    res.type('application/yaml').send(readOpenApi('openapi.yaml'))
  }),
)

/** Mounted separately at `/api/redoc`. */
export function sendRedoc(req: Request, res: Response): void {
  res.type('html').send(redocHtml(req))
}
