/**
 * Regras de negócio contra um PostgreSQL real.
 *
 * Só roda quando TEST_DATABASE_URL está definida (no CI ela aponta para um
 * serviço Postgres descartável; localmente, para o banco de desenvolvimento).
 * Todo dado criado aqui leva um sufixo único e é removido no final, então o
 * teste não interfere no que já existe.
 *
 *   TEST_DATABASE_URL=postgresql://... npm test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('regras de negócio (banco real)', () => {
  const tag = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  let db: PrismaClient;
  let access: typeof import('@/server/access');
  let progress: typeof import('@/server/progress');
  let activities: typeof import('@/server/activities');

  const ids = {
    tutor: '',
    student: '',
    courseA: '',
    courseB: '',
    bonus: '',
    lessonsA: [] as string[],
    previewLesson: '',
    activity: '',
    question: '',
    questionCorrect: '',
    questionWrong: '',
  };

  const asUser = (id: string, role: 'STUDENT' | 'TUTOR' = 'STUDENT') =>
    ({ id, name: 'Aluno Teste', email: `${id}@teste.local`, role, avatarKey: null, headline: null, isActive: true }) as never;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    ({ db } = await import('@/server/db'));
    access = await import('@/server/access');
    progress = await import('@/server/progress');
    activities = await import('@/server/activities');

    const tutor = await db.user.create({
      data: { name: 'Tutor Teste', email: `tutor-${tag}@teste.local`, passwordHash: 'x', role: 'TUTOR' },
    });
    const student = await db.user.create({
      data: { name: 'Maria Teste', email: `aluno-${tag}@teste.local`, passwordHash: 'x' },
    });
    ids.tutor = tutor.id;
    ids.student = student.id;

    const makeCourse = async (slug: string, lessons: number, extra: object = {}) => {
      const course = await db.course.create({
        data: {
          slug: `${slug}-${tag}`,
          title: `Curso ${slug}`,
          shortDescription: 'Curso de teste automatizado',
          status: 'PUBLISHED',
          accessType: 'RESTRICTED',
          tutorId: tutor.id,
          certificateEnabled: true,
          ...extra,
        },
      });
      const courseModule = await db.module.create({ data: { courseId: course.id, title: 'M1', position: 0 } });
      const lessonIds: string[] = [];
      for (let i = 0; i < lessons; i += 1) {
        const lesson = await db.lesson.create({
          data: {
            moduleId: courseModule.id,
            title: `Aula ${i + 1}`,
            slug: `aula-${i + 1}`,
            position: i,
            durationSeconds: 100,
            isPreview: i === 0 && slug === 'a',
          },
        });
        lessonIds.push(lesson.id);
      }
      return { course, lessonIds };
    };

    const a = await makeCourse('a', 3);
    const b = await makeCourse('b', 2);
    ids.courseA = a.course.id;
    ids.courseB = b.course.id;
    ids.lessonsA = a.lessonIds;
    ids.previewLesson = a.lessonIds[0]!;

    const bonus = await makeCourse('bonus', 1, {
      isBonus: true,
      unlocksWithCourseIds: [a.course.id, b.course.id],
    });
    ids.bonus = bonus.course.id;

    // Atividade obrigatória no curso A: 1 pergunta de escolha única.
    const activity = await db.activity.create({
      data: { courseId: a.course.id, title: 'Checkpoint', isRequired: true, passingScore: 100, maxAttempts: 2 },
    });
    ids.activity = activity.id;
    const question = await db.question.create({
      data: {
        activityId: activity.id,
        prompt: 'Qual é a certa?',
        type: 'SINGLE_CHOICE',
        points: 1,
        options: {
          create: [
            { text: 'Errada', isCorrect: false, position: 0 },
            { text: 'Certa', isCorrect: true, position: 1 },
          ],
        },
      },
      include: { options: true },
    });
    ids.questionCorrect = question.options.find((o) => o.isCorrect)!.id;
    ids.questionWrong = question.options.find((o) => !o.isCorrect)!.id;
    ids.question = question.id;
  });

  afterAll(async () => {
    if (!db) return;
    const courseIds = [ids.courseA, ids.courseB, ids.bonus].filter(Boolean);
    await db.certificate.deleteMany({ where: { courseId: { in: courseIds } } });
    await db.course.deleteMany({ where: { id: { in: courseIds } } });
    await db.user.deleteMany({ where: { id: { in: [ids.tutor, ids.student].filter(Boolean) } } });
    await db.$disconnect();
  });

  // ------------------------------------------------------------------ Acesso
  describe('controle de acesso', () => {
    it('visitante só vê a aula de amostra', async () => {
      expect((await access.lessonAccess(null, ids.previewLesson)).allowed).toBe(true);
      const blocked = await access.lessonAccess(null, ids.lessonsA[1]!);
      expect(blocked).toMatchObject({ allowed: false, reason: 'not-enrolled' });
    });

    it('aluno matriculado em aula de amostra é tratado como aluno, não como visitante', async () => {
      await access.grantAccess(ids.student, ids.courseA);
      const result = await access.lessonAccess(asUser(ids.student), ids.previewLesson);
      expect(result).toMatchObject({ allowed: true, reason: 'enrolled' });
      await db.enrollment.deleteMany({ where: { userId: ids.student, courseId: ids.courseA } });
    });

    it('aluno sem matrícula não acessa aula paga', async () => {
      const result = await access.lessonAccess(asUser(ids.student), ids.lessonsA[1]!);
      expect(result.allowed).toBe(false);
    });

    it('curso restrito não permite matrícula por conta própria', async () => {
      await expect(access.selfEnroll(asUser(ids.student), ids.courseA)).rejects.toMatchObject({
        status: 403,
      });
    });

    it('depois da liberação o aluno acessa', async () => {
      await access.grantAccess(ids.student, ids.courseA);
      const result = await access.lessonAccess(asUser(ids.student), ids.lessonsA[1]!);
      expect(result).toMatchObject({ allowed: true, reason: 'enrolled' });
    });

    it('acesso expirado é bloqueado e marcado como EXPIRED', async () => {
      await access.grantAccess(ids.student, ids.courseA, { expiresAt: new Date(Date.now() - 60_000) });
      const result = await access.lessonAccess(asUser(ids.student), ids.lessonsA[1]!);
      expect(result).toMatchObject({ allowed: false, reason: 'expired' });
      const row = await db.enrollment.findUnique({
        where: { userId_courseId: { userId: ids.student, courseId: ids.courseA } },
      });
      expect(row?.status).toBe('EXPIRED');
    });

    it('acesso revogado é bloqueado; restaurar devolve o acesso', async () => {
      await access.grantAccess(ids.student, ids.courseA);
      await access.revokeAccess(ids.student, ids.courseA);
      expect((await access.lessonAccess(asUser(ids.student), ids.lessonsA[1]!)).reason).toBe('revoked');
      await access.grantAccess(ids.student, ids.courseA);
      expect((await access.lessonAccess(asUser(ids.student), ids.lessonsA[1]!)).allowed).toBe(true);
    });

    it('curso despublicado some para o aluno, mas o tutor continua vendo', async () => {
      await db.course.update({ where: { id: ids.courseA }, data: { status: 'DRAFT' } });
      expect((await access.lessonAccess(asUser(ids.student), ids.lessonsA[1]!)).reason).toBe('unpublished');
      expect((await access.lessonAccess(asUser(ids.tutor, 'TUTOR'), ids.lessonsA[1]!)).allowed).toBe(true);
      await db.course.update({ where: { id: ids.courseA }, data: { status: 'PUBLISHED' } });
    });
  });

  // ---------------------------------------------------------------- Progresso
  describe('progresso e conclusão', () => {
    it('nunca regride o percentual assistido', async () => {
      const lesson = ids.lessonsA[0]!;
      await progress.recordLessonProgress(ids.student, lesson, { positionSeconds: 80, durationSeconds: 100 });
      await progress.recordLessonProgress(ids.student, lesson, { positionSeconds: 10, durationSeconds: 100 });
      const row = await db.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: ids.student, lessonId: lesson } },
      });
      expect(row?.percent).toBe(80);
      expect(row?.lastPositionSeconds).toBe(10); // posição de retomada é a última
    });

    it('aula conclui ao passar do limite de 92%', async () => {
      const result = await progress.recordLessonProgress(ids.student, ids.lessonsA[0]!, {
        positionSeconds: 95,
        durationSeconds: 100,
      });
      expect(result.lessonCompleted).toBe(true);
    });

    it('concluir todas as aulas NÃO conclui o curso enquanto houver atividade obrigatória pendente', async () => {
      for (const lesson of ids.lessonsA) {
        await progress.recordLessonProgress(ids.student, lesson, {
          positionSeconds: 100,
          durationSeconds: 100,
          completed: true,
        });
      }
      const enrollment = await db.enrollment.findUnique({
        where: { userId_courseId: { userId: ids.student, courseId: ids.courseA } },
      });
      expect(enrollment?.progressPercent).toBe(100);
      expect(enrollment?.completedAt).toBeNull();
      expect(await db.certificate.count({ where: { courseId: ids.courseA } })).toBe(0);
    });

    it('"continuar aprendendo" aponta para a primeira aula não concluída', async () => {
      await db.lessonProgress.updateMany({
        where: { userId: ids.student, lessonId: ids.lessonsA[1]! },
        data: { status: 'IN_PROGRESS', lastPositionSeconds: 42 },
      });
      const next = await progress.nextLessonFor(ids.student, ids.courseA);
      expect(next).toMatchObject({ lessonId: ids.lessonsA[1], resumeAt: 42 });

      // Restaura o estado: os testes seguintes dependem das aulas concluídas.
      await db.lessonProgress.updateMany({
        where: { userId: ids.student, lessonId: ids.lessonsA[1]! },
        data: { status: 'COMPLETED' },
      });
    });
  });

  // ---------------------------------------------------------------- Atividades
  describe('atividade obrigatória e certificado', () => {
    const question = () => ids.question;

    it('resposta errada reprova e não conclui o curso', async () => {
      const feedback = await activities.submitAttempt(asUser(ids.student), ids.activity, [
        { questionId: question(), selectedOptionIds: [ids.questionWrong] },
      ]);
      expect(feedback).toMatchObject({ passed: false, percent: 0, attemptsUsed: 1, courseCompleted: false });
    });

    it('alternativa de outra pergunta é ignorada, não vira acerto', async () => {
      const feedback = await activities.submitAttempt(asUser(ids.student), ids.activity, [
        { questionId: question(), selectedOptionIds: ['id-inexistente'] },
      ]);
      expect(feedback.passed).toBe(false);
    });

    it('respeita o limite de tentativas', async () => {
      await expect(
        activities.submitAttempt(asUser(ids.student), ids.activity, [
          { questionId: question(), selectedOptionIds: [ids.questionCorrect] },
        ]),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('passar na atividade conclui o curso e emite UM certificado (idempotente)', async () => {
      // Libera nova tentativa aumentando o limite (decisão do tutor).
      await db.activity.update({ where: { id: ids.activity }, data: { maxAttempts: 5 } });
      const feedback = await activities.submitAttempt(asUser(ids.student), ids.activity, [
        { questionId: question(), selectedOptionIds: [ids.questionCorrect] },
      ]);
      expect(feedback).toMatchObject({ passed: true, courseCompleted: true });
      expect(feedback.certificateCode).toMatch(/^AL-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

      // Recalcular de novo não duplica.
      await progress.refreshCourseProgress(ids.student, ids.courseA);
      await progress.refreshCourseProgress(ids.student, ids.courseA);
      expect(await db.certificate.count({ where: { courseId: ids.courseA, userId: ids.student } })).toBe(1);
    });

    it('o certificado congela nome, curso e carga horária', async () => {
      const certificate = await db.certificate.findFirstOrThrow({
        where: { courseId: ids.courseA, userId: ids.student },
      });
      expect(certificate).toMatchObject({ studentName: 'Maria Teste', courseTitle: 'Curso a' });
      await db.course.update({ where: { id: ids.courseA }, data: { title: 'Renomeado depois' } });
      const again = await db.certificate.findUniqueOrThrow({ where: { id: certificate.id } });
      expect(again.courseTitle).toBe('Curso a');
    });

    it('tutor testando a atividade não grava tentativa', async () => {
      const before = await db.activityAttempt.count({ where: { activityId: ids.activity } });
      const feedback = await activities.submitAttempt(asUser(ids.tutor, 'TUTOR'), ids.activity, [
        { questionId: question(), selectedOptionIds: [ids.questionCorrect] },
      ]);
      expect(feedback.preview).toBe(true);
      expect(await db.activityAttempt.count({ where: { activityId: ids.activity } })).toBe(before);
    });
  });

  // -------------------------------------------------------------------- Bônus
  describe('curso bônus', () => {
    it('não é liberado com apenas um dos cursos', async () => {
      expect(await db.enrollment.count({ where: { userId: ids.student, courseId: ids.bonus } })).toBe(0);
    });

    it('é liberado automaticamente ao ter acesso aos dois cursos', async () => {
      await access.grantAccess(ids.student, ids.courseB);
      const bonus = await db.enrollment.findUnique({
        where: { userId_courseId: { userId: ids.student, courseId: ids.bonus } },
      });
      expect(bonus).toMatchObject({ status: 'ACTIVE', source: 'bonus' });
    });

    it('avisa o aluno dentro da plataforma', async () => {
      const note = await db.notification.findFirst({
        where: { userId: ids.student, type: 'bonus' },
      });
      expect(note).not.toBeNull();
    });
  });
});
