import Link from 'next/link';
import { Award, BookOpen, CheckCircle2, Clock, PlayCircle, Sparkles } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Card, EmptyState, Progress } from '@/components/ui/primitives';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth/guards';
import { nextLessonFor } from '@/server/progress';
import { coverUrl } from '@/server/courses';
import { ENROLLMENT_STATUS_LABEL } from '@/lib/constants';
import { formatDuration, formatRelative, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meus cursos' };

export default async function MyCoursesPage() {
  const user = await requireUser('/meus-cursos');

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    orderBy: [{ status: 'asc' }, { lastActivityAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      status: true,
      progressPercent: true,
      lastActivityAt: true,
      completedAt: true,
      expiresAt: true,
      lastLesson: { select: { id: true, title: true } },
      certificate: { select: { code: true } },
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          coverKey: true,
          durationMinutes: true,
          isBonus: true,
          certificateEnabled: true,
          modules: {
            select: {
              _count: { select: { lessons: true } },
              lessons: { where: { isPublished: true }, select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (enrollments.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<BookOpen className="size-5" />}
          title="Você ainda não tem cursos"
          description="Assim que sua matrícula for liberada, o curso aparece aqui com todo o seu progresso."
          action={<ButtonLink href="/cursos">Ver cursos disponíveis</ButtonLink>}
        />
      </div>
    );
  }

  // Aulas concluídas por curso, em uma consulta só.
  const lessonIdsByCourse = new Map(
    enrollments.map((item) => [
      item.course.id,
      item.course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
    ]),
  );
  const allLessonIds = [...lessonIdsByCourse.values()].flat();
  const completedLessons = await db.lessonProgress.findMany({
    where: { userId: user.id, status: 'COMPLETED', lessonId: { in: allLessonIds } },
    select: { lessonId: true },
  });
  const completedSet = new Set(completedLessons.map((item) => item.lessonId));

  const cards = await Promise.all(
    enrollments.map(async (item) => ({
      enrollment: item,
      cover: await coverUrl(item.course.coverKey, item.course.slug),
      target:
        item.status === 'ACTIVE' || item.status === 'COMPLETED'
          ? await nextLessonFor(user.id, item.course.id)
          : null,
      lessonCount: lessonIdsByCourse.get(item.course.id)?.length ?? 0,
      doneCount: (lessonIdsByCourse.get(item.course.id) ?? []).filter((id) =>
        completedSet.has(id),
      ).length,
    })),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-brand-900">Meus cursos</h1>
        <p className="mt-1.5 text-ink-600">
          {pluralize(enrollments.length, 'curso', 'cursos')} na sua conta.
        </p>
      </header>

      <ul className="mt-6 flex flex-col gap-5">
        {cards.map(({ enrollment, cover, target, lessonCount, doneCount }) => {
          const course = enrollment.course;
          const blocked = enrollment.status === 'EXPIRED' || enrollment.status === 'REVOKED';

          return (
            <li key={enrollment.id}>
              <Card className="overflow-hidden">
                <div className="grid sm:grid-cols-[16rem_1fr]">
                  <div className="relative aspect-[16/9] bg-brand-900 sm:aspect-auto">
                    {cover ? (
                      <img src={cover} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="bg-night bg-grid grid size-full min-h-40 place-items-center">
                        <PlayCircle aria-hidden className="size-9 text-white/25" />
                      </div>
                    )}
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {enrollment.status === 'COMPLETED' ? (
                        <Badge tone="progress" icon={<CheckCircle2 className="size-3" />}>
                          Concluído
                        </Badge>
                      ) : blocked ? (
                        <Badge tone="danger">{ENROLLMENT_STATUS_LABEL[enrollment.status]}</Badge>
                      ) : (
                        <Badge tone="brand">Em andamento</Badge>
                      )}
                      {course.isBonus && (
                        <Badge tone="accent" icon={<Sparkles className="size-3" />}>
                          Bônus
                        </Badge>
                      )}
                      {enrollment.certificate && (
                        <Badge tone="accent" icon={<Award className="size-3" />}>
                          Certificado emitido
                        </Badge>
                      )}
                    </div>

                    <h2 className="mt-2.5 font-display text-xl font-semibold text-brand-900">
                      <Link href={`/cursos/${course.slug}`} className="hover:underline">
                        {course.title}
                      </Link>
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-600">
                      {course.shortDescription}
                    </p>

                    <div className="mt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-ink-700">
                          {doneCount} de {pluralize(lessonCount, 'aula concluída', 'aulas concluídas')}
                        </span>
                        <span className="text-ink-500">
                          {course.durationMinutes
                            ? formatDuration(course.durationMinutes * 60)
                            : null}
                        </span>
                      </div>
                      <Progress
                        value={enrollment.progressPercent}
                        className="mt-2"
                        showValue
                        label={`Progresso em ${course.title}`}
                      />
                    </div>

                    {enrollment.lastLesson && !blocked && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
                        <Clock aria-hidden className="size-3.5" />
                        Última aula: {enrollment.lastLesson.title}
                        {enrollment.lastActivityAt && ` · ${formatRelative(enrollment.lastActivityAt)}`}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {blocked ? (
                        <ButtonLink href={`/cursos/${course.slug}`} variant="secondary">
                          Ver condições de acesso
                        </ButtonLink>
                      ) : (
                        <>
                          {target && (
                            <ButtonLink
                              href={`/aula/${course.slug}/${target.lessonId}`}
                              variant={enrollment.status === 'COMPLETED' ? 'secondary' : 'accent'}
                            >
                              <PlayCircle aria-hidden className="size-4.5" />
                              {enrollment.status === 'COMPLETED'
                                ? 'Revisar'
                                : enrollment.progressPercent > 0
                                  ? 'Continuar'
                                  : 'Começar'}
                            </ButtonLink>
                          )}
                          {enrollment.certificate && (
                            <ButtonLink
                              href={`/api/certificados/${enrollment.certificate.code}`}
                              variant="secondary"
                              target="_blank"
                            >
                              <Award aria-hidden className="size-4" />
                              Baixar certificado
                            </ButtonLink>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
