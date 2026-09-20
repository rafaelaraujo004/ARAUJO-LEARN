import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { apiStaff } from '@/server/auth/guards';
import { ok, route } from '@/server/api';
import { storage, storageDriverName } from '@/server/storage';
import { keyForKind } from '@/server/storage/keys';
import { createUploadSchema } from '@/lib/validation';

/**
 * Prepara um upload DIRETO do navegador para o bucket.
 *
 * O arquivo nunca passa pelo backend: devolvemos URLs pré-assinadas (uma só
 * para arquivos pequenos, várias partes para vídeos grandes). O registro em
 * `MediaAsset` nasce como PENDING e só vira READY quando o cliente confirma.
 */
export const POST = route('uploads.create', async (request: NextRequest) => {
  await apiStaff();

  const payload = createUploadSchema.parse(await request.json());
  const key = keyForKind(payload.kind, payload.fileName);

  const media = await db.mediaAsset.create({
    data: {
      kind: payload.kind,
      provider: storageDriverName(),
      storageKey: key,
      originalName: payload.fileName.slice(0, 255),
      mimeType: payload.contentType,
      sizeBytes: BigInt(payload.sizeBytes),
      status: 'PENDING',
    },
    select: { id: true },
  });

  const upload = await storage().createUpload({
    key,
    contentType: payload.contentType,
    sizeBytes: payload.sizeBytes,
  });

  if (upload.strategy === 'multipart') {
    await db.mediaAsset.update({
      where: { id: media.id },
      data: { uploadId: upload.uploadId },
    });
  }

  return ok({ mediaId: media.id, ...upload });
});
