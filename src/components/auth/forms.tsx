'use client';

import * as React from 'react';
import Link from 'next/link';
import { useActionState } from 'react';
import { AtSign, Eye, EyeOff, KeyRound, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Alert } from '@/components/ui/primitives';
import {
  forgotAction,
  loginAction,
  registerAction,
  resetAction,
} from '@/server/actions/auth';
import { emptyFormState } from '@/lib/form-state';

/** Campo de senha com alternância de visibilidade — acessível por teclado. */
function PasswordInput({
  label,
  name,
  error,
  hint,
  autoComplete,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        label={label}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        error={error}
        hint={hint}
        icon={<KeyRound className="size-4" />}
        className="[&_input]:pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute top-[2.15rem] right-2 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
      >
        {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
      </button>
    </div>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert tone="danger" className="mb-1">
      {message}
    </Alert>
  );
}

// --------------------------------------------------------------------- Login

export function LoginForm({ next, justReset }: { next?: string; justReset?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, emptyFormState);

  return (
    <form action={action} className="flex flex-col gap-4">
      {justReset && (
        <Alert tone="success">Senha redefinida com sucesso. Entre com a nova senha.</Alert>
      )}
      <FormError message={state.message} />
      {next && <input type="hidden" name="next" value={next} />}

      <Input
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={state.errors?.email}
        icon={<AtSign className="size-4" />}
        placeholder="voce@email.com"
      />

      <PasswordInput
        label="Senha"
        name="password"
        autoComplete="current-password"
        error={state.errors?.password}
      />

      <div className="-mt-1 text-right">
        <Link
          href="/recuperar"
          className="text-sm font-medium text-brand-600 hover:text-brand-500 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>

      <Button type="submit" loading={pending} block size="lg">
        Entrar
      </Button>
    </form>
  );
}

// ------------------------------------------------------------------ Cadastro

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, emptyFormState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state.message} />
      {next && <input type="hidden" name="next" value={next} />}

      <Input
        label="Nome completo"
        name="name"
        autoComplete="name"
        required
        error={state.errors?.name}
        icon={<User className="size-4" />}
        placeholder="Como você quer ser chamado"
      />

      <Input
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={state.errors?.email}
        icon={<AtSign className="size-4" />}
        placeholder="voce@email.com"
      />

      <PasswordInput
        label="Senha"
        name="password"
        autoComplete="new-password"
        error={state.errors?.password}
        hint="Ao menos 8 caracteres, com letras e números."
      />

      <Button type="submit" loading={pending} block size="lg">
        Criar minha conta
      </Button>

      <p className="text-center text-xs leading-relaxed text-ink-500">
        Ao criar sua conta você concorda em receber comunicados sobre os cursos em que se
        matricular.
      </p>
    </form>
  );
}

// -------------------------------------------------------------- Recuperação

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotAction, emptyFormState);

  if (state.ok) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success" title="Verifique seu e-mail">
          {state.message}
        </Alert>
        <Link
          href="/entrar"
          className="text-center text-sm font-medium text-brand-600 hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state.message} />
      <Input
        label="E-mail da conta"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={state.errors?.email}
        icon={<AtSign className="size-4" />}
        placeholder="voce@email.com"
      />
      <Button type="submit" loading={pending} block size="lg">
        Enviar link de recuperação
      </Button>
      <Link
        href="/entrar"
        className="text-center text-sm font-medium text-brand-600 hover:underline"
      >
        Lembrei minha senha
      </Link>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetAction, emptyFormState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state.message} />
      <input type="hidden" name="token" value={token} />

      <PasswordInput
        label="Nova senha"
        name="password"
        autoComplete="new-password"
        error={state.errors?.password}
        hint="Ao menos 8 caracteres, com letras e números."
      />

      <Button type="submit" loading={pending} block size="lg">
        Salvar nova senha
      </Button>

      <p className="text-center text-xs text-ink-500">
        Por segurança, todas as sessões abertas serão encerradas.
      </p>
    </form>
  );
}
