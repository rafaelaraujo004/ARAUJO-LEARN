/**
 * Correção de atividades.
 *
 * Função pura, sem banco e sem 'server-only': é o coração da regra "o aluno
 * passou?", então precisa ser fácil de testar. O servidor a chama ao receber
 * as respostas — o cliente nunca decide a nota.
 *
 * Regras:
 *  - Escolha única e verdadeiro/falso: certa se marcou exatamente a alternativa correta.
 *  - Múltipla escolha: tudo ou nada — precisa marcar todas as corretas e nenhuma errada.
 *  - Pergunta de texto: não tem correção automática. Fica registrada, mas não
 *    entra na nota (nem no total), para não punir quem escreveu uma boa resposta
 *    que o sistema não sabe avaliar.
 *  - Atividade sem nenhuma pergunta corrigível (ex.: atividade de conclusão)
 *    é aprovada ao ser enviada.
 */

export type GradableType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'TEXT';

export interface GradableQuestion {
  id: string;
  type: GradableType;
  points: number;
  options: Array<{ id: string; isCorrect: boolean }>;
}

export interface SubmittedAnswer {
  questionId: string;
  selectedOptionIds: string[];
  textAnswer?: string;
}

export interface QuestionResult {
  questionId: string;
  /** `null` = pergunta sem correção automática. */
  isCorrect: boolean | null;
  pointsAwarded: number;
  correctOptionIds: string[];
}

export interface GradeResult {
  score: number;
  maxScore: number;
  /** 0–100 */
  percent: number;
  passed: boolean;
  results: QuestionResult[];
}

export function isAutoGraded(type: GradableType): boolean {
  return type !== 'TEXT';
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return set.size === b.length && b.every((item) => set.has(item));
}

export function gradeAttempt(
  questions: GradableQuestion[],
  answers: SubmittedAnswer[],
  passingScore: number,
): GradeResult {
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const results: QuestionResult[] = [];

  let score = 0;
  let maxScore = 0;

  for (const question of questions) {
    const correctOptionIds = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id);

    if (!isAutoGraded(question.type)) {
      results.push({
        questionId: question.id,
        isCorrect: null,
        pointsAwarded: 0,
        correctOptionIds: [],
      });
      continue;
    }

    maxScore += question.points;

    const selected = [...new Set(byQuestion.get(question.id)?.selectedOptionIds ?? [])];
    const isCorrect = correctOptionIds.length > 0 && sameSet(selected, correctOptionIds);
    const pointsAwarded = isCorrect ? question.points : 0;
    score += pointsAwarded;

    results.push({ questionId: question.id, isCorrect, pointsAwarded, correctOptionIds });
  }

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;

  return {
    score,
    maxScore,
    percent,
    passed: maxScore === 0 ? true : percent >= passingScore,
    results,
  };
}
