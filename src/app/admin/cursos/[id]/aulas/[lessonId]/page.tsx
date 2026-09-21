import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, ListChecks } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/primitives';
import { LessonEditor } from '@/components/admin/lesson-editor';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { title: true } });
  return { title: lesson ? `${lesson.title}, aula` : 'Aula' };
}

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  await requireStaff();
  const { id: courseId, lessonId } = await params;

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      description: true,
      content: true,
      notes: true,
      durationSeconds: true,
      isPreview: true,
      isPublished: true,
      module: { select: { id: true, title: true, courseId: true, course: { select: { slug: true, title: true } } } },
      video: {
        select: { id: true, originalName: true, sizeBytes: true, durationSeconds: true },
      },
      materials: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          type: true,
          url: true,
          media: { select: { originalName: true } },
        },
      },
      activities: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          isRequired: true,
          _count: { select: { questions: true } },
        },
      },
    },
  });

  if (!lesson || lesson.module.courseId !== courseId) notFound();

  return (
    <>
      <PageHeader
        title={lesson.title}
        description={`Módulo: ${lesson.module.title}`}
        breadcrumb={
          <Link href={`/admin/cursos/${courseId}/conteudo`} className="hover:underline">
            ← {lesson.module.course.title}
          </Link>
        }
        action={
          <ButtonLink
            href={`/aula/${lesson.module.course.slug}/${lesson.id}`}
            variant="secondary"
            target="_blank"
          >
            <ExternalLink aria-hidden className="size-4" />
            Ver como aluno
          </ButtonLink>
        }
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <LessonEditor
          lesson={{
            id: lesson.id,
            title: lesson.title,
            description: lesson.description ?? '',
            content: lesson.content ?? '',
            notes: lesson.notes ?? '',
            durationSeconds: lesson.durationSeconds,
            isPreview: lesson.isPreview,
            isPublished: lesson.isPublished,
            video: lesson.video
              ? {
                  id: lesson.video.id,
                  originalName: lesson.video.originalName,
                  sizeBytes: Number(lesson.video.sizeBytes),
                  durationSeconds: lesson.video.durationSeconds,
                }
              : null,
            materials: lesson.materials.map((material) => ({
              id: material.id,
              title: material.title,
              type: material.type,
              url: material.url,
              fileName: material.media?.originalName ?? null,
            })),
          }}
        />

        {/* Atividades ficam em tela própria, com editor de perguntas. */}
        <Card className="mt-6">
          <CardHeader
            title="Atividades desta aula"
            description="Perguntas para confirmar o que o aluno entendeu."
            action={
              <ButtonLink
                href={`/admin/cursos/${courseId}/atividades?aula=${lesson.id}`}
                variant="secondary"
                size="sm"
              >
                <ListChecks aria-hidden className="size-4" />
                Gerenciar
              </ButtonLink>
            }
          />
          {lesson.activities.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-ink-500">
              Nenhuma atividade nesta aula.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {lesson.activities.map((activity) => (
                <li key={activity.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/cursos/${courseId}/atividades/${activity.id}`}
                      className="text-sm font-medium text-ink-900 hover:text-brand-600 hover:underline"
                    >
                      {activity.title}
                    </Link>
                    <p className="text-xs text-ink-500">
                      {pluralize(activity._count.questions, 'pergunta', 'perguntas')}
                      {activity.isRequired ? ' · obrigatória para concluir' : ' · opcional'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
