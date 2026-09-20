import Link from 'next/link';
import { Award, Download, ShieldCheck } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Card, EmptyState } from '@/components/ui/primitives';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth/guards';
import { env } from '@/lib/env';
import { formatDate, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meus certificados' };

export default async function CertificatesPage() {
  const user = await requireUser('/certificados');

  const certificates = await db.certificate.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { issuedAt: 'desc' },
    select: {
      code: true,
      courseTitle: true,
      tutorName: true,
      hours: true,
      issuedAt: true,
      course: { select: { slug: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-brand-900">Meus certificados</h1>
        <p className="mt-1.5 text-ink-600">
          {certificates.length === 0
            ? 'Conclua um curso para receber seu certificado.'
            : `${pluralize(certificates.length, 'certificado emitido', 'certificados emitidos')}.`}
        </p>
      </header>

      {certificates.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Award className="size-5" />}
          title="Nenhum certificado ainda"
          description="O certificado é emitido automaticamente quando você conclui 100% das aulas e as atividades obrigatórias do curso."
          action={<ButtonLink href="/meus-cursos">Ver meus cursos</ButtonLink>}
        />
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {certificates.map((certificate) => (
            <li key={certificate.code}>
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-5 p-5 sm:p-6">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-50 text-accent-600">
                    <Award aria-hidden className="size-7" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-semibold text-brand-900">
                      {certificate.courseTitle}
                    </h2>
                    <p className="mt-0.5 text-sm text-ink-600">
                      {certificate.hours}{' '}
                      {certificate.hours === 1 ? 'hora' : 'horas'} · Concluído em{' '}
                      {formatDate(certificate.issuedAt)}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      Código de validação:{' '}
                      <span className="font-mono font-semibold text-ink-700">
                        {certificate.code}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <ButtonLink
                      href={`/api/certificados/${certificate.code}`}
                      target="_blank"
                      variant="primary"
                    >
                      <Download aria-hidden className="size-4" />
                      Baixar PDF
                    </ButtonLink>
                    <ButtonLink href={`/validar/${certificate.code}`} variant="secondary">
                      <ShieldCheck aria-hidden className="size-4" />
                      Página de validação
                    </ButtonLink>
                  </div>
                </div>

                <div className="border-t border-ink-200 bg-ink-50 px-5 py-3 text-xs text-ink-500 sm:px-6">
                  Compartilhe o endereço{' '}
                  <Link
                    href={`/validar/${certificate.code}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {env.appUrl.replace(/^https?:\/\//, '')}/certificados/{certificate.code}
                  </Link>{' '}
                  para que qualquer pessoa confira a autenticidade.
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
