'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { storage } from '@/server/storage';
import { fieldErrors, materialSchema } from '@/lib/validation';
import type { FormState } from '@/lib/form-state';

/**
 * Materiais complementares: arquivos no bucket ou links externos.
 * Podem estar presos ao curso, a um módulo ou a uma aula — o alvo é decidido
 * pelo campo preenchido, e só um deles é aceito.
 */

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export async function createMaterialAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();

  const parsed = materialSchema.safeParse({
    title: text(formData, 'title'),
    description: text(formData, 'description'),
    type: text(formData, 'type') || 'FILE',
    url: text(formData, 'url'),
    mediaId: text(formData, 'mediaId'),
    lessonId: text(formData, 'lessonId'),
    moduleId: text(formData, 'moduleId'),
    courseId: text(formData, 'courseId'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const data = parsed.data;
  const owner = await resolveOwner(data);
  if (!owner) return { ok: false, message: 'Escolha onde o material deve aparecer.' };

  const last = await db.material.findFirst({
    where: owner.where,
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  await db.material.create({
    data: {
      title: data.title,
      description: data.description || null,
      type: data.type,
      url: data.type === 'LINK' ? data.url || null : null,
      mediaId: data.type === 'FILE' ? data.mediaId || null : null,
      position: (last?.position ?? -1) + 1,
      lessonId: data.lessonId || null,
      moduleId: data.moduleId || null,
      courseId: data.courseId || null,
    },
  });

  revalidateOwner(owner.courseId, data.lessonId);
  return { ok: true, message: 'Material adicionado.' };
}

export async function deleteMaterialAction(materialId: string): Promise<FormState> {
  await requireStaff();

  const material = await db.material.findUnique({
    where: { id: materialId },
    select: {
      mediaId: true,
      lessonId: true,
      moduleId: true,
      courseId: true,
      lesson: { select: { module: { select: { courseId: true } } } },
      module: { select: { courseId: true } },
    },
  });
  if (!material) return { ok: false, message: 'Material não encontrado.' };

  await db.material.delete({ where: { id: materialId } });

  if (material.mediaId) {
    const media = await db.mediaAsset.findUnique({
      where: { id: material.mediaId },
      select: { storageKey: true, _count: { select: { lessons: true, materials: true } } },
    });
    if (media && media._count.lessons === 0 && media._count.materials === 0) {
      await db.mediaAsset.delete({ where: { id: material.mediaId } }).catch(() => {});
      await storage().delete(media.storageKey).catch(() => {});
    }
  }

  const courseId =
    material.courseId ?? material.module?.courseId ?? material.lesson?.module.courseId ?? null;
  revalidateOwner(courseId, material.lessonId);
  return { ok: true, message: 'Material removido.' };
}

type MaterialInput = {
  lessonId?: string;
  moduleId?: string;
  courseId?: string;
};

async function resolveOwner(
  data: MaterialInput,
): Promise<{ where: Record<string, string>; courseId: string | null } | null> {
  if (data.lessonId) {
    const lesson = await db.lesson.findUnique({
      where: { id: data.lessonId },
      select: { module: { select: { courseId: true } } },
    });
    if (!lesson) return null;
    return { where: { lessonId: data.lessonId }, courseId: lesson.module.courseId };
  }
  if (data.moduleId) {
    const found = await db.module.findUnique({
      where: { id: data.moduleId },
      select: { courseId: true },
    });
    if (!found) return null;
    return { where: { moduleId: data.moduleId }, courseId: found.courseId };
  }
  if (data.courseId) {
    return { where: { courseId: data.courseId }, courseId: data.courseId };
  }
  return null;
}

function revalidateOwner(courseId: string | null, lessonId?: string | null) {
  if (courseId) {
    revalidatePath(`/admin/cursos/${courseId}/conteudo`);
    revalidatePath(`/admin/cursos/${courseId}`);
    if (lessonId) revalidatePath(`/admin/cursos/${courseId}/aulas/${lessonId}`);
  }
}
