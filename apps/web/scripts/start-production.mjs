/**
 * Production start for Render / PaaS with Next.js output: 'standalone'.
 * Does not use `next start` (incompatible with standalone).
 * Binds HOSTNAME=0.0.0.0 so the platform proxy can reach the process.
 *
 * Layout matches apps/web/Dockerfile:
 *   cwd = .next/standalone
 *   node apps/web/server.js
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const standaloneRoot = path.join(appRoot, '.next', 'standalone')

const monorepoServer = path.join(standaloneRoot, 'apps', 'web', 'server.js')
const singleAppServer = path.join(standaloneRoot, 'server.js')

let serverJs
let cwd
let argv

if (existsSync(monorepoServer)) {
  serverJs = monorepoServer
  cwd = standaloneRoot
  argv = [path.join('apps', 'web', 'server.js')]
} else if (existsSync(singleAppServer)) {
  serverJs = singleAppServer
  cwd = standaloneRoot
  argv = ['server.js']
} else {
  console.error(
    '[growzy-web] Standalone server.js not found. Checked:\n',
    `  - ${monorepoServer}\n`,
    `  - ${singleAppServer}\n`,
    'Run `pnpm build` first (copies static/public into standalone).',
  )
  process.exit(1)
}

const staticDir = path.join(path.dirname(serverJs), '.next', 'static')
if (!existsSync(staticDir)) {
  console.error(
    '[growzy-web] Missing standalone static assets at',
    staticDir,
    '\nBuild must run prepare-standalone after next build.',
  )
  process.exit(1)
}

const port = String(process.env.PORT || '3000')
const hostname = process.env.HOSTNAME || '0.0.0.0'

console.log(`[growzy-web] standalone cwd=${cwd}`)
console.log(`[growzy-web] standalone server=${serverJs}`)
console.log(`[growzy-web] listening hostname=${hostname} port=${port}`)

const child = spawn(process.execPath, argv, {
  cwd,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: hostname,
  },
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
