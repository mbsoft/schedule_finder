import type { StorageProvider } from './interface';
import { LocalStorageProvider } from './local';

let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    if (process.env.GCS_BUCKET_NAME) {
      // Dynamic import to avoid loading GCS deps in local dev
      const { GCSStorageProvider } = require('./gcs');
      storageInstance = new GCSStorageProvider();
    } else {
      storageInstance = new LocalStorageProvider();
    }
  }
  return storageInstance!;
}

export type { StorageProvider };
