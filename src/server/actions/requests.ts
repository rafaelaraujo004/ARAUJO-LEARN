'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { getCurrentUser } from '@/server/auth/session';
import { requireStaff } from '@/server/auth/guards';
import { grantAccess } from '@/server/access';
import { refreshCourseProgress } from '@/server/progress';
import type { FormState } from '@/lib/form-state';

/**
 * Pedidos de matrícula.
 *
 * O pagamento é combinado fora da plataforma (PIX ou cartão, direto com o
 * tutor). O aluno registra o interesse aqui, o tutor confirma o pagamento e
 * libera o acesso em um clique. Quando houver um gateway, ele passa a chamar
 * `approveRequestAction` automaticamente — o resto continua igual.
 */

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export async function requestEnrollmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const slug = text(formData, 'slug');
  if (!slug) return { ok: false, message: 'Curso não informado.' };

  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/cursos/${slug}`)}`);

  const course = await db.course.findUnique({
    where: { slug },
    select: { id: true, title: true, status: true },
  });
  if (!course || course.status !== 'PUBLISHED') {
    return { ok: false, message: 'Curso não encontrado.' };
  }

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    select: { status: true },
  });
  if (enrollment && enrollment.status !== 'REVOKED') {
    return { ok: true, message: 'Você já tem acesso a este curso.' };
  }

  const payment = text(formData, 'payment') || 'a-combinar';
  const message = text(formData, 'message').slice(0, 1000);

  await db.enrollmentRequest.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    create: {
      userId: user.id,
      courseId: course.id,
      payment,
      message: message || null,
    },
    update: {
      status: 'PENDING',
      payment,
      message: message || null,
      handledAt: null,
    },
  });

  // Avisa o tutor dentro da plataforma, além do contato por WhatsApp.
  const staff = await db.user.findMany({
    where: { role: { in: ['TUTOR', 'ADMIN'] } },
    select: { id: true },
  });
  await db.notification.createMany({
    data: staff.map((member) => ({
      userId: member.id,
      type: 'request',
      title: 'Novo pedido de matrícula',
      body: `${user.name} pediu acesso a "${course.title}".`,
      link: '/admin/solicitacoes',
    })),
  });

  revalidatePath('/admin/solicitacoes');
  revalidatePath(`/cursos/${slug}`);

  return {
    ok: true,
    message:
      'Pedido registrado. Combine o pagamento com o tutor pelo WhatsApp, assim que ele confirmar, seu acesso é liberado.',
  };
}

export async function approveRequestAction(requestId: string): Promise<FormState> {
  await requireStaff();

  const request = await db.enrollmentRequest.findUnique({
    where: { id: requestId },
    select: { userId: true, courseId: true, course: { select: { title: true } } },
  });
  if (!request) return { ok: false, message: 'Pedido não encontrado.' };

  await grantAccess(request.userId, request.courseId, { source: 'tutor' });
  await refreshCourseProgress(request.userId, request.courseId);

  await db.enrollmentRequest.update({
    where: { id: requestId },
    data: { status: 'APPROVED', handledAt: new Date() },
  });

  await db.notification.create({
    data: {
      userId: request.userId,
      type: 'access',
      title: 'Acesso liberado',
      body: `Seu acesso ao curso "${request.course.title}" está liberado. Bons estudos!`,
      link: '/meus-cursos',
    },
  });

  revalidatePath('/admin/solicitacoes');
  revalidatePath('/admin/alunos');
  return { ok: true, message: 'Acesso liberado e aluno avisado.' };
}

export async function declineRequestAction(requestId: string): Promise<FormState> {
  await requireStaff();

  await db.enrollmentRequest.update({
    where: { id: requestId },
    data: { status: 'DECLINED', handledAt: new Date() },
  });

  revalidatePath('/admin/solicitacoes');
  return { ok: true, message: 'Pedido marcado como recusado.' };
}
