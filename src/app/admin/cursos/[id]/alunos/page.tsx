import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Award, Users } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState, Progress, Stat } from '@/components/ui/primitives';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { ENROLLMENT_STATUS_LABEL } from '@/lib/constants';
import { formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Alunos do curso' };

export default async function CourseStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const course = await db.course.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      enrollments: {
        orderBy: { lastActivityAt: { sort: 'desc', nulls: 'last' } },
        select: {
          status: true,
          progressPercent: true,
          lastActivityAt: true,
          user: { select: { id: true, name: true, email: true } },
          lastLesson: { select: { title: true } },
          certificate: { select: { code: true, revokedAt: true } },
        },
      },
    },
  });
  if (!course) notFound();

  const enrollments = course.enrollments;
  const completed = enrollments.filter((item) => item.status === 'COMPLETED').length;
  const average = enrollments.length
    ? Math.round(
        enrollments.reduce((total, item) => total + item.progressPercent, 0) / enrollments.length,
      )
    : 0;

  return (
    <>
      <PageHeader
        title="Alunos do curso"
        description={course.title}
        breadcrumb={
          <Link href={`/admin/cursos/${course.id}/conteudo`} className="hover:underline">
            ← Conteúdo do curso
          </Link>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Matriculados" value={enrollments.length} icon={<Users className="size-5" />} />
          <Stat
            label="Concluíram"
            value={completed}
            icon={<Award className="size-5" />}
            tone="progress"
          />
          <Stat label="Progresso médio" value={`${average}%`} icon={<Users className="size-5" />} tone="accent" />
        </div>

        <div className="mt-6">
          {enrollments.length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" />}
              title="Nenhum aluno neste curso"
              description="Quando um aluno for liberado, ele aparece aqui com o progresso."
            />
          ) : (
            <Card>
              <ul className="divide-y divide-ink-100">
                {enrollments.map((item) => (
                  <li key={item.user.id}>
                    <Link
                      href={`/admin/alunos/${item.user.id}`}
                      className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-brand-50"
                    >
                      <Avatar name={item.user.name} size={40} />
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="text-sm font-semibold text-ink-900">{item.user.name}</p>
                        <p className="truncate text-xs text-ink-500">
                          {item.lastLesson
                            ? `Última aula: ${item.lastLesson.title}`
                            : item.user.email}
                        </p>
                      </div>
                      <div className="w-40 shrink-0">
                        <Progress
                          value={item.progressPercent}
                          size="sm"
                          showValue
                          label={`Progresso de ${item.user.name}`}
                        />
                      </div>
                      <div className="flex w-40 shrink-0 items-center justify-end gap-2">
                        {item.certificate && !item.certificate.revokedAt && (
                          <Badge tone="accent" icon={<Award className="size-3" />}>
                            Certificado
                          </Badge>
                        )}
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
                      </div>
                      <p className="w-24 shrink-0 text-right text-xs text-ink-500">
                        {item.lastActivityAt ? formatRelative(item.lastActivityAt) : '—'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
