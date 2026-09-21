'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { env } from '@/lib/env';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import {
  clearSessionCookie,
  createSession,
  createToken,
  destroyAllSessions,
  destroyCurrentSession,
  getCurrentUser,
  pruneExpired,
  setSessionCookie,
  tokenHash,
} from '@/server/auth/session';
import { passwordResetEmail, sendMail, welcomeEmail } from '@/server/mail';
import { clientIpFromHeaders, rateLimit } from '@/server/api';
import {
  changePasswordSchema,
  fieldErrors,
  forgotSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetSchema,
} from '@/lib/validation';
import type { FormState } from '@/lib/form-state';

async function requestMeta() {
  const list = await headers();
  return {
    userAgent: list.get('user-agent'),
    ip: clientIpFromHeaders(list),
  };
}

/** Destino seguro pós-login: apenas caminhos internos. */
function safeNext(value: FormDataEntryValue | null): string {
  const raw = typeof value === 'string' ? value : '';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '';
  return raw;
}

// ------------------------------------------------------------------ Cadastro

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const meta = await requestMeta();
  const limit = rateLimit(`register:${meta.ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return { ok: false, message: 'Muitas tentativas. Tente novamente mais tarde.' };
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, errors: { email: 'Já existe uma conta com este e-mail.' } };
  }

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: 'STUDENT',
    },
    select: { id: true, name: true, email: true },
  });

  const { token, expiresAt } = await createSession(user.id, meta);
  await setSessionCookie(token, expiresAt);
  await sendMail({ to: user.email, ...welcomeEmail(user.name) }).catch((error) => {
    console.error('[auth] falha ao enviar boas-vindas:', error);
  });

  redirect(safeNext(formData.get('next')) || '/painel');
}

// --------------------------------------------------------------------- Login

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const meta = await requestMeta();
  // Limita por IP e por conta: protege contra força bruta sem travar um escritório inteiro.
  const byIp = rateLimit(`login-ip:${meta.ip}`, { limit: 20, windowMs: 15 * 60 * 1000 });
  const byEmail = rateLimit(`login-email:${parsed.data.email}`, {
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!byIp.allowed || !byEmail.allowed) {
    return {
      ok: false,
      message: 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.',
    };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true, isActive: true, role: true },
  });

  // Mensagem idêntica para e-mail inexistente e senha errada: não revela cadastros.
  const invalid: FormState = { ok: false, message: 'E-mail ou senha incorretos.' };
  if (!user) {
    // Gasta tempo parecido com o de uma verificação real para não vazar por timing.
    await verifyPassword(parsed.data.password, 'scrypt$16384$8$1$AAAA$AAAA');
    return invalid;
  }
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return invalid;
  if (!user.isActive) {
    return { ok: false, message: 'Esta conta está desativada. Fale com o tutor.' };
  }

  await pruneExpired();
  const { token, expiresAt } = await createSession(user.id, meta);
  await setSessionCookie(token, expiresAt);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const next = safeNext(formData.get('next'));
  redirect(next || (user.role === 'STUDENT' ? '/painel' : '/admin'));
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect('/');
}

// ------------------------------------------------------- Recuperação de acesso

export async function forgotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const meta = await requestMeta();
  const limit = rateLimit(`forgot:${meta.ip}`, { limit: 6, windowMs: 60 * 60 * 1000 });

  // Resposta sempre igual: não revela se o e-mail existe.
  const success: FormState = {
    ok: true,
    message:
      'Se existir uma conta com este e-mail, enviamos um link para redefinir a senha. Verifique sua caixa de entrada.',
  };
  if (!limit.allowed) return success;

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true, isActive: true },
  });
  if (!user || !user.isActive) return success;

  const token = createToken();
  await db.passwordResetToken.create({
    data: {
      tokenHash: tokenHash(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const link = `${env.appUrl}/redefinir?token=${token}`;
  await sendMail({ to: user.email, ...passwordResetEmail(user.name, link) }).catch((error) => {
    console.error('[auth] falha ao enviar recuperação:', error);
  });

  return success;
}

export async function resetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: tokenHash(parsed.data.token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      message: 'Este link expirou ou já foi usado. Peça um novo link de recuperação.',
    };
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false },
    }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  // Trocar a senha encerra todas as sessões — inclusive a de quem invadiu.
  await destroyAllSessions(record.userId);
  await clearSessionCookie();

  redirect('/entrar?redefinida=1');
}

// -------------------------------------------------------------------- Conta

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Sessão expirada. Entre novamente.' };

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    headline: formData.get('headline'),
    bio: formData.get('bio'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      headline: parsed.data.headline || null,
      bio: parsed.data.bio || null,
    },
  });

  revalidatePath('/conta');
  return { ok: true, message: 'Perfil atualizado.' };
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) return { ok: false, message: 'Sessão expirada. Entre novamente.' };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await db.user.findUnique({
    where: { id: current.id },
    select: { passwordHash: true },
  });
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { ok: false, errors: { currentPassword: 'Senha atual incorreta.' } };
  }

  await db.user.update({
    where: { id: current.id },
    data: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false },
  });
  await destroyAllSessions(current.id);

  const meta = await requestMeta();
  const { token, expiresAt } = await createSession(current.id, meta);
  await setSessionCookie(token, expiresAt);

  return { ok: true, message: 'Senha alterada. As outras sessões foram encerradas.' };
}
