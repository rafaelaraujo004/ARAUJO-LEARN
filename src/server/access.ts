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

  // A matrícula vale mais que a amostra: o aluno matriculado que abre uma aula
  // de amostra é aluno, e não visitante (não pode ver o aviso de "amostra").
  const result = await courseAccess(user, course.id);
  if (result.allowed) return { ...result, courseId: course.id };

  if (lesson.isPreview) return { allowed: true, reason: 'preview', courseId: course.id };
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
  options: { expiresAt?: Date | null; source?: string } = {},
): Promise<void> {
  await db.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      source: options.source ?? 'tutor',
      expiresAt: options.expiresAt ?? null,
    },
    update: {
      status: 'ACTIVE',
      source: options.source ?? 'tutor',
      expiresAt: options.expiresAt ?? null,
    },
  });

  await unlockBonusCourses(userId);
}

/**
 * Libera automaticamente os cursos bônus.
 *
 * Um curso bônus declara em `unlocksWithCourseIds` de quais cursos ele depende.
 * Assim que o aluno tem acesso ativo a todos eles, o bônus entra sozinho — sem
 * o tutor precisar lembrar de liberar.
 *
 * Devolve os títulos liberados nesta chamada.
 */
export async function unlockBonusCourses(userId: string): Promise<string[]> {
  const bonuses = await db.course.findMany({
    where: { isBonus: true, status: { not: 'ARCHIVED' } },
    select: { id: true, title: true, unlocksWithCourseIds: true },
  });
  if (bonuses.length === 0) return [];

  const now = Date.now();
  const enrollments = await db.enrollment.findMany({
    where: { userId },
    select: { courseId: true, status: true, expiresAt: true },
  });
  // "Ativo" de verdade: status aberto E prazo não vencido (o status só é
  // normalizado quando alguém tenta acessar).
  const active = new Set(
    enrollments
      .filter(
        (item) =>
          (item.status === 'ACTIVE' || item.status === 'COMPLETED') &&
          (!item.expiresAt || item.expiresAt.getTime() > now),
      )
      .map((item) => item.courseId),
  );
  // Bônus que o tutor removeu de propósito não volta sozinho.
  const revoked = new Set(
    enrollments.filter((item) => item.status === 'REVOKED').map((item) => item.courseId),
  );

  const unlocked: string[] = [];

  for (const bonus of bonuses) {
    if (bonus.unlocksWithCourseIds.length === 0) continue;
    if (active.has(bonus.id) || revoked.has(bonus.id)) continue;
    if (!bonus.unlocksWithCourseIds.every((required) => active.has(required))) continue;

    await db.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: bonus.id } },
      create: { userId, courseId: bonus.id, source: 'bonus' },
      update: { status: 'ACTIVE', source: 'bonus' },
    });
    await db.notification.create({
      data: {
        userId,
        type: 'bonus',
        title: 'Curso bônus liberado',
        body: `Você garantiu o bônus "${bonus.title}". Ele já está nos seus cursos.`,
        link: '/meus-cursos',
      },
    });
    unlocked.push(bonus.title);
  }

  return unlocked;
}

/**
 * O aluno cumpriu os pré-requisitos do curso bônus?
 * Retorna true se o curso não é bônus, ou se o aluno já tem acesso ativo a
 * todos os cursos listados em `unlocksWithCourseIds`.
 */
export async function bonusPrerequisitesMet(
  userId: string,
  courseId: string,
): Promise<{ met: boolean; missing: string[] }> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { isBonus: true, unlocksWithCourseIds: true },
  });
  if (!course || !course.isBonus || course.unlocksWithCourseIds.length === 0) {
    return { met: true, missing: [] };
  }

  const now = Date.now();
  const enrollments = await db.enrollment.findMany({
    where: { userId, courseId: { in: course.unlocksWithCourseIds } },
    select: { courseId: true, status: true, expiresAt: true },
  });
  const active = new Set(
    enrollments
      .filter(
        (e) =>
          (e.status === 'ACTIVE' || e.status === 'COMPLETED') &&
          (!e.expiresAt || e.expiresAt.getTime() > now),
      )
      .map((e) => e.courseId),
  );

  const missingIds = course.unlocksWithCourseIds.filter((id) => !active.has(id));
  if (missingIds.length === 0) return { met: true, missing: [] };

  const missingCourses = await db.course.findMany({
    where: { id: { in: missingIds } },
    select: { title: true },
  });
  return { met: false, missing: missingCourses.map((c) => c.title) };
}

export async function revokeAccess(userId: string, courseId: string): Promise<void> {
  await db.enrollment.updateMany({
    where: { userId, courseId },
    data: { status: 'REVOKED' },
  });
}
