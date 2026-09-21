'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { Award, Copy, KeyRound, RotateCcw, ShieldOff, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { Alert, Badge, Card, CardHeader, Progress } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import {
  createResetLinkAction,
  grantAccessAction,
  issueCertificateAction,
  restoreAccessAction,
  revokeAccessAction,
  setStudentActiveAction,
} from '@/server/actions/students';
import { emptyFormState, type FormState } from '@/lib/form-state';
import { ENROLLMENT_STATUS_LABEL } from '@/lib/constants';
import { formatDate, formatRelative } from '@/lib/utils';

export interface EnrollmentRow {
  courseId: string;
  courseTitle: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'REVOKED';
  progressPercent: number;
  source: string;
  expiresAt: string | null;
  lastLessonTitle: string | null;
  lastActivityAt: string | null;
  certificateCode: string | null;
  certificateEnabled: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  self: 'Matrícula própria',
  tutor: 'Liberado pelo tutor',
  bonus: 'Bônus automático',
  seed: 'Demonstração',
};

/** Tudo o que o tutor pode fazer com um aluno, em um só lugar. */
export function StudentActions({
  studentId,
  studentName,
  isActive,
  enrollments,
  availableCourses,
}: {
  studentId: string;
  studentName: string;
  isActive: boolean;
  enrollments: EnrollmentRow[];
  availableCourses: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = React.useState<EnrollmentRow | null>(null);
  const [confirmDisable, setConfirmDisable] = React.useState(false);
  const [resetLink, setResetLink] = React.useState<string | null>(null);

  const [grantState, grantAction, granting] = useActionState(grantAccessAction, emptyFormState);

  React.useEffect(() => {
    if (grantState.message) {
      if (grantState.ok) toast.success(grantState.message);
      else toast.error(grantState.message);
      if (grantState.ok) router.refresh();
    }
  }, [grantState, toast, router]);

  async function run(key: string, work: () => Promise<FormState>) {
    setBusy(key);
    try {
      const result = await work();
      if (result.message && !key.startsWith('reset')) {
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      }
      router.refresh();
      return result;
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------- Matrículas --- */}
      <Card>
        <CardHeader
          title="Cursos do aluno"
          description="Acesso, progresso e certificado de cada curso."
        />
        {enrollments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-500">
            Este aluno ainda não tem acesso a nenhum curso.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {enrollments.map((item) => {
              const inactive = item.status === 'REVOKED' || item.status === 'EXPIRED';
              return (
                <li key={item.courseId} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 basis-64">
                      <p className="text-sm font-semibold text-ink-900">{item.courseTitle}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge
                          tone={
                            item.status === 'COMPLETED'
                              ? 'progress'
                              : item.status === 'ACTIVE'
                                ? 'brand'
                                : 'danger'
                          }
                        >
                          {ENROLLMENT_STATUS_LABEL[item.status]}
                        </Badge>
                        <span className="text-xs text-ink-500">
                          {SOURCE_LABEL[item.source] ?? item.source}
                        </span>
                        {item.expiresAt && (
                          <span className="text-xs text-ink-500">
                            · até {formatDate(item.expiresAt)}
                          </span>
                        )}
                      </div>
                      <Progress
                        value={item.progressPercent}
                        showValue
                        className="mt-3 max-w-sm"
                        label={`Progresso em ${item.courseTitle}`}
                      />
                      <p className="mt-2 text-xs text-ink-500">
                        {item.lastLessonTitle
                          ? `Última aula: ${item.lastLessonTitle}`
                          : 'Ainda não assistiu a nenhuma aula'}
                        {item.lastActivityAt && ` · ${formatRelative(item.lastActivityAt)}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {item.certificateCode ? (
                        <Badge tone="accent" icon={<Award className="size-3" />}>
                          {item.certificateCode}
                        </Badge>
                      ) : (
                        item.certificateEnabled &&
                        item.progressPercent === 100 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={busy === `cert-${item.courseId}`}
                            onClick={() =>
                              run(`cert-${item.courseId}`, () =>
                                issueCertificateAction(studentId, item.courseId),
                              )
                            }
                          >
                            <Award aria-hidden className="size-4" />
                            Emitir certificado
                          </Button>
                        )
                      )}
                      {inactive ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busy === `restore-${item.courseId}`}
                          onClick={() =>
                            run(`restore-${item.courseId}`, () =>
                              restoreAccessAction(studentId, item.courseId),
                            )
                          }
                        >
                          <RotateCcw aria-hidden className="size-4" />
                          Restaurar acesso
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger-600 hover:bg-danger-50"
                          onClick={() => setConfirmRevoke(item)}
                        >
                          <ShieldOff aria-hidden className="size-4" />
                          Remover acesso
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ------------------------------------------------------ Liberar curso --- */}
      {availableCourses.length > 0 && (
        <Card>
          <CardHeader
            title="Liberar um curso"
            description="Use depois de confirmar o pagamento. O aluno é avisado."
          />
          <form action={grantAction} className="flex flex-col gap-4 p-5">
            <input type="hidden" name="userId" value={studentId} />
            {grantState.message && !grantState.ok && (
              <Alert tone="danger">{grantState.message}</Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
              <Select
                label="Curso"
                name="courseId"
                options={availableCourses.map((course) => ({
                  value: course.id,
                  label: course.title,
                }))}
              />
              <Input
                label="Acesso até (opcional)"
                name="expiresAt"
                type="date"
                error={grantState.errors?.expiresAt}
                hint="Em branco: acesso permanente."
              />
            </div>
            <div>
              <Button type="submit" loading={granting}>
                <UserCheck aria-hidden className="size-4" />
                Liberar acesso
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ------------------------------------------------------------- Conta --- */}
      <Card>
        <CardHeader title="Conta" description="Recuperação de acesso e situação da conta." />
        <div className="flex flex-col gap-5 p-5">
          <div>
            <p className="text-sm font-medium text-ink-800">Aluno esqueceu a senha?</p>
            <p className="mt-0.5 text-sm text-ink-500">
              Gere um link de uso único (válido por 1 hora) e envie ao aluno, por exemplo pelo
              WhatsApp.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              loading={busy === 'reset'}
              onClick={async () => {
                const result = await run('reset', () => createResetLinkAction(studentId));
                if (result.ok && result.message) setResetLink(result.message);
                else if (result.message) toast.error(result.message);
              }}
            >
              <KeyRound aria-hidden className="size-4" />
              Gerar link de redefinição
            </Button>

            {resetLink && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 p-3">
                <input
                  readOnly
                  value={resetLink}
                  aria-label="Link de redefinição de senha"
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 basis-60 bg-transparent font-mono text-xs text-ink-700"
                />
                <Button size="sm" variant="secondary" onClick={() => copyLink(resetLink)}>
                  <Copy aria-hidden className="size-4" />
                  Copiar
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-ink-200 pt-5">
            <p className="text-sm font-medium text-ink-800">
              {isActive ? 'Conta ativa' : 'Conta desativada'}
            </p>
            <p className="mt-0.5 text-sm text-ink-500">
              {isActive
                ? 'Desativar impede o login e encerra as sessões abertas. Os dados e o progresso ficam guardados.'
                : 'Este aluno não consegue entrar enquanto a conta estiver desativada.'}
            </p>
            {isActive ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-danger-600 hover:bg-danger-50"
                onClick={() => setConfirmDisable(true)}
              >
                <UserX aria-hidden className="size-4" />
                Desativar conta
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                loading={busy === 'active'}
                onClick={() => run('active', () => setStudentActiveAction(studentId, true))}
              >
                <UserCheck aria-hidden className="size-4" />
                Reativar conta
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmRevoke !== null}
        onClose={() => setConfirmRevoke(null)}
        loading={busy?.startsWith('revoke') ?? false}
        title="Remover o acesso?"
        confirmLabel="Sim, remover"
        message={
          <>
            <p>
              <strong>{studentName}</strong> perde o acesso a{' '}
              <strong>{confirmRevoke?.courseTitle}</strong>.
            </p>
            <p className="mt-2">
              O progresso fica guardado: se você restaurar o acesso depois, ele continua de onde
              parou.
            </p>
          </>
        }
        onConfirm={async () => {
          if (!confirmRevoke) return;
          const target = confirmRevoke;
          await run(`revoke-${target.courseId}`, () => revokeAccessAction(studentId, target.courseId));
          setConfirmRevoke(null);
        }}
      />

      <ConfirmDialog
        open={confirmDisable}
        onClose={() => setConfirmDisable(false)}
        loading={busy === 'active'}
        title="Desativar a conta?"
        confirmLabel="Sim, desativar"
        message={
          <p>
            <strong>{studentName}</strong> será desconectado e não conseguirá entrar até você
            reativar a conta.
          </p>
        }
        onConfirm={async () => {
          await run('active', () => setStudentActiveAction(studentId, false));
          setConfirmDisable(false);
        }}
      />
    </div>
  );
}
