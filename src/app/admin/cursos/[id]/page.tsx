import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Layers } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { CourseForm } from '@/components/admin/course-form';
import { CourseSettings } from '@/components/admin/course-settings';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { coverUrl } from '@/server/courses';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await db.course.findUnique({ where: { id }, select: { title: true } });
  return { title: course ? `${course.title}, informações` : 'Curso' };
}

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const course = await db.course.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      description: true,
      objective: true,
      audience: true,
      level: true,
      status: true,
      accessType: true,
      coverKey: true,
      durationMinutes: true,
      certificateEnabled: true,
      priceCents: true,
      pixDiscountPercent: true,
      maxInstallments: true,
      includes: true,
      isBonus: true,
      _count: { select: { enrollments: true } },
    },
  });
  if (!course) notFound();

  const cover = await coverUrl(course.coverKey, course.slug);

  return (
    <>
      <PageHeader
        title="Informações do curso"
        description="O que o aluno lê antes de decidir se matricular."
        breadcrumb={
          <Link href="/admin/cursos" className="hover:underline">
            ← Cursos
          </Link>
        }
        action={
          <>
            <ButtonLink href={`/admin/cursos/${course.id}/conteudo`} variant="secondary">
              <Layers aria-hidden className="size-4" />
              Conteúdo
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

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <CourseForm
          course={{
            id: course.id,
            title: course.title,
            slug: course.slug,
            shortDescription: course.shortDescription,
            description: course.description ?? '',
            objective: course.objective ?? '',
            audience: course.audience ?? '',
            level: course.level,
            accessType: course.accessType,
            durationMinutes: course.durationMinutes,
            certificateEnabled: course.certificateEnabled,
            priceCents: course.priceCents,
            pixDiscountPercent: course.pixDiscountPercent,
            maxInstallments: course.maxInstallments,
            includes: course.includes,
            isBonus: course.isBonus,
          }}
        />

        <div className="mt-8">
          <CourseSettings
            courseId={course.id}
            courseTitle={course.title}
            status={course.status}
            coverUrl={cover}
            coverName={course.coverKey ? course.coverKey.split('/').pop() ?? 'capa' : null}
            enrollmentCount={course._count.enrollments}
          />
        </div>
      </div>
    </>
  );
}
