export interface StorageProvider {
  read<T>(path: string): Promise<T | null>;
  write<T>(path: string, data: T): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
