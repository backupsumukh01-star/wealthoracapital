import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { env } from '../../config/env.js'
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
    const absolute = path.join(this.root, key)
    await mkdir(path.dirname(absolute), { recursive: true })
    await writeFile(absolute, input.buffer)
    return {
      key,
      url: this.getPublicUrl(key),
      contentType: input.contentType,
      size: input.buffer.byteLength,
    }
  }

  async delete(key: string): Promise<void> {
    const absolute = path.join(this.root, key)
    try {
      await unlink(absolute)
    } catch {
      // Missing files are non-fatal for delete.
    }
  }

  getPublicUrl(key: string): string {
    return `${env.API_URL}/uploads/${key.replace(/\\/g, '/')}`
  }
}
