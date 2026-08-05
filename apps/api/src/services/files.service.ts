import { forbidden } from '../utils/errors.js'
import { storage } from './storage/index.js'

const ALLOWED_PREFIXES = ['reports/', 'media/']

/**
 * Generic signed-URL resolver for storage categories that aren't gated behind a
 * dedicated domain endpoint (KYC files use their own route/checks). Signature +
 * expiry is what protects these, mirroring `kycService.resolveSignedFile`.
 */
export const filesService = {
  /**
   * `storage.createSignedDownloadUrl` points at the KYC-specific route (its
   * original and only caller). We reuse its key+expiry+signature — the actual
   * cryptographic material — but rewrite the path to this generic endpoint.
   */
  buildDownloadUrl(key: string): string {
    const kycStyleUrl = storage.createSignedDownloadUrl(key)
    const url = new URL(kycStyleUrl)
    return `${url.origin}/api/v1/files/download?${url.searchParams.toString()}`
  },

  resolveSignedFile(key: string, expires: string, signature: string): string {
    if (!storage.verifySignedDownloadUrl(key, expires, signature)) {
      throw forbidden('Invalid or expired download link.')
    }
    if (!ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      throw forbidden('This file cannot be downloaded from this endpoint.')
    }
    return key
  },
}
