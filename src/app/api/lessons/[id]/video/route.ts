import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { getCurrentUser } from '@/server/auth/session';
import { assertLessonAccess } from '@/server/access';
import { HttpError } from '@/server/auth/guards';
import { ok, route } from '@/server/api';
import { storage } from '@/server/storage';
import { env } from '@/lib/env';

/**
 * URL temporária para assistir ao vídeo de uma aula.
 *
 * O bucket é privado: nenhum vídeo tem endereço público permanente. A cada
 * pedido conferimos a matrícula e devolvemos um link que expira em minutos.
 * Se amanhã os vídeos forem para um provedor de streaming, só esta rota muda.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  'lessons.video',
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const user = await getCurrentUser();

    await assertLessonAccess(user, id);

    const lesson = await db.lesson.findUnique({
      where: { id },
      select: {
        video: { select: { storageKey: true, status: true, mimeType: true, durationSeconds: true } },
      },
    });

    if (!lesson?.video) throw new HttpError(404, 'Esta aula não tem vídeo.');
    if (lesson.video.status !== 'READY') {
      throw new HttpError(409, 'O vídeo ainda está sendo processado.');
    }

    const url = await storage().getSignedUrl(lesson.video.storageKey, {
      expiresIn: env.storage.signedUrlTtl,
    });

    return ok(
      {
        url,
        mimeType: lesson.video.mimeType,
        durationSeconds: lesson.video.durationSeconds,
        expiresIn: env.storage.signedUrlTtl,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  },
);
