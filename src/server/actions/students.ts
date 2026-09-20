'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireStaff, requireAdmin } from '@/server/auth/guards';
import { grantAccess, revokeAccess } from '@/server/access';
import { refreshCourseProgress } from '@/server/progress';
import { issueCertificateIfEligible } from '@/server/certificates';
import { createToken, tokenHash } from '@/server/auth/session';
import { env } from '@/lib/env';
import { fieldErrors, tutorProfileSchema } from '@/lib/validation';
import type { FormState } from '@/lib/form-state';

/** Gestão de alunos, acessos e perfil do tutor. */

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export async function grantAccessAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();

  const userId = text(formData, 'userId');
  const courseId = text(formData, 'courseId');
  const expires = text(formData, 'expiresAt');
  if (!userId || !courseId) return { ok: false, message: 'Selecione o aluno e o curso.' };

  const expiresAt = expires ? new Date(`${expires}T23:59:59`) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return { ok: false, errors: { expiresAt: 'Data inválida.' } };
  }

  await grantAccess(userId, courseId, { expiresAt });
  await refreshCourseProgress(userId, courseId);

  await db.notification.create({
    data: {
      userId,
      type: 'access',
      title: 'Novo curso liberado',
      body: 'O tutor liberou o acesso a um curso para você.',
      link: '/meus-cursos',
    },
  });

  revalidatePath('/admin/alunos');
  revalidatePath(`/admin/alunos/${userId}`);
  return { ok: true, message: 'Acesso liberado.' };
}

export async function revokeAccessAction(userId: string, courseId: string): Promise<FormState> {
  await requireStaff();
  await revokeAccess(userId, courseId);
  revalidatePath(`/admin/alunos/${userId}`);
  revalidatePath('/admin/alunos');
  return { ok: true, message: 'Acesso removido.' };
}

/** Reativa uma matrícula revogada ou expirada. */
export async function restoreAccessAction(userId: string, courseId: string): Promise<FormState> {
  await requireStaff();
  await grantAccess(userId, courseId, { expiresAt: null });
  await refreshCourseProgress(userId, courseId);
  revalidatePath(`/admin/alunos/${userId}`);
  return { ok: true, message: 'Acesso restaurado.' };
}

/** Emite o certificado manualmente (o aluno precisa ter concluído o curso). */
export async function issueCertificateAction(
  userId: string,
  courseId: string,
): Promise<FormState> {
  await requireStaff();

  await refreshCourseProgress(userId, courseId);
  const code = await issueCertificateIfEligible(userId, courseId);

  revalidatePath('/admin/certificados');
  revalidatePath(`/admin/alunos/${userId}`);

  if (!code) {
    return {
      ok: false,
      message:
        'O aluno ainda não concluiu 100% do curso (ou o certificado está desativado neste curso).',
    };
  }
  return { ok: true, message: `Certificado ${code} emitido.` };
}

export async function revokeCertificateAction(code: string): Promise<FormState> {
  await requireStaff();
  await db.certificate.update({ where: { code }, data: { revokedAt: new Date() } });
  revalidatePath('/admin/certificados');
  revalidatePath(`/certificados/${code}`);
  return { ok: true, message: 'Certificado revogado.' };
}

/** Ativa/desativa a conta do aluno. */
export async function setStudentActiveAction(
  userId: string,
  isActive: boolean,
): Promise<FormState> {
  await requireStaff();

  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return { ok: false, message: 'Aluno não encontrado.' };
  if (target.role !== 'STUDENT') {
    return { ok: false, message: 'Só é possível desativar contas de aluno por aqui.' };
  }

  await db.user.update({ where: { id: userId }, data: { isActive } });
  if (!isActive) await db.session.deleteMany({ where: { userId } });

  revalidatePath('/admin/alunos');
  revalidatePath(`/admin/alunos/${userId}`);
  return { ok: true, message: isActive ? 'Conta reativada.' : 'Conta desativada.' };
}

/**
 * Gera um link de redefinição para o tutor repassar ao aluno que perdeu acesso
 * ao e-mail. O link é de uso único e expira em 1 hora.
 */
export async function createResetLinkAction(userId: string): Promise<FormState> {
  await requireStaff();

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return { ok: false, message: 'Aluno não encontrado.' };

  const token = createToken();
  await db.passwordResetToken.create({
    data: {
      tokenHash: tokenHash(token),
      userId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return { ok: true, message: `${env.appUrl}/redefinir?token=${token}` };
}

/** Promove ou rebaixa um usuário — só um ADMIN pode. */
export async function setUserRoleAction(
  userId: string,
  role: 'STUDENT' | 'TUTOR' | 'ADMIN',
): Promise<FormState> {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    return { ok: false, message: 'Você não pode alterar o próprio nível de acesso.' };
  }

  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath('/admin/alunos');
  revalidatePath(`/admin/alunos/${userId}`);
  return { ok: true, message: 'Nível de acesso atualizado.' };
}

// -------------------------------------------------------- Perfil do tutor

export async function updateTutorProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const staff = await requireStaff();

  const specialties = text(formData, 'specialties')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);

  const parsed = tutorProfileSchema.safeParse({
    name: text(formData, 'name'),
    headline: text(formData, 'headline'),
    bio: text(formData, 'bio'),
    experience: text(formData, 'experience'),
    methodology: text(formData, 'methodology'),
    specialties,
    socials: {
      instagram: text(formData, 'instagram'),
      linkedin: text(formData, 'linkedin'),
      youtube: text(formData, 'youtube'),
      site: text(formData, 'site'),
      whatsapp: text(formData, 'whatsapp'),
    },
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const data = parsed.data;

  await db.user.update({
    where: { id: staff.id },
    data: { name: data.name, headline: data.headline || null, bio: data.bio || null },
  });

  await db.tutorProfile.upsert({
    where: { userId: staff.id },
    create: {
      userId: staff.id,
      isPrimary: true,
      headline: data.headline || null,
      bio: data.bio || null,
      experience: data.experience || null,
      methodology: data.methodology || null,
      specialties: data.specialties,
      socials: data.socials,
    },
    update: {
      headline: data.headline || null,
      bio: data.bio || null,
      experience: data.experience || null,
      methodology: data.methodology || null,
      specialties: data.specialties,
      socials: data.socials,
    },
  });

  revalidatePath('/tutor');
  revalidatePath('/');
  revalidatePath('/admin/perfil');
  return { ok: true, message: 'Perfil atualizado.' };
}

/** Define a foto do tutor a partir de uma mídia já enviada. */
export async function setTutorPhotoAction(mediaId: string | null): Promise<FormState> {
  const staff = await requireStaff();

  let photoKey: string | null = null;
  if (mediaId) {
    const media = await db.mediaAsset.findUnique({
      where: { id: mediaId },
      select: { storageKey: true, kind: true, status: true },
    });
    if (!media || media.kind !== 'IMAGE' || media.status !== 'READY') {
      return { ok: false, message: 'Imagem inválida.' };
    }
    photoKey = media.storageKey;
  }

  await db.user.update({ where: { id: staff.id }, data: { avatarKey: photoKey } });
  await db.tutorProfile.upsert({
    where: { userId: staff.id },
    create: { userId: staff.id, isPrimary: true, photoKey },
    update: { photoKey },
  });

  revalidatePath('/tutor');
  revalidatePath('/');
  revalidatePath('/admin/perfil');
  return { ok: true, message: photoKey ? 'Foto atualizada.' : 'Foto removida.' };
}
