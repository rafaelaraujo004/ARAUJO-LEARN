import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/forms';
import { getCurrentUser } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redefinida?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (user) redirect(user.role === 'STUDENT' ? '/painel' : '/admin');

  const next = params.next?.startsWith('/') && !params.next.startsWith('//') ? params.next : undefined;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Continue de onde parou.</h1>
      <p className="mt-2 text-ink-600">
        Entre e volte direto para a sua próxima aula.
      </p>

      <div className="mt-8">
        <LoginForm next={next} justReset={params.redefinida === '1'} />
      </div>

      <p className="mt-8 text-center text-sm text-ink-600">
        Ainda não tem conta?{' '}
        <Link
          href={next ? `/criar-conta?next=${encodeURIComponent(next)}` : '/criar-conta'}
          className="font-semibold text-brand-600 hover:underline"
        >
          Criar conta gratuita
        </Link>
      </p>
    </div>
  );
}
