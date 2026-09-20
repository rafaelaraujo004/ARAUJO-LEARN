import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/lib/env';
import { SITE } from '@/lib/constants';

/**
 * Envio de e-mail com dois drivers.
 *
 * `console` (padrão): registra a mensagem no log do servidor. Permite que o
 * fluxo de recuperação de senha funcione de ponta a ponta sem credenciais —
 * basta ler o link no terminal.
 * `smtp`: envio real. Só depende de preencher as variáveis SMTP_*.
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: Transporter | null = null;

function smtpTransport(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.smtp.host,
      port: env.mail.smtp.port,
      secure: env.mail.smtp.port === 465,
      auth: env.mail.smtp.user
        ? { user: env.mail.smtp.user, pass: env.mail.smtp.password }
        : undefined,
    });
  }
  return transporter;
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (env.mail.driver === 'smtp' && env.mail.smtp.host) {
    await smtpTransport().sendMail({
      from: env.mail.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return;
  }

  console.info(
    [
      '',
      '──────────────── E-MAIL (driver console) ────────────────',
      `Para:     ${message.to}`,
      `Assunto:  ${message.subject}`,
      '',
      message.text,
      '─────────────────────────────────────────────────────────',
      '',
    ].join('\n'),
  );
}

export function passwordResetEmail(name: string, link: string): Omit<MailMessage, 'to'> {
  const text = [
    `Olá, ${name}.`,
    '',
    `Recebemos um pedido para redefinir sua senha na ${SITE.name}.`,
    'Abra o link abaixo para criar uma nova senha (válido por 1 hora):',
    '',
    link,
    '',
    'Se não foi você, ignore este e-mail — nada será alterado.',
    '',
    `${SITE.name} — ${SITE.slogan}`,
  ].join('\n');

  return {
    subject: `Redefinição de senha · ${SITE.name}`,
    text,
    html: `<p>Olá, ${escapeHtml(name)}.</p>
<p>Recebemos um pedido para redefinir sua senha na <strong>${SITE.name}</strong>.</p>
<p><a href="${link}">Criar uma nova senha</a> (o link vale por 1 hora).</p>
<p>Se não foi você, ignore este e-mail — nada será alterado.</p>
<p style="color:#6b7280">${SITE.name} — ${SITE.slogan}</p>`,
  };
}

export function welcomeEmail(name: string): Omit<MailMessage, 'to'> {
  const text = [
    `Bem-vindo(a), ${name}.`,
    '',
    `Sua conta na ${SITE.name} está pronta.`,
    `Acesse ${env.appUrl}/painel para começar.`,
    '',
    SITE.slogan,
  ].join('\n');
  return { subject: `Sua conta na ${SITE.name} está pronta`, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
