import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Ban, Download, HelpCircle } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/primitives';
import { db } from '@/server/db';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Certificado ${code.toUpperCase()}`,
    description: 'Validação de certificado da ARAÚJO LEARN.',
  };
}

/**
 * Página pública de validação.
 *
 * Mostra o que confirma a autenticidade (aluno, curso, carga horária, tutor,
 * data) e nada além disso — sem e-mail, sem progresso, sem dados de contato.
 */
export default async function ValidateCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = decodeURIComponent(code).trim().toUpperCase();

  const certificate = await db.certificate.findUnique({
    where: { code: normalized },
    select: {
      code: true,
      studentName: true,
      courseTitle: true,
      tutorName: true,
      hours: true,
      issuedAt: true,
      revokedAt: true,
      course: { select: { slug: true, status: true } },
    },
  });

  if (!certificate) {
    return (
      <Shell tone="unknown" title="Certificado não encontrado" code={normalized}>
        <p className="text-ink-600">
          Nenhum certificado da ARAÚJO LEARN corresponde ao código{' '}
          <strong className="font-mono">{normalized}</strong>.
        </p>
        <p className="mt-2 text-sm text-ink-500">
          Confira se o código foi digitado corretamente. Ele tem o formato AL-XXXX-XXXX e não usa as
          letras I e O nem os números 0 e 1.
        </p>
        <ButtonLink href="/validar" className="mt-6">
          Tentar outro código
        </ButtonLink>
      </Shell>
    );
  }

  if (certificate.revokedAt) {
    return (
      <Shell tone="revoked" title="Certificado revogado" code={certificate.code}>
        <p className="text-ink-600">
          Este certificado existiu, mas foi <strong>revogado</strong> pelo tutor em{' '}
          {formatDate(certificate.revokedAt)} e não deve ser aceito como comprovação.
        </p>
        <ButtonLink href="/validar" variant="secondary" className="mt-6">
          Validar outro código
        </ButtonLink>
      </Shell>
    );
  }

  return (
    <Shell tone="valid" title="Certificado autêntico" code={certificate.code}>
      <dl className="divide-y divide-ink-100">
        <Row label="Aluno" value={certificate.studentName} emphasis />
        <Row label="Curso" value={certificate.courseTitle} emphasis />
        <Row
          label="Carga horária"
          value={`${certificate.hours} ${certificate.hours === 1 ? 'hora' : 'horas'}`}
        />
        <Row label="Tutor responsável" value={certificate.tutorName} />
        <Row label="Data de conclusão" value={formatDate(certificate.issuedAt)} />
        <Row label="Código de validação" value={certificate.code} mono />
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <ButtonLink href={`/api/certificados/${certificate.code}`} target="_blank">
          <Download aria-hidden className="size-4" />
          Ver o certificado em PDF
        </ButtonLink>
        {certificate.course.status === 'PUBLISHED' && (
          <ButtonLink href={`/cursos/${certificate.course.slug}`} variant="secondary">
            Conhecer o curso
          </ButtonLink>
        )}
      </div>
    </Shell>
  );
}

function Shell({
  tone,
  title,
  code,
  children,
}: {
  tone: 'valid' | 'revoked' | 'unknown';
  title: string;
  code: string;
  children: React.ReactNode;
}) {
  const badge = {
    valid: {
      icon: BadgeCheck,
      className: 'bg-progress-100 text-progress-700 ring-progress-300/60',
      label: 'Documento válido',
    },
    revoked: {
      icon: Ban,
      className: 'bg-danger-50 text-danger-600 ring-danger-100',
      label: 'Documento revogado',
    },
    unknown: {
      icon: HelpCircle,
      className: 'bg-ink-100 text-ink-600 ring-ink-200',
      label: 'Código não localizado',
    },
  }[tone];

  return (
    <>
      <section className="bg-night bg-grid">
        <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-accent-300 uppercase">
            Validação de certificado
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 font-mono text-sm tracking-wider text-brand-200">{code}</p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Card className="p-6 sm:p-8">
          <span
            className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${badge.className}`}
          >
            <badge.icon aria-hidden className="size-4" />
            {badge.label}
          </span>
          <div className="mt-5">{children}</div>
        </Card>

        <p className="mt-6 text-center text-sm text-ink-500">
          Em caso de dúvida sobre este documento,{' '}
          <Link href="/tutor" className="font-medium text-brand-600 hover:underline">
            fale com o tutor
          </Link>
          .
        </p>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  emphasis,
  mono,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd
        className={[
          'text-right',
          emphasis ? 'font-display text-lg font-semibold text-brand-900' : 'text-ink-800',
          mono ? 'font-mono tracking-wider' : '',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  );
}
