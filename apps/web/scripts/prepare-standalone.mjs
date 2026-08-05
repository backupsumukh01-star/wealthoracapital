/**
 * After `next build` with output: 'standalone', copy static assets and public
 * files into the standalone tree so `node …/server.js` can serve them.
 * Monorepo layout (outputFileTracingRoot = repo root):
 *   .next/standalone/apps/web/server.js
 *   .next/standalone/apps/web/.next/static  ← from .next/static
 *   .next/standalone/apps/web/public       ← from public
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const standaloneRoot = path.join(appRoot, '.next', 'standalone')
const standaloneApp = path.join(standaloneRoot, 'apps', 'web')
const serverJs = path.join(standaloneApp, 'server.js')

if (!existsSync(serverJs)) {
  console.error(
    '[prepare-standalone] Missing standalone server at',
    serverJs,
    '\nDid next build complete with output: "standalone"?',
  )
  process.exit(1)
}

const staticSrc = path.join(appRoot, '.next', 'static')
const staticDest = path.join(standaloneApp, '.next', 'static')
const publicSrc = path.join(appRoot, 'public')
const publicDest = path.join(standaloneApp, 'public')

if (!existsSync(staticSrc)) {
  console.error('[prepare-standalone] Missing build output:', staticSrc)
  process.exit(1)
}

mkdirSync(path.dirname(staticDest), { recursive: true })
if (existsSync(staticDest)) rmSync(staticDest, { recursive: true, force: true })
cpSync(staticSrc, staticDest, { recursive: true })
console.log('[prepare-standalone] copied .next/static →', path.relative(appRoot, staticDest))

if (existsSync(publicSrc)) {
  if (existsSync(publicDest)) rmSync(publicDest, { recursive: true, force: true })
  cpSync(publicSrc, publicDest, { recursive: true })
  console.log('[prepare-standalone] copied public →', path.relative(appRoot, publicDest))
} else {
  console.warn('[prepare-standalone] no public/ directory; skipping')
}

console.log('[prepare-standalone] ready — start with: node', path.relative(appRoot, serverJs))
