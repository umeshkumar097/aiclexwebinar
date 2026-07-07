import type { StorageAdapter, UploadOptions } from './storage.interface';

/**
 * MinIO-compatible S3 adapter placeholder.
 * The actual MinIO implementation is embedded in NestJS StorageService via the minio SDK.
 * This class exists only to satisfy the StorageAdapter type contract.
 */
export class MinioStorageAdapter implements StorageAdapter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_endpoint: string, _accessKey: string, _secretKey: string) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async upload(_container: string, _key: string, _buffer: Buffer, _options: UploadOptions): Promise<void> {
    throw new Error('Use MinioStorageAdapter in NestJS module directly');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async download(_container: string, _key: string): Promise<Buffer> {
    throw new Error('Use MinioStorageAdapter in NestJS module directly');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_container: string, _key: string): Promise<void> {
    throw new Error('Use MinioStorageAdapter in NestJS module directly');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getSignedUrl(_container: string, _key: string, _ttlSeconds: number): Promise<string> {
    throw new Error('Use MinioStorageAdapter in NestJS module directly');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async exists(_container: string, _key: string): Promise<boolean> {
    throw new Error('Use MinioStorageAdapter in NestJS module directly');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async move(_container: string, _sourceKey: string, _destinationKey: string): Promise<void> {
    throw new Error('Use MinioStorageAdapter in NestJS module directly');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMetadata(_container: string, _key: string): Promise<Record<string, string>> {
    throw new Error('Use MinioStorageAdapter in NestJS module directly');
  }
}
