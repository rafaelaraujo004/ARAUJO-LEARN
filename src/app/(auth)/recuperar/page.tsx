import type { Metadata } from 'next';
import { ForgotForm } from '@/components/auth/forms';

export const metadata: Metadata = { title: 'Recuperar acesso' };

export default function ForgotPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Recuperar acesso</h1>
      <p className="mt-2 text-ink-600">
        Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
      </p>

      <div className="mt-8">
        <ForgotForm />
      </div>
    </div>
  );
}
