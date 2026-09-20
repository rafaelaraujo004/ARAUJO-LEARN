import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetForm } from '@/components/auth/forms';
import { Alert } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Nova senha' };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Link inválido</h1>
        <Alert tone="warning" className="mt-6">
          Este link de redefinição não é válido. Peça um novo link na tela de recuperação.
        </Alert>
        <Link
          href="/recuperar"
          className="mt-6 block text-center text-sm font-semibold text-brand-600 hover:underline"
        >
          Pedir novo link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Criar nova senha</h1>
      <p className="mt-2 text-ink-600">Escolha uma senha que você não use em outros sites.</p>

      <div className="mt-8">
        <ResetForm token={token} />
      </div>
    </div>
  );
}
