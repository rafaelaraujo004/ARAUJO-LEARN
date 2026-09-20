import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Role, User } from '@prisma/client';
import { db } from '@/server/db';
import { env } from '@/lib/env';

/**
 * Sessão opaca.
 *
 * O cookie guarda um token aleatório de 32 bytes. No banco fica apenas o HMAC
 * desse token — vazamento do banco não permite forjar sessão, e o tutor pode
 * revogar acesso de verdade apagando a linha.
 */

export const SESSION_COOKIE = 'al_session';

function hashToken(token: string): string {
  return createHmac('sha256', env.auth.secret).update(token).digest('hex');
}

/** Comparação em tempo constante para tokens de uso único (reset de senha). */
export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function createToken(): string {
  return randomBytes(32).toString('base64url');
}

export function tokenHash(token: string): string {
  return hashToken(token);
}

export type SessionUser = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'avatarKey' | 'headline' | 'isActive'
>;

const SESSION_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarKey: true,
  headline: true,
  isActive: true,
} as const;

/** Cria a sessão no banco e devolve o token que vai para o cookie. */
export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = createToken();
  const expiresAt = new Date(Date.now() + env.auth.sessionTtlDays * 86_400_000);

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ip: meta.ip ?? null,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Encerra a sessão atual (logout deste dispositivo). */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

/** Encerra todas as sessões do usuário (após troca de senha, por exemplo). */
export async function destroyAllSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

/**
 * Usuário da requisição atual, ou `null`.
 * `cache()` garante uma única consulta por request mesmo com vários componentes
 * pedindo o usuário — o layout, o header e a página compartilham o resultado.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, user: { select: SESSION_USER_SELECT } },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (!session.user.isActive) return null;

  return session.user;
});

export function isStaff(role: Role | undefined | null): boolean {
  return role === 'TUTOR' || role === 'ADMIN';
}

/** Remove sessões e tokens expirados. Chamado no login, sem job dedicado. */
export async function pruneExpired(): Promise<void> {
  const now = new Date();
  await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
}
