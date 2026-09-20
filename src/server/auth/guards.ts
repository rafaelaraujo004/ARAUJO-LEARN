import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentUser, isStaff, type SessionUser } from '@/server/auth/session';

/**
 * Autorização acontece SEMPRE no servidor.
 * O frontend pode esconder um botão, mas quem decide é este arquivo.
 */

export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = returnTo ? `?next=${encodeURIComponent(returnTo)}` : '';
    redirect(`/entrar${target}`);
  }
  return user;
}

export async function requireStaff(returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (!isStaff(user.role)) redirect('/painel');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') redirect('/admin');
  return user;
}

/** Erro de autorização em rotas de API (sem redirect). */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function apiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, 'Autenticação necessária.');
  return user;
}

export async function apiStaff(): Promise<SessionUser> {
  const user = await apiUser();
  if (!isStaff(user.role)) throw new HttpError(403, 'Acesso restrito ao tutor.');
  return user;
}
