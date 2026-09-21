'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { HttpError, requireStaff } from '@/server/auth/guards';
import { getCurrentUser } from '@/server/auth/session';
import { submitAttempt, type AttemptFeedback } from '@/server/activities';
import { activitySchema, fieldErrors, questionSchema, submitAttemptSchema } from '@/lib/validation';
import { rateLimit } from '@/server/api';
import type { FormState } from '@/lib/form-state';

// ----------------------------------------------------------------- Aluno

export type SubmitResult =
  | { ok: true; feedback: AttemptFeedback }
  | { ok: false; message: string };

export async function submitAttemptAction(input: unknown): Promise<SubmitResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Sua sessão expirou. Entre novamente.' };

  const limit = rateLimit(`attempt:${user.id}`, { limit: 30, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return { ok: false, message: 'Muitos envios seguidos. Aguarde um pouco e tente de novo.' };
  }

  const parsed = submitAttemptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Respostas inválidas.' };

  try {
    const feedback = await submitAttempt(user, parsed.data.activityId, parsed.data.answers);
    revalidatePath(`/atividade/${parsed.data.activityId}`);
    revalidatePath('/painel');
    revalidatePath('/meus-cursos');
    return { ok: true, feedback };
  } catch (error) {
    if (error instanceof HttpError) return { ok: false, message: error.message };
    console.error('[activities] falha ao enviar tentativa:', error);
    return { ok: false, message: 'Não foi possível enviar as respostas. Tente novamente.' };
  }
}

// ----------------------------------------------------------------- Tutor

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function flag(formData: FormData, name: string): boolean {
  return formData.get(name) === 'on' || formData.get(name) === 'true';
}

function revalidateActivities(courseId: string, activityId?: string) {
  revalidatePath(`/admin/cursos/${courseId}/atividades`);
  if (activityId) revalidatePath(`/admin/cursos/${courseId}/atividades/${activityId}`);
  revalidatePath(`/admin/cursos/${courseId}/conteudo`);
}

export async function createActivityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const courseId = text(formData, 'courseId');
  if (!courseId) return { ok: false, message: 'Curso não informado.' };

  const parsed = activitySchema.safeParse({
    title: text(formData, 'title'),
    description: text(formData, 'description'),
    type: text(formData, 'type') || 'QUIZ',
    isRequired: flag(formData, 'isRequired'),
    passingScore: text(formData, 'passingScore') || 70,
    lessonId: text(formData, 'lessonId'),
    moduleId: text(formData, 'moduleId'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const data = parsed.data;

  // Valida que a aula/módulo escolhidos pertencem mesmo a este curso.
  if (data.lessonId) {
    const lesson = await db.lesson.findFirst({
      where: { id: data.lessonId, module: { courseId } },
      select: { id: true },
    });
    if (!lesson) return { ok: false, errors: { lessonId: 'Aula não pertence a este curso.' } };
  }
  if (data.moduleId) {
    const found = await db.module.findFirst({
      where: { id: data.moduleId, courseId },
      select: { id: true },
    });
    if (!found) return { ok: false, errors: { moduleId: 'Módulo não pertence a este curso.' } };
  }

  const last = await db.activity.findFirst({
    where: { courseId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const activity = await db.activity.create({
    data: {
      courseId,
      title: data.title,
      description: data.description || null,
      type: data.type,
      isRequired: data.isRequired,
      passingScore: data.passingScore,
      lessonId: data.lessonId || null,
      moduleId: data.lessonId ? null : data.moduleId || null,
      position: (last?.position ?? -1) + 1,
    },
    select: { id: true },
  });

  revalidateActivities(courseId);
  return { ok: true, message: 'Atividade criada.', createdId: activity.id };
}

export async function updateActivityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const activityId = text(formData, 'activityId');
  if (!activityId) return { ok: false, message: 'Atividade não informada.' };

  const parsed = activitySchema.safeParse({
    title: text(formData, 'title'),
    description: text(formData, 'description'),
    type: text(formData, 'type') || 'QUIZ',
    isRequired: flag(formData, 'isRequired'),
    passingScore: text(formData, 'passingScore') || 70,
    lessonId: text(formData, 'lessonId'),
    moduleId: text(formData, 'moduleId'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const existing = await db.activity.findUnique({
    where: { id: activityId },
    select: { courseId: true },
  });
  if (!existing) return { ok: false, message: 'Atividade não encontrada.' };

  const data = parsed.data;
  const maxAttempts = text(formData, 'maxAttempts');

  await db.activity.update({
    where: { id: activityId },
    data: {
      title: data.title,
      description: data.description || null,
      type: data.type,
      isRequired: data.isRequired,
      passingScore: data.passingScore,
      isPublished: flag(formData, 'isPublished'),
      maxAttempts: maxAttempts ? Math.max(1, Number.parseInt(maxAttempts, 10) || 1) : null,
      lessonId: data.lessonId || null,
      moduleId: data.lessonId ? null : data.moduleId || null,
    },
  });

  revalidateActivities(existing.courseId, activityId);
  return { ok: true, message: 'Atividade salva.' };
}

export async function deleteActivityAction(activityId: string): Promise<FormState> {
  await requireStaff();
  const existing = await db.activity.findUnique({
    where: { id: activityId },
    select: { courseId: true },
  });
  if (!existing) return { ok: false, message: 'Atividade não encontrada.' };

  await db.activity.delete({ where: { id: activityId } });
  revalidateActivities(existing.courseId);
  return { ok: true, message: 'Atividade excluída.' };
}

/** Cria ou atualiza uma pergunta junto com as alternativas. */
export async function saveQuestionAction(input: {
  activityId: string;
  questionId?: string;
  prompt: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'TEXT';
  explanation?: string;
  points: number;
  options: Array<{ text: string; isCorrect: boolean }>;
}): Promise<FormState> {
  await requireStaff();

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const activity = await db.activity.findUnique({
    where: { id: input.activityId },
    select: { courseId: true },
  });
  if (!activity) return { ok: false, message: 'Atividade não encontrada.' };

  // Regras de consistência: sem elas o aluno nunca conseguiria acertar.
  if (data.type !== 'TEXT') {
    if (data.options.length < 2) {
      return { ok: false, message: 'Inclua ao menos duas alternativas.' };
    }
    const correct = data.options.filter((option) => option.isCorrect).length;
    if (correct === 0) return { ok: false, message: 'Marque ao menos uma alternativa correta.' };
    if (data.type !== 'MULTIPLE_CHOICE' && correct > 1) {
      return {
        ok: false,
        message: 'Este tipo de pergunta aceita apenas uma alternativa correta.',
      };
    }
  }

  const options = data.type === 'TEXT' ? [] : data.options;

  if (input.questionId) {
    await db.$transaction([
      db.questionOption.deleteMany({ where: { questionId: input.questionId } }),
      db.question.update({
        where: { id: input.questionId },
        data: {
          prompt: data.prompt,
          type: data.type,
          explanation: data.explanation || null,
          points: data.points,
          options: {
            create: options.map((option, index) => ({
              text: option.text,
              isCorrect: option.isCorrect,
              position: index,
            })),
          },
        },
      }),
    ]);
  } else {
    const last = await db.question.findFirst({
      where: { activityId: input.activityId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    await db.question.create({
      data: {
        activityId: input.activityId,
        prompt: data.prompt,
        type: data.type,
        explanation: data.explanation || null,
        points: data.points,
        position: (last?.position ?? -1) + 1,
        options: {
          create: options.map((option, index) => ({
            text: option.text,
            isCorrect: option.isCorrect,
            position: index,
          })),
        },
      },
    });
  }

  revalidateActivities(activity.courseId, input.activityId);
  return { ok: true, message: 'Pergunta salva.' };
}

export async function deleteQuestionAction(questionId: string): Promise<FormState> {
  await requireStaff();
  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { activityId: true, activity: { select: { courseId: true } } },
  });
  if (!question) return { ok: false, message: 'Pergunta não encontrada.' };

  await db.question.delete({ where: { id: questionId } });
  revalidateActivities(question.activity.courseId, question.activityId);
  return { ok: true, message: 'Pergunta excluída.' };
}

export async function reorderQuestionsAction(
  activityId: string,
  ids: string[],
): Promise<FormState> {
  await requireStaff();
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: { courseId: true },
  });
  if (!activity) return { ok: false, message: 'Atividade não encontrada.' };

  await db.$transaction(
    ids.map((id, index) =>
      db.question.updateMany({ where: { id, activityId }, data: { position: index } }),
    ),
  );
  revalidateActivities(activity.courseId, activityId);
  return { ok: true, message: 'Ordem atualizada.' };
}
