import { Storage } from '@google-cloud/storage';
import type { StorageProvider } from './interface';

export class GCSStorageProvider implements StorageProvider {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.storage = new Storage();
    this.bucketName = process.env.GCS_BUCKET_NAME!;
  }

  async read<T>(path: string): Promise<T | null> {
    try {
      const file = this.storage.bucket(this.bucketName).file(path);
      const [exists] = await file.exists();
      if (!exists) return null;
      const [content] = await file.download();
      return JSON.parse(content.toString()) as T;
    } catch {
      return null;
    }
  }

  async write<T>(path: string, data: T): Promise<void> {
    const file = this.storage.bucket(this.bucketName).file(path);
    await file.save(JSON.stringify(data, null, 2), {
      contentType: 'application/json',
    });
  }

  async delete(path: string): Promise<void> {
    const file = this.storage.bucket(this.bucketName).file(path);
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
  }

  async exists(path: string): Promise<boolean> {
    const file = this.storage.bucket(this.bucketName).file(path);
    const [exists] = await file.exists();
    return exists;
  }
}
