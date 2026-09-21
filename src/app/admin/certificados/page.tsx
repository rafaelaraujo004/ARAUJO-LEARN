import Link from 'next/link';
import { Award, Search } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { Badge, Card, EmptyState } from '@/components/ui/primitives';
import { CertificateRowActions } from '@/components/admin/certificate-row-actions';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { cn, formatDate, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Certificados' };

const PER_PAGE = 20;

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; pagina?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const search = params.busca?.trim() ?? '';
  const page = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1);

  const where: Prisma.CertificateWhereInput = search
    ? {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { studentName: { contains: search, mode: 'insensitive' } },
          { courseTitle: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [certificates, total] = await Promise.all([
    db.certificate.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        code: true,
        studentName: true,
        courseTitle: true,
        hours: true,
        issuedAt: true,
        revokedAt: true,
        userId: true,
      },
    }),
    db.certificate.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (nextPage: number) => {
    const query = new URLSearchParams();
    if (search) query.set('busca', search);
    if (nextPage > 1) query.set('pagina', String(nextPage));
    const qs = query.toString();
    return qs ? `/admin/certificados?${qs}` : '/admin/certificados';
  };

  return (
    <>
      <PageHeader
        title="Certificados"
        description="Emitidos automaticamente quando o aluno conclui 100% do curso. Qualquer pessoa pode conferir pelo código."
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <form action="/admin/certificados" method="get" role="search" className="max-w-md">
          <label htmlFor="busca" className="sr-only">
            Buscar certificado
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400"
            />
            <input
              id="busca"
              name="busca"
              type="search"
              defaultValue={search}
              placeholder="Buscar por aluno, curso ou código"
              className="h-11 w-full rounded-xl border border-ink-200 bg-white pr-24 pl-10 text-[0.9375rem] shadow-inset-line placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-400"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded-lg bg-brand-800 px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Buscar
            </button>
          </div>
        </form>

        <p className="mt-5 text-sm text-ink-500" role="status">
          {pluralize(total, 'certificado', 'certificados')}
        </p>

        <div className="mt-3">
          {certificates.length === 0 ? (
            <EmptyState
              icon={<Award className="size-5" />}
              title={search ? 'Nenhum certificado encontrado' : 'Nenhum certificado emitido'}
              description={
                search
                  ? 'Tente outro nome, curso ou código.'
                  : 'Quando um aluno concluir um curso, o certificado aparece aqui.'
              }
            />
          ) : (
            <Card>
              <ul className="divide-y divide-ink-100">
                {certificates.map((certificate) => (
                  <li
                    key={certificate.id}
                    className="flex flex-wrap items-center gap-4 px-5 py-4"
                  >
                    <div className="min-w-0 flex-1 basis-64">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                        <Link
                          href={`/admin/alunos/${certificate.userId}`}
                          className="hover:text-brand-600 hover:underline"
                        >
                          {certificate.studentName}
                        </Link>
                        {certificate.revokedAt && <Badge tone="danger">Revogado</Badge>}
                      </p>
                      <p className="truncate text-sm text-ink-600">{certificate.courseTitle}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        <span className={cn('font-mono', certificate.revokedAt && 'line-through')}>
                          {certificate.code}
                        </span>{' '}
                        · {certificate.hours} {certificate.hours === 1 ? 'hora' : 'horas'} ·{' '}
                        {formatDate(certificate.issuedAt)}
                      </p>
                    </div>
                    <CertificateRowActions
                      code={certificate.code}
                      studentName={certificate.studentName}
                      revoked={Boolean(certificate.revokedAt)}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {pageCount > 1 && (
          <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
              <Link
                key={item}
                href={href(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Página ${item}`}
                className={cn(
                  'grid size-10 place-items-center rounded-lg border text-sm font-medium transition-colors',
                  item === page
                    ? 'border-brand-800 bg-brand-800 text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300',
                )}
              >
                {item}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
