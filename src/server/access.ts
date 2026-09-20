import 'server-only';
import { db } from '@/server/db';
import { HttpError } from '@/server/auth/guards';
import { isStaff, type SessionUser } from '@/server/auth/session';

/**
 * Controle de acesso ao conteúdo — o backend é a única autoridade.
 *
 * Toda pergunta do tipo "este aluno pode ver esta aula?" passa por aqui, e
 * apenas por aqui. Quando existirem planos, assinaturas ou acesso temporário,
 * a regra nova entra neste arquivo e vale para a plataforma inteira.
 */

export type AccessReason =
  | 'staff'
  | 'enrolled'
  | 'preview'
  | 'not-enrolled'
  | 'expired'
  | 'revoked'
  | 'unpublished';

export interface AccessResult {
  allowed: boolean;
  reason: AccessReason;
  enrollmentId?: string;
}

/** A matrícula ainda vale? Expirada vira `EXPIRED` no banco na primeira checagem. */
async function normalizeEnrollment(enrollment: {
  id: string;
  status: string;
  expiresAt: Date | null;
}): Promise<AccessResult> {
  if (enrollment.status === 'REVOKED') return { allowed: false, reason: 'revoked' };

  const expired = enrollment.expiresAt !== null && enrollment.expiresAt.getTime() < Date.now();
  if (expired) {
    if (enrollment.status !== 'EXPIRED') {
      await db.enrollment.update({ where: { id: enrollment.id }, data: { status: 'EXPIRED' } });
    }
    return { allowed: false, reason: 'expired' };
  }

  return { allowed: true, reason: 'enrolled', enrollmentId: enrollment.id };
}

/** O usuário tem acesso ao curso inteiro? */
export async function courseAccess(
  user: SessionUser | null,
  courseId: string,
): Promise<AccessResult> {
  if (user && isStaff(user.role)) return { allowed: true, reason: 'staff' };
  if (!user) return { allowed: false, reason: 'not-enrolled' };

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true, status: true, expiresAt: true },
  });
  if (!enrollment) return { allowed: false, reason: 'not-enrolled' };

  return normalizeEnrollment(enrollment);
}

/**
 * O usuário pode assistir a esta aula?
 * Uma aula marcada como amostra (`isPreview`) libera acesso sem matrícula.
 */
export async function lessonAccess(
  user: SessionUser | null,
  lessonId: string,
): Promise<AccessResult & { courseId?: string }> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      isPreview: true,
      isPublished: true,
      module: { select: { course: { select: { id: true, status: true } } } },
    },
  });
  if (!lesson) throw new HttpError(404, 'Aula não encontrada.');

  const course = lesson.module.course;
  const staff = Boolean(user && isStaff(user.role));

  if (!staff && (!lesson.isPublished || course.status !== 'PUBLISHED')) {
    return { allowed: false, reason: 'unpublished', courseId: course.id };
  }

  if (staff) return { allowed: true, reason: 'staff', courseId: course.id };
  if (lesson.isPreview) return { allowed: true, reason: 'preview', courseId: course.id };

  const result = await courseAccess(user, course.id);
  return { ...result, courseId: course.id };
}

/** Versão para rotas de API: lança 403 em vez de devolver o motivo. */
export async function assertLessonAccess(
  user: SessionUser | null,
  lessonId: string,
): Promise<{ courseId: string; enrollmentId?: string }> {
  const access = await lessonAccess(user, lessonId);
  if (!access.allowed || !access.courseId) {
    throw new HttpError(403, mensagemDeBloqueio(access.reason));
  }
  return { courseId: access.courseId, enrollmentId: access.enrollmentId };
}

export function mensagemDeBloqueio(reason: AccessReason): string {
  switch (reason) {
    case 'expired':
      return 'Seu acesso a este curso expirou. Fale com o tutor para renovar.';
    case 'revoked':
      return 'Seu acesso a este curso foi removido.';
    case 'unpublished':
      return 'Este conteúdo ainda não está disponível.';
    default:
      return 'Você precisa ter acesso a este curso para ver esta aula.';
  }
}

/**
 * Matrícula do próprio aluno.
 * Só funciona em curso publicado e com acesso `FREE` — cursos restritos
 * dependem de liberação do tutor.
 */
export async function selfEnroll(
  user: SessionUser,
  courseId: string,
): Promise<{ enrollmentId: string }> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true, accessType: true },
  });
  if (!course || course.status !== 'PUBLISHED') {
    throw new HttpError(404, 'Curso não encontrado.');
  }

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true, status: true },
  });
  if (existing) {
    if (existing.status === 'REVOKED') {
      throw new HttpError(403, 'Seu acesso a este curso foi removido.');
    }
    return { enrollmentId: existing.id };
  }

  if (course.accessType !== 'FREE') {
    throw new HttpError(
      403,
      'Este curso é liberado individualmente pelo tutor. Entre em contato para solicitar acesso.',
    );
  }

  const enrollment = await db.enrollment.create({
    data: { userId: user.id, courseId, source: 'self' },
    select: { id: true },
  });
  return { enrollmentId: enrollment.id };
}

/** Liberação manual feita pelo tutor. */
export async function grantAccess(
  userId: string,
  courseId: string,
  options: { expiresAt?: Date | null } = {},
): Promise<void> {
  await db.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      source: 'tutor',
      expiresAt: options.expiresAt ?? null,
    },
    update: {
      status: 'ACTIVE',
      source: 'tutor',
      expiresAt: options.expiresAt ?? null,
    },
  });
}

export async function revokeAccess(userId: string, courseId: string): Promise<void> {
  await db.enrollment.updateMany({
    where: { userId, courseId },
    data: { status: 'REVOKED' },
  });
}
