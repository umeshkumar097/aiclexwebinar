import type { StorageAdapter, UploadOptions } from './storage.interface';
/**
 * Azure Blob Storage implementation of StorageAdapter.
 *
 * Configuration via environment variables:
 *   AZURE_STORAGE_ACCOUNT_NAME — storage account name
 *   AZURE_STORAGE_ACCOUNT_KEY  — storage account key
 *   AZURE_STORAGE_ENDPOINT     — optional custom endpoint (for local Azurite/MinIO)
 */
export declare class AzureBlobStorageAdapter implements StorageAdapter {
    private readonly client;
    private readonly credential;
    constructor(accountName: string, accountKey: string, endpoint?: string);
    upload(container: string, key: string, buffer: Buffer, options: UploadOptions): Promise<void>;
    download(container: string, key: string): Promise<Buffer>;
    delete(container: string, key: string): Promise<void>;
    getSignedUrl(container: string, key: string, ttlSeconds: number): Promise<string>;
    exists(container: string, key: string): Promise<boolean>;
    move(container: string, sourceKey: string, destinationKey: string): Promise<void>;
    getMetadata(container: string, key: string): Promise<Record<string, string>>;
}
//# sourceMappingURL=azure-blob.adapter.d.ts.map