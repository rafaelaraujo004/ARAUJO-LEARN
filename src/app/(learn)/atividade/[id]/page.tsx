import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, ChevronLeft, ListChecks, Lock } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { Quiz } from '@/components/activity/quiz';
import { requireUser } from '@/server/auth/guards';
import { isStaff } from '@/server/auth/session';
import { courseAccess, mensagemDeBloqueio } from '@/server/access';
import { attemptSummary, getActivityForStudent } from '@/server/activities';
import { pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Atividade' };

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/atividade/${id}`);

  const activity = await getActivityForStudent(id);
  if (!activity) notFound();

  const staff = isStaff(user.role);
  if (!staff && (!activity.isPublished || activity.course.status !== 'PUBLISHED')) notFound();

  const access = await courseAccess(user, activity.courseId);
  const backHref = activity.lesson
    ? `/aula/${activity.course.slug}/${activity.lesson.id}`
    : `/cursos/${activity.course.slug}`;
  const backLabel = activity.lesson ? 'Voltar para a aula' : 'Voltar para o curso';

  if (!access.allowed) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-500">
          <Lock aria-hidden className="size-6" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold">Conteúdo bloqueado</h1>
        <p className="mt-2 text-ink-600">{mensagemDeBloqueio(access.reason)}</p>
        <ButtonLink href={`/cursos/${activity.course.slug}`} className="mt-6">
          Ver o curso
        </ButtonLink>
      </div>
    );
  }

  const summary = await attemptSummary(user.id, activity.id);
  const attemptsLeft =
    activity.maxAttempts === null ? null : Math.max(0, activity.maxAttempts - summary.count);
  const noAttemptsLeft = attemptsLeft === 0 && !staff;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-brand-600"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {backLabel}
      </Link>

      <header className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand" icon={<ListChecks className="size-3" />}>
            {activity.type === 'QUIZ' ? 'Questionário' : 'Exercício'}
          </Badge>
          {activity.isRequired && <Badge tone="accent">Obrigatória para concluir o curso</Badge>}
          {summary.passed && (
            <Badge tone="progress" icon={<Check className="size-3" />}>
              Aprovado
            </Badge>
          )}
        </div>

        <h1 className="mt-3 font-display text-3xl font-semibold text-brand-900">{activity.title}</h1>
        <p className="mt-1 text-sm text-ink-500">
          {activity.course.title}
          {activity.lesson && ` · ${activity.lesson.title}`}
        </p>

        {activity.description && (
          <p className="mt-4 leading-relaxed text-ink-600">{activity.description}</p>
        )}

        <p className="mt-4 text-sm text-ink-600">
          {pluralize(activity.questions.length, 'pergunta', 'perguntas')} · nota mínima{' '}
          {activity.passingScore}%
          {summary.count > 0 && (
            <>
              {' '}
              · melhor resultado <strong>{summary.bestPercent}%</strong>
            </>
          )}
        </p>
      </header>

      <div className="mt-8">
        {activity.questions.length === 0 ? (
          <p className="rounded-card border border-dashed border-ink-300 px-6 py-12 text-center text-sm text-ink-500">
            O tutor ainda não cadastrou perguntas nesta atividade.
          </p>
        ) : noAttemptsLeft ? (
          <div className="rounded-card border border-ink-200 bg-white px-6 py-10 text-center shadow-soft">
            <p className="font-sans text-base font-semibold text-ink-900">
              Você usou todas as tentativas.
            </p>
            <p className="mt-1 text-sm text-ink-600">
              {summary.passed
                ? 'Mas você já foi aprovado nesta atividade.'
                : 'Fale com o tutor se precisar de outra chance.'}
            </p>
            <ButtonLink href={backHref} className="mt-5" variant="secondary">
              {backLabel}
            </ButtonLink>
          </div>
        ) : (
          <Quiz
            activityId={activity.id}
            passingScore={activity.passingScore}
            backHref={backHref}
            backLabel={backLabel}
            attemptsLeft={staff ? null : attemptsLeft}
            questions={activity.questions.map((question) => ({
              id: question.id,
              prompt: question.prompt,
              type: question.type,
              points: question.points,
              options: question.options,
            }))}
          />
        )}
      </div>
    </div>
  );
}
