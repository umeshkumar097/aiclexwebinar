export interface UploadOptions {
    contentType: string;
    metadata?: Record<string, string>;
    cacheControl?: string;
}
export interface StorageAdapter {
    /**
     * Upload a buffer to the specified key (path) in the given container.
     */
    upload(container: string, key: string, buffer: Buffer, options: UploadOptions): Promise<void>;
    /**
     * Download a blob as a Buffer.
     */
    download(container: string, key: string): Promise<Buffer>;
    /**
     * Delete a blob. Throws if the blob does not exist.
     */
    delete(container: string, key: string): Promise<void>;
    /**
     * Generate a time-limited signed URL for read access.
     * The URL must not expose the storage provider directly to clients.
     */
    getSignedUrl(container: string, key: string, ttlSeconds: number): Promise<string>;
    /**
     * Check if a blob exists.
     */
    exists(container: string, key: string): Promise<boolean>;
    /**
     * Copy a blob from source to destination key within the same container.
     * Deletes the source after successful copy.
     */
    move(container: string, sourceKey: string, destinationKey: string): Promise<void>;
    /**
     * Get metadata for a blob without downloading it.
     */
    getMetadata(container: string, key: string): Promise<Record<string, string>>;
}
//# sourceMappingURL=storage.interface.d.ts.map