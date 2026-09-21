import Link from 'next/link';
import { KeyRound } from 'lucide-react';

/** Aviso do primeiro acesso: a senha foi definida por outra pessoa e pode ser trocada agora. */
export function PasswordNotice() {
  return (
    <div className="border-b border-accent-200 bg-accent-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm text-ink-800 sm:px-6">
        <KeyRound className="size-4 shrink-0 text-accent-600" aria-hidden />
        <p className="min-w-0 flex-1">
          Você entrou com uma senha provisória. Crie a sua própria senha para proteger a conta.
        </p>
        <Link href="/conta" className="font-semibold text-brand-800 underline underline-offset-2">
          Trocar minha senha
        </Link>
      </div>
    </div>
  );
}
