import Link from 'next/link';
import { CourseForm } from '@/components/admin/course-form';
import { PageHeader } from '@/components/admin/shell';
import { requireStaff } from '@/server/auth/guards';

export const metadata = { title: 'Novo curso' };

export default async function NewCoursePage() {
  await requireStaff();

  return (
    <>
      <PageHeader
        title="Novo curso"
        description="Preencha o essencial agora. Módulos, aulas e capa vêm no próximo passo."
        breadcrumb={
          <Link href="/admin/cursos" className="hover:underline">
            ← Voltar para cursos
          </Link>
        }
      />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <CourseForm />
      </div>
    </>
  );
}
