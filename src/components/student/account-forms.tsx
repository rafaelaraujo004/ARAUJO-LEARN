'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, KeyRound, LogOut, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/field';
import { Alert, Avatar, Card, CardHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import {
  changePasswordAction,
  logoutAction,
  removeAvatarAction,
  updateProfileAction,
  uploadAvatarAction,
} from '@/server/actions/auth';
import { emptyFormState } from '@/lib/form-state';

export function AccountForms({
  profile,
  avatarUrl,
}: {
  profile: { name: string; email: string; headline: string; bio: string };
  avatarUrl?: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    emptyFormState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePasswordAction,
    emptyFormState,
  );
  const [avatarState, avatarAction, avatarPending] = useActionState(
    uploadAvatarAction,
    emptyFormState,
  );
  const passwordForm = React.useRef<HTMLFormElement>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (profileState.ok && profileState.message) toast.success(profileState.message);
  }, [profileState, toast]);

  React.useEffect(() => {
    if (passwordState.ok && passwordState.message) {
      toast.success(passwordState.message);
      passwordForm.current?.reset();
    }
  }, [passwordState, toast]);

  React.useEffect(() => {
    if (avatarState.ok && avatarState.message) {
      toast.success(avatarState.message);
      router.refresh();
    }
  }, [avatarState, toast, router]);

  async function handleRemoveAvatar() {
    const result = await removeAvatarAction();
    if (result.ok) {
      toast.success(result.message ?? 'Foto removida.');
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Foto de perfil */}
      <Card>
        <CardHeader title="Foto de perfil" description="Aparece ao lado do seu nome na plataforma." />
        <div className="flex flex-wrap items-center gap-5 p-5">
          <Avatar name={profile.name} src={avatarUrl} size={80} />

          <div className="flex flex-col gap-2">
            <form action={avatarAction}>
              <input
                ref={fileInput}
                type="file"
                name="avatar"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    e.target.form?.requestSubmit();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={avatarPending}
                onClick={() => fileInput.current?.click()}
              >
                <Camera aria-hidden className="size-4" />
                {avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
              </Button>
            </form>

            {avatarUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRemoveAvatar}
              >
                <Trash2 aria-hidden className="size-4" />
                Remover
              </Button>
            )}
          </div>

          <p className="w-full text-xs text-ink-500">
            JPG, PNG ou WebP. Até 2 MB.
          </p>

          {avatarState.message && !avatarState.ok && (
            <Alert tone="danger" className="w-full">{avatarState.message}</Alert>
          )}
        </div>
      </Card>

      {/* Dados pessoais */}
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

      {/* Senha */}
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

      {/* Sair */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-semibold text-ink-900">Sair da conta</p>
            <p className="mt-0.5 text-sm text-ink-500">Encerra esta sessão no navegador.</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut aria-hidden className="size-4" />
              Sair
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
