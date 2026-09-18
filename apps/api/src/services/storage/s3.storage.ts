import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { Readable } from 'node:stream'
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web'

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

import { env } from '../../config/env.js'
import type { StorageCategory, StorageDriver, StoredObject } from './storage.types.js'

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

/**
 * S3-compatible object storage (AWS S3, MinIO, R2, etc.).
 * Put/delete/stream only — no change to upload category rules or signed-URL crypto.
 */
export class S3StorageDriver implements StorageDriver {
  private client: S3Client
  private bucket: string

  constructor() {
    if (!env.S3_BUCKET) {
      throw new Error('S3_BUCKET is required when STORAGE_DRIVER=s3')
    }
    this.bucket = env.S3_BUCKET
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(env.S3_ENDPOINT),
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    })
  }

  async put(input: {
    category: StorageCategory
    filename: string
    buffer: Buffer
    contentType: string
  }): Promise<StoredObject> {
    const safeName = sanitizeFilename(input.filename)
    const key = `${input.category}/${randomUUID()}-${safeName}`
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    )
    return {
      key,
      url: this.getPublicUrl(key),
      contentType: input.contentType,
      size: input.buffer.byteLength,
    }
  }

  async delete(key: string): Promise<void> {
    const normalized = this.assertKey(key)
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: normalized,
        }),
      )
    } catch {
      // Missing objects are non-fatal for delete.
    }
  }

  getAbsolutePath(_key: string): string {
    throw new Error('Object storage has no local filesystem path; use openReadStream.')
  }

  async exists(key: string): Promise<boolean> {
    const normalized = this.assertKey(key)
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: normalized,
        }),
      )
      return true
    } catch {
      return false
    }
  }

  async openReadStream(key: string): Promise<NodeJS.ReadableStream> {
    const normalized = this.assertKey(key)
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: normalized,
      }),
    )
    const body = result.Body
    if (!body) {
      throw new Error('Empty object body')
    }
    if (body instanceof Readable) {
      return body
    }
    // SDK may return a web ReadableStream in some runtimes.
    const webStream = body as { transformToWebStream?: () => ReadableStream }
    if (typeof webStream.transformToWebStream === 'function') {
      return Readable.fromWeb(webStream.transformToWebStream() as NodeWebReadableStream)
    }
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray()
    return Readable.from(Buffer.from(bytes))
  }

  getPublicUrl(key: string): string {
    const normalized = key.replace(/\\/g, '/')
    if (env.S3_PUBLIC_BASE_URL) {
      return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${normalized}`
    }
    // Fall back to API proxy so private buckets still work via /uploads.
    return `${env.API_URL}/uploads/${normalized}`
  }

  createSignedDownloadUrl(key: string, expiresInSeconds = 300): string {
    const expires = String(Math.floor(Date.now() / 1000) + expiresInSeconds)
    const signature = this.sign(key, expires)
    const params = new URLSearchParams({ key, expires, signature })
    return `${env.API_URL}/api/v1/kyc/files/download?${params.toString()}`
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

  private assertKey(key: string): string {
    const normalized = key.replace(/\\/g, '/')
    if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
      throw new Error('Invalid storage key')
    }
    return normalized
  }

  private sign(key: string, expires: string): string {
    return createHmac('sha256', env.JWT_ACCESS_SECRET).update(`${key}:${expires}`).digest('hex')
  }
}
