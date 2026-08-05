import { env } from '../../config/env.js'
import { LocalStorageDriver } from './local.storage.js'
import { S3StorageDriver } from './s3.storage.js'
import type { StorageDriver } from './storage.types.js'

function createStorageDriver(): StorageDriver {
  if (env.STORAGE_DRIVER === 's3') {
    return new S3StorageDriver()
  }
  return new LocalStorageDriver()
}

export const storage = createStorageDriver()
export type { StorageCategory, StoredObject, StorageDriver } from './storage.types.js'
