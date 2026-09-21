'use client';

import * as React from 'react';
import Link from 'next/link';
import { Award, Check, CircleAlert, Loader2, RotateCcw, X } from 'lucide-react';
import { Alert, Badge, Card } from '@/components/ui/primitives';
import { Button, ButtonLink } from '@/components/ui/button';
import { submitAttemptAction } from '@/server/actions/activities';
import type { AttemptFeedback } from '@/server/activities';
import { cn } from '@/lib/utils';

export interface QuizQuestion {
  id: string;
  prompt: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'TEXT';
  points: number;
  options: Array<{ id: string; text: string }>;
}

const TYPE_HINT: Record<QuizQuestion['type'], string> = {
  SINGLE_CHOICE: 'Marque uma alternativa.',
  TRUE_FALSE: 'Marque uma alternativa.',
  MULTIPLE_CHOICE: 'Marque todas as alternativas corretas.',
  TEXT: 'Resposta escrita, não vale nota, mas fica registrada.',
};

/**
 * Formulário da atividade.
 *
 * O gabarito só chega depois do envio, e vem do servidor: nada aqui decide
 * se a resposta está certa.
 */
export function Quiz({
  activityId,
  questions,
  passingScore,
  backHref,
  backLabel,
  attemptsLeft,
}: {
  activityId: string;
  questions: QuizQuestion[];
  passingScore: number;
  backHref: string;
  backLabel: string;
  attemptsLeft: number | null;
}) {
  const [selected, setSelected] = React.useState<Record<string, string[]>>({});
  const [texts, setTexts] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<AttemptFeedback | null>(null);
  const topRef = React.useRef<HTMLDivElement>(null);

  const answered = questions.filter((question) =>
    question.type === 'TEXT'
      ? true
      : (selected[question.id]?.length ?? 0) > 0,
  ).length;
  const complete = answered === questions.length;

  function toggle(question: QuizQuestion, optionId: string) {
    setSelected((current) => {
      const previous = current[question.id] ?? [];
      if (question.type === 'MULTIPLE_CHOICE') {
        return {
          ...current,
          [question.id]: previous.includes(optionId)
            ? previous.filter((id) => id !== optionId)
            : [...previous, optionId],
        };
      }
      return { ...current, [question.id]: [optionId] };
    });
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const result = await submitAttemptAction({
        activityId,
        answers: questions.map((question) => ({
          questionId: question.id,
          selectedOptionIds: selected[question.id] ?? [],
          textAnswer: texts[question.id] ?? '',
        })),
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setFeedback(result.feedback);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      setError('Não foi possível enviar. Verifique sua conexão e tente novamente.');
    } finally {
      setPending(false);
    }
  }

  function retry() {
    setFeedback(null);
    setSelected({});
    setTexts({});
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const remaining =
    feedback && feedback.maxAttempts !== null
      ? Math.max(0, feedback.maxAttempts - feedback.attemptsUsed)
      : attemptsLeft;

  return (
    <div ref={topRef} className="scroll-mt-24">
      {/* ------------------------------------------------------- Resultado --- */}
      {feedback && (
        <Card
          className={cn(
            'mb-6 p-6',
            feedback.passed ? 'border-progress-300 bg-progress-100/60' : 'border-accent-200 bg-accent-50',
          )}
        >
          <div className="flex items-start gap-4">
            <span
              className={cn(
                'grid size-12 shrink-0 place-items-center rounded-full text-white',
                feedback.passed ? 'bg-progress-500' : 'bg-accent-500',
              )}
            >
              {feedback.passed ? (
                <Check aria-hidden className="size-6" strokeWidth={3} />
              ) : (
                <CircleAlert aria-hidden className="size-6" />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-semibold text-brand-900">
                {feedback.passed ? 'Você passou!' : 'Ainda não foi dessa vez.'}
              </h2>
              <p className="mt-1 text-ink-700">
                {feedback.maxScore > 0 ? (
                  <>
                    Você acertou <strong>{feedback.percent}%</strong> ({feedback.score} de{' '}
                    {feedback.maxScore} {feedback.maxScore === 1 ? 'ponto' : 'pontos'}). A nota mínima
                    é {passingScore}%.
                  </>
                ) : (
                  'Suas respostas foram registradas.'
                )}
              </p>
              {feedback.preview && (
                <p className="mt-2 text-sm text-ink-600">
                  Modo de teste do tutor: esta tentativa não foi gravada.
                </p>
              )}
              {feedback.courseCompleted && (
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-progress-700">
                  <Award aria-hidden className="size-4.5" />
                  Curso concluído
                  {feedback.certificateCode && ', seu certificado já está disponível.'}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {feedback.courseCompleted && feedback.certificateCode ? (
              <ButtonLink href="/certificados" variant="accent">
                <Award aria-hidden className="size-4" />
                Ver meu certificado
              </ButtonLink>
            ) : (
              <ButtonLink href={backHref} variant={feedback.passed ? 'primary' : 'secondary'}>
                {backLabel}
              </ButtonLink>
            )}
            {!feedback.passed && (remaining === null || remaining > 0) && (
              <Button variant="primary" onClick={retry}>
                <RotateCcw aria-hidden className="size-4" />
                Tentar de novo
              </Button>
            )}
          </div>
          {!feedback.passed && remaining !== null && remaining === 0 && (
            <p className="mt-3 text-sm text-ink-600">
              Você usou todas as tentativas. Fale com o tutor se precisar de outra chance.
            </p>
          )}
        </Card>
      )}

      {/* ------------------------------------------------------- Perguntas --- */}
      <ol className="flex flex-col gap-5">
        {questions.map((question, index) => {
          const result = feedback?.questions.find((item) => item.questionId === question.id);
          const chosen = selected[question.id] ?? [];

          return (
            <li key={question.id}>
              <Card className="p-5 sm:p-6">
                <fieldset disabled={Boolean(feedback) || pending}>
                  <legend className="w-full">
                    <span className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700 tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-[0.9375rem] leading-relaxed font-semibold text-ink-900">
                        {question.prompt}
                      </span>
                      {result?.isCorrect === true && <Badge tone="progress">Certa</Badge>}
                      {result?.isCorrect === false && <Badge tone="danger">Errada</Badge>}
                    </span>
                    <span className="mt-1 ml-10 block text-xs font-normal text-ink-500">
                      {TYPE_HINT[question.type]}
                    </span>
                  </legend>

                  {question.type === 'TEXT' ? (
                    <div className="mt-4 ml-0 sm:ml-10">
                      <label htmlFor={`t-${question.id}`} className="sr-only">
                        Sua resposta
                      </label>
                      <textarea
                        id={`t-${question.id}`}
                        rows={4}
                        maxLength={5000}
                        value={texts[question.id] ?? ''}
                        onChange={(event) =>
                          setTexts((current) => ({ ...current, [question.id]: event.target.value }))
                        }
                        placeholder="Escreva sua resposta aqui"
                        className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[0.9375rem] leading-relaxed placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-400 disabled:bg-ink-100"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-col gap-2 sm:ml-10">
                      {question.options.map((option) => {
                        const isChosen = chosen.includes(option.id);
                        const isCorrect = result?.correctOptionIds.includes(option.id) ?? false;
                        const wrongPick = Boolean(result) && isChosen && !isCorrect;

                        return (
                          <label
                            key={option.id}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors',
                              !result && 'hover:border-brand-300 hover:bg-brand-50',
                              !result && isChosen && 'border-brand-500 bg-brand-50',
                              !result && !isChosen && 'border-ink-200 bg-white',
                              result && isCorrect && 'border-progress-500 bg-progress-100/70',
                              wrongPick && 'border-danger-500 bg-danger-50',
                              result && !isCorrect && !wrongPick && 'border-ink-200 bg-white opacity-70',
                              (feedback || pending) && 'cursor-default',
                            )}
                          >
                            <input
                              type={question.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                              name={`q-${question.id}`}
                              checked={isChosen}
                              onChange={() => toggle(question, option.id)}
                              className="mt-0.5 size-4 shrink-0 accent-brand-600"
                            />
                            <span className="min-w-0 flex-1 leading-relaxed text-ink-800">
                              {option.text}
                            </span>
                            {result && isCorrect && (
                              <Check aria-label="Alternativa correta" className="mt-0.5 size-4 shrink-0 text-progress-700" />
                            )}
                            {wrongPick && (
                              <X aria-label="Sua resposta, incorreta" className="mt-0.5 size-4 shrink-0 text-danger-600" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </fieldset>

                {result?.explanation && (
                  <div className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-700 sm:ml-10">
                    <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                      Por quê
                    </p>
                    <p className="mt-1">{result.explanation}</p>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>

      {/* ---------------------------------------------------------- Envio --- */}
      {!feedback && (
        <div className="mt-6">
          {error && (
            <Alert tone="danger" className="mb-4">
              {error}
            </Alert>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-500" aria-live="polite">
              {answered} de {questions.length} respondidas
              {attemptsLeft !== null && ` · ${attemptsLeft} ${attemptsLeft === 1 ? 'tentativa restante' : 'tentativas restantes'}`}
            </p>
            <div className="flex gap-2">
              <Link
                href={backHref}
                className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100"
              >
                Voltar
              </Link>
              <Button variant="accent" size="lg" disabled={!complete || pending} onClick={submit}>
                {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
                Enviar respostas
              </Button>
            </div>
          </div>
          {!complete && (
            <p className="mt-2 text-xs text-ink-500 sm:text-right">
              Responda todas as perguntas para enviar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
