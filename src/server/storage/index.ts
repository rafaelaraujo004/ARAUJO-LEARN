import 'server-only';
import { env, isS3Configured } from '@/lib/env';
import { LocalStorage } from './local';
import { S3Storage } from './s3';
import type { StorageProvider } from './types';

export * from './types';

let instance: StorageProvider | null = null;

/**
 * Seleção do driver de armazenamento.
 *
 * Com credenciais de bucket → S3 (Railway Storage Bucket).
 * Sem credenciais → disco local, para que o desenvolvimento funcione sem
 * configuração. Trocar por Cloudflare Stream no futuro é adicionar um caso aqui.
 */
export function storage(): StorageProvider {
  if (instance) return instance;
  instance = isS3Configured() ? new S3Storage() : new LocalStorage();
  return instance;
}

export function storageDriverName(): string {
  return isS3Configured() ? 's3' : 'local';
}

/** Avisa no boot quando o storage está em modo de desenvolvimento. */
export function warnIfLocalStorage(): void {
  if (env.isProduction && !isS3Configured()) {
    console.warn(
      '[storage] ATENÇÃO: rodando em produção com disco local. ' +
        'Configure S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY.',
    );
  }
}
