import { z } from 'zod';
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from './constants';

/**
 * Schemas compartilhados entre formulários e API.
 * A validação do cliente é conveniência; a do servidor é a que vale.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail.')
  .max(254, 'E-mail longo demais.')
  .email('E-mail inválido.')
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, 'Use ao menos 8 caracteres.')
  .max(200, 'Senha longa demais.')
  .regex(/[a-zA-Z]/, 'Inclua ao menos uma letra.')
  .regex(/[0-9]/, 'Inclua ao menos um número.');

export const registerSchema = z.object({
  name: trimmed(120).min(2, 'Informe seu nome completo.'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha.'),
  next: z.string().optional(),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({
  token: z.string().min(10, 'Link inválido.'),
  password: passwordSchema,
});

export const profileSchema = z.object({
  name: trimmed(120).min(2, 'Informe seu nome.'),
  headline: trimmed(160).optional().or(z.literal('')),
  bio: trimmed(2000).optional().or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  password: passwordSchema,
});

// ------------------------------------------------------------------ Cursos

export const courseLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export const courseStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const courseAccessSchema = z.enum(['FREE', 'RESTRICTED']);

export const courseSchema = z.object({
  title: trimmed(160).min(3, 'Dê um título ao curso.'),
  slug: trimmed(90)
    .regex(/^[a-z0-9-]*$/, 'Use apenas letras minúsculas, números e hífen.')
    .optional()
    .or(z.literal('')),
  shortDescription: trimmed(280).min(10, 'Escreva uma descrição curta (ao menos 10 caracteres).'),
  description: trimmed(8000).optional().or(z.literal('')),
  objective: trimmed(2000).optional().or(z.literal('')),
  audience: trimmed(2000).optional().or(z.literal('')),
  level: courseLevelSchema,
  accessType: courseAccessSchema,
  durationMinutes: z.coerce.number().int().min(0).max(100_000).nullable().optional(),
  certificateEnabled: z.boolean(),
});

export const moduleSchema = z.object({
  title: trimmed(160).min(2, 'Dê um título ao módulo.'),
  description: trimmed(2000).optional().or(z.literal('')),
});

export const lessonSchema = z.object({
  title: trimmed(160).min(2, 'Dê um título à aula.'),
  description: trimmed(1000).optional().or(z.literal('')),
  content: trimmed(40_000).optional().or(z.literal('')),
  notes: trimmed(4000).optional().or(z.literal('')),
  durationSeconds: z.coerce.number().int().min(0).max(360_000),
  isPreview: z.boolean(),
  isPublished: z.boolean(),
});

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Nada para reordenar.'),
});

// ----------------------------------------------------------------- Materiais

export const materialSchema = z
  .object({
    title: trimmed(160).min(2, 'Dê um nome ao material.'),
    description: trimmed(1000).optional().or(z.literal('')),
    type: z.enum(['FILE', 'LINK']),
    url: trimmed(2000).optional().or(z.literal('')),
    mediaId: z.string().optional().or(z.literal('')),
    lessonId: z.string().optional().or(z.literal('')),
    moduleId: z.string().optional().or(z.literal('')),
    courseId: z.string().optional().or(z.literal('')),
  })
  .refine((value) => (value.type === 'LINK' ? Boolean(value.url) : Boolean(value.mediaId)), {
    message: 'Informe o link ou envie o arquivo.',
    path: ['url'],
  })
  .refine((value) => value.type !== 'LINK' || /^https?:\/\//i.test(value.url ?? ''), {
    message: 'O link deve começar com http:// ou https://',
    path: ['url'],
  });

// ------------------------------------------------------------------ Uploads

export const mediaKindSchema = z.enum(['VIDEO', 'DOCUMENT', 'IMAGE']);

export const createUploadSchema = z
  .object({
    kind: mediaKindSchema,
    fileName: trimmed(255).min(1, 'Nome de arquivo ausente.'),
    contentType: trimmed(160).min(1, 'Tipo de arquivo ausente.'),
    sizeBytes: z.coerce.number().int().positive('Arquivo vazio.'),
  })
  .superRefine((value, ctx) => {
    const rules = {
      VIDEO: { types: ACCEPTED_VIDEO_TYPES, max: MAX_VIDEO_BYTES, label: 'vídeo' },
      DOCUMENT: { types: ACCEPTED_DOCUMENT_TYPES, max: MAX_DOCUMENT_BYTES, label: 'documento' },
      IMAGE: { types: ACCEPTED_IMAGE_TYPES, max: MAX_IMAGE_BYTES, label: 'imagem' },
    }[value.kind];

    if (!rules.types.includes(value.contentType)) {
      ctx.addIssue({
        code: 'custom',
        path: ['contentType'],
        message: `Formato de ${rules.label} não aceito: ${value.contentType}`,
      });
    }
    if (value.sizeBytes > rules.max) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizeBytes'],
        message: `Arquivo maior que o limite para ${rules.label}.`,
      });
    }
  });

export const completeUploadSchema = z.object({
  mediaId: z.string().min(1),
  parts: z
    .array(z.object({ partNumber: z.number().int().positive(), etag: z.string().min(1) }))
    .optional(),
  durationSeconds: z.coerce.number().int().min(0).max(360_000).optional(),
  width: z.coerce.number().int().min(0).max(20_000).optional(),
  height: z.coerce.number().int().min(0).max(20_000).optional(),
});

// ----------------------------------------------------------------- Progresso

export const progressSchema = z.object({
  lessonId: z.string().min(1),
  positionSeconds: z.coerce.number().min(0).max(360_000),
  durationSeconds: z.coerce.number().min(0).max(360_000).optional(),
  /** Marcação explícita pelo aluno (aula sem vídeo, ou "marcar como concluída"). */
  completed: z.boolean().optional(),
});

// ---------------------------------------------------------------- Atividades

export const questionTypeSchema = z.enum([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'TEXT',
]);

export const activitySchema = z.object({
  title: trimmed(160).min(2, 'Dê um título à atividade.'),
  description: trimmed(2000).optional().or(z.literal('')),
  type: z.enum(['QUIZ', 'EXERCISE']),
  isRequired: z.boolean(),
  passingScore: z.coerce.number().int().min(0).max(100),
  lessonId: z.string().optional().or(z.literal('')),
  moduleId: z.string().optional().or(z.literal('')),
});

export const questionSchema = z.object({
  prompt: trimmed(2000).min(3, 'Escreva a pergunta.'),
  type: questionTypeSchema,
  explanation: trimmed(2000).optional().or(z.literal('')),
  points: z.coerce.number().int().min(1).max(100),
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        text: trimmed(500).min(1, 'Preencha a alternativa.'),
        isCorrect: z.boolean(),
      }),
    )
    .default([]),
});

export const submitAttemptSchema = z.object({
  activityId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionIds: z.array(z.string()).default([]),
      textAnswer: trimmed(5000).optional().or(z.literal('')),
    }),
  ),
});

// ------------------------------------------------------------------ Alunos

export const enrollmentSchema = z.object({
  courseId: z.string().min(1),
  userId: z.string().min(1),
  expiresAt: z.string().optional().or(z.literal('')),
});

export const tutorProfileSchema = z.object({
  name: trimmed(120).min(2, 'Informe o nome.'),
  headline: trimmed(160).optional().or(z.literal('')),
  bio: trimmed(4000).optional().or(z.literal('')),
  experience: trimmed(4000).optional().or(z.literal('')),
  methodology: trimmed(4000).optional().or(z.literal('')),
  specialties: z.array(trimmed(60)).max(12).default([]),
  socials: z
    .object({
      instagram: trimmed(200).optional().or(z.literal('')),
      linkedin: trimmed(200).optional().or(z.literal('')),
      youtube: trimmed(200).optional().or(z.literal('')),
      site: trimmed(200).optional().or(z.literal('')),
      whatsapp: trimmed(60).optional().or(z.literal('')),
    })
    .partial()
    .default({}),
});

/** Converte erros do Zod no formato usado pelos formulários. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
