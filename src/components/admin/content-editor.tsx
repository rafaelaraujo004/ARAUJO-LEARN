'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  ListChecks,
  PenLine,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/field';
import { Badge, Card, EmptyState } from '@/components/ui/primitives';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import {
  createLessonAction,
  createModuleAction,
  deleteLessonAction,
  deleteModuleAction,
  reorderLessonsAction,
  reorderModulesAction,
  updateModuleAction,
} from '@/server/actions/courses';
import { emptyFormState, type FormState } from '@/lib/form-state';
import { formatDuration, pluralize } from '@/lib/utils';

export interface LessonNode {
  id: string;
  title: string;
  durationSeconds: number;
  isPublished: boolean;
  isPreview: boolean;
  hasVideo: boolean;
  materialCount: number;
  activityCount: number;
}

export interface ModuleNode {
  id: string;
  title: string;
  description: string | null;
  lessons: LessonNode[];
}

/**
 * Estrutura do curso: módulos e aulas.
 *
 * A reordenação usa botões de subir/descer em vez de arrastar-e-soltar:
 * funciona no celular, funciona por teclado e não depende de precisão do mouse
 * — exatamente o que o tutor precisa para organizar o conteúdo.
 */
export function ContentEditor({
  courseId,
  modules,
}: {
  courseId: string;
  modules: ModuleNode[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  const [moduleDialog, setModuleDialog] = React.useState<ModuleNode | 'new' | null>(null);
  const [deleting, setDeleting] = React.useState<
    { kind: 'module' | 'lesson'; id: string; title: string; count?: number } | null
  >(null);

  async function run(work: () => Promise<FormState>) {
    setBusy(true);
    try {
      const result = await work();
      if (result.message) {
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      }
      router.refresh();
      return result;
    } finally {
      setBusy(false);
    }
  }

  function moveModule(index: number, direction: -1 | 1) {
    const next = [...modules];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    void run(() => reorderModulesAction(courseId, next.map((module) => module.id)));
  }

  function moveLesson(moduleNode: ModuleNode, index: number, direction: -1 | 1) {
    const next = [...moduleNode.lessons];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    void run(() =>
      reorderLessonsAction(courseId, moduleNode.id, next.map((lesson) => lesson.id)),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {modules.length === 0 ? (
        <EmptyState
          icon={<Plus className="size-5" />}
          title="Nenhum módulo ainda"
          description="Um módulo agrupa aulas com um mesmo propósito. Comece criando o primeiro."
          action={<Button onClick={() => setModuleDialog('new')}>Criar primeiro módulo</Button>}
        />
      ) : (
        modules.map((moduleNode, moduleIndex) => (
          <Card key={moduleNode.id}>
            {/* Cabeçalho do módulo */}
            <div className="flex flex-wrap items-start gap-3 border-b border-ink-200 px-5 py-4">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700 tabular-nums">
                {moduleIndex + 1}
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="font-sans text-[0.9375rem] font-semibold text-ink-900">
                  {moduleNode.title}
                </h2>
                {moduleNode.description && (
                  <p className="mt-0.5 text-sm text-ink-500">{moduleNode.description}</p>
                )}
                <p className="mt-1 text-xs text-ink-500">
                  {pluralize(moduleNode.lessons.length, 'aula', 'aulas')}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label={`Mover "${moduleNode.title}" para cima`}
                  disabled={moduleIndex === 0 || busy}
                  onClick={() => moveModule(moduleIndex, -1)}
                >
                  <ChevronUp aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Mover "${moduleNode.title}" para baixo`}
                  disabled={moduleIndex === modules.length - 1 || busy}
                  onClick={() => moveModule(moduleIndex, 1)}
                >
                  <ChevronDown aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Editar módulo "${moduleNode.title}"`}
                  onClick={() => setModuleDialog(moduleNode)}
                >
                  <PenLine aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Excluir módulo "${moduleNode.title}"`}
                  className="text-danger-500 hover:bg-danger-50"
                  onClick={() =>
                    setDeleting({
                      kind: 'module',
                      id: moduleNode.id,
                      title: moduleNode.title,
                      count: moduleNode.lessons.length,
                    })
                  }
                >
                  <Trash2 aria-hidden className="size-4" />
                </IconButton>
              </div>
            </div>

            {/* Aulas */}
            {moduleNode.lessons.length > 0 && (
              <ul className="divide-y divide-ink-100">
                {moduleNode.lessons.map((lesson, lessonIndex) => (
                  <li key={lesson.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/cursos/${courseId}/aulas/${lesson.id}`}
                        className="text-sm font-medium text-ink-900 hover:text-brand-600 hover:underline"
                      >
                        {lessonIndex + 1}. {lesson.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                        {lesson.hasVideo ? (
                          <span className="flex items-center gap-1 text-progress-700">
                            <Video aria-hidden className="size-3.5" />
                            Vídeo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-accent-600">
                            <Video aria-hidden className="size-3.5" />
                            Sem vídeo
                          </span>
                        )}
                        {lesson.durationSeconds > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock aria-hidden className="size-3.5" />
                            {formatDuration(lesson.durationSeconds)}
                          </span>
                        )}
                        {lesson.materialCount > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText aria-hidden className="size-3.5" />
                            {lesson.materialCount}
                          </span>
                        )}
                        {lesson.activityCount > 0 && (
                          <span className="flex items-center gap-1">
                            <ListChecks aria-hidden className="size-3.5" />
                            {lesson.activityCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {lesson.isPreview && <Badge tone="accent">Amostra</Badge>}
                      {!lesson.isPublished && <Badge tone="neutral">Rascunho</Badge>}
                      <IconButton
                        label={`Mover "${lesson.title}" para cima`}
                        disabled={lessonIndex === 0 || busy}
                        onClick={() => moveLesson(moduleNode, lessonIndex, -1)}
                      >
                        <ChevronUp aria-hidden className="size-4" />
                      </IconButton>
                      <IconButton
                        label={`Mover "${lesson.title}" para baixo`}
                        disabled={lessonIndex === moduleNode.lessons.length - 1 || busy}
                        onClick={() => moveLesson(moduleNode, lessonIndex, 1)}
                      >
                        <ChevronDown aria-hidden className="size-4" />
                      </IconButton>
                      <IconButton
                        label={`Excluir aula "${lesson.title}"`}
                        className="text-danger-500 hover:bg-danger-50"
                        onClick={() =>
                          setDeleting({ kind: 'lesson', id: lesson.id, title: lesson.title })
                        }
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <NewLessonForm moduleId={moduleNode.id} onDone={() => router.refresh()} />
          </Card>
        ))
      )}

      {modules.length > 0 && (
        <Button variant="secondary" onClick={() => setModuleDialog('new')} className="self-start">
          <Plus aria-hidden className="size-4" />
          Adicionar módulo
        </Button>
      )}

      <ModuleDialog
        courseId={courseId}
        value={moduleDialog}
        onClose={() => setModuleDialog(null)}
        onSaved={() => {
          setModuleDialog(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        loading={busy}
        title={deleting?.kind === 'module' ? 'Excluir módulo?' : 'Excluir aula?'}
        confirmLabel="Sim, excluir"
        message={
          <>
            <p>
              Você está prestes a excluir <strong>{deleting?.title}</strong>.
            </p>
            {deleting?.kind === 'module' && (deleting.count ?? 0) > 0 && (
              <p className="mt-2 font-medium text-danger-600">
                {pluralize(deleting.count ?? 0, 'aula será excluída', 'aulas serão excluídas')}{' '}
                junto, com vídeos, materiais e o progresso dos alunos.
              </p>
            )}
            <p className="mt-2">Esta ação não pode ser desfeita.</p>
          </>
        }
        onConfirm={() => {
          if (!deleting) return;
          const target = deleting;
          setDeleting(null);
          void run(() =>
            target.kind === 'module'
              ? deleteModuleAction(target.id)
              : deleteLessonAction(target.id),
          );
        }}
      />
    </div>
  );
}

/** Campo rápido no fim de cada módulo — cria a aula sem sair da tela. */
function NewLessonForm({ moduleId, onDone }: { moduleId: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(createLessonAction, emptyFormState);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onDone();
    }
  }, [state, onDone]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-wrap items-start gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3"
    >
      <input type="hidden" name="moduleId" value={moduleId} />
      <div className="min-w-48 flex-1">
        <label htmlFor={`lesson-${moduleId}`} className="sr-only">
          Título da nova aula
        </label>
        <input
          id={`lesson-${moduleId}`}
          name="title"
          required
          placeholder="Título da nova aula"
          className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-400"
        />
        {state.errors?.title && (
          <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
            {state.errors.title}
          </p>
        )}
      </div>
      <Button type="submit" variant="secondary" size="sm" loading={pending} className="h-10">
        <Plus aria-hidden className="size-4" />
        Adicionar aula
      </Button>
    </form>
  );
}

function ModuleDialog({
  courseId,
  value,
  onClose,
  onSaved,
}: {
  courseId: string;
  value: ModuleNode | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = value !== null && value !== 'new';
  const [state, action, pending] = useActionState(
    editing ? updateModuleAction : createModuleAction,
    emptyFormState,
  );

  React.useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  return (
    <Modal
      open={value !== null}
      onClose={onClose}
      title={editing ? 'Editar módulo' : 'Novo módulo'}
      description="Um módulo agrupa aulas que fazem sentido juntas."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="module-form" loading={pending}>
            {editing ? 'Salvar' : 'Criar módulo'}
          </Button>
        </>
      }
    >
      <form id="module-form" action={action} className="flex flex-col gap-4">
        {editing ? (
          <input type="hidden" name="moduleId" value={value.id} />
        ) : (
          <input type="hidden" name="courseId" value={courseId} />
        )}
        <Input
          label="Título do módulo"
          name="title"
          required
          defaultValue={editing ? value.title : ''}
          error={state.errors?.title}
          placeholder="Ex.: Primeiros passos"
        />
        <Textarea
          label="Descrição"
          name="description"
          rows={3}
          defaultValue={editing ? (value.description ?? '') : ''}
          hint="Opcional. Uma linha explicando o que este módulo cobre."
        />
      </form>
    </Modal>
  );
}
