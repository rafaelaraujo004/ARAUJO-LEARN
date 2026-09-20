import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { LessonView } from '@/components/lesson/lesson-view';
import { db } from '@/server/db';
import { getCurrentUser, isStaff } from '@/server/auth/session';
import { lessonAccess, mensagemDeBloqueio } from '@/server/access';
import { courseOutline, getLessonForViewing, neighbours } from '@/server/lessons';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { title: true },
  });
  return { title: lesson?.title ?? 'Aula', robots: { index: false, follow: false } };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonId: string }>;
}) {
  const { courseSlug, lessonId } = await params;
  const user = await getCurrentUser();

  const lesson = await getLessonForViewing(lessonId);
  if (!lesson || lesson.module.course.slug !== courseSlug) notFound();

  const access = await lessonAccess(user, lessonId);

  if (!access.allowed) {
    // Sem conta: manda entrar e volta para cá depois.
    if (!user) redirect(`/entrar?next=${encodeURIComponent(`/aula/${courseSlug}/${lessonId}`)}`);

    return (
      <main className="grid min-h-dvh place-items-center bg-ink-50 px-4">
        <div className="max-w-md text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-500">
            <Lock aria-hidden className="size-6" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-brand-900">
            Conteúdo bloqueado
          </h1>
          <p className="mt-2 text-ink-600">{mensagemDeBloqueio(access.reason)}</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <ButtonLink href={`/cursos/${courseSlug}`}>Ver o curso</ButtonLink>
            <ButtonLink href="/painel" variant="secondary">
              Meu painel
            </ButtonLink>
          </div>
        </div>
      </main>
    );
  }

  const course = lesson.module.course;
  const staff = isStaff(user?.role);

  const [modules, progress, enrollment, attempts] = await Promise.all([
    courseOutline(course.id, user?.id ?? null),
    user
      ? db.lessonProgress.findUnique({
          where: { userId_lessonId: { userId: user.id, lessonId } },
          select: { lastPositionSeconds: true, status: true },
        })
      : null,
    user
      ? db.enrollment.findUnique({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
          select: { progressPercent: true },
        })
      : null,
    user && lesson.activities.length > 0
      ? db.activityAttempt.findMany({
          where: {
            userId: user.id,
            passed: true,
            activityId: { in: lesson.activities.map((activity) => activity.id) },
          },
          select: { activityId: true },
          distinct: ['activityId'],
        })
      : [],
  ]);

  const passedActivities = new Set(attempts.map((item) => item.activityId));
  const { previous, next, index, total } = neighbours(modules, lessonId);

  // Registra a aula como "última vista" para o botão Continuar aprendendo.
  if (user && !staff) {
    await db.enrollment
      .updateMany({
        where: { userId: user.id, courseId: course.id },
        data: { lastLessonId: lessonId, lastActivityAt: new Date() },
      })
      .catch(() => {});
  }

  return (
    <LessonView
      lesson={{
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        content: lesson.content,
        notes: lesson.notes,
        durationSeconds: lesson.durationSeconds,
        hasVideo: Boolean(lesson.videoId),
        materials: lesson.materials.map((material) => ({
          id: material.id,
          title: material.title,
          description: material.description,
          type: material.type,
          url: material.url,
          fileName: material.media?.originalName ?? null,
          sizeBytes: material.media ? Number(material.media.sizeBytes) : null,
        })),
        activities: lesson.activities.map((activity) => ({
          id: activity.id,
          title: activity.title,
          description: activity.description,
          isRequired: activity.isRequired,
          questionCount: activity._count.questions,
          passed: passedActivities.has(activity.id),
        })),
      }}
      course={{
        slug: course.slug,
        title: course.title,
        moduleTitle: lesson.module.title,
      }}
      modules={modules}
      resumeAt={progress?.lastPositionSeconds ?? 0}
      completed={progress?.status === 'COMPLETED'}
      progressPercent={enrollment?.progressPercent ?? 0}
      previous={previous}
      next={next}
      position={index + 1}
      total={total}
      isPreviewAccess={access.reason === 'preview'}
    />
  );
}
