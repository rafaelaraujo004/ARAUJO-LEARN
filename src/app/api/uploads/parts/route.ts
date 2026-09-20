import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { apiStaff, HttpError } from '@/server/auth/guards';
import { ok, route } from '@/server/api';
import { storage } from '@/server/storage';

/**
 * Reassina partes de um upload multipart.
 * É o que permite retomar um envio interrompido sem recomeçar do zero.
 */
export const POST = route('uploads.parts', async (request: NextRequest) => {
  await apiStaff();
  const body = (await request.json()) as { mediaId?: string; partNumbers?: number[] };

  if (!body.mediaId || !Array.isArray(body.partNumbers) || body.partNumbers.length === 0) {
    throw new HttpError(422, 'Informe a mídia e as partes a reassinar.');
  }

  const media = await db.mediaAsset.findUnique({
    where: { id: body.mediaId },
    select: { storageKey: true, uploadId: true },
  });
  if (!media?.uploadId) throw new HttpError(404, 'Upload não encontrado ou já finalizado.');

  const parts = await storage().signParts(
    media.storageKey,
    media.uploadId,
    body.partNumbers.filter((value) => Number.isInteger(value) && value > 0).slice(0, 1000),
  );

  return ok({ parts });
});
