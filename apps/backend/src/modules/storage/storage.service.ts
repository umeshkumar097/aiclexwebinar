import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

import { AzureBlobStorageAdapter } from '@zonvo/storage';
import type { StorageAdapter, UploadOptions } from '@zonvo/storage';
import { STORAGE_CONTAINERS } from '@zonvo/constants';

import type { AppConfig } from '../../config/configuration';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly adapter: StorageAdapter;
  private readonly provider: string;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    this.provider = configService.get('storage.provider', { infer: true });

    if (this.provider === 'azure') {
      const azure = configService.get('storage.azure', { infer: true });
      this.adapter = new AzureBlobStorageAdapter(
        azure.accountName,
        azure.accountKey,
        azure.endpoint || undefined,
      );
    } else {
      // MinIO (local dev) — implemented inline using minio SDK
      const minio = configService.get('storage.minio', { infer: true });
      const rawEndpoint = minio.endpoint.startsWith('http') ? minio.endpoint : `http://${minio.endpoint}`;
      const endpoint = new URL(rawEndpoint);
      const minioClient = new Minio.Client({
        endPoint: endpoint.hostname,
        port: parseInt(endpoint.port || '9000', 10),
        useSSL: minio.useSsl,
        accessKey: minio.accessKey,
        secretKey: minio.secretKey,
      });

      this.adapter = this.createMinioAdapter(minioClient);
    }

    this.logger.log(`Storage provider: ${this.provider}`);
  }

  async upload(
    container: keyof typeof STORAGE_CONTAINERS,
    buffer: Buffer,
    options: UploadOptions & { key?: string },
  ): Promise<string> {
    const { v4: uuidv4 } = await import('uuid');
    const containerName = STORAGE_CONTAINERS[container];
    const key = options.key ?? `${uuidv4()}/${Date.now()}`;

    try {
      await this.adapter.upload(containerName, key, buffer, options);
      return key;
    } catch (error) {
      this.logger.error(`Storage upload failed [${containerName}/${key}]:`, error);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async getSignedUrl(
    container: keyof typeof STORAGE_CONTAINERS,
    key: string,
    ttlSeconds: number,
  ): Promise<string> {
    try {
      return await this.adapter.getSignedUrl(STORAGE_CONTAINERS[container], key, ttlSeconds);
    } catch (error) {
      this.logger.error(`Failed to generate signed URL [${String(container)}/${key}]:`, error);
      throw new InternalServerErrorException('Failed to generate file URL');
    }
  }

  async delete(container: keyof typeof STORAGE_CONTAINERS, key: string): Promise<void> {
    try {
      await this.adapter.delete(STORAGE_CONTAINERS[container], key);
    } catch (error) {
      this.logger.error(`Storage delete failed [${String(container)}/${key}]:`, error);
      throw new InternalServerErrorException('File delete failed');
    }
  }

  async exists(container: keyof typeof STORAGE_CONTAINERS, key: string): Promise<boolean> {
    return this.adapter.exists(STORAGE_CONTAINERS[container], key);
  }

  async move(
    container: keyof typeof STORAGE_CONTAINERS,
    sourceKey: string,
    destinationKey: string,
  ): Promise<void> {
    return this.adapter.move(STORAGE_CONTAINERS[container], sourceKey, destinationKey);
  }

  private createMinioAdapter(minioClient: Minio.Client): StorageAdapter {
    return {
      async upload(container, key, buffer, options): Promise<void> {
        await minioClient.putObject(container, key, buffer, buffer.length, {
          'Content-Type': options.contentType,
          ...options.metadata,
        });
      },

      async download(container, key): Promise<Buffer> {
        const stream = await minioClient.getObject(container, key);
        return new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        });
      },

      async delete(container, key): Promise<void> {
        await minioClient.removeObject(container, key);
      },

      async getSignedUrl(container, key, ttlSeconds): Promise<string> {
        return minioClient.presignedGetObject(container, key, ttlSeconds);
      },

      async exists(container, key): Promise<boolean> {
        try {
          await minioClient.statObject(container, key);
          return true;
        } catch {
          return false;
        }
      },

      async move(container, sourceKey, destinationKey): Promise<void> {
        await minioClient.copyObject(container, destinationKey, `/${container}/${sourceKey}`, new Minio.CopyConditions());
        await minioClient.removeObject(container, sourceKey);
      },

      async getMetadata(container, key): Promise<Record<string, string>> {
        const stat = await minioClient.statObject(container, key);
        return stat.metaData as Record<string, string>;
      },
    };
  }
}
