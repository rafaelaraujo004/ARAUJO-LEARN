import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { apiStaff, HttpError } from '@/server/auth/guards';
import { ok, route } from '@/server/api';
import { storage } from '@/server/storage';
import { completeUploadSchema } from '@/lib/validation';
import { MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '@/lib/constants';

/**
 * Confirma o upload: fecha o multipart (se houver), confere o objeto no bucket
 * e marca a mídia como READY. Só depois disso a aula pode usar o vídeo.
 */
export const POST = route('uploads.complete', async (request: NextRequest) => {
  const user = await apiStaff();
  const payload = completeUploadSchema.parse(await request.json());

  const media = await db.mediaAsset.findUnique({
    where: { id: payload.mediaId },
    select: { id: true, storageKey: true, uploadId: true, status: true, kind: true },
  });
  if (!media) throw new HttpError(404, 'Upload não encontrado.');

  const store = storage();

  if (media.uploadId) {
    if (!payload.parts?.length) {
      throw new HttpError(422, 'Faltam as partes do upload para finalizar.');
    }
    await store.completeUpload(media.storageKey, media.uploadId, payload.parts);
  }

  const info = await store.head(media.storageKey);
  if (!info) {
    await db.mediaAsset.update({ where: { id: media.id }, data: { status: 'FAILED' } });
    throw new HttpError(422, 'O arquivo não chegou ao armazenamento. Tente enviar novamente.');
  }

  // A URL assinada não limita o tamanho enviado: confere o objeto real.
  const limit =
    media.kind === 'VIDEO'
      ? MAX_VIDEO_BYTES
      : media.kind === 'IMAGE'
        ? MAX_IMAGE_BYTES
        : MAX_DOCUMENT_BYTES;
  if (info.sizeBytes > limit) {
    await store.delete(media.storageKey).catch(() => {});
    await db.mediaAsset.update({ where: { id: media.id }, data: { status: 'FAILED' } });
    throw new HttpError(422, 'O arquivo enviado ultrapassa o limite permitido para este tipo.');
  }

  const updated = await db.mediaAsset.update({
    where: { id: media.id },
    data: {
      status: 'READY',
      uploadId: null,
      sizeBytes: BigInt(info.sizeBytes),
      createdById: user.id,
      ...(payload.durationSeconds ? { durationSeconds: Math.round(payload.durationSeconds) } : {}),
      ...(payload.width ? { width: payload.width } : {}),
      ...(payload.height ? { height: payload.height } : {}),
    },
    select: {
      id: true,
      kind: true,
      originalName: true,
      mimeType: true,
      durationSeconds: true,
      status: true,
    },
  });

  return ok({
    media: { ...updated, sizeBytes: info.sizeBytes },
  });
});
