import Link from 'next/link';
import { BookOpen, ExternalLink, Layers, PenLine, Plus, Users } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Card, EmptyState } from '@/components/ui/primitives';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { LEVEL_LABEL, STATUS_LABEL } from '@/lib/constants';
import { formatDate, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cursos' };

export default async function AdminCoursesPage() {
  await requireStaff();

  const courses = await db.course.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      status: true,
      level: true,
      updatedAt: true,
      _count: { select: { enrollments: true, modules: true } },
      modules: { select: { _count: { select: { lessons: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        title="Cursos"
        description="Crie, edite e publique o conteúdo da plataforma."
        action={
          <ButtonLink href="/admin/cursos/novo">
            <Plus aria-hidden className="size-4" />
            Novo curso
          </ButtonLink>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {courses.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-5" />}
            title="Nenhum curso criado"
            description="Um curso é formado por módulos, e cada módulo por aulas. Comece criando o curso, a estrutura vem depois."
            action={<ButtonLink href="/admin/cursos/novo">Criar meu primeiro curso</ButtonLink>}
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {courses.map((course) => {
              const lessonCount = course.modules.reduce(
                (total, module) => total + module._count.lessons,
                0,
              );
              return (
                <li key={course.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            tone={
                              course.status === 'PUBLISHED'
                                ? 'progress'
                                : course.status === 'DRAFT'
                                  ? 'neutral'
                                  : 'danger'
                            }
                          >
                            {STATUS_LABEL[course.status]}
                          </Badge>
                          <Badge tone="brand">{LEVEL_LABEL[course.level]}</Badge>
                        </div>

                        <h2 className="mt-2.5 font-display text-xl font-semibold text-brand-900">
                          <Link
                            href={`/admin/cursos/${course.id}/conteudo`}
                            className="hover:underline"
                          >
                            {course.title}
                          </Link>
                        </h2>
                        <p className="mt-1 line-clamp-2 text-sm text-ink-600">
                          {course.shortDescription}
                        </p>

                        <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-500">
                          <div className="flex items-center gap-1.5">
                            <Layers aria-hidden className="size-3.5" />
                            <dt className="sr-only">Módulos</dt>
                            <dd>{pluralize(course._count.modules, 'módulo', 'módulos')}</dd>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen aria-hidden className="size-3.5" />
                            <dt className="sr-only">Aulas</dt>
                            <dd>{pluralize(lessonCount, 'aula', 'aulas')}</dd>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users aria-hidden className="size-3.5" />
                            <dt className="sr-only">Alunos</dt>
                            <dd>{pluralize(course._count.enrollments, 'aluno', 'alunos')}</dd>
                          </div>
                          <div>
                            <dt className="sr-only">Última alteração</dt>
                            <dd>Editado em {formatDate(course.updatedAt)}</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <ButtonLink
                          href={`/admin/cursos/${course.id}/conteudo`}
                          variant="primary"
                          size="sm"
                        >
                          <Layers aria-hidden className="size-4" />
                          Conteúdo
                        </ButtonLink>
                        <ButtonLink
                          href={`/admin/cursos/${course.id}`}
                          variant="secondary"
                          size="sm"
                        >
                          <PenLine aria-hidden className="size-4" />
                          Informações
                        </ButtonLink>
                        {course.status === 'PUBLISHED' && (
                          <ButtonLink
                            href={`/cursos/${course.slug}`}
                            variant="ghost"
                            size="sm"
                            target="_blank"
                          >
                            <ExternalLink aria-hidden className="size-4" />
                            <span className="sr-only">Ver no site: {course.title}</span>
                          </ButtonLink>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
