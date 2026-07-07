import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type R2Folder = 'uploads' | 'recordings' | 'thumbnails';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const accountId    = process.env.R2_ACCOUNT_ID    ?? '';
    const accessKeyId  = process.env.R2_ACCESS_KEY_ID ?? '';
    const secretKey    = process.env.R2_SECRET_ACCESS_KEY ?? '';
    this.bucket        = process.env.R2_BUCKET_NAME   ?? 'zonvo-videos';
    this.publicUrl     = process.env.R2_PUBLIC_URL    ?? ''; // optional CDN URL

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey: secretKey },
    });
  }

  // ── Generate presigned PUT URL (client uploads directly to R2) ─────────────
  async getUploadUrl(
    folder: R2Folder,
    webinarId: string,
    filename: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
    const ext = filename.split('.').pop() ?? 'mp4';
    const safeFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const fileKey = `${folder}/${webinarId}/${safeFilename}`;

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn });

    // Public URL — either CDN or R2 public bucket URL
    const filePublicUrl = this.publicUrl
      ? `${this.publicUrl}/${fileKey}`
      : `https://${this.bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileKey}`;

    this.logger.log(`Presigned upload URL generated: ${fileKey}`);
    return { uploadUrl, fileKey, publicUrl: filePublicUrl };
  }

  // ── Generate presigned GET URL (for private files) ─────────────────────────
  async getDownloadUrl(fileKey: string, expiresIn = 3600): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: fileKey });
    return getSignedUrl(this.client, cmd, { expiresIn });
  }

  // ── Delete a file ──────────────────────────────────────────────────────────
  async deleteFile(fileKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: fileKey }));
    this.logger.log(`Deleted R2 file: ${fileKey}`);
  }

  // ── Check bucket exists (health) ──────────────────────────────────────────
  async checkBucket(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }
}
