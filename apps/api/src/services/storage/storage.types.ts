export type StorageCategory = 'avatars' | 'documents' | 'kyc' | 'deposits' | 'media' | 'reports'

export interface StoredObject {
  key: string
  url: string
  contentType: string
  size: number
}

export interface StorageDriver {
  put(input: {
    category: StorageCategory
    filename: string
    buffer: Buffer
    contentType: string
  }): Promise<StoredObject>
  delete(key: string): Promise<void>
  getPublicUrl(key: string): string
  /** Local disk path when available; object storage drivers throw. Prefer `openReadStream`. */
  getAbsolutePath(key: string): string
  /** True when the object is readable in the active driver. */
  exists(key: string): Promise<boolean>
  openReadStream(key: string): Promise<NodeJS.ReadableStream>
  createSignedDownloadUrl(key: string, expiresInSeconds?: number): string
  verifySignedDownloadUrl(key: string, expires: string, signature: string): boolean
}
