/**
 * Contrato de armazenamento de mídia.
 *
 * Nenhuma parte do domínio (curso, aula, material, certificado) conhece S3,
 * Railway ou disco local — todos falam com esta interface. Trocar o Railway
 * Storage Bucket por Cloudflare R2/Stream amanhã significa escrever um novo
 * arquivo aqui dentro e mudar uma variável de ambiente.
 */

export interface UploadPartTarget {
  partNumber: number;
  url: string;
}

export interface CompletedPart {
  partNumber: number;
  etag: string;
}

export interface CreateUploadInput {
  key: string;
  contentType: string;
  sizeBytes: number;
  /** Força multipart mesmo abaixo do limite (usado em testes). */
  multipart?: boolean;
}

export type CreateUploadResult =
  | {
      strategy: 'single';
      key: string;
      /** URL para um único PUT direto do navegador. */
      url: string;
      headers?: Record<string, string>;
    }
  | {
      strategy: 'multipart';
      key: string;
      uploadId: string;
      partSize: number;
      parts: UploadPartTarget[];
      headers?: Record<string, string>;
    };

export interface StorageObjectInfo {
  key: string;
  sizeBytes: number;
  contentType: string | null;
}

export interface SignedUrlOptions {
  /** Segundos de validade. */
  expiresIn?: number;
  /** Nome sugerido no download (Content-Disposition: attachment). */
  downloadName?: string;
}

export interface StorageProvider {
  readonly name: string;

  /** Prepara um upload DIRETO do navegador para o bucket. */
  createUpload(input: CreateUploadInput): Promise<CreateUploadResult>;

  /** Gera URLs para partes adicionais (retomada de upload interrompido). */
  signParts(key: string, uploadId: string, partNumbers: number[]): Promise<UploadPartTarget[]>;

  completeUpload(key: string, uploadId: string, parts: CompletedPart[]): Promise<void>;

  abortUpload(key: string, uploadId: string): Promise<void>;

  /** URL temporária de leitura — o bucket permanece privado. */
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;

  /** Envio feito pelo servidor (capas pequenas, PDFs de certificado). */
  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void>;

  get(key: string): Promise<Buffer>;

  head(key: string): Promise<StorageObjectInfo | null>;

  delete(key: string): Promise<void>;
}
