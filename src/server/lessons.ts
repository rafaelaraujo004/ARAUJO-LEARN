import 'server-only';
import { db } from '@/server/db';
import { progressMap } from '@/server/progress';

/**
 * Tudo o que a tela da aula precisa, em poucas consultas.
 * O sumário do curso inteiro vem junto porque ele fica visível ao lado da aula
 * — buscar aula por aula seria N+1 na tela mais usada da plataforma.
 */

export interface OutlineLesson {
  id: string;
  title: string;
  durationSeconds: number;
  isPreview: boolean;
  hasVideo: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  percent: number;
}

export interface OutlineModule {
  id: string;
  title: string;
  lessons: OutlineLesson[];
}

export async function courseOutline(
  courseId: string,
  userId: string | null,
): Promise<OutlineModule[]> {
  const modules = await db.module.findMany({
    where: { courseId },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      title: true,
      lessons: {
        where: { isPublished: true },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          durationSeconds: true,
          isPreview: true,
          videoId: true,
        },
      },
    },
  });

  const lessonIds = modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  const progress = userId ? await progressMap(userId, lessonIds) : new Map();

  return modules.map((module) => ({
    id: module.id,
    title: module.title,
    lessons: module.lessons.map((lesson) => {
      const item = progress.get(lesson.id);
      return {
        id: lesson.id,
        title: lesson.title,
        durationSeconds: lesson.durationSeconds,
        isPreview: lesson.isPreview,
        hasVideo: Boolean(lesson.videoId),
        status: (item?.status ?? 'NOT_STARTED') as OutlineLesson['status'],
        percent: item?.percent ?? 0,
      };
    }),
  }));
}

/** Aula anterior e próxima, atravessando a fronteira entre módulos. */
export function neighbours(
  modules: OutlineModule[],
  lessonId: string,
): { previous: OutlineLesson | null; next: OutlineLesson | null; index: number; total: number } {
  const flat = modules.flatMap((module) => module.lessons);
  const index = flat.findIndex((lesson) => lesson.id === lessonId);
  return {
    previous: index > 0 ? (flat[index - 1] ?? null) : null,
    next: index >= 0 && index < flat.length - 1 ? (flat[index + 1] ?? null) : null,
    index,
    total: flat.length,
  };
}

export async function getLessonForViewing(lessonId: string) {
  return db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      description: true,
      content: true,
      notes: true,
      durationSeconds: true,
      isPreview: true,
      isPublished: true,
      videoId: true,
      module: {
        select: {
          id: true,
          title: true,
          course: {
            select: {
              id: true,
              slug: true,
              title: true,
              certificateEnabled: true,
            },
          },
        },
      },
      materials: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          url: true,
          media: { select: { originalName: true, sizeBytes: true, mimeType: true } },
        },
      },
      activities: {
        where: { isPublished: true },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          isRequired: true,
          passingScore: true,
          _count: { select: { questions: true } },
        },
      },
    },
  });
}
