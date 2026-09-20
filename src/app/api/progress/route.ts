import type { NextRequest } from 'next/server';
import { apiUser } from '@/server/auth/guards';
import { assertLessonAccess } from '@/server/access';
import { ok, route } from '@/server/api';
import { recordLessonProgress } from '@/server/progress';
import { progressSchema } from '@/lib/validation';

/**
 * Registro de progresso do player.
 *
 * Chamada a cada poucos segundos e também ao sair da página (sendBeacon).
 * Barata de propósito: uma escrita na aula e um recálculo do resumo do curso.
 */
export const dynamic = 'force-dynamic';

export const POST = route('progress.record', async (request: NextRequest) => {
  const user = await apiUser();

  // `sendBeacon` manda text/plain; aceitamos os dois formatos.
  const raw = await request.text();
  const payload = progressSchema.parse(JSON.parse(raw));

  await assertLessonAccess(user, payload.lessonId);

  const result = await recordLessonProgress(user.id, payload.lessonId, {
    positionSeconds: payload.positionSeconds,
    durationSeconds: payload.durationSeconds,
    completed: payload.completed,
  });

  return ok(result, { headers: { 'Cache-Control': 'no-store' } });
});
