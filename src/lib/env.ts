import 'server-only';

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
 * Em produção o segredo é obrigatório. Em desenvolvimento usamos um valor fixo
 * para que `npm run dev` funcione sem configuração — nunca em produção.
 */
const DEV_SECRET = 'dev-only-insecure-secret-araujo-learn-000000000000';

export const env = {
  isProduction,
  appUrl: optional('APP_URL', 'http://localhost:3000').replace(/\/$/, ''),
  databaseUrl: required('DATABASE_URL', isProduction ? undefined : 'postgresql://postgres:postgres@localhost:5433/araujo_learn?schema=public'),

  auth: {
    secret: isProduction ? required('AUTH_SECRET') : optional('AUTH_SECRET', DEV_SECRET),
    sessionTtlDays: int('SESSION_TTL_DAYS', 30),
  },

  storage: {
    driver: (optional('STORAGE_DRIVER', 'local') as 's3' | 'local'),
    endpoint: optional('S3_ENDPOINT'),
    region: optional('S3_REGION', 'auto'),
    bucket: optional('S3_BUCKET', 'araujo-learn'),
    accessKeyId: optional('S3_ACCESS_KEY_ID'),
    secretAccessKey: optional('S3_SECRET_ACCESS_KEY'),
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
