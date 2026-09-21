import { describe, expect, it } from 'vitest';
import { gradeAttempt, type GradableQuestion } from '@/lib/grading';

const single: GradableQuestion = {
  id: 'q1',
  type: 'SINGLE_CHOICE',
  points: 1,
  options: [
    { id: 'a', isCorrect: false },
    { id: 'b', isCorrect: true },
    { id: 'c', isCorrect: false },
  ],
};

const multiple: GradableQuestion = {
  id: 'q2',
  type: 'MULTIPLE_CHOICE',
  points: 2,
  options: [
    { id: 'a', isCorrect: true },
    { id: 'b', isCorrect: true },
    { id: 'c', isCorrect: false },
  ],
};

const text: GradableQuestion = { id: 'q3', type: 'TEXT', points: 5, options: [] };

describe('gradeAttempt', () => {
  it('pontua escolha única correta', () => {
    const result = gradeAttempt([single], [{ questionId: 'q1', selectedOptionIds: ['b'] }], 70);
    expect(result).toMatchObject({ score: 1, maxScore: 1, percent: 100, passed: true });
  });

  it('zera escolha única errada', () => {
    const result = gradeAttempt([single], [{ questionId: 'q1', selectedOptionIds: ['a'] }], 70);
    expect(result).toMatchObject({ score: 0, percent: 0, passed: false });
  });

  it('múltipla escolha é tudo ou nada: faltou uma correta', () => {
    const result = gradeAttempt([multiple], [{ questionId: 'q2', selectedOptionIds: ['a'] }], 70);
    expect(result.results[0]?.isCorrect).toBe(false);
  });

  it('múltipla escolha é tudo ou nada: marcou uma errada a mais', () => {
    const result = gradeAttempt(
      [multiple],
      [{ questionId: 'q2', selectedOptionIds: ['a', 'b', 'c'] }],
      70,
    );
    expect(result.results[0]?.isCorrect).toBe(false);
  });

  it('múltipla escolha correta independe da ordem', () => {
    const result = gradeAttempt(
      [multiple],
      [{ questionId: 'q2', selectedOptionIds: ['b', 'a'] }],
      70,
    );
    expect(result).toMatchObject({ score: 2, maxScore: 2, passed: true });
  });

  it('pergunta sem resposta conta como errada, não como erro do sistema', () => {
    const result = gradeAttempt([single], [], 70);
    expect(result).toMatchObject({ score: 0, maxScore: 1, passed: false });
  });

  it('ids repetidos não enganam a correção', () => {
    const result = gradeAttempt(
      [multiple],
      [{ questionId: 'q2', selectedOptionIds: ['a', 'a', 'b'] }],
      70,
    );
    expect(result.results[0]?.isCorrect).toBe(true);
  });

  it('pergunta de texto não entra na nota nem no total', () => {
    const result = gradeAttempt(
      [single, text],
      [
        { questionId: 'q1', selectedOptionIds: ['b'] },
        { questionId: 'q3', selectedOptionIds: [], textAnswer: 'qualquer coisa' },
      ],
      70,
    );
    expect(result).toMatchObject({ score: 1, maxScore: 1, percent: 100, passed: true });
    expect(result.results[1]).toMatchObject({ isCorrect: null, pointsAwarded: 0 });
  });

  it('atividade sem pergunta corrigível é aprovada ao enviar', () => {
    const result = gradeAttempt([text], [{ questionId: 'q3', selectedOptionIds: [] }], 70);
    expect(result).toMatchObject({ maxScore: 0, percent: 100, passed: true });
  });

  it('respeita a nota mínima configurada', () => {
    const questions: GradableQuestion[] = [single, { ...single, id: 'q4' }];
    const answers = [
      { questionId: 'q1', selectedOptionIds: ['b'] },
      { questionId: 'q4', selectedOptionIds: ['a'] },
    ];
    expect(gradeAttempt(questions, answers, 50).passed).toBe(true); // 50% >= 50
    expect(gradeAttempt(questions, answers, 51).passed).toBe(false);
  });

  it('questão sem alternativa correta cadastrada nunca é dada como certa', () => {
    const broken: GradableQuestion = {
      id: 'q5',
      type: 'SINGLE_CHOICE',
      points: 1,
      options: [{ id: 'a', isCorrect: false }],
    };
    const result = gradeAttempt([broken], [{ questionId: 'q5', selectedOptionIds: [] }], 70);
    expect(result.results[0]?.isCorrect).toBe(false);
  });
});
