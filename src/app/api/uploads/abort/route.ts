import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { apiStaff } from '@/server/auth/guards';
import { ok, route } from '@/server/api';
import { storage } from '@/server/storage';

/** Cancela um upload em andamento e limpa as partes já enviadas. */
export const POST = route('uploads.abort', async (request: NextRequest) => {
  await apiStaff();
  const { mediaId } = (await request.json()) as { mediaId?: string };
  if (!mediaId) return ok({ aborted: false });

  const media = await db.mediaAsset.findUnique({
    where: { id: mediaId },
    select: { id: true, storageKey: true, uploadId: true, status: true },
  });
  if (!media) return ok({ aborted: false });

  if (media.uploadId) {
    await storage().abortUpload(media.storageKey, media.uploadId).catch(() => {});
  }
  // Mídia que nunca ficou pronta não deve poluir a biblioteca.
  if (media.status === 'PENDING') {
    await db.mediaAsset.delete({ where: { id: media.id } }).catch(() => {});
  }

  return ok({ aborted: true });
});
