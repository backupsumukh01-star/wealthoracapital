#!/usr/bin/env node
/**
 * Production-safe `prisma migrate deploy` with recovery for one known failed migration.
 *
 * 20260806120000_deposit_withdrawal_submission_fields failed on Render because the SQL
 * file had a UTF-8 BOM. Postgres rejected it at parse time — no DDL was applied.
 * Prisma still recorded the migration as failed (P3009), which blocks every deploy.
 *
 * Recovery: mark that migration rolled back, then deploy again (idempotent SQL).
 * This path only runs when migrate deploy fails with P3009 for that exact migration.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const KNOWN_FAILED_MIGRATION = '20260806120000_deposit_withdrawal_submission_fields'

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function runPrisma(args) {
  const result = spawnSync('pnpm', ['exec', 'prisma', ...args], {
    cwd: apiRoot,
    encoding: 'utf8',
    env: process.env,
    shell: process.platform === 'win32',
  })
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    signal: result.signal,
  }
}

function print(result) {
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
}

function isKnownP3009(result) {
  const text = `${result.stdout}\n${result.stderr}`
  return (
    text.includes('P3009') &&
    text.includes(KNOWN_FAILED_MIGRATION) &&
    /failed migrations|migration started .* failed/i.test(text)
  )
}

const first = runPrisma(['migrate', 'deploy'])
print(first)

if (first.status === 0) {
  process.exit(0)
}

if (!isKnownP3009(first)) {
  process.exit(first.status)
}

console.error(
  `[migrate-deploy-safe] Recovering known failed migration ${KNOWN_FAILED_MIGRATION} (BOM parse failure; no schema changes applied).`,
)

const resolve = runPrisma(['migrate', 'resolve', '--rolled-back', KNOWN_FAILED_MIGRATION])
print(resolve)
if (resolve.status !== 0) {
  console.error('[migrate-deploy-safe] resolve --rolled-back failed')
  process.exit(resolve.status)
}

const second = runPrisma(['migrate', 'deploy'])
print(second)
process.exit(second.status)
