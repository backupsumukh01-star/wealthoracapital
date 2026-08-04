export type StorageCategory = 'avatars' | 'documents' | 'kyc'

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
  getAbsolutePath(key: string): string
  createSignedDownloadUrl(key: string, expiresInSeconds?: number): string
  verifySignedDownloadUrl(key: string, expires: string, signature: string): boolean
}
