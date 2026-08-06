import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, constants as fsConstants, mkdir, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { StorageCategory, StorageDriver, StoredObject } from './storage.types.js'

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

export class LocalStorageDriver implements StorageDriver {
  private root = path.resolve(env.UPLOAD_ROOT)

  async put(input: {
    category: StorageCategory
    filename: string
    buffer: Buffer
    contentType: string
  }): Promise<StoredObject> {
    const safeName = sanitizeFilename(input.filename)
    const key = `${input.category}/${randomUUID()}-${safeName}`
    const absolute = this.getAbsolutePath(key)
    const dir = path.dirname(absolute)
    await mkdir(dir, { recursive: true })

    // Atomic write: temp file then rename so partial uploads never leave broken files.
    const tmp = `${absolute}.${process.pid}.${Date.now()}.tmp`
    await writeFile(tmp, input.buffer, { mode: 0o640 })
    await rename(tmp, absolute)

    try {
      await access(absolute, fsConstants.R_OK)
    } catch (err) {
      logger.error(
        { err, key, absolute, uploadRoot: this.root },
        'KYC/storage write verification failed — file missing after put',
      )
      throw new Error(`Storage write verification failed for ${key}`)
    }

    logger.info(
      { key, absolute, bytes: input.buffer.byteLength, contentType: input.contentType },
      'Stored upload on local disk',
    )

    return {
      key,
      url: this.getPublicUrl(key),
      contentType: input.contentType,
      size: input.buffer.byteLength,
    }
  }

  async delete(key: string): Promise<void> {
    const absolute = this.getAbsolutePath(key)
    try {
      await unlink(absolute)
    } catch {
      // Missing files are non-fatal for delete.
    }
  }

  getAbsolutePath(key: string): string {
    const normalized = key.replace(/\\/g, '/')
    if (normalized.includes('..')) {
      throw new Error('Invalid storage key')
    }
    return path.join(this.root, normalized)
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.getAbsolutePath(key), fsConstants.R_OK)
      return true
    } catch {
      return false
    }
  }

  async openReadStream(key: string): Promise<NodeJS.ReadableStream> {
    const absolute = this.getAbsolutePath(key)
    try {
      await access(absolute, fsConstants.R_OK)
    } catch (err) {
      logger.warn({ err, key, absolute, uploadRoot: this.root }, 'Storage object not found on disk')
      throw new Error(`Storage object not found: ${key} (path: ${absolute})`)
    }
    return createReadStream(absolute)
  }

  getPublicUrl(key: string): string {
    return `${env.API_URL.replace(/\/$/, '')}/uploads/${key.replace(/\\/g, '/')}`
  }

  createSignedDownloadUrl(key: string, expiresInSeconds = 300): string {
    const expires = String(Math.floor(Date.now() / 1000) + expiresInSeconds)
    const signature = this.sign(key, expires)
    const params = new URLSearchParams({ key, expires, signature })
    return `${env.API_URL.replace(/\/$/, '')}/api/v1/kyc/files/download?${params.toString()}`
  }

  verifySignedDownloadUrl(key: string, expires: string, signature: string): boolean {
    const expiresNum = Number(expires)
    if (!Number.isFinite(expiresNum) || expiresNum < Math.floor(Date.now() / 1000)) {
      return false
    }
    const expected = this.sign(key, expires)
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    if (a.length !== b.length) {
      return false
    }
    return timingSafeEqual(a, b)
  }

  private sign(key: string, expires: string): string {
    return createHmac('sha256', env.JWT_ACCESS_SECRET).update(`${key}:${expires}`).digest('hex')
  }
}
