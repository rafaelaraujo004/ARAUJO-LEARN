'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Eye, EyeOff, Rocket, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { FileUpload } from '@/components/admin/file-upload';
import {
  deleteCourseAction,
  setCourseCoverAction,
  setCourseStatusAction,
} from '@/server/actions/courses';

/**
 * Capa, publicação e exclusão.
 * Ações destrutivas sempre passam por confirmação explícita.
 */
export function CourseSettings({
  courseId,
  status,
  coverUrl,
  coverName,
  enrollmentCount,
  courseTitle,
}: {
  courseId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  coverUrl: string | null;
  coverName: string | null;
  enrollmentCount: number;
  courseTitle: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  async function run(work: () => Promise<{ ok: boolean; message?: string }>) {
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
      {/* ------------------------------------------------------------ Capa */}
      <Card>
        <CardHeader
          title="Capa do curso"
          description="Aparece no catálogo e na página do curso. Proporção 16:9."
        />
        <div className="p-5">
          {coverUrl && (
            <div className="mb-4 overflow-hidden rounded-xl border border-ink-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="Capa atual do curso" className="aspect-[16/9] w-full object-cover" />
            </div>
          )}
          <FileUpload
            kind="IMAGE"
            hint="JPG, PNG, WEBP ou AVIF até 8 MB. Ideal: 1600×900."
            current={coverName ? { name: coverName } : null}
            onUploaded={(media) => void run(() => setCourseCoverAction(courseId, media.id))}
            onRemove={coverUrl ? () => void run(() => setCourseCoverAction(courseId, null)) : undefined}
          />
        </div>
      </Card>

      {/* ------------------------------------------------------ Publicação */}
      <Card>
        <CardHeader
          title="Publicação"
          description={
            status === 'PUBLISHED'
              ? 'Este curso está visível no catálogo.'
              : status === 'DRAFT'
                ? 'Rascunho: só você consegue ver.'
                : 'Arquivado: fora do catálogo, mas os alunos matriculados mantêm o acesso.'
          }
        />
        <div className="flex flex-wrap gap-2 p-5">
          {status !== 'PUBLISHED' && (
            <Button
              loading={busy}
              onClick={() => void run(() => setCourseStatusAction(courseId, 'PUBLISHED'))}
            >
              <Rocket aria-hidden className="size-4" />
              Publicar curso
            </Button>
          )}
          {status === 'PUBLISHED' && (
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => void run(() => setCourseStatusAction(courseId, 'DRAFT'))}
            >
              <EyeOff aria-hidden className="size-4" />
              Despublicar
            </Button>
          )}
          {status !== 'ARCHIVED' ? (
            <Button
              variant="ghost"
              loading={busy}
              onClick={() => void run(() => setCourseStatusAction(courseId, 'ARCHIVED'))}
            >
              <Archive aria-hidden className="size-4" />
              Arquivar
            </Button>
          ) : (
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => void run(() => setCourseStatusAction(courseId, 'DRAFT'))}
            >
              <Eye aria-hidden className="size-4" />
              Tirar do arquivo
            </Button>
          )}
        </div>
      </Card>

      {/* --------------------------------------------------------- Exclusão */}
      <Card className="border-danger-100">
        <CardHeader
          title="Excluir curso"
          description="Remove o curso, os módulos, as aulas, o progresso dos alunos e os certificados emitidos."
        />
        <div className="p-5">
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden className="size-4" />
            Excluir este curso
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        loading={busy}
        title="Excluir o curso?"
        confirmLabel="Sim, excluir"
        message={
          <>
            <p>
              Você está prestes a excluir <strong>{courseTitle}</strong>.
            </p>
            {enrollmentCount > 0 && (
              <p className="mt-2 font-medium text-danger-600">
                {enrollmentCount} {enrollmentCount === 1 ? 'aluno perderá' : 'alunos perderão'} o
                acesso e o progresso registrado. Certificados já emitidos para este curso também
                serão apagados.
              </p>
            )}
            <p className="mt-2">Esta ação não pode ser desfeita.</p>
          </>
        }
        onConfirm={() =>
          void run(async () => {
            const result = await deleteCourseAction(courseId);
            if (result.ok) router.push('/admin/cursos');
            return result;
          })
        }
      />
    </div>
  );
}
