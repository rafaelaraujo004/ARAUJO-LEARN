import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Layers,
  Lock,
  PlayCircle,
  Target,
  Users,
} from 'lucide-react';
import { Badge, Card, Progress } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';
import { EnrollButton } from '@/components/course/enroll-button';
import { courseTotals, coverUrl, getCourseBySlug } from '@/server/courses';
import { getCurrentUser, isStaff } from '@/server/auth/session';
import { courseAccess } from '@/server/access';
import { db } from '@/server/db';
import { LEVEL_LABEL } from '@/lib/constants';
import { formatDuration, pluralize } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: 'Curso não encontrado' };
  return {
    title: course.title,
    description: course.shortDescription,
    openGraph: { title: course.title, description: course.shortDescription },
  };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [course, user] = await Promise.all([getCourseBySlug(slug), getCurrentUser()]);

  if (!course) notFound();
  // Rascunhos e arquivados só aparecem para o tutor.
  if (course.status !== 'PUBLISHED' && !isStaff(user?.role)) notFound();

  const [access, cover] = await Promise.all([
    courseAccess(user, course.id),
    coverUrl(course.coverKey),
  ]);

  const totals = courseTotals(course);
  const enrolled = access.allowed && access.reason !== 'staff';

  const enrollment = user
    ? await db.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
        select: { progressPercent: true, status: true, lastLessonId: true },
      })
    : null;

  const tutor = course.tutor;
  const tutorHeadline = tutor.tutorProfile?.headline ?? tutor.headline;
  const tutorBio = tutor.tutorProfile?.bio ?? tutor.bio;

  const ctaLabel = enrolled
    ? enrollment && enrollment.progressPercent > 0
      ? 'Continuar de onde parei'
      : 'Começar o curso'
    : user
      ? 'Matricular-me neste curso'
      : 'Criar conta e começar';

  return (
    <>
      {/* ----------------------------------------------------------- Capa --- */}
      <section className="bg-night bg-grid">
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <nav aria-label="Trilha de navegação" className="text-sm text-brand-300">
            <Link href="/cursos" className="hover:text-white hover:underline">
              Cursos
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            <span className="text-brand-200">{course.title}</span>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="muted">{LEVEL_LABEL[course.level]}</Badge>
                {course.certificateEnabled && (
                  <Badge tone="muted" icon={<Award className="size-3" />}>
                    Com certificado
                  </Badge>
                )}
                {course.status !== 'PUBLISHED' && (
                  <Badge tone="accent">
                    {course.status === 'DRAFT' ? 'Rascunho (visível só para você)' : 'Arquivado'}
                  </Badge>
                )}
              </div>

              <h1 className="mt-5 font-display text-4xl leading-tight font-semibold text-white sm:text-5xl">
                {course.title}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-brand-200">
                {course.shortDescription}
              </p>

              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
                <Fact icon={Layers} label="Módulos" value={String(totals.moduleCount)} />
                <Fact icon={BookOpen} label="Aulas" value={String(totals.lessonCount)} />
                <Fact
                  icon={Clock}
                  label="Duração"
                  value={
                    totals.durationSeconds > 0
                      ? formatDuration(totals.durationSeconds)
                      : totals.durationMinutes > 0
                        ? formatDuration(totals.durationMinutes * 60)
                        : 'A definir'
                  }
                />
                {totals.materialCount > 0 && (
                  <Fact icon={FileText} label="Materiais" value={String(totals.materialCount)} />
                )}
                <Fact
                  icon={Users}
                  label="Alunos"
                  value={String(course._count.enrollments)}
                />
              </dl>
            </div>

            {/* Cartão de ação */}
            <aside className="lg:justify-self-end lg:self-start">
              <Card className="w-full overflow-hidden lg:w-80">
                <div className="aspect-[16/9] bg-brand-900">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="bg-night bg-grid grid size-full place-items-center">
                      <PlayCircle aria-hidden className="size-10 text-white/25" />
                    </div>
                  )}
                </div>

                <div className="p-5">
                  {enrolled && enrollment ? (
                    <>
                      <p className="text-sm font-medium text-ink-700">
                        {enrollment.status === 'COMPLETED'
                          ? 'Curso concluído'
                          : 'Seu progresso'}
                      </p>
                      <Progress
                        value={enrollment.progressPercent}
                        showValue
                        className="mt-2"
                        label={`Progresso no curso ${course.title}`}
                      />
                      <div className="mt-5">
                        <EnrollButton slug={course.slug} mode="continue" label={ctaLabel} />
                      </div>
                    </>
                  ) : isStaff(user?.role) ? (
                    <>
                      <p className="text-sm text-ink-600">
                        Você está vendo este curso como tutor.
                      </p>
                      <ButtonLink
                        href={`/admin/cursos/${course.id}`}
                        variant="primary"
                        block
                        className="mt-4"
                      >
                        Editar este curso
                      </ButtonLink>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-ink-600">
                        {course.accessType === 'FREE'
                          ? 'Acesso liberado para alunos cadastrados. Sem custo.'
                          : 'Este curso é liberado individualmente pelo tutor.'}
                      </p>
                      <div className="mt-4">
                        {user ? (
                          <EnrollButton slug={course.slug} mode="enroll" label={ctaLabel} />
                        ) : (
                          <ButtonLink
                            href={`/entrar?next=${encodeURIComponent(`/cursos/${course.slug}`)}`}
                            variant="accent"
                            size="lg"
                            block
                          >
                            {ctaLabel}
                          </ButtonLink>
                        )}
                      </div>
                    </>
                  )}

                  <ul className="mt-5 flex flex-col gap-2 border-t border-ink-200 pt-4 text-sm text-ink-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 aria-hidden className="size-4 text-progress-500" />
                      Acesso pelo celular, tablet ou computador
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 aria-hidden className="size-4 text-progress-500" />
                      Retoma de onde você parou
                    </li>
                    {course.certificateEnabled && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 aria-hidden className="size-4 text-progress-500" />
                        Certificado ao concluir
                      </li>
                    )}
                  </ul>
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Conteúdo --- */}
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="min-w-0">
          {course.description && (
            <section>
              <h2 className="font-display text-2xl font-semibold">Sobre o curso</h2>
              <div className="prose-lesson mt-4 whitespace-pre-line">{course.description}</div>
            </section>
          )}

          {(course.objective || course.audience) && (
            <section className="mt-10 grid gap-5 sm:grid-cols-2">
              {course.objective && (
                <Card className="p-5">
                  <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-ink-900">
                    <Target aria-hidden className="size-4 text-brand-500" />
                    Objetivo
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-600">
                    {course.objective}
                  </p>
                </Card>
              )}
              {course.audience && (
                <Card className="p-5">
                  <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-ink-900">
                    <Users aria-hidden className="size-4 text-brand-500" />
                    Para quem é
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-600">
                    {course.audience}
                  </p>
                </Card>
              )}
            </section>
          )}

          {/* --------------------------------------------------- Programa --- */}
          <section className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold">Conteúdo do curso</h2>
              <p className="text-sm text-ink-500">
                {pluralize(totals.moduleCount, 'módulo', 'módulos')} ·{' '}
                {pluralize(totals.lessonCount, 'aula', 'aulas')}
              </p>
            </div>

            {course.modules.length === 0 ? (
              <p className="mt-4 rounded-card border border-dashed border-ink-300 px-5 py-8 text-center text-sm text-ink-500">
                O conteúdo deste curso ainda está sendo preparado.
              </p>
            ) : (
              <ol className="mt-5 flex flex-col gap-3">
                {course.modules.map((module, index) => {
                  const moduleSeconds = module.lessons.reduce(
                    (total, lesson) => total + lesson.durationSeconds,
                    0,
                  );
                  return (
                    <li key={module.id}>
                      <details
                        open={index === 0}
                        className="group rounded-card border border-ink-200 bg-white shadow-soft"
                      >
                        <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700 tabular-nums">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-sans text-[0.9375rem] font-semibold text-ink-900">
                              {module.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-ink-500">
                              {pluralize(module.lessons.length, 'aula', 'aulas')}
                              {moduleSeconds > 0 && ` · ${formatDuration(moduleSeconds)}`}
                            </span>
                          </span>
                          <ChevronDown
                            aria-hidden
                            className="size-4.5 shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                          />
                        </summary>

                        {module.description && (
                          <p className="px-5 pb-3 text-sm text-ink-600">{module.description}</p>
                        )}

                        <ul className="border-t border-ink-200">
                          {module.lessons.map((lesson) => {
                            const unlocked = enrolled || isStaff(user?.role) || lesson.isPreview;
                            const inner = (
                              <>
                                <span className="shrink-0 text-ink-400">
                                  {unlocked ? (
                                    <PlayCircle aria-hidden className="size-4.5" />
                                  ) : (
                                    <Lock aria-hidden className="size-4" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm text-ink-700">
                                    {lesson.title}
                                  </span>
                                  {lesson.description && (
                                    <span className="mt-0.5 block truncate text-xs text-ink-500">
                                      {lesson.description}
                                    </span>
                                  )}
                                </span>
                                {lesson.isPreview && !enrolled && (
                                  <Badge tone="accent">Amostra</Badge>
                                )}
                                {lesson.durationSeconds > 0 && (
                                  <span className="shrink-0 text-xs text-ink-500 tabular-nums">
                                    {formatDuration(lesson.durationSeconds)}
                                  </span>
                                )}
                              </>
                            );

                            return (
                              <li key={lesson.id} className="border-b border-ink-100 last:border-0">
                                {unlocked ? (
                                  <Link
                                    href={`/aula/${course.slug}/${lesson.id}`}
                                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-brand-50"
                                  >
                                    {inner}
                                  </Link>
                                ) : (
                                  <div className="flex items-center gap-3 px-5 py-3">{inner}</div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        {/* --------------------------------------------------------- Tutor --- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-500 uppercase">
              Seu tutor
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold">{tutor.name}</h2>
            {tutorHeadline && <p className="mt-1 text-sm text-accent-600">{tutorHeadline}</p>}
            {tutorBio && (
              <p className="mt-4 line-clamp-6 text-sm leading-relaxed text-ink-600">{tutorBio}</p>
            )}
            {tutor.tutorProfile?.specialties && tutor.tutorProfile.specialties.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {tutor.tutorProfile.specialties.slice(0, 6).map((item) => (
                  <li key={item}>
                    <Badge tone="brand">{item}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/tutor"
              className="mt-5 inline-block text-sm font-semibold text-brand-600 hover:underline"
            >
              Ver perfil completo →
            </Link>
          </Card>

          {course.materials.length > 0 && (
            <Card className="mt-5 p-6">
              <h2 className="font-sans text-sm font-semibold text-ink-900">Materiais do curso</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {course.materials.map((material) => (
                  <li key={material.id} className="flex items-start gap-2 text-sm text-ink-600">
                    <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" />
                    <span>{material.title}</span>
                  </li>
                ))}
              </ul>
              {!enrolled && (
                <p className="mt-3 text-xs text-ink-500">
                  Disponíveis para download após a matrícula.
                </p>
              )}
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon aria-hidden className="size-4.5 text-accent-300" />
      <div>
        <dt className="text-xs text-brand-300">{label}</dt>
        <dd className="text-sm font-semibold text-white">{value}</dd>
      </div>
    </div>
  );
}
