import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from '@/server/auth/guards';
import { fieldErrors } from '@/lib/validation';

/**
 * Respostas e tratamento de erro das rotas de API.
 * Erros nunca vazam stack trace para o cliente; o detalhe fica no log.
 */

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data as object, init);
}

export function fail(status: number, message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status });
}

export function handleError(error: unknown, context: string): NextResponse {
  if (error instanceof HttpError) {
    return fail(error.status, error.message, error.details);
  }
  if (error instanceof ZodError) {
    return fail(422, 'Dados inválidos.', fieldErrors(error));
  }
  console.error(`[api:${context}]`, error);
  return fail(500, 'Algo deu errado. Tente novamente.');
}

/** Envolve um handler com tratamento de erro padronizado. */
export function route<Args extends unknown[]>(
  context: string,
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error, context);
    }
  };
}

/**
 * Limitador de tentativas em memória.
 *
 * Suficiente para o tamanho atual (um processo, um tutor): protege login e
 * recuperação de senha contra força bruta. Se a plataforma crescer para várias
 * instâncias, trocar por Redis é substituir este arquivo.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Limpa contadores vencidos — evita crescimento indefinido do mapa. */
export function pruneRateLimits(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/**
 * IP do cliente a partir dos cabeçalhos.
 *
 * Atrás do proxy do Railway, o cliente pode enviar o próprio X-Forwarded-For; o
 * proxy ACRESCENTA o IP real ao final. Por isso vale a ÚLTIMA entrada — a
 * primeira é controlada por quem faz a requisição e permitiria burlar o limite
 * de tentativas trocando o valor a cada chamada.
 */
export function clientIpFromHeaders(headers: Pick<Headers, 'get'>): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const last = forwarded.split(',').at(-1)?.trim();
    if (last) return last;
  }
  return headers.get('x-real-ip') ?? 'desconhecido';
}

export function clientIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
}
