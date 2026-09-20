'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Download,
  ExternalLink,
  FileText,
  Info,
  ListChecks,
  ListTree,
  Loader2,
} from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { Badge, Card } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { VideoPlayer } from '@/components/player/video-player';
import { Markdown } from '@/components/lesson/markdown';
import { CourseOutline, OutlineDrawer } from '@/components/lesson/outline';
import { cn, formatBytes, formatDuration, pluralize } from '@/lib/utils';
import type { OutlineLesson, OutlineModule } from '@/server/lessons';

export interface LessonViewData {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  notes: string | null;
  durationSeconds: number;
  hasVideo: boolean;
  materials: Array<{
    id: string;
    title: string;
    description: string | null;
    type: 'FILE' | 'LINK';
    url: string | null;
    fileName: string | null;
    sizeBytes: number | null;
  }>;
  activities: Array<{
    id: string;
    title: string;
    description: string | null;
    isRequired: boolean;
    questionCount: number;
    passed: boolean;
  }>;
}

/**
 * Tela da aula.
 *
 * O aluno sempre enxerga: onde está (sumário), o que falta (barra de
 * progresso), e qual é o próximo passo (botão de próxima aula).
 */
export function LessonView({
  lesson,
  course,
  modules,
  resumeAt,
  completed,
  progressPercent,
  previous,
  next,
  position,
  total,
  isPreviewAccess,
}: {
  lesson: LessonViewData;
  course: { slug: string; title: string; moduleTitle: string };
  modules: OutlineModule[];
  resumeAt: number;
  completed: boolean;
  progressPercent: number;
  previous: OutlineLesson | null;
  next: OutlineLesson | null;
  position: number;
  total: number;
  isPreviewAccess: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [percent, setPercent] = React.useState(progressPercent);
  const [isCompleted, setIsCompleted] = React.useState(completed);
  const [marking, setMarking] = React.useState(false);

  async function markComplete() {
    setMarking(true);
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          positionSeconds: lesson.durationSeconds,
          durationSeconds: lesson.durationSeconds,
          completed: true,
        }),
      });
      const result = (await response.json()) as {
        coursePercent?: number;
        courseCompleted?: boolean;
        certificateCode?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? 'Não foi possível registrar.');

      setIsCompleted(true);
      if (typeof result.coursePercent === 'number') setPercent(result.coursePercent);
      toast.success(
        result.courseCompleted ? 'Curso concluído!' : 'Aula marcada como concluída.',
        result.certificateCode ? 'Seu certificado já está disponível.' : undefined,
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível registrar.');
    } finally {
      setMarking(false);
    }
  }

  const nextHref = next ? `/aula/${course.slug}/${next.id}` : null;

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      {/* ------------------------------------------------------------ Topo */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-brand-950">
        <div className="flex h-16 items-center gap-3 px-3 sm:px-5">
          <Link
            href={`/cursos/${course.slug}`}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft aria-hidden className="size-4" />
            <span className="hidden sm:inline">Curso</span>
          </Link>

          <div className="hidden lg:block">
            <Link href="/" aria-label="ARAÚJO LEARN">
              <Logo variant="light" />
            </Link>
          </div>

          <div className="min-w-0 flex-1 text-center lg:text-left lg:pl-4">
            <p className="truncate text-sm font-medium text-white">{course.title}</p>
            <p className="truncate text-xs text-brand-300">
              Aula {position} de {total} · {course.moduleTitle}
            </p>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <div className="h-1.5 w-28 overflow-hidden rounded-pill bg-white/15">
              <div
                className="h-full rounded-pill bg-progress-500 transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums text-brand-200">{percent}%</span>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-brand-200 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Abrir conteúdo do curso"
          >
            <ListTree aria-hidden className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* ------------------------------------------------------ Conteúdo */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
            {isPreviewAccess && (
              <Card className="mb-5 flex items-start gap-3 border-accent-200 bg-accent-50 p-4">
                <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-600" />
                <div>
                  <p className="text-sm font-semibold text-accent-700">
                    Você está assistindo a uma aula de amostra.
                  </p>
                  <p className="mt-0.5 text-sm text-accent-700/90">
                    Para acessar o curso completo,{' '}
                    <Link href={`/cursos/${course.slug}`} className="font-semibold underline">
                      veja as condições de matrícula
                    </Link>
                    .
                  </p>
                </div>
              </Card>
            )}

            {lesson.hasVideo ? (
              <VideoPlayer
                lessonId={lesson.id}
                title={lesson.title}
                resumeAt={resumeAt}
                initialCompleted={isCompleted}
                nextLessonHref={nextHref}
                onProgress={(result) => {
                  setPercent(result.coursePercent);
                  if (result.lessonCompleted) setIsCompleted(true);
                }}
              />
            ) : null}

            <div className="mt-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-display text-2xl font-semibold text-brand-900 sm:text-3xl">
                    {lesson.title}
                  </h1>
                  <p className="mt-1 text-sm text-ink-500">
                    {course.moduleTitle}
                    {lesson.durationSeconds > 0 && ` · ${formatDuration(lesson.durationSeconds)}`}
                  </p>
                </div>
                {isCompleted && (
                  <Badge tone="progress" icon={<Check className="size-3" />}>
                    Concluída
                  </Badge>
                )}
              </div>

              {lesson.description && (
                <p className="mt-3 leading-relaxed text-ink-600">{lesson.description}</p>
              )}
            </div>

            {lesson.content && (
              <article className="prose-lesson mt-8">
                <Markdown content={lesson.content} />
              </article>
            )}

            {lesson.notes && (
              <Card className="mt-8 border-brand-200 bg-brand-50 p-5">
                <h2 className="flex items-center gap-2 font-sans text-sm font-semibold text-brand-800">
                  <Info aria-hidden className="size-4" />
                  Observações do tutor
                </h2>
                <div className="prose-lesson mt-2 text-[0.9375rem] text-brand-900/90">
                  <Markdown content={lesson.notes} />
                </div>
              </Card>
            )}

            {/* ------------------------------------------------- Materiais */}
            {lesson.materials.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-semibold">Materiais desta aula</h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {lesson.materials.map((material) => (
                    <li key={material.id}>
                      <a
                        href={`/api/materials/${material.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-full items-start gap-3 rounded-card border border-ink-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                          {material.type === 'LINK' ? (
                            <ExternalLink aria-hidden className="size-5" />
                          ) : (
                            <FileText aria-hidden className="size-5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-ink-900">
                            {material.title}
                          </span>
                          {material.description && (
                            <span className="mt-0.5 block text-xs text-ink-500">
                              {material.description}
                            </span>
                          )}
                          <span className="mt-1 block text-xs text-ink-400">
                            {material.type === 'LINK'
                              ? 'Link externo'
                              : [material.fileName, material.sizeBytes ? formatBytes(material.sizeBytes) : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                          </span>
                        </span>
                        <Download aria-hidden className="mt-1 size-4 shrink-0 text-ink-400" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ------------------------------------------------ Atividades */}
            {lesson.activities.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-semibold">Atividades</h2>
                <ul className="mt-3 flex flex-col gap-3">
                  {lesson.activities.map((activity) => (
                    <li key={activity.id}>
                      <Link
                        href={`/atividade/${activity.id}`}
                        className="flex items-center gap-3 rounded-card border border-ink-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
                      >
                        <span
                          className={cn(
                            'grid size-10 shrink-0 place-items-center rounded-lg',
                            activity.passed
                              ? 'bg-progress-100 text-progress-700'
                              : 'bg-accent-50 text-accent-600',
                          )}
                        >
                          {activity.passed ? (
                            <Check aria-hidden className="size-5" />
                          ) : (
                            <ListChecks aria-hidden className="size-5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-ink-900">
                            {activity.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {pluralize(activity.questionCount, 'pergunta', 'perguntas')}
                            {activity.isRequired
                              ? ' · obrigatória para concluir o curso'
                              : ' · opcional'}
                          </span>
                        </span>
                        {activity.passed ? (
                          <Badge tone="progress">Aprovado</Badge>
                        ) : (
                          <span className="text-sm font-semibold text-brand-600">Fazer →</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ------------------------------------------------ Navegação */}
            <div className="mt-10 flex flex-col gap-3 border-t border-ink-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              {previous ? (
                <Link
                  href={`/aula/${course.slug}/${previous.id}`}
                  className="group flex min-w-0 items-center gap-2 text-sm text-ink-600 transition-colors hover:text-brand-600"
                >
                  <ArrowLeft aria-hidden className="size-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-xs text-ink-400">Aula anterior</span>
                    <span className="block truncate font-medium">{previous.title}</span>
                  </span>
                </Link>
              ) : (
                <span />
              )}

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                {!isCompleted && !lesson.hasVideo && (
                  <button
                    type="button"
                    onClick={markComplete}
                    disabled={marking}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-progress-300 bg-progress-100 px-5 text-sm font-semibold text-progress-700 transition-colors hover:bg-progress-300/40 disabled:opacity-60"
                  >
                    {marking ? (
                      <Loader2 aria-hidden className="size-4 animate-spin" />
                    ) : (
                      <Check aria-hidden className="size-4" />
                    )}
                    Marcar como concluída
                  </button>
                )}

                {next ? (
                  <Link
                    href={`/aula/${course.slug}/${next.id}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-700"
                  >
                    Próxima aula
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                ) : (
                  <Link
                    href={`/cursos/${course.slug}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-700"
                  >
                    Voltar ao curso
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* -------------------------------------------------------- Sumário */}
        <aside className="hidden w-80 shrink-0 border-l border-white/10 bg-brand-950 lg:block">
          <div className="sticky top-16 h-[calc(100dvh-4rem)]">
            <CourseOutline
              courseSlug={course.slug}
              modules={modules}
              currentLessonId={lesson.id}
              progressPercent={percent}
            />
          </div>
        </aside>
      </div>

      <OutlineDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        courseSlug={course.slug}
        modules={modules}
        currentLessonId={lesson.id}
        progressPercent={percent}
      />
    </div>
  );
}
