import type { StorageAdapter, UploadOptions } from './storage.interface';
/**
 * MinIO-compatible S3 adapter placeholder.
 * The actual MinIO implementation is embedded in NestJS StorageService via the minio SDK.
 * This class exists only to satisfy the StorageAdapter type contract.
 */
export declare class MinioStorageAdapter implements StorageAdapter {
    constructor(_endpoint: string, _accessKey: string, _secretKey: string);
    upload(_container: string, _key: string, _buffer: Buffer, _options: UploadOptions): Promise<void>;
    download(_container: string, _key: string): Promise<Buffer>;
    delete(_container: string, _key: string): Promise<void>;
    getSignedUrl(_container: string, _key: string, _ttlSeconds: number): Promise<string>;
    exists(_container: string, _key: string): Promise<boolean>;
    move(_container: string, _sourceKey: string, _destinationKey: string): Promise<void>;
    getMetadata(_container: string, _key: string): Promise<Record<string, string>>;
}
//# sourceMappingURL=minio.adapter.d.ts.map