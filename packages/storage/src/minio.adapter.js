"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinioStorageAdapter = void 0;
/**
 * MinIO-compatible S3 adapter placeholder.
 * The actual MinIO implementation is embedded in NestJS StorageService via the minio SDK.
 * This class exists only to satisfy the StorageAdapter type contract.
 */
class MinioStorageAdapter {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_endpoint, _accessKey, _secretKey) { }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async upload(_container, _key, _buffer, _options) {
        throw new Error('Use MinioStorageAdapter in NestJS module directly');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async download(_container, _key) {
        throw new Error('Use MinioStorageAdapter in NestJS module directly');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async delete(_container, _key) {
        throw new Error('Use MinioStorageAdapter in NestJS module directly');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getSignedUrl(_container, _key, _ttlSeconds) {
        throw new Error('Use MinioStorageAdapter in NestJS module directly');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async exists(_container, _key) {
        throw new Error('Use MinioStorageAdapter in NestJS module directly');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async move(_container, _sourceKey, _destinationKey) {
        throw new Error('Use MinioStorageAdapter in NestJS module directly');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getMetadata(_container, _key) {
        throw new Error('Use MinioStorageAdapter in NestJS module directly');
    }
}
exports.MinioStorageAdapter = MinioStorageAdapter;
//# sourceMappingURL=minio.adapter.js.map