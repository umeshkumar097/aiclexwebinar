"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureBlobStorageAdapter = void 0;
const storage_blob_1 = require("@azure/storage-blob");
/**
 * Azure Blob Storage implementation of StorageAdapter.
 *
 * Configuration via environment variables:
 *   AZURE_STORAGE_ACCOUNT_NAME — storage account name
 *   AZURE_STORAGE_ACCOUNT_KEY  — storage account key
 *   AZURE_STORAGE_ENDPOINT     — optional custom endpoint (for local Azurite/MinIO)
 */
class AzureBlobStorageAdapter {
    client;
    credential;
    constructor(accountName, accountKey, endpoint) {
        this.credential = new storage_blob_1.StorageSharedKeyCredential(accountName, accountKey);
        if (endpoint) {
            this.client = new storage_blob_1.BlobServiceClient(endpoint, this.credential);
        }
        else {
            this.client = new storage_blob_1.BlobServiceClient(`https://${accountName}.blob.core.windows.net`, this.credential);
        }
    }
    async upload(container, key, buffer, options) {
        const containerClient = this.client.getContainerClient(container);
        const blobClient = containerClient.getBlockBlobClient(key);
        await blobClient.uploadData(buffer, {
            blobHTTPHeaders: {
                blobContentType: options.contentType,
                blobCacheControl: options.cacheControl ?? 'private, max-age=0',
            },
            metadata: options.metadata,
        });
    }
    async download(container, key) {
        const containerClient = this.client.getContainerClient(container);
        const blobClient = containerClient.getBlobClient(key);
        const downloadResponse = await blobClient.download();
        if (!downloadResponse.readableStreamBody) {
            throw new Error(`Failed to download blob: ${container}/${key}`);
        }
        return await streamToBuffer(downloadResponse.readableStreamBody);
    }
    async delete(container, key) {
        const containerClient = this.client.getContainerClient(container);
        const blobClient = containerClient.getBlobClient(key);
        await blobClient.deleteIfExists();
    }
    async getSignedUrl(container, key, ttlSeconds) {
        const expiresOn = new Date();
        expiresOn.setSeconds(expiresOn.getSeconds() + ttlSeconds);
        const sasParams = (0, storage_blob_1.generateBlobSASQueryParameters)({
            containerName: container,
            blobName: key,
            permissions: storage_blob_1.BlobSASPermissions.parse('r'), // read-only
            expiresOn,
        }, this.credential);
        const containerClient = this.client.getContainerClient(container);
        const blobClient = containerClient.getBlobClient(key);
        return `${blobClient.url}?${sasParams.toString()}`;
    }
    async exists(container, key) {
        const containerClient = this.client.getContainerClient(container);
        const blobClient = containerClient.getBlobClient(key);
        return await blobClient.exists();
    }
    async move(container, sourceKey, destinationKey) {
        const containerClient = this.client.getContainerClient(container);
        const sourceClient = containerClient.getBlobClient(sourceKey);
        const destClient = containerClient.getBlobClient(destinationKey);
        // Copy to destination
        const copyResponse = await destClient.beginCopyFromURL(sourceClient.url);
        await copyResponse.pollUntilDone();
        // Delete source after successful copy
        await sourceClient.deleteIfExists();
    }
    async getMetadata(container, key) {
        const containerClient = this.client.getContainerClient(container);
        const blobClient = containerClient.getBlobClient(key);
        const properties = await blobClient.getProperties();
        return properties.metadata ?? {};
    }
}
exports.AzureBlobStorageAdapter = AzureBlobStorageAdapter;
async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
        });
        readableStream.on('end', () => resolve(Buffer.concat(chunks)));
        readableStream.on('error', reject);
    });
}
//# sourceMappingURL=azure-blob.adapter.js.map