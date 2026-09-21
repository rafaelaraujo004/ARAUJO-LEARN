'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { Check, ChevronDown, ChevronUp, PenLine, Plus, Save, Trash2, X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/button';
import { Input, Select, Switch, Textarea } from '@/components/ui/field';
import { Alert, Badge, Card, CardHeader, EmptyState } from '@/components/ui/primitives';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { scopeOptions, type ScopeModule } from '@/components/admin/activity-list';
import {
  deleteQuestionAction,
  reorderQuestionsAction,
  saveQuestionAction,
  updateActivityAction,
} from '@/server/actions/activities';
import { emptyFormState, type FormState } from '@/lib/form-state';
import { cn, pluralize } from '@/lib/utils';

type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'TEXT';

export interface QuestionData {
  id: string;
  prompt: string;
  type: QuestionType;
  explanation: string;
  points: number;
  options: Array<{ text: string; isCorrect: boolean }>;
}

export interface ActivityData {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: 'QUIZ' | 'EXERCISE';
  isRequired: boolean;
  isPublished: boolean;
  passingScore: number;
  maxAttempts: number | null;
  scope: string;
}

const TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'Escolha única',
  MULTIPLE_CHOICE: 'Múltipla escolha',
  TRUE_FALSE: 'Verdadeiro ou falso',
  TEXT: 'Resposta escrita',
};

export function ActivityEditor({
  activity,
  questions,
  modules,
}: {
  activity: ActivityData;
  questions: QuestionData[];
  modules: ScopeModule[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, action, pending] = useActionState(updateActivityAction, emptyFormState);

  const [scope, setScope] = React.useState(activity.scope);
  const [required, setRequired] = React.useState(activity.isRequired);
  const [published, setPublished] = React.useState(activity.isPublished);

  const [dialog, setDialog] = React.useState<{ key: number; question: QuestionData | null } | null>(null);
  const [removing, setRemoving] = React.useState<QuestionData | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (state.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state, toast]);

  async function run(work: () => Promise<FormState>) {
    setBusy(true);
    try {
      const result = await work();
      if (result.message) {
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...questions];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    void run(() => reorderQuestionsAction(activity.id, next.map((question) => question.id)));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------ Perguntas --- */}
      <Card>
        <CardHeader
          title="Perguntas"
          description={
            questions.length === 0
              ? 'Adicione ao menos uma pergunta para os alunos poderem responder.'
              : `${pluralize(questions.length, 'pergunta', 'perguntas')} nesta atividade.`
          }
          action={
            <Button size="sm" onClick={() => setDialog({ key: Date.now(), question: null })}>
              <Plus aria-hidden className="size-4" />
              Nova pergunta
            </Button>
          }
        />

        {questions.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nenhuma pergunta ainda"
              description="Escolha única, múltipla escolha, verdadeiro/falso ou resposta escrita."
              action={
                <Button onClick={() => setDialog({ key: Date.now(), question: null })}>
                  Criar primeira pergunta
                </Button>
              }
            />
          </div>
        ) : (
          <ol className="divide-y divide-ink-100">
            {questions.map((question, index) => (
              <li key={question.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700 tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">{question.prompt}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                    <Badge tone="neutral">{TYPE_LABEL[question.type]}</Badge>
                    <span>{pluralize(question.points, 'ponto', 'pontos')}</span>
                    {question.type !== 'TEXT' && (
                      <span>
                        {question.options.filter((option) => option.isCorrect).length} correta(s) de{' '}
                        {question.options.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton
                    label={`Mover pergunta ${index + 1} para cima`}
                    disabled={index === 0 || busy}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUp aria-hidden className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`Mover pergunta ${index + 1} para baixo`}
                    disabled={index === questions.length - 1 || busy}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown aria-hidden className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`Editar pergunta ${index + 1}`}
                    onClick={() => setDialog({ key: Date.now(), question })}
                  >
                    <PenLine aria-hidden className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`Excluir pergunta ${index + 1}`}
                    className="text-danger-500 hover:bg-danger-50"
                    onClick={() => setRemoving(question)}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* ------------------------------------------------------ Configurações --- */}
      <form action={action} className="flex flex-col gap-6">
        <input type="hidden" name="activityId" value={activity.id} />
        <input type="hidden" name="lessonId" value={scope.startsWith('l:') ? scope.slice(2) : ''} />
        <input type="hidden" name="moduleId" value={scope.startsWith('m:') ? scope.slice(2) : ''} />
        <input type="hidden" name="isRequired" value={required ? 'true' : 'false'} />
        <input type="hidden" name="isPublished" value={published ? 'true' : 'false'} />

        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        <Card>
          <CardHeader title="Configurações" />
          <div className="flex flex-col gap-5 p-5">
            <Input
              label="Título"
              name="title"
              required
              defaultValue={activity.title}
              error={state.errors?.title}
            />
            <Textarea
              label="Instruções"
              name="description"
              rows={3}
              defaultValue={activity.description}
              hint="Aparece acima das perguntas."
            />
            <Select
              label="Onde aparece"
              name="scope-visual"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              options={scopeOptions(modules)}
            />
            <div className="grid gap-5 sm:grid-cols-3">
              <Select
                label="Tipo"
                name="type"
                defaultValue={activity.type}
                options={[
                  { value: 'QUIZ', label: 'Questionário' },
                  { value: 'EXERCISE', label: 'Exercício' },
                ]}
              />
              <Input
                label="Nota mínima (%)"
                name="passingScore"
                type="number"
                min={0}
                max={100}
                defaultValue={activity.passingScore}
              />
              <Input
                label="Máx. de tentativas"
                name="maxAttempts"
                type="number"
                min={1}
                defaultValue={activity.maxAttempts ?? ''}
                hint="Em branco: ilimitadas."
              />
            </div>
            <Switch
              label="Obrigatória para concluir o curso"
              description="O aluno só conclui o curso depois de passar nesta atividade."
              checked={required}
              onCheckedChange={setRequired}
            />
            <Switch
              label="Publicada"
              description="Desligado, a atividade fica invisível para os alunos."
              checked={published}
              onCheckedChange={setPublished}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={pending}>
            <Save aria-hidden className="size-4" />
            Salvar configurações
          </Button>
        </div>
      </form>

      <QuestionDialog
        key={dialog?.key ?? 0}
        activityId={activity.id}
        state={dialog}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        loading={busy}
        title="Excluir pergunta?"
        confirmLabel="Sim, excluir"
        message={
          <>
            <p>
              A pergunta <strong>&ldquo;{removing?.prompt}&rdquo;</strong> e as respostas dos alunos
              a ela serão apagadas.
            </p>
            <p className="mt-2">Esta ação não pode ser desfeita.</p>
          </>
        }
        onConfirm={() => {
          if (!removing) return;
          const target = removing;
          setRemoving(null);
          void run(() => deleteQuestionAction(target.id));
        }}
      />
    </div>
  );
}

/** Cria ou edita uma pergunta e suas alternativas. */
function QuestionDialog({
  activityId,
  state,
  onClose,
  onSaved,
}: {
  activityId: string;
  state: { key: number; question: QuestionData | null } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = state?.question ?? null;

  const [prompt, setPrompt] = React.useState(initial?.prompt ?? '');
  const [type, setType] = React.useState<QuestionType>(initial?.type ?? 'SINGLE_CHOICE');
  const [points, setPoints] = React.useState(initial?.points ?? 1);
  const [explanation, setExplanation] = React.useState(initial?.explanation ?? '');
  const [options, setOptions] = React.useState<Array<{ text: string; isCorrect: boolean }>>(
    initial?.options.length
      ? initial.options
      : [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
        ],
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function changeType(next: QuestionType) {
    setType(next);
    if (next === 'TRUE_FALSE') {
      setOptions([
        { text: 'Verdadeiro', isCorrect: true },
        { text: 'Falso', isCorrect: false },
      ]);
    } else if (next === 'SINGLE_CHOICE') {
      // Ao voltar de múltipla escolha, mantém só a primeira correta.
      let seen = false;
      setOptions((current) =>
        current.map((option) => {
          if (option.isCorrect && !seen) {
            seen = true;
            return option;
          }
          return { ...option, isCorrect: false };
        }),
      );
    }
  }

  function setCorrect(index: number) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        type === 'MULTIPLE_CHOICE'
          ? optionIndex === index
            ? { ...option, isCorrect: !option.isCorrect }
            : option
          : { ...option, isCorrect: optionIndex === index },
      ),
    );
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const result = await saveQuestionAction({
        activityId,
        questionId: initial?.id,
        prompt,
        type,
        explanation,
        points,
        options: type === 'TEXT' ? [] : options,
      });
      if (!result.ok) {
        setError(
          result.message ??
            Object.values(result.errors ?? {})[0] ??
            'Não foi possível salvar a pergunta.',
        );
        return;
      }
      onSaved();
    } finally {
      setPending(false);
    }
  }

  const fixedOptions = type === 'TRUE_FALSE';

  return (
    <Modal
      open={state !== null}
      onClose={onClose}
      title={initial ? 'Editar pergunta' : 'Nova pergunta'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={save} loading={pending}>
            Salvar pergunta
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error && <Alert tone="danger">{error}</Alert>}

        <Textarea
          label="Enunciado"
          required
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Escreva a pergunta"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Tipo de pergunta"
            value={type}
            onChange={(event) => changeType(event.target.value as QuestionType)}
            options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <Input
            label="Pontos"
            type="number"
            min={1}
            max={100}
            value={points}
            disabled={type === 'TEXT'}
            onChange={(event) => setPoints(Math.max(1, Number(event.target.value) || 1))}
            hint={type === 'TEXT' ? 'Resposta escrita não vale nota.' : undefined}
          />
        </div>

        {type !== 'TEXT' && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-700">
              Alternativas{' '}
              <span className="font-normal text-ink-500">
                —{' '}
                {type === 'MULTIPLE_CHOICE'
                  ? 'marque todas as corretas'
                  : 'marque a alternativa correta'}
              </span>
            </legend>
            <ul className="flex flex-col gap-2">
              {options.map((option, index) => (
                <li key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    role={type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                    aria-checked={option.isCorrect}
                    aria-label={`Alternativa ${index + 1} é a correta`}
                    onClick={() => setCorrect(index)}
                    className={cn(
                      'grid size-9 shrink-0 place-items-center border transition-colors',
                      type === 'MULTIPLE_CHOICE' ? 'rounded-lg' : 'rounded-full',
                      option.isCorrect
                        ? 'border-progress-500 bg-progress-500 text-white'
                        : 'border-ink-300 bg-white text-transparent hover:border-progress-500',
                    )}
                  >
                    <Check aria-hidden className="size-4" strokeWidth={3} />
                  </button>
                  <input
                    aria-label={`Texto da alternativa ${index + 1}`}
                    value={option.text}
                    readOnly={fixedOptions}
                    onChange={(event) =>
                      setOptions((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, text: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder={`Alternativa ${index + 1}`}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-3 text-sm placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-400 read-only:bg-ink-50"
                  />
                  {!fixedOptions && (
                    <IconButton
                      label={`Remover alternativa ${index + 1}`}
                      disabled={options.length <= 2}
                      onClick={() =>
                        setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      <X aria-hidden className="size-4" />
                    </IconButton>
                  )}
                </li>
              ))}
            </ul>
            {!fixedOptions && options.length < 8 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setOptions((current) => [...current, { text: '', isCorrect: false }])}
              >
                <Plus aria-hidden className="size-4" />
                Adicionar alternativa
              </Button>
            )}
          </fieldset>
        )}

        <Textarea
          label="Explicação da resposta"
          rows={2}
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          hint="Opcional. O aluno lê depois de enviar — é aqui que ele aprende com o erro."
        />
      </div>
    </Modal>
  );
}
