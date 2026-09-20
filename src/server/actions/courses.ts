'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { uniqueCourseSlug, uniqueLessonSlug } from '@/server/courses';
import { storage } from '@/server/storage';
import { courseSchema, fieldErrors, lessonSchema, moduleSchema } from '@/lib/validation';
import { slugify } from '@/lib/utils';
import type { FormState } from '@/lib/form-state';

/**
 * Ações do painel do tutor sobre cursos, módulos e aulas.
 *
 * Toda função aqui começa por `requireStaff()`: como qualquer export de um
 * arquivo 'use server' vira um endpoint público, a autorização não pode
 * depender da tela que chamou.
 */

function flag(formData: FormData, name: string): boolean {
  return formData.get(name) === 'on' || formData.get(name) === 'true';
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function revalidateCourse(courseId: string, slug?: string) {
  revalidatePath('/admin/cursos');
  revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath(`/admin/cursos/${courseId}/conteudo`);
  revalidatePath('/cursos');
  if (slug) revalidatePath(`/cursos/${slug}`);
}

// ------------------------------------------------------------------ Cursos

export async function createCourseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const tutor = await requireStaff();

  const parsed = courseSchema.safeParse({
    title: text(formData, 'title'),
    slug: text(formData, 'slug'),
    shortDescription: text(formData, 'shortDescription'),
    description: text(formData, 'description'),
    objective: text(formData, 'objective'),
    audience: text(formData, 'audience'),
    level: text(formData, 'level') || 'BEGINNER',
    accessType: text(formData, 'accessType') || 'FREE',
    durationMinutes: text(formData, 'durationMinutes') || null,
    certificateEnabled: flag(formData, 'certificateEnabled'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const slug = await uniqueCourseSlug(parsed.data.slug || slugify(parsed.data.title));
  const last = await db.course.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });

  const course = await db.course.create({
    data: {
      slug,
      title: parsed.data.title,
      shortDescription: parsed.data.shortDescription,
      description: parsed.data.description || null,
      objective: parsed.data.objective || null,
      audience: parsed.data.audience || null,
      level: parsed.data.level,
      accessType: parsed.data.accessType,
      durationMinutes: parsed.data.durationMinutes ?? null,
      certificateEnabled: parsed.data.certificateEnabled,
      position: (last?.position ?? -1) + 1,
      tutorId: tutor.id,
      status: 'DRAFT',
    },
    select: { id: true },
  });

  revalidatePath('/admin/cursos');
  redirect(`/admin/cursos/${course.id}/conteudo`);
}

export async function updateCourseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const courseId = text(formData, 'courseId');
  if (!courseId) return { ok: false, message: 'Curso não informado.' };

  const parsed = courseSchema.safeParse({
    title: text(formData, 'title'),
    slug: text(formData, 'slug'),
    shortDescription: text(formData, 'shortDescription'),
    description: text(formData, 'description'),
    objective: text(formData, 'objective'),
    audience: text(formData, 'audience'),
    level: text(formData, 'level') || 'BEGINNER',
    accessType: text(formData, 'accessType') || 'FREE',
    durationMinutes: text(formData, 'durationMinutes') || null,
    certificateEnabled: flag(formData, 'certificateEnabled'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const slug = await uniqueCourseSlug(
    parsed.data.slug || slugify(parsed.data.title),
    courseId,
  );

  const course = await db.course.update({
    where: { id: courseId },
    data: {
      slug,
      title: parsed.data.title,
      shortDescription: parsed.data.shortDescription,
      description: parsed.data.description || null,
      objective: parsed.data.objective || null,
      audience: parsed.data.audience || null,
      level: parsed.data.level,
      accessType: parsed.data.accessType,
      durationMinutes: parsed.data.durationMinutes ?? null,
      certificateEnabled: parsed.data.certificateEnabled,
    },
    select: { slug: true },
  });

  revalidateCourse(courseId, course.slug);
  return { ok: true, message: 'Curso atualizado.' };
}

/** Publica ou volta para rascunho. */
export async function setCourseStatusAction(
  courseId: string,
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
): Promise<FormState> {
  await requireStaff();

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { slug: true, publishedAt: true, modules: { select: { _count: { select: { lessons: true } } } } },
  });
  if (!course) return { ok: false, message: 'Curso não encontrado.' };

  const lessonCount = course.modules.reduce((total, module) => total + module._count.lessons, 0);
  if (status === 'PUBLISHED' && lessonCount === 0) {
    return {
      ok: false,
      message: 'Adicione ao menos uma aula antes de publicar o curso.',
    };
  }

  await db.course.update({
    where: { id: courseId },
    data: {
      status,
      publishedAt: status === 'PUBLISHED' ? (course.publishedAt ?? new Date()) : course.publishedAt,
    },
  });

  revalidateCourse(courseId, course.slug);
  return {
    ok: true,
    message:
      status === 'PUBLISHED'
        ? 'Curso publicado. Já aparece no catálogo.'
        : status === 'DRAFT'
          ? 'Curso voltou para rascunho.'
          : 'Curso arquivado.',
  };
}

export async function deleteCourseAction(courseId: string): Promise<FormState> {
  await requireStaff();

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { coverKey: true, _count: { select: { enrollments: true } } },
  });
  if (!course) return { ok: false, message: 'Curso não encontrado.' };

  // Em cascata: módulos, aulas, progresso, matrículas e certificados.
  await db.course.delete({ where: { id: courseId } });
  if (course.coverKey) await storage().delete(course.coverKey).catch(() => {});

  revalidatePath('/admin/cursos');
  revalidatePath('/cursos');
  return { ok: true, message: 'Curso excluído.' };
}

export async function setCourseCoverAction(
  courseId: string,
  mediaId: string | null,
): Promise<FormState> {
  await requireStaff();

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { coverKey: true, slug: true },
  });
  if (!course) return { ok: false, message: 'Curso não encontrado.' };

  let coverKey: string | null = null;
  if (mediaId) {
    const media = await db.mediaAsset.findUnique({
      where: { id: mediaId },
      select: { storageKey: true, kind: true, status: true },
    });
    if (!media || media.kind !== 'IMAGE' || media.status !== 'READY') {
      return { ok: false, message: 'Imagem inválida.' };
    }
    coverKey = media.storageKey;
  }

  await db.course.update({ where: { id: courseId }, data: { coverKey } });
  if (course.coverKey && course.coverKey !== coverKey) {
    await storage().delete(course.coverKey).catch(() => {});
  }

  revalidateCourse(courseId, course.slug);
  return { ok: true, message: coverKey ? 'Capa atualizada.' : 'Capa removida.' };
}

// ----------------------------------------------------------------- Módulos

export async function createModuleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const courseId = text(formData, 'courseId');
  if (!courseId) return { ok: false, message: 'Curso não informado.' };

  const parsed = moduleSchema.safeParse({
    title: text(formData, 'title'),
    description: text(formData, 'description'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const last = await db.module.findFirst({
    where: { courseId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  await db.module.create({
    data: {
      courseId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      position: (last?.position ?? -1) + 1,
    },
  });

  revalidateCourse(courseId);
  return { ok: true, message: 'Módulo criado.' };
}

export async function updateModuleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const moduleId = text(formData, 'moduleId');
  const parsed = moduleSchema.safeParse({
    title: text(formData, 'title'),
    description: text(formData, 'description'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const updated = await db.module.update({
    where: { id: moduleId },
    data: { title: parsed.data.title, description: parsed.data.description || null },
    select: { courseId: true },
  });

  revalidateCourse(updated.courseId);
  return { ok: true, message: 'Módulo atualizado.' };
}

export async function deleteModuleAction(moduleId: string): Promise<FormState> {
  await requireStaff();
  const found = await db.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!found) return { ok: false, message: 'Módulo não encontrado.' };

  await db.module.delete({ where: { id: moduleId } });
  revalidateCourse(found.courseId);
  return { ok: true, message: 'Módulo excluído.' };
}

// -------------------------------------------------------------------- Aulas

export async function createLessonAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const moduleId = text(formData, 'moduleId');
  const title = text(formData, 'title').trim();
  if (!moduleId) return { ok: false, message: 'Módulo não informado.' };
  if (title.length < 2) return { ok: false, errors: { title: 'Dê um título à aula.' } };

  const [last, found] = await Promise.all([
    db.lesson.findFirst({
      where: { moduleId },
      orderBy: { position: 'desc' },
      select: { position: true },
    }),
    db.module.findUnique({ where: { id: moduleId }, select: { courseId: true } }),
  ]);
  if (!found) return { ok: false, message: 'Módulo não encontrado.' };

  await db.lesson.create({
    data: {
      moduleId,
      title,
      slug: await uniqueLessonSlug(moduleId, slugify(title)),
      position: (last?.position ?? -1) + 1,
      isPublished: true,
    },
  });

  revalidateCourse(found.courseId);
  return { ok: true, message: 'Aula criada.' };
}

export async function updateLessonAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const lessonId = text(formData, 'lessonId');
  if (!lessonId) return { ok: false, message: 'Aula não informada.' };

  const parsed = lessonSchema.safeParse({
    title: text(formData, 'title'),
    description: text(formData, 'description'),
    content: text(formData, 'content'),
    notes: text(formData, 'notes'),
    durationSeconds: text(formData, 'durationSeconds') || 0,
    isPreview: flag(formData, 'isPreview'),
    isPublished: flag(formData, 'isPublished'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { moduleId: true, slug: true, title: true, module: { select: { courseId: true } } },
  });
  if (!lesson) return { ok: false, message: 'Aula não encontrada.' };

  const slug =
    lesson.title === parsed.data.title
      ? lesson.slug
      : await uniqueLessonSlug(lesson.moduleId, slugify(parsed.data.title), lessonId);

  await db.lesson.update({
    where: { id: lessonId },
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description || null,
      content: parsed.data.content || null,
      notes: parsed.data.notes || null,
      durationSeconds: parsed.data.durationSeconds,
      isPreview: parsed.data.isPreview,
      isPublished: parsed.data.isPublished,
    },
  });

  revalidateCourse(lesson.module.courseId);
  revalidatePath(`/admin/cursos/${lesson.module.courseId}/aulas/${lessonId}`);
  return { ok: true, message: 'Aula salva.' };
}

export async function deleteLessonAction(lessonId: string): Promise<FormState> {
  await requireStaff();
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  });
  if (!lesson) return { ok: false, message: 'Aula não encontrada.' };

  await db.lesson.delete({ where: { id: lessonId } });
  revalidateCourse(lesson.module.courseId);
  return { ok: true, message: 'Aula excluída.' };
}

/** Associa (ou remove) o vídeo de uma aula. */
export async function setLessonVideoAction(
  lessonId: string,
  mediaId: string | null,
): Promise<FormState> {
  await requireStaff();

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      videoId: true,
      durationSeconds: true,
      module: { select: { courseId: true } },
    },
  });
  if (!lesson) return { ok: false, message: 'Aula não encontrada.' };

  let durationSeconds = lesson.durationSeconds;
  if (mediaId) {
    const media = await db.mediaAsset.findUnique({
      where: { id: mediaId },
      select: { kind: true, status: true, durationSeconds: true },
    });
    if (!media || media.kind !== 'VIDEO' || media.status !== 'READY') {
      return { ok: false, message: 'Vídeo inválido ou ainda não finalizado.' };
    }
    // A duração da aula passa a vir do vídeo — o tutor não precisa digitar.
    if (media.durationSeconds) durationSeconds = media.durationSeconds;
  }

  await db.lesson.update({
    where: { id: lessonId },
    data: { videoId: mediaId, durationSeconds },
  });

  // O vídeo antigo vira órfão: remove do bucket para não pagar por lixo.
  if (lesson.videoId && lesson.videoId !== mediaId) {
    await removeMediaIfOrphan(lesson.videoId);
  }

  revalidateCourse(lesson.module.courseId);
  revalidatePath(`/admin/cursos/${lesson.module.courseId}/aulas/${lessonId}`);
  return { ok: true, message: mediaId ? 'Vídeo associado à aula.' : 'Vídeo removido.' };
}

async function removeMediaIfOrphan(mediaId: string): Promise<void> {
  const media = await db.mediaAsset.findUnique({
    where: { id: mediaId },
    select: {
      storageKey: true,
      _count: { select: { lessons: true, materials: true } },
    },
  });
  if (!media || media._count.lessons > 0 || media._count.materials > 0) return;

  await db.mediaAsset.delete({ where: { id: mediaId } }).catch(() => {});
  await storage().delete(media.storageKey).catch(() => {});
}

// ------------------------------------------------------------- Ordenação

export async function reorderModulesAction(courseId: string, ids: string[]): Promise<FormState> {
  await requireStaff();
  await db.$transaction(
    ids.map((id, index) =>
      db.module.update({ where: { id }, data: { position: index } }),
    ),
  );
  revalidateCourse(courseId);
  return { ok: true, message: 'Ordem dos módulos atualizada.' };
}

export async function reorderLessonsAction(
  courseId: string,
  moduleId: string,
  ids: string[],
): Promise<FormState> {
  await requireStaff();
  await db.$transaction(
    ids.map((id, index) =>
      db.lesson.update({ where: { id }, data: { position: index, moduleId } }),
    ),
  );
  revalidateCourse(courseId);
  return { ok: true, message: 'Ordem das aulas atualizada.' };
}

export async function reorderCoursesAction(ids: string[]): Promise<FormState> {
  await requireStaff();
  await db.$transaction(
    ids.map((id, index) => db.course.update({ where: { id }, data: { position: index } })),
  );
  revalidatePath('/admin/cursos');
  revalidatePath('/cursos');
  return { ok: true, message: 'Ordem dos cursos atualizada.' };
}
