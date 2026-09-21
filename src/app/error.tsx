'use client';

import Link from 'next/link';
import * as React from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Rede de segurança para erros inesperados.
 * O aluno vê uma mensagem humana e uma saída; o detalhe técnico vai para o log.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[app] erro não tratado:', error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-ink-50 px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-danger-50 text-danger-500">
          <TriangleAlert aria-hidden className="size-7" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold text-brand-900">
          Algo saiu do esperado.
        </h1>
        <p className="mt-2 text-ink-600">
          Isso não foi culpa sua. Tente de novo, se continuar, volte ao início e avise o tutor.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-ink-400">Código do erro: {error.digest}</p>
        )}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset} size="lg">
            Tentar novamente
          </Button>
          <Link
            href="/"
            className="inline-flex h-13 items-center justify-center rounded-xl border border-ink-200 bg-white px-7 text-base font-medium text-brand-800 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </main>
  );
}
