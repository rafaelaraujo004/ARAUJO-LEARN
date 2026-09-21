import 'server-only';
import { db } from '@/server/db';
import { HttpError } from '@/server/auth/guards';
import { isStaff, type SessionUser } from '@/server/auth/session';
import { courseAccess, mensagemDeBloqueio } from '@/server/access';
import { refreshCourseProgress } from '@/server/progress';
import {
  gradeAttempt,
  type GradeResult,
  type SubmittedAnswer,
} from '@/lib/grading';

/**
 * Atividades: leitura para o aluno e envio de respostas.
 *
 * A correção acontece aqui, no servidor. O que vai para o navegador antes do
 * envio NUNCA inclui qual alternativa é a correta.
 */

export interface AttemptFeedback extends GradeResult {
  attemptsUsed: number;
  maxAttempts: number | null;
  courseCompleted: boolean;
  certificateCode?: string;
  /** Não gravado: tutor testando a própria atividade. */
  preview: boolean;
  questions: Array<{
    questionId: string;
    isCorrect: boolean | null;
    correctOptionIds: string[];
    explanation: string | null;
  }>;
}

/** Atividade + perguntas SEM o gabarito, pronta para o aluno responder. */
export async function getActivityForStudent(activityId: string) {
  return db.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      isRequired: true,
      passingScore: true,
      maxAttempts: true,
      isPublished: true,
      courseId: true,
      lessonId: true,
      course: { select: { slug: true, title: true, status: true } },
      lesson: { select: { id: true, title: true } },
      questions: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          prompt: true,
          type: true,
          points: true,
          options: {
            orderBy: { position: 'asc' },
            select: { id: true, text: true },
          },
        },
      },
    },
  });
}

/** Histórico do aluno nesta atividade. */
export async function attemptSummary(userId: string, activityId: string) {
  const attempts = await db.activityAttempt.findMany({
    where: { userId, activityId, submittedAt: { not: null } },
    orderBy: { submittedAt: 'desc' },
    select: { id: true, score: true, maxScore: true, passed: true, submittedAt: true },
  });

  const percentOf = (attempt: { score: number; maxScore: number }) =>
    attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 100;

  return {
    count: attempts.length,
    passed: attempts.some((attempt) => attempt.passed),
    bestPercent: attempts.reduce((best, attempt) => Math.max(best, percentOf(attempt)), 0),
    lastPercent: attempts[0] ? percentOf(attempts[0]) : null,
    lastAt: attempts[0]?.submittedAt ?? null,
  };
}

export async function submitAttempt(
  user: SessionUser,
  activityId: string,
  answers: SubmittedAnswer[],
): Promise<AttemptFeedback> {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      courseId: true,
      isPublished: true,
      passingScore: true,
      maxAttempts: true,
      course: { select: { status: true } },
      questions: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          type: true,
          points: true,
          explanation: true,
          options: { select: { id: true, isCorrect: true } },
        },
      },
    },
  });
  if (!activity) throw new HttpError(404, 'Atividade não encontrada.');

  const staff = isStaff(user.role);

  if (!staff) {
    if (!activity.isPublished || activity.course.status !== 'PUBLISHED') {
      throw new HttpError(403, 'Esta atividade ainda não está disponível.');
    }
    const access = await courseAccess(user, activity.courseId);
    if (!access.allowed) throw new HttpError(403, mensagemDeBloqueio(access.reason));
  }

  // Só aceita alternativas que realmente pertencem à pergunta enviada.
  const valid = new Map(
    activity.questions.map((question) => [
      question.id,
      new Set(question.options.map((option) => option.id)),
    ]),
  );
  const clean: SubmittedAnswer[] = [];
  for (const answer of answers) {
    const options = valid.get(answer.questionId);
    if (!options) continue;
    clean.push({
      questionId: answer.questionId,
      selectedOptionIds: answer.selectedOptionIds.filter((id) => options.has(id)),
      textAnswer: answer.textAnswer?.slice(0, 5000),
    });
  }

  const graded = gradeAttempt(
    activity.questions.map((question) => ({
      id: question.id,
      type: question.type,
      points: question.points,
      options: question.options,
    })),
    clean,
    activity.passingScore,
  );

  const explanations = new Map(
    activity.questions.map((question) => [question.id, question.explanation]),
  );
  const questions = graded.results.map((result) => ({
    questionId: result.questionId,
    isCorrect: result.isCorrect,
    correctOptionIds: result.correctOptionIds,
    explanation: explanations.get(result.questionId) ?? null,
  }));

  // Tutor testando: mostra o resultado sem gravar nada.
  if (staff) {
    return {
      ...graded,
      questions,
      attemptsUsed: 0,
      maxAttempts: null,
      courseCompleted: false,
      preview: true,
    };
  }

  const used = await db.activityAttempt.count({
    where: { userId: user.id, activityId, submittedAt: { not: null } },
  });
  if (activity.maxAttempts !== null && used >= activity.maxAttempts) {
    throw new HttpError(403, 'Você já usou todas as tentativas desta atividade.');
  }

  const now = new Date();
  await db.activityAttempt.create({
    data: {
      activityId,
      userId: user.id,
      score: graded.score,
      maxScore: graded.maxScore,
      passed: graded.passed,
      startedAt: now,
      submittedAt: now,
      answers: {
        create: clean.map((answer) => {
          const result = graded.results.find((item) => item.questionId === answer.questionId);
          return {
            questionId: answer.questionId,
            selectedOptionIds: answer.selectedOptionIds,
            textAnswer: answer.textAnswer || null,
            isCorrect: result?.isCorrect ?? false,
            pointsAwarded: result?.pointsAwarded ?? 0,
          };
        }),
      },
    },
  });

  // Passar em uma atividade obrigatória pode ser o que faltava para concluir o curso.
  let courseCompleted = false;
  let certificateCode: string | undefined;
  if (graded.passed) {
    const summary = await refreshCourseProgress(user.id, activity.courseId);
    courseCompleted = summary.completed;
    certificateCode = summary.certificateCode;
  }

  return {
    ...graded,
    questions,
    attemptsUsed: used + 1,
    maxAttempts: activity.maxAttempts,
    courseCompleted,
    certificateCode,
    preview: false,
  };
}
