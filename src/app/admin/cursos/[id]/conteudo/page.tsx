import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, ListChecks, PenLine, Users } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { ContentEditor } from '@/components/admin/content-editor';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { STATUS_LABEL } from '@/lib/constants';
import { formatDuration, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await db.course.findUnique({ where: { id }, select: { title: true } });
  return { title: course ? `${course.title} — conteúdo` : 'Conteúdo' };
}

export default async function CourseContentPage({
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
      slug: true,
      title: true,
      status: true,
      _count: { select: { enrollments: true } },
      modules: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          lessons: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              title: true,
              durationSeconds: true,
              isPublished: true,
              isPreview: true,
              videoId: true,
              _count: { select: { materials: true, activities: true } },
            },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const modules = course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      durationSeconds: lesson.durationSeconds,
      isPublished: lesson.isPublished,
      isPreview: lesson.isPreview,
      hasVideo: Boolean(lesson.videoId),
      materialCount: lesson._count.materials,
      activityCount: lesson._count.activities,
    })),
  }));

  const lessonCount = modules.reduce((total, module) => total + module.lessons.length, 0);
  const totalSeconds = modules.reduce(
    (total, module) =>
      total + module.lessons.reduce((sum, lesson) => sum + lesson.durationSeconds, 0),
    0,
  );

  return (
    <>
      <PageHeader
        title={course.title}
        description={`${pluralize(modules.length, 'módulo', 'módulos')} · ${pluralize(
          lessonCount,
          'aula',
          'aulas',
        )}${totalSeconds > 0 ? ` · ${formatDuration(totalSeconds)}` : ''}`}
        breadcrumb={
          <Link href="/admin/cursos" className="hover:underline">
            ← Cursos
          </Link>
        }
        action={
          <>
            <ButtonLink href={`/admin/cursos/${course.id}`} variant="secondary">
              <PenLine aria-hidden className="size-4" />
              Informações
            </ButtonLink>
            <ButtonLink href={`/admin/cursos/${course.id}/atividades`} variant="secondary">
              <ListChecks aria-hidden className="size-4" />
              Atividades
            </ButtonLink>
            <ButtonLink href={`/admin/cursos/${course.id}/alunos`} variant="secondary">
              <Users aria-hidden className="size-4" />
              Alunos ({course._count.enrollments})
            </ButtonLink>
            {course.status === 'PUBLISHED' && (
              <ButtonLink href={`/cursos/${course.slug}`} variant="ghost" target="_blank">
                <ExternalLink aria-hidden className="size-4" />
                Ver no site
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="mb-5 flex items-center gap-2">
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
          {course.status !== 'PUBLISHED' && (
            <span className="text-sm text-ink-500">
              Publique o curso na aba{' '}
              <Link href={`/admin/cursos/${course.id}`} className="font-medium text-brand-600 hover:underline">
                Informações
              </Link>{' '}
              quando o conteúdo estiver pronto.
            </span>
          )}
        </div>

        <ContentEditor courseId={course.id} modules={modules} />
      </div>
    </>
  );
}
