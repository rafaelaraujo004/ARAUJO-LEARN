'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { getCurrentUser } from '@/server/auth/session';
import { selfEnroll } from '@/server/access';
import { nextLessonFor } from '@/server/progress';
import { HttpError } from '@/server/auth/guards';
import type { FormState } from '@/lib/form-state';

/**
 * Matrícula feita pelo próprio aluno, a partir da página do curso.
 * A regra de quem pode se matricular vive em `src/server/access.ts`.
 */
export async function enrollAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = String(formData.get('slug') ?? '');
  if (!slug) return { ok: false, message: 'Curso não informado.' };

  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/cursos/${slug}`)}`);

  const course = await db.course.findUnique({ where: { slug }, select: { id: true } });
  if (!course) return { ok: false, message: 'Curso não encontrado.' };

  try {
    await selfEnroll(user, course.id);
  } catch (error) {
    if (error instanceof HttpError) return { ok: false, message: error.message };
    throw error;
  }

  const target = await nextLessonFor(user.id, course.id);
  revalidatePath(`/cursos/${slug}`);
  revalidatePath('/painel');

  redirect(target ? `/aula/${slug}/${target.lessonId}` : `/cursos/${slug}`);
}

/** Leva o aluno direto para onde parou. */
export async function continueAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = String(formData.get('slug') ?? '');
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/cursos/${slug}`)}`);

  const course = await db.course.findUnique({ where: { slug }, select: { id: true } });
  if (!course) return { ok: false, message: 'Curso não encontrado.' };

  const target = await nextLessonFor(user.id, course.id);
  redirect(target ? `/aula/${slug}/${target.lessonId}` : `/cursos/${slug}`);
}
