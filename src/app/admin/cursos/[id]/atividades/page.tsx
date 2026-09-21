import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActivityList } from '@/components/admin/activity-list';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Atividades' };

export default async function CourseActivitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aula?: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const { aula } = await searchParams;

  const course = await db.course.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      modules: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          lessons: { orderBy: { position: 'asc' }, select: { id: true, title: true } },
        },
      },
      activities: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          type: true,
          isRequired: true,
          isPublished: true,
          moduleId: true,
          lessonId: true,
          _count: { select: { questions: true } },
        },
      },
    },
  });
  if (!course) notFound();

  const moduleTitle = new Map(course.modules.map((module) => [module.id, module.title]));
  const lessonTitle = new Map(
    course.modules.flatMap((module) => module.lessons.map((lesson) => [lesson.id, lesson.title] as const)),
  );

  const rows = course.activities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    type: activity.type,
    isRequired: activity.isRequired,
    isPublished: activity.isPublished,
    questionCount: activity._count.questions,
    scopeLabel: activity.lessonId
      ? `Aula: ${lessonTitle.get(activity.lessonId) ?? 'Sem registro'}`
      : activity.moduleId
        ? `Módulo: ${moduleTitle.get(activity.moduleId) ?? 'Sem registro'}`
        : 'Final do curso',
  }));

  return (
    <>
      <PageHeader
        title="Atividades"
        description={course.title}
        breadcrumb={
          <Link href={`/admin/cursos/${course.id}/conteudo`} className="hover:underline">
            ← Conteúdo do curso
          </Link>
        }
      />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        <ActivityList
          courseId={course.id}
          activities={rows}
          modules={course.modules}
          presetLessonId={aula}
        />
      </div>
    </>
  );
}
