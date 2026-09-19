import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const nextBin = require.resolve('next/dist/bin/next')
const shim = path.join(path.dirname(fileURLToPath(import.meta.url)), 'win-readlink-shim.cjs')

const nodeArgs =
  process.platform === 'win32' ? ['--require', shim, nextBin, 'build'] : [nextBin, 'build']

const child = spawn(process.execPath, nodeArgs, {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
