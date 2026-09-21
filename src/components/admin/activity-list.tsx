'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { ListChecks, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/button';
import { Input, Select, Switch, Textarea } from '@/components/ui/field';
import { Alert, Badge, Card, EmptyState } from '@/components/ui/primitives';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { createActivityAction, deleteActivityAction } from '@/server/actions/activities';
import { emptyFormState } from '@/lib/form-state';
import { pluralize } from '@/lib/utils';

export interface ActivityRow {
  id: string;
  title: string;
  type: 'QUIZ' | 'EXERCISE';
  isRequired: boolean;
  isPublished: boolean;
  questionCount: number;
  scopeLabel: string;
}

export interface ScopeModule {
  id: string;
  title: string;
  lessons: Array<{ id: string; title: string }>;
}

/** Codifica onde a atividade aparece: "" = curso, "m:<id>" = módulo, "l:<id>" = aula. */
export function scopeOptions(modules: ScopeModule[]) {
  return [
    { value: '', label: 'Final do curso' },
    ...modules.flatMap((module) => [
      { value: `m:${module.id}`, label: `Módulo: ${module.title}` },
      ...module.lessons.map((lesson) => ({
        value: `l:${lesson.id}`,
        label: `   Aula: ${lesson.title}`,
      })),
    ]),
  ];
}

export function ActivityList({
  courseId,
  activities,
  modules,
  presetLessonId,
}: {
  courseId: string;
  activities: ActivityRow[];
  modules: ScopeModule[];
  presetLessonId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(presetLessonId ? 1 : 0);
  const [deleting, setDeleting] = React.useState<ActivityRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function remove(activity: ActivityRow) {
    setBusy(true);
    try {
      const result = await deleteActivityAction(activity.id);
      if (result.ok) toast.success(result.message ?? 'Atividade excluída.');
      else toast.error(result.message ?? 'Não foi possível excluir.');
      router.refresh();
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setOpen((n) => n + 1)}>
          <Plus aria-hidden className="size-4" />
          Nova atividade
        </Button>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="size-5" />}
          title="Nenhuma atividade ainda"
          description="Atividades confirmam o que o aluno entendeu. Quando são obrigatórias, o curso só é concluído depois de o aluno passar nelas."
          action={<Button onClick={() => setOpen((n) => n + 1)}>Criar primeira atividade</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {activities.map((activity) => (
            <li key={activity.id}>
              <Card className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/cursos/${courseId}/atividades/${activity.id}`}
                      className="font-sans text-[0.9375rem] font-semibold text-ink-900 hover:text-brand-600 hover:underline"
                    >
                      {activity.title}
                    </Link>
                    {activity.isRequired ? (
                      <Badge tone="accent">Obrigatória</Badge>
                    ) : (
                      <Badge tone="neutral">Opcional</Badge>
                    )}
                    {!activity.isPublished && <Badge tone="neutral">Rascunho</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {activity.scopeLabel} ·{' '}
                    {pluralize(activity.questionCount, 'pergunta', 'perguntas')}
                  </p>
                  {activity.questionCount === 0 && (
                    <p className="mt-1 text-xs font-medium text-accent-600">
                      Sem perguntas — os alunos não conseguem responder.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/admin/cursos/${courseId}/atividades/${activity.id}`}
                    className="inline-flex h-9 items-center rounded-lg border border-ink-200 bg-white px-3 text-sm font-medium text-brand-800 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    Editar
                  </Link>
                  <IconButton
                    label={`Excluir atividade "${activity.title}"`}
                    className="text-danger-500 hover:bg-danger-50"
                    onClick={() => setDeleting(activity)}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <CreateDialog
        key={open}
        open={open > 0}
        onClose={() => setOpen(0)}
        courseId={courseId}
        modules={modules}
        presetLessonId={presetLessonId}
        onCreated={(id) => router.push(`/admin/cursos/${courseId}/atividades/${id}`)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        loading={busy}
        title="Excluir atividade?"
        confirmLabel="Sim, excluir"
        message={
          <>
            <p>
              Você vai excluir <strong>{deleting?.title}</strong>, com todas as perguntas e as
              tentativas já feitas pelos alunos.
            </p>
            <p className="mt-2">Esta ação não pode ser desfeita.</p>
          </>
        }
        onConfirm={() => deleting && void remove(deleting)}
      />
    </div>
  );
}

function CreateDialog({
  open,
  onClose,
  courseId,
  modules,
  presetLessonId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  modules: ScopeModule[];
  presetLessonId?: string;
  onCreated: (activityId: string) => void;
}) {
  const [state, action, pending] = useActionState(createActivityAction, emptyFormState);
  const [scope, setScope] = React.useState(presetLessonId ? `l:${presetLessonId}` : '');
  const [required, setRequired] = React.useState(true);

  // A função vem inline do pai e muda a cada render; guardá-la em ref evita
  // navegar mais de uma vez para a mesma atividade recém-criada.
  const onCreatedRef = React.useRef(onCreated);
  React.useEffect(() => {
    onCreatedRef.current = onCreated;
  });
  React.useEffect(() => {
    if (state.ok && state.createdId) onCreatedRef.current(state.createdId);
  }, [state]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova atividade"
      description="Você cadastra as perguntas no próximo passo."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="activity-form" loading={pending}>
            Criar e adicionar perguntas
          </Button>
        </>
      }
    >
      <form id="activity-form" action={action} className="flex flex-col gap-4">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={scope.startsWith('l:') ? scope.slice(2) : ''} />
        <input type="hidden" name="moduleId" value={scope.startsWith('m:') ? scope.slice(2) : ''} />
        <input type="hidden" name="isRequired" value={required ? 'true' : 'false'} />

        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        <Input
          label="Título"
          name="title"
          required
          error={state.errors?.title}
          placeholder="Ex.: Checkpoint do módulo 1"
        />
        <Textarea
          label="Instruções"
          name="description"
          rows={2}
          hint="Opcional. O que o aluno precisa saber antes de responder."
        />
        <Select
          label="Onde aparece"
          name="scope-visual"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          options={scopeOptions(modules)}
          hint="Aula: aparece na própria aula. Módulo: na última aula do módulo. Final do curso: na última aula."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Tipo"
            name="type"
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
            defaultValue={70}
          />
        </div>
        <Switch
          label="Obrigatória para concluir o curso"
          description="O aluno só conclui o curso (e recebe o certificado) depois de passar."
          checked={required}
          onCheckedChange={setRequired}
        />
      </form>
    </Modal>
  );
}
