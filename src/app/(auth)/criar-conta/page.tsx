import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/auth/forms';
import { getCurrentUser } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Criar conta' };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (user) redirect(user.role === 'STUDENT' ? '/painel' : '/admin');

  const next =
    params.next?.startsWith('/') && !params.next.startsWith('//') ? params.next : undefined;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Dê o primeiro passo.</h1>
      <p className="mt-2 text-ink-600">
        Leva dois minutos. Crie sua conta, escolha o curso e comece hoje.
      </p>

      <div className="mt-8">
        <RegisterForm next={next} />
      </div>

      <p className="mt-8 text-center text-sm text-ink-600">
        Já tem conta?{' '}
        <Link
          href={next ? `/entrar?next=${encodeURIComponent(next)}` : '/entrar'}
          className="font-semibold text-brand-600 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
