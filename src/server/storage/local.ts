import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
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
 * Driver de disco local — só para desenvolvimento sem credenciais de bucket.
 *
 * Reproduz a semântica do S3 de propósito: as URLs também são assinadas e
 * expiram, e o upload também é feito direto pelo navegador (para a rota
 * `/api/storage/local`). Assim o código do cliente é exatamente o mesmo nos
 * dois drivers, e trocar para o Railway não muda uma linha da interface.
 */

const ROOT = path.join(process.cwd(), '.storage');
const TMP = path.join(ROOT, '.uploads');

function assertSafeKey(key: string): void {
  if (!key || key.includes('..') || path.isAbsolute(key)) {
    throw new Error(`Chave de armazenamento inválida: ${key}`);
  }
}

function filePath(key: string): string {
  assertSafeKey(key);
  return path.join(ROOT, key);
}

export function signLocalUrl(params: Record<string, string>, expiresIn: number): string {
  const exp = String(Math.floor(Date.now() / 1000) + expiresIn);
  const search = new URLSearchParams({ ...params, exp });
  search.sort();
  const sig = createHmac('sha256', env.auth.secret).update(search.toString()).digest('hex');
  search.set('sig', sig);
  return `/api/storage/local?${search.toString()}`;
}

export function verifyLocalUrl(search: URLSearchParams): boolean {
  const sig = search.get('sig');
  const exp = Number(search.get('exp'));
  if (!sig || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const copy = new URLSearchParams(search);
  copy.delete('sig');
  copy.sort();
  const expected = createHmac('sha256', env.auth.secret).update(copy.toString()).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export class LocalStorage implements StorageProvider {
  readonly name = 'local';

  async createUpload(input: CreateUploadInput): Promise<CreateUploadResult> {
    const useMultipart = input.multipart ?? input.sizeBytes > MULTIPART_THRESHOLD;

    if (!useMultipart) {
      return {
        strategy: 'single',
        key: input.key,
        url: signLocalUrl({ mode: 'put', key: input.key }, 3600),
      };
    }

    const uploadId = `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    await fs.mkdir(path.join(TMP, uploadId), { recursive: true });

    const partCount = Math.max(1, Math.ceil(input.sizeBytes / UPLOAD_PART_SIZE));
    const partNumbers = Array.from({ length: partCount }, (_, i) => i + 1);

    return {
      strategy: 'multipart',
      key: input.key,
      uploadId,
      partSize: UPLOAD_PART_SIZE,
      parts: await this.signParts(input.key, uploadId, partNumbers),
    };
  }

  async signParts(
    key: string,
    uploadId: string,
    partNumbers: number[],
  ): Promise<UploadPartTarget[]> {
    return partNumbers.map((partNumber) => ({
      partNumber,
      url: signLocalUrl(
        { mode: 'part', key, uploadId, part: String(partNumber) },
        43_200,
      ),
    }));
  }

  async completeUpload(key: string, uploadId: string, parts: CompletedPart[]): Promise<void> {
    const target = filePath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const ordered = parts.slice().sort((a, b) => a.partNumber - b.partNumber);

    const handle = await fs.open(target, 'w');
    try {
      for (const part of ordered) {
        const chunk = await fs.readFile(path.join(TMP, uploadId, String(part.partNumber)));
        await handle.write(chunk);
      }
    } finally {
      await handle.close();
    }
    await fs.rm(path.join(TMP, uploadId), { recursive: true, force: true });
  }

  async abortUpload(_key: string, uploadId: string): Promise<void> {
    await fs.rm(path.join(TMP, uploadId), { recursive: true, force: true });
  }

  async getSignedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
    const params: Record<string, string> = { mode: 'get', key };
    if (options.downloadName) params.download = options.downloadName;
    return signLocalUrl(params, options.expiresIn ?? env.storage.signedUrlTtl);
  }

  async put(key: string, body: Buffer | Uint8Array, _contentType: string): Promise<void> {
    const target = filePath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(filePath(key));
  }

  async head(key: string): Promise<StorageObjectInfo | null> {
    try {
      const stat = await fs.stat(filePath(key));
      return { key, sizeBytes: stat.size, contentType: null };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await fs.rm(filePath(key), { force: true });
  }

  /** Usado pela rota de upload local. */
  async writePart(uploadId: string, partNumber: number, body: Buffer): Promise<void> {
    const dir = path.join(TMP, uploadId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, String(partNumber)), body);
  }

  resolvePath(key: string): string {
    return filePath(key);
  }
}
