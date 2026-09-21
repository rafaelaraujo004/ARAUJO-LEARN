/**
 * Regras de negócio numéricas em um único lugar.
 * Mudar uma regra aqui muda a plataforma inteira de forma coerente.
 */

/** Percentual do vídeo a partir do qual a aula é considerada concluída. */
export const LESSON_COMPLETION_THRESHOLD = 92;

/** De quanto em quanto tempo o player salva a posição (ms). */
export const PROGRESS_SAVE_INTERVAL_MS = 10_000;

/** Nota mínima padrão de uma atividade (%). */
export const DEFAULT_PASSING_SCORE = 70;

/** Tamanho de cada parte no upload multipart (8 MB). */
export const UPLOAD_PART_SIZE = 8 * 1024 * 1024;

/** Acima disto o upload usa multipart com retomada. */
export const MULTIPART_THRESHOLD = 16 * 1024 * 1024;

/** Limites de upload por tipo de arquivo. */
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
export const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
];

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

export const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'text/plain',
  'text/csv',
  ...ACCEPTED_IMAGE_TYPES,
];

/** Itens por página nas listagens administrativas e no catálogo. */
export const PAGE_SIZE = 12;

export const SITE = {
  name: 'ARAÚJO LEARN',
  shortName: 'Araújo Learn',
  slogan: 'Aprenda. Evolua. Conquiste.',
  description:
    'Cursos de engenharia civil para quem quer ler projetos e orçar obras com segurança — e provar que sabe.',
} as const;

export const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
};

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};

export const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Em andamento',
  COMPLETED: 'Concluído',
  EXPIRED: 'Expirado',
  REVOKED: 'Revogado',
};
