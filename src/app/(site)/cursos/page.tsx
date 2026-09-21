import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, SlidersHorizontal } from 'lucide-react';
import { CourseCard } from '@/components/course/course-card';
import { EmptyState } from '@/components/ui/primitives';
import { listPublishedCourses } from '@/server/courses';
import { getCurrentUser } from '@/server/auth/session';
import { db } from '@/server/db';
import { LEVEL_LABEL } from '@/lib/constants';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Cursos',
  description: 'Todos os cursos disponíveis na ARAÚJO LEARN.',
};

const LEVELS = ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; nivel?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const level = (LEVELS as readonly string[]).includes(params.nivel ?? '')
    ? (params.nivel as (typeof LEVELS)[number])
    : 'ALL';
  const search = params.busca?.trim() ?? '';
  const page = Number.parseInt(params.pagina ?? '1', 10) || 1;

  const [{ courses, total, pageCount }, user] = await Promise.all([
    listPublishedCourses({
      search,
      level: level === 'ALL' ? 'ALL' : level,
      page,
    }),
    getCurrentUser(),
  ]);

  // Cursos em que o aluno já está matriculado ganham "Continuar" no lugar de "Ver o curso".
  const enrolled = user
    ? new Map(
        (
          await db.enrollment.findMany({
            where: { userId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
            select: { courseId: true, progressPercent: true },
          })
        ).map((item) => [item.courseId, item.progressPercent]),
      )
    : new Map<string, number>();

  const buildHref = (patch: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const next = { busca: search || undefined, nivel: level === 'ALL' ? undefined : level, ...patch };
    for (const [key, value] of Object.entries(next)) {
      if (value) query.set(key, value);
    }
    const qs = query.toString();
    return qs ? `/cursos?${qs}` : '/cursos';
  };

  return (
    <>
      <section className="bg-night bg-grid">
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl">
            Escolha o curso que resolve o seu problema.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-brand-100">
            Direto ao ponto, do jeito que a obra pede. Você termina sabendo fazer, e com certificado
            para provar.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* ------------------------------------------------------- Filtros --- */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form action="/cursos" method="get" role="search" className="w-full lg:max-w-md">
            <label htmlFor="busca" className="sr-only">
              Buscar cursos
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
                placeholder="Buscar por curso, módulo ou aula"
                className="h-11 w-full rounded-xl border border-ink-200 bg-white pr-24 pl-10 text-[0.9375rem] shadow-inset-line placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-400"
              />
              {level !== 'ALL' && <input type="hidden" name="nivel" value={level} />}
              <button
                type="submit"
                className="absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded-lg bg-brand-800 px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Buscar
              </button>
            </div>
          </form>

          <nav aria-label="Filtrar por nível" className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
              <SlidersHorizontal aria-hidden className="size-3.5" />
              Nível
            </span>
            {LEVELS.map((item) => (
              <Link
                key={item}
                href={buildHref({ nivel: item === 'ALL' ? undefined : item, pagina: undefined })}
                aria-current={level === item ? 'page' : undefined}
                className={cn(
                  'rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  level === item
                    ? 'border-brand-800 bg-brand-800 text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700',
                )}
              >
                {item === 'ALL' ? 'Todos' : LEVEL_LABEL[item]}
              </Link>
            ))}
          </nav>
        </div>

        {/* -------------------------------------------------------- Lista --- */}
        <p className="mt-8 text-sm text-ink-500" role="status">
          {total === 0
            ? 'Nenhum curso encontrado.'
            : `${total} ${total === 1 ? 'curso encontrado' : 'cursos encontrados'}`}
          {search && ` para “${search}”`}
        </p>

        {courses.length > 0 ? (
          <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const progress = enrolled.get(course.id);
              return (
                <li key={course.id}>
                  <CourseCard
                    course={course}
                    progress={progress}
                    ctaLabel={progress === undefined ? 'Quero este curso' : 'Continuar'}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            className="mt-5"
            icon={<Search className="size-5" />}
            title="Nada por aqui com esse filtro"
            description="Tente outra palavra ou remova os filtros para ver todos os cursos."
            action={
              <Link
                href="/cursos"
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                Limpar filtros
              </Link>
            }
          />
        )}

        {/* ---------------------------------------------------- Paginação --- */}
        {pageCount > 1 && (
          <nav aria-label="Paginação" className="mt-12 flex items-center justify-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
              <Link
                key={item}
                href={buildHref({ pagina: item === 1 ? undefined : String(item) })}
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
