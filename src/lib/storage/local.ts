import fs from 'fs/promises';
import path from 'path';
import type { StorageProvider } from './interface';

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath = process.env.LOCAL_STORAGE_PATH || '.data';
  }

  private resolvePath(filePath: string): string {
    return path.join(this.basePath, filePath);
  }

  async read<T>(filePath: string): Promise<T | null> {
    try {
      const fullPath = this.resolvePath(filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  async write<T>(filePath: string, data: T): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(this.resolvePath(filePath));
    } catch {
      // ignore if not exists
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(filePath));
      return true;
    } catch {
      return false;
    }
  }
}
