'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/field';
import { Alert, Card, CardHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { changePasswordAction, updateProfileAction } from '@/server/actions/auth';
import { emptyFormState } from '@/lib/form-state';

/** Dados pessoais e troca de senha. */
export function AccountForms({
  profile,
}: {
  profile: { name: string; email: string; headline: string; bio: string };
}) {
  const toast = useToast();
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    emptyFormState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePasswordAction,
    emptyFormState,
  );
  const passwordForm = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (profileState.ok && profileState.message) toast.success(profileState.message);
  }, [profileState, toast]);

  React.useEffect(() => {
    if (passwordState.ok && passwordState.message) {
      toast.success(passwordState.message);
      passwordForm.current?.reset();
    }
  }, [passwordState, toast]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Dados pessoais" description="É o nome que aparece no certificado." />
        <form action={profileAction} className="flex flex-col gap-5 p-5">
          {profileState.message && !profileState.ok && (
            <Alert tone="danger">{profileState.message}</Alert>
          )}

          <Input
            label="Nome completo"
            name="name"
            required
            defaultValue={profile.name}
            error={profileState.errors?.name}
            hint="Escreva exatamente como quer ver no certificado."
          />

          <Input
            label="E-mail"
            value={profile.email}
            disabled
            hint="Para alterar o e-mail, fale com o tutor."
            readOnly
          />

          <Input
            label="Como você se apresenta"
            name="headline"
            defaultValue={profile.headline}
            hint="Opcional. Ex.: Engenheiro civil · Marabá/PA"
          />

          <Textarea
            label="Sobre você"
            name="bio"
            rows={4}
            defaultValue={profile.bio}
            hint="Opcional. Ajuda o tutor a entender seu contexto ao responder suas dúvidas."
          />

          <div className="flex justify-end">
            <Button type="submit" loading={profilePending}>
              <Save aria-hidden className="size-4" />
              Salvar alterações
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Senha"
          description="Ao trocar a senha, todas as sessões abertas são encerradas."
        />
        <form ref={passwordForm} action={passwordAction} className="flex flex-col gap-5 p-5">
          {passwordState.message && !passwordState.ok && (
            <Alert tone="danger">{passwordState.message}</Alert>
          )}

          <Input
            label="Senha atual"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            error={passwordState.errors?.currentPassword}
            icon={<KeyRound className="size-4" />}
          />

          <Input
            label="Nova senha"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            error={passwordState.errors?.password}
            hint="Ao menos 8 caracteres, com letras e números."
            icon={<KeyRound className="size-4" />}
          />

          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={passwordPending}>
              Alterar senha
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
