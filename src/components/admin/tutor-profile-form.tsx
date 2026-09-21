'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/field';
import { Alert, Card, CardHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { FileUpload } from '@/components/admin/file-upload';
import { setTutorPhotoAction, updateTutorProfileAction } from '@/server/actions/students';
import { emptyFormState } from '@/lib/form-state';

export interface TutorProfileValues {
  name: string;
  headline: string;
  bio: string;
  experience: string;
  methodology: string;
  specialties: string;
  whatsapp: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  site: string;
}

/**
 * O perfil do tutor é a apresentação pública da marca: aparece na home, na
 * página "Quem ensina" e no cartão de cada curso.
 */
export function TutorProfileForm({
  values,
  photoUrl,
  hasCustomPhoto,
}: {
  values: TutorProfileValues;
  photoUrl: string;
  hasCustomPhoto: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, action, pending] = useActionState(updateTutorProfileAction, emptyFormState);

  React.useEffect(() => {
    if (state.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state, toast]);

  async function changePhoto(mediaId: string | null) {
    const result = await setTutorPhotoAction(mediaId);
    if (result.ok) toast.success(result.message ?? 'Foto atualizada.');
    else toast.error(result.message ?? 'Não foi possível atualizar a foto.');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="Foto de apresentação"
          description="Aparece no topo do site e na página do tutor. Uma foto de rosto, com boa luz."
        />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
          <img
            src={photoUrl}
            alt="Foto atual do tutor"
            className="aspect-[4/4.4] w-40 shrink-0 rounded-xl border border-ink-200 object-cover object-top"
          />
          <div className="min-w-0 flex-1">
            <FileUpload
              kind="IMAGE"
              hint="JPG, PNG ou WEBP até 8 MB. Ideal: vertical, com o rosto centralizado."
              current={hasCustomPhoto ? { name: 'Foto enviada por você' } : null}
              onUploaded={(media) => void changePhoto(media.id)}
              onRemove={hasCustomPhoto ? () => void changePhoto(null) : undefined}
            />
            {!hasCustomPhoto && (
              <p className="mt-3 text-xs text-ink-500">
                Enquanto você não enviar uma foto, o site usa o retrato padrão.
              </p>
            )}
          </div>
        </div>
      </Card>

      <form action={action} className="flex flex-col gap-6">
        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        <Card>
          <CardHeader title="Apresentação" />
          <div className="flex flex-col gap-5 p-5">
            <Input
              label="Nome"
              name="name"
              required
              defaultValue={values.name}
              error={state.errors?.name}
            />
            <Textarea
              label="Chamada profissional"
              name="headline"
              rows={2}
              defaultValue={values.headline}
              hint="Uma linha com título e formação. Ex.: Engenheiro Civil · MSc em Perícia e Avaliação de Engenharia."
            />
            <Textarea
              label="Biografia"
              name="bio"
              rows={5}
              defaultValue={values.bio}
              error={state.errors?.bio}
            />
            <Textarea
              label="Formação e experiência"
              name="experience"
              rows={4}
              defaultValue={values.experience}
            />
            <Textarea
              label="Metodologia"
              name="methodology"
              rows={4}
              defaultValue={values.methodology}
              hint="Como você conduz os cursos."
            />
            <Input
              label="Especialidades"
              name="specialties"
              defaultValue={values.specialties}
              hint="Separe por vírgula. Ex.: Leitura de projetos, Orçamento de obras, Perícia"
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Contato e redes"
            description="O WhatsApp alimenta os botões de dúvida em todo o site."
          />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Input
              label="WhatsApp"
              name="whatsapp"
              inputMode="tel"
              defaultValue={values.whatsapp}
              placeholder="(94) 99999-9999"
            />
            <Input
              label="Instagram"
              name="instagram"
              defaultValue={values.instagram}
              placeholder="instagram.com/seuperfil"
            />
            <Input
              label="LinkedIn"
              name="linkedin"
              defaultValue={values.linkedin}
              placeholder="linkedin.com/in/seuperfil"
            />
            <Input
              label="YouTube"
              name="youtube"
              defaultValue={values.youtube}
              placeholder="youtube.com/@seucanal"
            />
            <Input
              label="Site"
              name="site"
              defaultValue={values.site}
              placeholder="seusite.com.br"
              className="sm:col-span-2"
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={pending}>
            <Save aria-hidden className="size-4" />
            Salvar perfil
          </Button>
        </div>
      </form>
    </div>
  );
}
