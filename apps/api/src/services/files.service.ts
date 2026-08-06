import { forbidden } from '../utils/errors.js'
import { storage } from './storage/index.js'

const ALLOWED_PREFIXES = ['reports/', 'media/', 'deposits/']

/**
 * Generic signed-URL resolver for storage categories that aren't gated behind a
 * dedicated domain endpoint (KYC files use their own route/checks). Signature +
 * expiry is what protects these, mirroring `kycService.resolveSignedFile`.
 */
export const filesService = {
  /**
   * Prefer this over the KYC-specific signed path for non-KYC private objects
   * (deposit proofs live under `deposits/`).
   */
  buildDownloadUrl(key: string, expiresInSeconds = 3600): string {
    const kycStyleUrl = storage.createSignedDownloadUrl(key, expiresInSeconds)
    const url = new URL(kycStyleUrl)
    // Reuse the HMAC material from the storage driver, but serve via the generic files route
    // which allows the `deposits/` prefix (KYC route rejects non-kyc keys).
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
