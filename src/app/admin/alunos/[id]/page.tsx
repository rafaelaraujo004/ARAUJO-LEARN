import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Mail } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui/primitives';
import { StudentActions } from '@/components/admin/student-actions';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { formatDate, formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { name: true } });
  return { title: user ? user.name : 'Aluno' };
}

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const student = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      enrollments: {
        orderBy: { createdAt: 'desc' },
        select: {
          courseId: true,
          status: true,
          progressPercent: true,
          source: true,
          expiresAt: true,
          lastActivityAt: true,
          lastLesson: { select: { title: true } },
          certificate: { select: { code: true, revokedAt: true } },
          course: { select: { title: true, certificateEnabled: true } },
        },
      },
    },
  });
  if (!student) notFound();

  // Cursos publicados aos quais o aluno ainda não tem acesso ativo.
  const enrolledIds = student.enrollments
    .filter((item) => item.status !== 'REVOKED' && item.status !== 'EXPIRED')
    .map((item) => item.courseId);
  const availableCourses = await db.course.findMany({
    where: { status: 'PUBLISHED', id: { notIn: enrolledIds } },
    orderBy: { position: 'asc' },
    select: { id: true, title: true },
  });

  return (
    <>
      <PageHeader
        title={student.name}
        description={student.email}
        breadcrumb={
          <Link href="/admin/alunos" className="hover:underline">
            ← Alunos
          </Link>
        }
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-card border border-ink-200 bg-white p-5 shadow-soft">
          <Avatar name={student.name} size={56} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-sans text-base font-semibold text-ink-900">
              {student.name}
              {!student.isActive && <Badge tone="danger">Desativado</Badge>}
              {student.role !== 'STUDENT' && <Badge tone="accent">Equipe</Badge>}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-600">
              <Mail aria-hidden className="size-3.5" />
              {student.email}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              Cadastrado em {formatDate(student.createdAt)}
              {student.lastLoginAt && ` · último acesso ${formatRelative(student.lastLoginAt)}`}
            </p>
          </div>
        </div>

        <StudentActions
          studentId={student.id}
          studentName={student.name}
          isActive={student.isActive}
          availableCourses={availableCourses}
          enrollments={student.enrollments.map((item) => ({
            courseId: item.courseId,
            courseTitle: item.course.title,
            status: item.status,
            progressPercent: item.progressPercent,
            source: item.source,
            expiresAt: item.expiresAt?.toISOString() ?? null,
            lastLessonTitle: item.lastLesson?.title ?? null,
            lastActivityAt: item.lastActivityAt?.toISOString() ?? null,
            certificateCode: item.certificate && !item.certificate.revokedAt ? item.certificate.code : null,
            certificateEnabled: item.course.certificateEnabled,
          }))}
        />
      </div>
    </>
  );
}
