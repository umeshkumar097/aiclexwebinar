import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
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
    const accountId   = process.env.R2_ACCOUNT_ID        ?? '';
    const accessKeyId = process.env.R2_ACCESS_KEY_ID     ?? '';
    const secretKey   = process.env.R2_SECRET_ACCESS_KEY ?? '';
    this.bucket       = process.env.R2_BUCKET_NAME       ?? 'zonvowebinar';
    this.publicUrl    = process.env.R2_PUBLIC_URL         ?? '';

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey: secretKey },
    });
  }

  // ── Build public URL for a file key ────────────────────────────────────────
  buildPublicUrl(fileKey: string): string {
    return this.publicUrl
      ? `${this.publicUrl}/${fileKey}`
      : `https://${this.bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileKey}`;
  }

  // ── Generate safe file key ──────────────────────────────────────────────────
  buildFileKey(folder: R2Folder, webinarId: string, filename: string): string {
    const ext = filename.split('.').pop() ?? 'bin';
    const safe = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    return `${folder}/${webinarId}/${safe}`;
  }

  // ── Proxy upload: backend streams file directly to R2 ──────────────────────
  // Use this when browser cannot upload directly (CORS not configured on bucket)
  async uploadBuffer(
    folder: R2Folder,
    webinarId: string,
    filename: string,
    contentType: string,
    buffer: Buffer,
  ): Promise<{ fileKey: string; publicUrl: string }> {
    const fileKey = this.buildFileKey(folder, webinarId, filename);

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
      Body: buffer,
      ContentLength: buffer.length,
    }));

    const filePublicUrl = this.buildPublicUrl(fileKey);
    this.logger.log(`Proxy-uploaded to R2: ${fileKey} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
    return { fileKey, publicUrl: filePublicUrl };
  }

  // ── Generate presigned PUT URL (direct browser upload — needs CORS on bucket)
  async getUploadUrl(
    folder: R2Folder,
    webinarId: string,
    filename: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
    const fileKey = this.buildFileKey(folder, webinarId, filename);

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn });
    const filePublicUrl = this.buildPublicUrl(fileKey);

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

  // ── Health check ───────────────────────────────────────────────────────────
  async checkBucket(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }
}
