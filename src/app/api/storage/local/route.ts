import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { LocalStorage, verifyLocalUrl } from '@/server/storage/local';
import { fail, route } from '@/server/api';

/**
 * Endpoint do driver de armazenamento local (desenvolvimento).
 *
 * Emula o S3: só aceita requisições com assinatura HMAC válida e não expirada,
 * exatamente como uma URL pré-assinada. Assim o código do navegador é idêntico
 * nos dois drivers, e trocar para o Railway não muda nada no cliente.
 *
 * Em produção com bucket configurado, esta rota simplesmente não é usada.
 */

export const dynamic = 'force-dynamic';

const local = new LocalStorage();

function guard(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (!verifyLocalUrl(params)) return null;
  return params;
}

/** Upload de arquivo inteiro ou de uma parte. */
export const PUT = route('storage.local.put', async (request: NextRequest) => {
  const params = guard(request);
  if (!params) return fail(403, 'Assinatura inválida ou expirada.');

  const mode = params.get('mode');
  const key = params.get('key');
  if (!key) return fail(422, 'Chave ausente.');

  const body = Buffer.from(await request.arrayBuffer());

  if (mode === 'part') {
    const uploadId = params.get('uploadId');
    const part = Number(params.get('part'));
    if (!uploadId || !Number.isInteger(part)) return fail(422, 'Parte inválida.');
    await local.writePart(uploadId, part, body);
    // O ETag imita o do S3 para que o cliente use o mesmo fluxo nos dois drivers.
    return new NextResponse(null, {
      status: 200,
      headers: { ETag: `"local-${uploadId}-${part}"` },
    });
  }

  if (mode !== 'put') return fail(422, 'Modo inválido.');

  await local.put(key, body, request.headers.get('content-type') ?? 'application/octet-stream');
  return new NextResponse(null, { status: 200, headers: { ETag: `"local-${key}"` } });
});

/** Leitura com suporte a Range — necessário para o player buscar no vídeo. */
export const GET = route('storage.local.get', async (request: NextRequest) => {
  const params = guard(request);
  if (!params) return fail(403, 'Assinatura inválida ou expirada.');

  const key = params.get('key');
  if (!key || params.get('mode') !== 'get') return fail(422, 'Requisição inválida.');

  let filePath: string;
  let size: number;
  try {
    filePath = local.resolvePath(key);
    size = statSync(filePath).size;
  } catch {
    return fail(404, 'Arquivo não encontrado.');
  }

  const contentType = mimeFromKey(key);
  const download = params.get('download');
  const headers = new Headers({
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
  });
  if (download) {
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(download)}"`);
  }

  const range = request.headers.get('range');
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : size - 1;

    if (Number.isNaN(start) || start >= size) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      });
    }

    const safeEnd = Math.min(end, size - 1);
    headers.set('Content-Range', `bytes ${start}-${safeEnd}/${size}`);
    headers.set('Content-Length', String(safeEnd - start + 1));

    const stream = Readable.toWeb(
      createReadStream(filePath, { start, end: safeEnd }),
    ) as ReadableStream;
    return new NextResponse(stream, { status: 206, headers });
  }

  headers.set('Content-Length', String(size));
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, { status: 200, headers });
});

const MIME: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  zip: 'application/zip',
  csv: 'text/csv',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function mimeFromKey(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase() ?? '';
  return MIME[extension] ?? 'application/octet-stream';
}
