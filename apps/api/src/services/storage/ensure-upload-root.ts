import { access, mkdir, writeFile, unlink } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import path from 'node:path'

import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'

/**
 * Ensures local UPLOAD_ROOT exists and is writable before accepting traffic.
 * Fails fast in production when Persistent Disk / path is misconfigured.
 */
export async function ensureUploadRoot(): Promise<void> {
  if (env.STORAGE_DRIVER !== 'local') {
    logger.info({ driver: env.STORAGE_DRIVER }, 'Object storage driver — skip local upload root check')
    return
  }

  const root = path.resolve(env.UPLOAD_ROOT)
  await mkdir(root, { recursive: true })
  await access(root, fsConstants.R_OK | fsConstants.W_OK)

  const probe = path.join(root, `.write-probe-${process.pid}`)
  await writeFile(probe, 'ok', { mode: 0o640 })
  await unlink(probe)

  if (env.NODE_ENV === 'production' && !root.startsWith('/data')) {
    logger.warn(
      { uploadRoot: root },
      'UPLOAD_ROOT is not under /data — Render Persistent Disk may not be mounted; uploads can be lost on restart',
    )
  }

  logger.info({ uploadRoot: root, driver: 'local' }, 'Upload root ready')
}
