'use client';

import { UPLOAD_PART_SIZE } from './constants';

/**
 * Upload direto do navegador para o bucket.
 *
 * O arquivo não passa pelo backend: o servidor só assina as URLs. Arquivos
 * grandes vão em partes de 8 MB, com nova tentativa por parte e reassinatura
 * automática quando uma URL expira no meio de um envio longo — é o que permite
 * retomar um vídeo de vários GB sem recomeçar do zero.
 */

export type UploadKind = 'VIDEO' | 'DOCUMENT' | 'IMAGE';

export interface UploadedMedia {
  id: string;
  kind: UploadKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
}

export interface UploadHandle {
  /** 0–100 */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

interface CreateResponse {
  mediaId: string;
  strategy: 'single' | 'multipart';
  key: string;
  url?: string;
  uploadId?: string;
  partSize?: number;
  parts?: Array<{ partNumber: number; url: string }>;
}

class UploadError extends Error {}

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new UploadError((data.error as string) ?? 'Falha na comunicação com o servidor.');
  }
  return data as T;
}

/** PUT com progresso real — `fetch` ainda não reporta progresso de upload. */
function putWithProgress(
  url: string,
  body: Blob,
  options: { contentType?: string; onProgress?: (loaded: number) => void; signal?: AbortSignal },
): Promise<{ etag: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url, true);
    if (options.contentType) request.setRequestHeader('Content-Type', options.contentType);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(event.loaded);
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        const etag = request.getResponseHeader('ETag') ?? request.getResponseHeader('etag') ?? '';
        resolve({ etag: etag.replace(/"/g, '') });
      } else {
        reject(new UploadError(`O armazenamento recusou o envio (${request.status}).`));
      }
    };
    request.onerror = () => reject(new UploadError('Falha de rede durante o envio.'));
    request.onabort = () => reject(new DOMException('Envio cancelado.', 'AbortError'));

    options.signal?.addEventListener('abort', () => request.abort(), { once: true });
    request.send(body);
  });
}

/** Lê a duração (e dimensões) do vídeo no próprio navegador. */
export function readVideoMetadata(
  file: File,
): Promise<{ durationSeconds?: number; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    const finish = (result: { durationSeconds?: number; width?: number; height?: number }) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };

    video.onloadedmetadata = () =>
      finish({
        durationSeconds: Number.isFinite(video.duration) ? Math.round(video.duration) : undefined,
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
      });
    video.onerror = () => finish({});
    // Arquivo corrompido ou codec desconhecido não deve travar o upload.
    setTimeout(() => finish({}), 8000);
    video.src = url;
  });
}

export async function uploadFile(
  file: File,
  kind: UploadKind,
  handle: UploadHandle = {},
): Promise<UploadedMedia> {
  const { onProgress, signal } = handle;

  const created = await postJson<CreateResponse>(
    '/api/uploads',
    {
      kind,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    },
    signal,
  );

  const metadata = kind === 'VIDEO' ? await readVideoMetadata(file) : {};

  try {
    if (created.strategy === 'single') {
      if (!created.url) throw new UploadError('O servidor não devolveu a URL de envio.');
      await putWithProgress(created.url, file, {
        contentType: file.type,
        signal,
        onProgress: (loaded) => onProgress?.(Math.round((loaded / file.size) * 100)),
      });

      const result = await postJson<{ media: UploadedMedia }>(
        '/api/uploads/complete',
        { mediaId: created.mediaId, ...metadata },
        signal,
      );
      onProgress?.(100);
      return result.media;
    }

    // ------------------------------------------------------------ multipart
    const partSize = created.partSize ?? UPLOAD_PART_SIZE;
    const targets = new Map((created.parts ?? []).map((part) => [part.partNumber, part.url]));
    const total = Math.max(1, Math.ceil(file.size / partSize));
    const loadedByPart = new Map<number, number>();
    const completed: Array<{ partNumber: number; etag: string }> = [];

    const report = () => {
      let loaded = 0;
      for (const value of loadedByPart.values()) loaded += value;
      onProgress?.(Math.min(99, Math.round((loaded / file.size) * 100)));
    };

    for (let partNumber = 1; partNumber <= total; partNumber += 1) {
      const start = (partNumber - 1) * partSize;
      const chunk = file.slice(start, Math.min(start + partSize, file.size));

      let attempt = 0;
      for (;;) {
        attempt += 1;
        let url = targets.get(partNumber);
        if (!url) {
          const refreshed = await postJson<{ parts: Array<{ partNumber: number; url: string }> }>(
            '/api/uploads/parts',
            { mediaId: created.mediaId, partNumbers: [partNumber] },
            signal,
          );
          url = refreshed.parts[0]?.url;
          if (url) targets.set(partNumber, url);
        }
        if (!url) throw new UploadError('Não foi possível obter a URL desta parte.');

        try {
          const { etag } = await putWithProgress(url, chunk, {
            signal,
            onProgress: (loaded) => {
              loadedByPart.set(partNumber, loaded);
              report();
            },
          });
          completed.push({ partNumber, etag });
          loadedByPart.set(partNumber, chunk.size);
          report();
          break;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') throw error;
          if (attempt >= 3) throw error;
          // URL pode ter expirado em um envio longo: descarta e pede outra.
          targets.delete(partNumber);
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        }
      }
    }

    const result = await postJson<{ media: UploadedMedia }>(
      '/api/uploads/complete',
      { mediaId: created.mediaId, parts: completed, ...metadata },
      signal,
    );
    onProgress?.(100);
    return result.media;
  } catch (error) {
    // Falha ou cancelamento: limpa o rascunho no bucket e no banco.
    void fetch('/api/uploads/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaId: created.mediaId }),
      keepalive: true,
    }).catch(() => {});
    throw error;
  }
}
