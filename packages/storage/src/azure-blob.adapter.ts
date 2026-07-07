import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

import type { StorageAdapter, UploadOptions } from './storage.interface';

/**
 * Azure Blob Storage implementation of StorageAdapter.
 *
 * Configuration via environment variables:
 *   AZURE_STORAGE_ACCOUNT_NAME — storage account name
 *   AZURE_STORAGE_ACCOUNT_KEY  — storage account key
 *   AZURE_STORAGE_ENDPOINT     — optional custom endpoint (for local Azurite/MinIO)
 */
export class AzureBlobStorageAdapter implements StorageAdapter {
  private readonly client: BlobServiceClient;
  private readonly credential: StorageSharedKeyCredential;

  constructor(accountName: string, accountKey: string, endpoint?: string) {
    this.credential = new StorageSharedKeyCredential(accountName, accountKey);

    if (endpoint) {
      this.client = new BlobServiceClient(endpoint, this.credential);
    } else {
      this.client = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        this.credential,
      );
    }
  }

  async upload(
    container: string,
    key: string,
    buffer: Buffer,
    options: UploadOptions,
  ): Promise<void> {
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

  async download(container: string, key: string): Promise<Buffer> {
    const containerClient = this.client.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(key);
    const downloadResponse = await blobClient.download();

    if (!downloadResponse.readableStreamBody) {
      throw new Error(`Failed to download blob: ${container}/${key}`);
    }

    return await streamToBuffer(downloadResponse.readableStreamBody);
  }

  async delete(container: string, key: string): Promise<void> {
    const containerClient = this.client.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(key);
    await blobClient.deleteIfExists();
  }

  async getSignedUrl(container: string, key: string, ttlSeconds: number): Promise<string> {
    const expiresOn = new Date();
    expiresOn.setSeconds(expiresOn.getSeconds() + ttlSeconds);

    const sasParams = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName: key,
        permissions: BlobSASPermissions.parse('r'), // read-only
        expiresOn,
      },
      this.credential,
    );

    const containerClient = this.client.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(key);
    return `${blobClient.url}?${sasParams.toString()}`;
  }

  async exists(container: string, key: string): Promise<boolean> {
    const containerClient = this.client.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(key);
    return await blobClient.exists();
  }

  async move(container: string, sourceKey: string, destinationKey: string): Promise<void> {
    const containerClient = this.client.getContainerClient(container);
    const sourceClient = containerClient.getBlobClient(sourceKey);
    const destClient = containerClient.getBlobClient(destinationKey);

    // Copy to destination
    const copyResponse = await destClient.beginCopyFromURL(sourceClient.url);
    await copyResponse.pollUntilDone();

    // Delete source after successful copy
    await sourceClient.deleteIfExists();
  }

  async getMetadata(container: string, key: string): Promise<Record<string, string>> {
    const containerClient = this.client.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(key);
    const properties = await blobClient.getProperties();
    return properties.metadata ?? {};
  }
}

async function streamToBuffer(
  readableStream: NodeJS.ReadableStream,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data: Buffer | string) => {
      chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });
    readableStream.on('end', () => resolve(Buffer.concat(chunks)));
    readableStream.on('error', reject);
  });
}
