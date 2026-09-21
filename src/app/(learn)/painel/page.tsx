import Link from 'next/link';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  ListChecks,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Card, CardHeader, EmptyState, Progress, ProgressRing, Stat } from '@/components/ui/primitives';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth/guards';
import { nextLessonFor } from '@/server/progress';
import { coverUrl } from '@/server/courses';
import { formatRelative, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu painel' };

export default async function StudentDashboardPage() {
  const user = await requireUser('/painel');

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
    orderBy: [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      status: true,
      progressPercent: true,
      lastActivityAt: true,
      completedAt: true,
      lastLesson: { select: { id: true, title: true } },
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          coverKey: true,
          certificateEnabled: true,
          isBonus: true,
        },
      },
    },
  });

  const [certificates, pendingActivities, availableCourses] = await Promise.all([
    db.certificate.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { issuedAt: 'desc' },
      select: { code: true, courseTitle: true, issuedAt: true },
    }),
    // Atividades obrigatórias ainda não aprovadas nos cursos do aluno.
    db.activity.findMany({
      where: {
        isRequired: true,
        isPublished: true,
        course: { enrollments: { some: { userId: user.id, status: { in: ['ACTIVE'] } } } },
        attempts: { none: { userId: user.id, passed: true } },
      },
      select: {
        id: true,
        title: true,
        course: { select: { title: true } },
      },
      take: 5,
    }),
    db.course.count({
      where: {
        status: 'PUBLISHED',
        enrollments: { none: { userId: user.id } },
      },
    }),
  ]);

  const inProgress = enrollments.filter((item) => item.status === 'ACTIVE');
  const completed = enrollments.filter((item) => item.status === 'COMPLETED');

  // Curso mais recente: é para ele que o botão "Continuar aprendendo" aponta.
  const current = inProgress[0] ?? null;
  const target = current ? await nextLessonFor(user.id, current.course.id) : null;
  const currentCover = current ? await coverUrl(current.course.coverKey) : null;

  const firstName = user.name.split(' ')[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-brand-900">Olá, {firstName}.</h1>
        <p className="mt-1.5 text-ink-600">
          {current
            ? 'Continue de onde você parou.'
            : enrollments.length > 0
              ? 'Tudo em dia por aqui.'
              : 'Escolha um curso para começar.'}
        </p>
      </header>

      {/* ----------------------------------------------- Continuar aprendendo */}
      {current && target && (
        <Card className="mt-6 overflow-hidden">
          <div className="grid gap-0 sm:grid-cols-[14rem_1fr]">
            <div className="relative hidden aspect-[16/9] bg-brand-900 sm:block">
              {currentCover ? (
                <img src={currentCover} alt="" className="size-full object-cover" />
              ) : (
                <div className="bg-night bg-grid grid size-full place-items-center">
                  <PlayCircle aria-hidden className="size-9 text-white/25" />
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center gap-4 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tracking-[0.14em] text-brand-500 uppercase">
                    Continuar aprendendo
                  </p>
                  <h2 className="mt-1.5 font-display text-xl font-semibold text-brand-900">
                    {current.course.title}
                  </h2>
                  {current.lastLesson && (
                    <p className="mt-1 text-sm text-ink-600">
                      Última aula: {current.lastLesson.title}
                    </p>
                  )}
                  {current.lastActivityAt && (
                    <p className="mt-0.5 text-xs text-ink-400">
                      <Clock aria-hidden className="mr-1 inline size-3" />
                      {formatRelative(current.lastActivityAt)}
                    </p>
                  )}
                </div>
                <ProgressRing value={current.progressPercent} />
              </div>

              <div className="flex flex-wrap gap-2">
                <ButtonLink href={`/aula/${current.course.slug}/${target.lessonId}`} variant="accent">
                  <PlayCircle aria-hidden className="size-4.5" />
                  {current.progressPercent > 0 ? 'Continuar' : 'Começar agora'}
                </ButtonLink>
                <ButtonLink href={`/cursos/${current.course.slug}`} variant="secondary">
                  Ver o curso
                </ButtonLink>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------ Números */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Em andamento"
          value={inProgress.length}
          hint={pluralize(inProgress.length, 'curso', 'cursos')}
          icon={<BookOpen className="size-5" />}
        />
        <Stat
          label="Concluídos"
          value={completed.length}
          hint={pluralize(completed.length, 'curso', 'cursos')}
          icon={<GraduationCap className="size-5" />}
          tone="progress"
        />
        <Stat
          label="Certificados"
          value={certificates.length}
          hint="disponíveis para download"
          icon={<Award className="size-5" />}
          tone="accent"
        />
        <Stat
          label="Atividades"
          value={pendingActivities.length}
          hint={pendingActivities.length === 0 ? 'nada pendente' : 'aguardando você'}
          icon={<ListChecks className="size-5" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        {/* ------------------------------------------------------- Cursos --- */}
        <div>
          <Card>
            <CardHeader
              title="Seus cursos"
              action={
                <Link
                  href="/meus-cursos"
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  Ver todos
                </Link>
              }
            />
            {enrollments.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<BookOpen className="size-5" />}
                  title="Você ainda não tem cursos"
                  description="Escolha um curso no catálogo para começar sua formação."
                  action={<ButtonLink href="/cursos">Ver cursos disponíveis</ButtonLink>}
                />
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {enrollments.slice(0, 5).map((item) => (
                  <li key={item.id} className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/cursos/${item.course.slug}`}
                            className="text-sm font-semibold text-ink-900 hover:text-brand-600 hover:underline"
                          >
                            {item.course.title}
                          </Link>
                          {item.course.isBonus && (
                            <Badge tone="accent" icon={<Sparkles className="size-3" />}>
                              Bônus
                            </Badge>
                          )}
                          {item.status === 'COMPLETED' && (
                            <Badge tone="progress" icon={<CheckCircle2 className="size-3" />}>
                              Concluído
                            </Badge>
                          )}
                        </div>
                        <Progress
                          value={item.progressPercent}
                          size="sm"
                          showValue
                          className="mt-2"
                          label={`Progresso em ${item.course.title}`}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {availableCourses > 0 && (
            <Card className="mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="font-sans text-sm font-semibold text-ink-900">
                  {pluralize(availableCourses, 'outro curso disponível', 'outros cursos disponíveis')}
                </p>
                <p className="mt-0.5 text-sm text-ink-500">
                  Amplie sua formação, e garanta o curso bônus ao ter os dois cursos.
                </p>
              </div>
              <ButtonLink href="/cursos" variant="secondary">
                Ver catálogo
              </ButtonLink>
            </Card>
          )}
        </div>

        {/* ------------------------------------------------------ Coluna --- */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Atividades pendentes" />
            {pendingActivities.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-ink-500">
                Nenhuma atividade pendente.
              </p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {pendingActivities.map((activity) => (
                  <li key={activity.id}>
                    <Link
                      href={`/atividade/${activity.id}`}
                      className="block px-5 py-3.5 transition-colors hover:bg-brand-50"
                    >
                      <p className="text-sm font-medium text-ink-900">{activity.title}</p>
                      <p className="text-xs text-ink-500">{activity.course.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Certificados"
              action={
                <Link
                  href="/certificados"
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  Ver todos
                </Link>
              }
            />
            {certificates.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-ink-500">
                Conclua um curso para receber seu primeiro certificado.
              </p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {certificates.slice(0, 3).map((certificate) => (
                  <li key={certificate.code} className="px-5 py-3.5">
                    <p className="text-sm font-medium text-ink-900">{certificate.courseTitle}</p>
                    <p className="text-xs text-ink-500">
                      {certificate.code} · {formatRelative(certificate.issuedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
