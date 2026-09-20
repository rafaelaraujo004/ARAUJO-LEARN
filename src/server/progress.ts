import 'server-only';
import { db } from '@/server/db';
import { LESSON_COMPLETION_THRESHOLD } from '@/lib/constants';
import { clamp } from '@/lib/utils';
import { issueCertificateIfEligible } from '@/server/certificates';

/**
 * Progresso do aluno.
 *
 * Duas camadas:
 *  - `LessonProgress`: verdade por aula (posição do vídeo, percentual, conclusão).
 *  - `Enrollment.progressPercent` / `lastLessonId`: resumo desnormalizado, para
 *    que o dashboard abra com uma consulta só em vez de varrer todas as aulas.
 *
 * O resumo é recalculado a partir da verdade sempre que uma aula muda — nunca
 * incrementado "no escuro", então ele não diverge.
 */

export interface ProgressInput {
  positionSeconds: number;
  durationSeconds?: number;
  /** Marcação explícita do aluno (aula de texto ou botão "marcar como concluída"). */
  completed?: boolean;
}

export interface ProgressResult {
  lessonPercent: number;
  lessonCompleted: boolean;
  coursePercent: number;
  courseCompleted: boolean;
  certificateCode?: string;
}

export async function recordLessonProgress(
  userId: string,
  lessonId: string,
  input: ProgressInput,
): Promise<ProgressResult> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      durationSeconds: true,
      module: { select: { courseId: true } },
    },
  });
  if (!lesson) throw new Error(`Aula inexistente: ${lessonId}`);

  const courseId = lesson.module.courseId;
  const duration = Math.max(input.durationSeconds ?? 0, lesson.durationSeconds, 0);
  const position = Math.max(0, Math.round(input.positionSeconds));

  const previous = await db.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { watchedSeconds: true, percent: true, status: true, startedAt: true },
  });

  // Percentual assistido: o maior valor já alcançado — voltar no vídeo não
  // desfaz o que o aluno já viu.
  const rawPercent = duration > 0 ? (position / duration) * 100 : input.completed ? 100 : 0;
  const percent = Math.round(clamp(Math.max(rawPercent, previous?.percent ?? 0), 0, 100));

  const completed =
    input.completed === true ||
    previous?.status === 'COMPLETED' ||
    (duration > 0 && percent >= LESSON_COMPLETION_THRESHOLD);

  const now = new Date();

  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      status: completed ? 'COMPLETED' : 'IN_PROGRESS',
      lastPositionSeconds: position,
      watchedSeconds: Math.max(position, 0),
      percent,
      startedAt: now,
      completedAt: completed ? now : null,
      lastActivityAt: now,
    },
    update: {
      status: completed ? 'COMPLETED' : 'IN_PROGRESS',
      lastPositionSeconds: position,
      watchedSeconds: Math.max(position, previous?.watchedSeconds ?? 0),
      percent,
      startedAt: previous?.startedAt ?? now,
      ...(completed && previous?.status !== 'COMPLETED' ? { completedAt: now } : {}),
      lastActivityAt: now,
    },
  });

  const summary = await refreshCourseProgress(userId, courseId, lessonId);

  return {
    lessonPercent: percent,
    lessonCompleted: completed,
    coursePercent: summary.percent,
    courseCompleted: summary.completed,
    certificateCode: summary.certificateCode,
  };
}

export interface CourseSummary {
  percent: number;
  completed: boolean;
  totalLessons: number;
  completedLessons: number;
  pendingActivities: number;
  certificateCode?: string;
}

/**
 * Recalcula o resumo do curso a partir das aulas e atividades obrigatórias.
 * Conclusão exige 100% das aulas publicadas E todas as atividades obrigatórias
 * aprovadas (regra registrada em DECISIONS.md).
 */
export async function refreshCourseProgress(
  userId: string,
  courseId: string,
  lastLessonId?: string,
): Promise<CourseSummary> {
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true, status: true, completedAt: true },
  });

  const [lessons, requiredActivities] = await Promise.all([
    db.lesson.findMany({
      where: { isPublished: true, module: { courseId } },
      select: { id: true },
    }),
    db.activity.findMany({
      where: { courseId, isRequired: true, isPublished: true },
      select: { id: true },
    }),
  ]);

  const lessonIds = lessons.map((lesson) => lesson.id);
  const totalLessons = lessonIds.length;

  const completedLessons = totalLessons
    ? await db.lessonProgress.count({
        where: { userId, lessonId: { in: lessonIds }, status: 'COMPLETED' },
      })
    : 0;

  let pendingActivities = 0;
  if (requiredActivities.length > 0) {
    const passed = await db.activityAttempt.findMany({
      where: {
        userId,
        passed: true,
        activityId: { in: requiredActivities.map((activity) => activity.id) },
      },
      select: { activityId: true },
      distinct: ['activityId'],
    });
    pendingActivities = requiredActivities.length - passed.length;
  }

  // As aulas pesam 100% da barra; as atividades funcionam como trava de
  // conclusão. Assim o aluno vê progresso real assistindo, sem barra parada.
  const percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  const completed = totalLessons > 0 && completedLessons === totalLessons && pendingActivities === 0;

  if (!enrollment) {
    return { percent, completed, totalLessons, completedLessons, pendingActivities };
  }

  const now = new Date();
  const alreadyCompleted = Boolean(enrollment.completedAt);

  await db.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPercent: percent,
      lastActivityAt: now,
      ...(lastLessonId ? { lastLessonId } : {}),
      ...(completed && !alreadyCompleted
        ? { status: 'COMPLETED' as const, completedAt: now }
        : {}),
      ...(!completed && enrollment.status === 'COMPLETED'
        ? { status: 'ACTIVE' as const, completedAt: null }
        : {}),
    },
  });

  let certificateCode: string | undefined;
  if (completed) {
    certificateCode = (await issueCertificateIfEligible(userId, courseId)) ?? undefined;
  }

  return {
    percent,
    completed,
    totalLessons,
    completedLessons,
    pendingActivities,
    certificateCode,
  };
}

/**
 * Para onde vai o botão "Continuar aprendendo".
 * Ordem de preferência: aula em andamento → primeira aula não concluída →
 * primeira aula do curso.
 */
export async function nextLessonFor(
  userId: string,
  courseId: string,
): Promise<{ lessonId: string; moduleId: string; resumeAt: number } | null> {
  const modules = await db.module.findMany({
    where: { courseId },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      lessons: {
        where: { isPublished: true },
        orderBy: { position: 'asc' },
        select: { id: true },
      },
    },
  });

  const ordered = modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ lessonId: lesson.id, moduleId: module.id })),
  );
  if (ordered.length === 0) return null;

  const progress = await db.lessonProgress.findMany({
    where: { userId, lessonId: { in: ordered.map((item) => item.lessonId) } },
    select: { lessonId: true, status: true, lastPositionSeconds: true, lastActivityAt: true },
  });
  const byLesson = new Map(progress.map((item) => [item.lessonId, item]));

  const inProgress = progress
    .filter((item) => item.status === 'IN_PROGRESS')
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())[0];

  if (inProgress) {
    const match = ordered.find((item) => item.lessonId === inProgress.lessonId);
    if (match) return { ...match, resumeAt: inProgress.lastPositionSeconds };
  }

  const firstUnfinished = ordered.find(
    (item) => byLesson.get(item.lessonId)?.status !== 'COMPLETED',
  );
  const target = firstUnfinished ?? ordered[0];
  if (!target) return null;

  return {
    ...target,
    resumeAt: byLesson.get(target.lessonId)?.lastPositionSeconds ?? 0,
  };
}

/** Mapa aula → progresso, usado no sumário do curso e na página da aula. */
export async function progressMap(
  userId: string,
  lessonIds: string[],
): Promise<Map<string, { status: string; percent: number; lastPositionSeconds: number }>> {
  if (lessonIds.length === 0) return new Map();
  const rows = await db.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: { lessonId: true, status: true, percent: true, lastPositionSeconds: true },
  });
  return new Map(
    rows.map((row) => [
      row.lessonId,
      {
        status: row.status,
        percent: row.percent,
        lastPositionSeconds: row.lastPositionSeconds,
      },
    ]),
  );
}
