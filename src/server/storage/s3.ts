import 'server-only';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presign } from '@aws-sdk/s3-request-presigner';
import { env } from '@/lib/env';
import { MULTIPART_THRESHOLD, UPLOAD_PART_SIZE } from '@/lib/constants';
import type {
  CompletedPart,
  CreateUploadInput,
  CreateUploadResult,
  SignedUrlOptions,
  StorageObjectInfo,
  StorageProvider,
  UploadPartTarget,
} from './types';

/**
 * Driver S3-compatível — atende Railway Storage Bucket, Cloudflare R2, MinIO e AWS.
 * O bucket é privado: todo acesso passa por URL assinada de curta duração.
 */
export class S3Storage implements StorageProvider {
  readonly name = 's3';
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = env.storage.bucket;
    this.client = new S3Client({
      region: env.storage.region || 'auto',
      endpoint: env.storage.endpoint || undefined,
      forcePathStyle: env.storage.forcePathStyle,
      credentials: {
        accessKeyId: env.storage.accessKeyId,
        secretAccessKey: env.storage.secretAccessKey,
      },
    });
  }

  async createUpload(input: CreateUploadInput): Promise<CreateUploadResult> {
    const useMultipart = input.multipart ?? input.sizeBytes > MULTIPART_THRESHOLD;

    if (!useMultipart) {
      const url = await presign(
        this.client,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.key,
          ContentType: input.contentType,
        }),
        { expiresIn: 3600 },
      );
      return { strategy: 'single', key: input.key, url };
    }

    const created = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: input.key,
        ContentType: input.contentType,
      }),
    );
    if (!created.UploadId) throw new Error('S3 não retornou UploadId.');

    const partCount = Math.max(1, Math.ceil(input.sizeBytes / UPLOAD_PART_SIZE));
    const partNumbers = Array.from({ length: partCount }, (_, i) => i + 1);

    return {
      strategy: 'multipart',
      key: input.key,
      uploadId: created.UploadId,
      partSize: UPLOAD_PART_SIZE,
      parts: await this.signParts(input.key, created.UploadId, partNumbers),
    };
  }

  async signParts(
    key: string,
    uploadId: string,
    partNumbers: number[],
  ): Promise<UploadPartTarget[]> {
    // 12h: um upload de vários GB em conexão doméstica pode demorar.
    return Promise.all(
      partNumbers.map(async (partNumber) => ({
        partNumber,
        url: await presign(
          this.client,
          new UploadPartCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
          }),
          { expiresIn: 43_200 },
        ),
      })),
    );
  }

  async completeUpload(key: string, uploadId: string, parts: CompletedPart[]): Promise<void> {
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts
            .slice()
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
        },
      }),
    );
  }

  async abortUpload(key: string, uploadId: string): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId }),
    );
  }

  async getSignedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
    return presign(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: options.downloadName
          ? `attachment; filename="${encodeURIComponent(options.downloadName)}"`
          : undefined,
      }),
      { expiresIn: options.expiresIn ?? env.storage.signedUrlTtl },
    );
  }

  async put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Objeto vazio: ${key}`);
    return Buffer.from(bytes);
  }

  async head(key: string): Promise<StorageObjectInfo | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        key,
        sizeBytes: Number(res.ContentLength ?? 0),
        contentType: res.ContentType ?? null,
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
