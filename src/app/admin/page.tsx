import Link from 'next/link';
import {
  Award,
  BookOpen,
  CircleAlert,
  GraduationCap,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Card, CardHeader, EmptyState, Progress, Stat } from '@/components/ui/primitives';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { STATUS_LABEL } from '@/lib/constants';
import { formatRelative, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const tutor = await requireStaff();

  const [courseCount, publishedCount, studentCount, certificateCount, enrollmentCount, courses, recent, pending] =
    await Promise.all([
      db.course.count(),
      db.course.count({ where: { status: 'PUBLISHED' } }),
      db.user.count({ where: { role: 'STUDENT' } }),
      db.certificate.count({ where: { revokedAt: null } }),
      db.enrollment.count(),
      db.course.findMany({
        orderBy: [{ position: 'asc' }],
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          _count: { select: { enrollments: true, modules: true } },
        },
      }),
      db.enrollment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          progressPercent: true,
          createdAt: true,
          lastActivityAt: true,
          user: { select: { id: true, name: true } },
          course: { select: { title: true } },
        },
      }),
      // Aulas sem vídeo e sem texto: conteúdo que ficou pela metade.
      db.lesson.count({
        where: { videoId: null, OR: [{ content: null }, { content: '' }] },
      }),
    ]);

  return (
    <>
      <PageHeader
        title={`Olá, ${tutor.name.split(' ')[0]}.`}
        description="Este é o resumo da sua plataforma."
        action={
          <ButtonLink href="/admin/cursos/novo">
            <Plus aria-hidden className="size-4" />
            Novo curso
          </ButtonLink>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Cursos"
            value={courseCount}
            hint={`${publishedCount} publicado${publishedCount === 1 ? '' : 's'}`}
            icon={<BookOpen className="size-5" />}
          />
          <Stat
            label="Alunos"
            value={studentCount}
            hint="contas de aluno"
            icon={<Users className="size-5" />}
          />
          <Stat
            label="Matrículas"
            value={enrollmentCount}
            hint="acessos ativos e concluídos"
            icon={<GraduationCap className="size-5" />}
            tone="progress"
          />
          <Stat
            label="Certificados"
            value={certificateCount}
            hint="emitidos"
            icon={<Award className="size-5" />}
            tone="accent"
          />
        </div>

        {pending > 0 && (
          <Card className="mt-6 flex items-start gap-3 border-accent-200 bg-accent-50 p-4">
            <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-accent-700">
                {pluralize(pending, 'aula está', 'aulas estão')} sem vídeo e sem conteúdo escrito.
              </p>
              <p className="mt-0.5 text-sm text-accent-700/90">
                Aulas vazias aparecem no curso mas não ensinam nada. Vale revisar antes de publicar.
              </p>
            </div>
          </Card>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* -------------------------------------------------- Cursos --- */}
          <Card>
            <CardHeader
              title="Seus cursos"
              action={
                <Link
                  href="/admin/cursos"
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  Ver todos
                </Link>
              }
            />
            {courses.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<BookOpen className="size-5" />}
                  title="Nenhum curso ainda"
                  description="Crie seu primeiro curso e comece a montar os módulos."
                  action={<ButtonLink href="/admin/cursos/novo">Criar curso</ButtonLink>}
                />
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {courses.map((course) => (
                  <li key={course.id}>
                    <Link
                      href={`/admin/cursos/${course.id}/conteudo`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">{course.title}</p>
                        <p className="text-xs text-ink-500">
                          {pluralize(course._count.modules, 'módulo', 'módulos')} ·{' '}
                          {pluralize(course._count.enrollments, 'aluno', 'alunos')}
                        </p>
                      </div>
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
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ------------------------------------------------- Atividade --- */}
          <Card>
            <CardHeader
              title="Alunos recentes"
              description="Últimas matrículas e progresso"
              action={
                <Link
                  href="/admin/alunos"
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  Ver todos
                </Link>
              }
            />
            {recent.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<TrendingUp className="size-5" />}
                  title="Nenhuma matrícula ainda"
                  description="Quando um aluno entrar em um curso, ele aparece aqui."
                />
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {recent.map((item) => (
                  <li key={item.id} className="px-5 py-3.5">
                    <Link
                      href={`/admin/alunos/${item.user.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {item.user.name}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {item.course.title} · {formatRelative(item.lastActivityAt ?? item.createdAt)}
                        </p>
                      </div>
                      <div className="w-24 shrink-0">
                        <Progress
                          value={item.progressPercent}
                          size="sm"
                          showValue
                          label={`Progresso de ${item.user.name}`}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
