import Link from 'next/link';
import { Search, Users } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { Avatar, Badge, Card, EmptyState, Progress } from '@/components/ui/primitives';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { cn, formatRelative, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Alunos' };

const PER_PAGE = 20;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; pagina?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const search = params.busca?.trim() ?? '';
  const page = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1);

  const where: Prisma.UserWhereInput = {
    role: 'STUDENT',
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [students, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        enrollments: {
          select: { status: true, progressPercent: true, lastActivityAt: true },
        },
        _count: { select: { certificates: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (nextPage: number) => {
    const query = new URLSearchParams();
    if (search) query.set('busca', search);
    if (nextPage > 1) query.set('pagina', String(nextPage));
    const qs = query.toString();
    return qs ? `/admin/alunos?${qs}` : '/admin/alunos';
  };

  return (
    <>
      <PageHeader
        title="Alunos"
        description={`${pluralize(total, 'aluno cadastrado', 'alunos cadastrados')}${
          search ? ` para "${search}"` : ''
        }.`}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <form action="/admin/alunos" method="get" role="search" className="max-w-md">
          <label htmlFor="busca" className="sr-only">
            Buscar aluno por nome ou e-mail
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
              placeholder="Buscar por nome ou e-mail"
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

        <div className="mt-6">
          {students.length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" />}
              title={search ? 'Nenhum aluno encontrado' : 'Nenhum aluno ainda'}
              description={
                search
                  ? 'Tente outro nome ou e-mail.'
                  : 'Quando alguém criar uma conta, ela aparece aqui.'
              }
            />
          ) : (
            <Card>
              <ul className="divide-y divide-ink-100">
                {students.map((student) => {
                  const active = student.enrollments.filter((item) =>
                    ['ACTIVE', 'COMPLETED'].includes(item.status),
                  );
                  const average = active.length
                    ? Math.round(
                        active.reduce((sum, item) => sum + item.progressPercent, 0) / active.length,
                      )
                    : 0;
                  const lastActivity = student.enrollments
                    .map((item) => item.lastActivityAt)
                    .filter((value): value is Date => Boolean(value))
                    .sort((a, b) => b.getTime() - a.getTime())[0];

                  return (
                    <li key={student.id}>
                      <Link
                        href={`/admin/alunos/${student.id}`}
                        className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-brand-50"
                      >
                        <Avatar name={student.name} size={40} />
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                            {student.name}
                            {!student.isActive && <Badge tone="danger">Desativado</Badge>}
                          </p>
                          <p className="truncate text-xs text-ink-500">{student.email}</p>
                        </div>

                        <div className="w-40 shrink-0">
                          <p className="text-xs text-ink-500">
                            {pluralize(active.length, 'curso', 'cursos')}
                            {student._count.certificates > 0 &&
                              ` · ${pluralize(student._count.certificates, 'certificado', 'certificados')}`}
                          </p>
                          <Progress
                            value={average}
                            size="sm"
                            showValue
                            className="mt-1.5"
                            label={`Progresso médio de ${student.name}`}
                          />
                        </div>

                        <p
                          className={cn(
                            'w-28 shrink-0 text-right text-xs',
                            lastActivity ? 'text-ink-600' : 'text-ink-400',
                          )}
                        >
                          {lastActivity
                            ? formatRelative(lastActivity)
                            : student.lastLoginAt
                              ? `entrou ${formatRelative(student.lastLoginAt)}`
                              : 'sem atividade'}
                        </p>
                      </Link>
                    </li>
                  );
                })}
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
