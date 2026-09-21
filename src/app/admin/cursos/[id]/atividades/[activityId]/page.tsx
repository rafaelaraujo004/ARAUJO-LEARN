import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { ActivityEditor } from '@/components/admin/activity-editor';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';

export const dynamic = 'force-dynamic';

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string; activityId: string }>;
}) {
  await requireStaff();
  const { id: courseId, activityId } = await params;

  const [activity, course] = await Promise.all([
    db.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        type: true,
        isRequired: true,
        isPublished: true,
        passingScore: true,
        maxAttempts: true,
        lessonId: true,
        moduleId: true,
        questions: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            prompt: true,
            type: true,
            explanation: true,
            points: true,
            options: {
              orderBy: { position: 'asc' },
              select: { text: true, isCorrect: true },
            },
          },
        },
      },
    }),
    db.course.findUnique({
      where: { id: courseId },
      select: {
        title: true,
        modules: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            lessons: { orderBy: { position: 'asc' }, select: { id: true, title: true } },
          },
        },
      },
    }),
  ]);

  if (!activity || !course || activity.courseId !== courseId) notFound();

  return (
    <>
      <PageHeader
        title={activity.title}
        description={course.title}
        breadcrumb={
          <Link href={`/admin/cursos/${courseId}/atividades`} className="hover:underline">
            ← Atividades
          </Link>
        }
        action={
          <ButtonLink href={`/atividade/${activity.id}`} variant="secondary" target="_blank">
            <ExternalLink aria-hidden className="size-4" />
            Testar como aluno
          </ButtonLink>
        }
      />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <ActivityEditor
          activity={{
            id: activity.id,
            courseId: activity.courseId,
            title: activity.title,
            description: activity.description ?? '',
            type: activity.type,
            isRequired: activity.isRequired,
            isPublished: activity.isPublished,
            passingScore: activity.passingScore,
            maxAttempts: activity.maxAttempts,
            scope: activity.lessonId
              ? `l:${activity.lessonId}`
              : activity.moduleId
                ? `m:${activity.moduleId}`
                : '',
          }}
          questions={activity.questions.map((question) => ({
            id: question.id,
            prompt: question.prompt,
            type: question.type,
            explanation: question.explanation ?? '',
            points: question.points,
            options: question.options,
          }))}
          modules={course.modules}
        />
      </div>
    </>
  );
}
