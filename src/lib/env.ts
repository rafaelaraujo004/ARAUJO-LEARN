import 'server-only';
import { siteOrigin } from '@/lib/site-url';

/**
 * Leitura e validação de variáveis de ambiente.
 *
 * Falha cedo e com mensagem clara: um deploy sem `DATABASE_URL` deve morrer no
 * boot, não no meio de uma aula do aluno.
 */

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. Veja .env.example.`,
    );
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1';
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Durante `next build` o Next importa este módulo só para analisar as páginas;
 * as variáveis reais podem ainda nem existir (primeiro deploy). Nessa fase a
 * exigência é relaxada. Ao INICIAR o servidor em produção, tudo continua obrigatório.
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const strict = isProduction && !isBuildPhase;

/**
 * Driver de storage: se as credenciais do bucket existem, usa o bucket.
 * Só cai no disco local quando não há credenciais — ou quando o driver 'local'
 * é pedido explicitamente. Evita o erro clássico de esquecer STORAGE_DRIVER em
 * produção e gravar vídeos em disco efêmero, que some a cada deploy.
 */
const hasBucketCredentials = Boolean(
  (process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL) &&
    (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
    (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY),
);
const explicitDriver = process.env.STORAGE_DRIVER as 's3' | 'local' | undefined;

/**
 * Em produção o segredo é obrigatório. Em desenvolvimento usamos um valor fixo
 * para que `npm run dev` funcione sem configuração — nunca em produção.
 */
const DEV_SECRET = 'dev-only-insecure-secret-araujo-learn-000000000000';

export const env = {
  isProduction,
  appUrl: siteOrigin(process.env.APP_URL),
  databaseUrl: required('DATABASE_URL', strict ? undefined : 'postgresql://postgres:postgres@localhost:5433/araujo_learn?schema=public'),

  auth: {
    secret: strict ? required('AUTH_SECRET') : optional('AUTH_SECRET', DEV_SECRET),
    sessionTtlDays: int('SESSION_TTL_DAYS', 30),
  },

  storage: {
    driver: explicitDriver ?? (hasBucketCredentials ? 's3' : 'local'),
    // Aceita os nomes S3_* e também os que o Railway Storage Bucket injeta
    // (AWS_*): dá para apontar as variáveis do serviço direto para o bucket.
    endpoint: optional('S3_ENDPOINT') || optional('AWS_ENDPOINT_URL'),
    region: optional('S3_REGION') || optional('AWS_DEFAULT_REGION', 'auto'),
    bucket: optional('S3_BUCKET') || optional('AWS_S3_BUCKET_NAME', 'araujo-learn'),
    accessKeyId: optional('S3_ACCESS_KEY_ID') || optional('AWS_ACCESS_KEY_ID'),
    secretAccessKey: optional('S3_SECRET_ACCESS_KEY') || optional('AWS_SECRET_ACCESS_KEY'),
    forcePathStyle: bool('S3_FORCE_PATH_STYLE', true),
    signedUrlTtl: int('SIGNED_URL_TTL', 900),
  },

  mail: {
    driver: (optional('MAIL_DRIVER', 'console') as 'console' | 'smtp'),
    from: optional('MAIL_FROM', 'ARAUJO LEARN <nao-responda@araujolearn.com>'),
    smtp: {
      host: optional('SMTP_HOST'),
      port: int('SMTP_PORT', 587),
      user: optional('SMTP_USER'),
      password: optional('SMTP_PASSWORD'),
    },
  },
} as const;

/** Storage S3 só está utilizável se todas as credenciais existirem. */
export function isS3Configured(): boolean {
  const s = env.storage;
  return Boolean(s.driver === 's3' && s.endpoint && s.bucket && s.accessKeyId && s.secretAccessKey);
}
