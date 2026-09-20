'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { Link2, Paperclip, Plus, Save, Trash2 } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/button';
import { Input, Switch, Textarea } from '@/components/ui/field';
import { Alert, Card, CardHeader, EmptyState } from '@/components/ui/primitives';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { FileUpload } from '@/components/admin/file-upload';
import { setLessonVideoAction, updateLessonAction } from '@/server/actions/courses';
import { createMaterialAction, deleteMaterialAction } from '@/server/actions/materials';
import { emptyFormState, type FormState } from '@/lib/form-state';
import { formatBytes, formatDuration } from '@/lib/utils';

export interface LessonEditorData {
  id: string;
  title: string;
  description: string;
  content: string;
  notes: string;
  durationSeconds: number;
  isPreview: boolean;
  isPublished: boolean;
  video: {
    id: string;
    originalName: string;
    sizeBytes: number;
    durationSeconds: number | null;
  } | null;
  materials: Array<{
    id: string;
    title: string;
    type: 'FILE' | 'LINK';
    url: string | null;
    fileName: string | null;
  }>;
}

export function LessonEditor({ lesson }: { lesson: LessonEditorData }) {
  const router = useRouter();
  const toast = useToast();
  const [state, action, pending] = useActionState(updateLessonAction, emptyFormState);

  const [isPreview, setIsPreview] = React.useState(lesson.isPreview);
  const [isPublished, setIsPublished] = React.useState(lesson.isPublished);
  const [busy, setBusy] = React.useState(false);
  const [materialOpen, setMaterialOpen] = React.useState(0);
  const [removingMaterial, setRemovingMaterial] = React.useState<{ id: string; title: string } | null>(
    null,
  );

  React.useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    if (!state.ok && state.message) toast.error(state.message);
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

  return (
    <div className="flex flex-col gap-6">
      {/* ----------------------------------------------------------- Vídeo */}
      <Card>
        <CardHeader
          title="Vídeo da aula"
          description="Enviado direto para o armazenamento — o arquivo não passa pelo servidor da aplicação."
        />
        <div className="p-5">
          <FileUpload
            kind="VIDEO"
            hint="MP4, WEBM, MOV ou MKV. Arquivos grandes são enviados em partes, com retomada automática."
            current={
              lesson.video
                ? {
                    name: lesson.video.originalName,
                    sizeBytes: lesson.video.sizeBytes,
                    durationSeconds: lesson.video.durationSeconds,
                  }
                : null
            }
            onUploaded={(media) => void run(() => setLessonVideoAction(lesson.id, media.id))}
            onRemove={
              lesson.video ? () => void run(() => setLessonVideoAction(lesson.id, null)) : undefined
            }
          />
          {lesson.video?.durationSeconds ? (
            <p className="mt-3 text-xs text-ink-500">
              A duração da aula ({formatDuration(lesson.video.durationSeconds)}) foi lida do vídeo.
            </p>
          ) : null}
        </div>
      </Card>

      {/* --------------------------------------------------------- Detalhes */}
      <form action={action} className="flex flex-col gap-6">
        <input type="hidden" name="lessonId" value={lesson.id} />
        <input type="hidden" name="isPreview" value={isPreview ? 'true' : 'false'} />
        <input type="hidden" name="isPublished" value={isPublished ? 'true' : 'false'} />

        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        <Card>
          <CardHeader title="Conteúdo da aula" />
          <div className="flex flex-col gap-5 p-5">
            <Input
              label="Título"
              name="title"
              required
              defaultValue={lesson.title}
              error={state.errors?.title}
            />
            <Textarea
              label="Resumo"
              name="description"
              rows={2}
              defaultValue={lesson.description}
              hint="Uma linha que aparece na lista de aulas."
            />
            <Textarea
              label="Texto da aula"
              name="content"
              rows={12}
              defaultValue={lesson.content}
              hint="Aceita Markdown: ## título, **negrito**, listas, > citação e `código`. Uma aula pode existir só com texto, sem vídeo."
              className="[&_textarea]:font-mono [&_textarea]:text-sm"
            />
            <Textarea
              label="Observações do tutor"
              name="notes"
              rows={3}
              defaultValue={lesson.notes}
              hint="Aparece ao aluno em um bloco destacado. Bom para avisos e dicas."
            />
            <Input
              label="Duração (segundos)"
              name="durationSeconds"
              type="number"
              min={0}
              defaultValue={lesson.durationSeconds}
              hint={
                lesson.video
                  ? 'Preenchido automaticamente pelo vídeo. Ajuste se precisar.'
                  : 'Para aulas sem vídeo, informe o tempo estimado de leitura.'
              }
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Visibilidade" />
          <div className="flex flex-col gap-5 p-5">
            <Switch
              label="Aula publicada"
              description="Desligado, a aula fica invisível para os alunos e não entra no cálculo de progresso."
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Switch
              label="Aula de amostra"
              description="Ligado, qualquer visitante pode assistir a esta aula sem se matricular."
              checked={isPreview}
              onCheckedChange={setIsPreview}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={pending} size="lg">
            <Save aria-hidden className="size-4" />
            Salvar aula
          </Button>
        </div>
      </form>

      {/* ------------------------------------------------------- Materiais */}
      <Card>
        <CardHeader
          title="Materiais da aula"
          description="Arquivos para download e links de apoio."
          action={
            <Button variant="secondary" size="sm" onClick={() => setMaterialOpen((n) => n + 1)}>
              <Plus aria-hidden className="size-4" />
              Adicionar
            </Button>
          }
        />
        {lesson.materials.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Paperclip className="size-5" />}
              title="Nenhum material nesta aula"
              description="PDFs, planilhas, apostilas ou links complementares."
            />
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {lesson.materials.map((material) => (
              <li key={material.id} className="flex items-center gap-3 px-5 py-3">
                <span className="shrink-0 text-ink-400">
                  {material.type === 'LINK' ? (
                    <Link2 aria-hidden className="size-4.5" />
                  ) : (
                    <Paperclip aria-hidden className="size-4.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{material.title}</p>
                  <p className="truncate text-xs text-ink-500">
                    {material.type === 'LINK' ? material.url : material.fileName}
                  </p>
                </div>
                <IconButton
                  label={`Remover material "${material.title}"`}
                  className="text-danger-500 hover:bg-danger-50"
                  onClick={() => setRemovingMaterial({ id: material.id, title: material.title })}
                >
                  <Trash2 aria-hidden className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <MaterialDialog
        key={materialOpen}
        open={materialOpen > 0}
        onClose={() => setMaterialOpen(0)}
        lessonId={lesson.id}
        onSaved={() => {
          setMaterialOpen(0);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={removingMaterial !== null}
        onClose={() => setRemovingMaterial(null)}
        loading={busy}
        title="Remover material?"
        confirmLabel="Remover"
        message={
          <p>
            O material <strong>{removingMaterial?.title}</strong> será removido da aula e o arquivo
            apagado do armazenamento.
          </p>
        }
        onConfirm={() => {
          if (!removingMaterial) return;
          const target = removingMaterial;
          setRemovingMaterial(null);
          void run(() => deleteMaterialAction(target.id));
        }}
      />
    </div>
  );
}

/** Adiciona material a uma aula, módulo ou curso. */
export function MaterialDialog({
  open,
  onClose,
  onSaved,
  lessonId,
  moduleId,
  courseId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  lessonId?: string;
  moduleId?: string;
  courseId?: string;
}) {
  const [state, action, pending] = useActionState(createMaterialAction, emptyFormState);
  const [type, setType] = React.useState<'FILE' | 'LINK'>('FILE');
  const [media, setMedia] = React.useState<{ id: string; name: string; size: number } | null>(null);

  // O estado interno é descartado pelo `key` que o pai troca a cada abertura —
  // por isso o efeito só precisa avisar que salvou.
  React.useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar material"
      description="Um arquivo para download ou um link externo."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="material-form"
            loading={pending}
            disabled={type === 'FILE' && !media}
          >
            Adicionar material
          </Button>
        </>
      }
    >
      <form id="material-form" action={action} className="flex flex-col gap-4">
        {lessonId && <input type="hidden" name="lessonId" value={lessonId} />}
        {moduleId && <input type="hidden" name="moduleId" value={moduleId} />}
        {courseId && <input type="hidden" name="courseId" value={courseId} />}
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="mediaId" value={media?.id ?? ''} />

        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        <div role="radiogroup" aria-label="Tipo de material" className="flex gap-2">
          {(
            [
              { value: 'FILE', label: 'Arquivo' },
              { value: 'LINK', label: 'Link' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={type === option.value}
              onClick={() => setType(option.value)}
              className={
                type === option.value
                  ? 'rounded-pill border border-brand-800 bg-brand-800 px-4 py-1.5 text-sm font-medium text-white'
                  : 'rounded-pill border border-ink-200 bg-white px-4 py-1.5 text-sm font-medium text-ink-600 hover:border-brand-300'
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        <Input
          label="Nome do material"
          name="title"
          required
          error={state.errors?.title}
          placeholder="Ex.: Planilha-modelo do módulo 1"
        />

        {type === 'LINK' ? (
          <Input
            label="Endereço (URL)"
            name="url"
            type="url"
            required
            error={state.errors?.url}
            placeholder="https://"
          />
        ) : (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-700">Arquivo</p>
            <FileUpload
              kind="DOCUMENT"
              hint="PDF, DOCX, XLSX, PPTX, ZIP, imagens ou TXT até 100 MB."
              current={media ? { name: media.name, sizeBytes: media.size } : null}
              onUploaded={(uploaded) =>
                setMedia({
                  id: uploaded.id,
                  name: uploaded.originalName,
                  size: uploaded.sizeBytes,
                })
              }
              onRemove={media ? () => setMedia(null) : undefined}
            />
            {media && (
              <p className="mt-2 text-xs text-ink-500">
                {media.name} · {formatBytes(media.size)}
              </p>
            )}
            {state.errors?.url && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-danger-600">
                {state.errors.url}
              </p>
            )}
          </div>
        )}

        <Textarea
          label="Descrição"
          name="description"
          rows={2}
          hint="Opcional. Explique para que serve este material."
        />
      </form>
    </Modal>
  );
}
