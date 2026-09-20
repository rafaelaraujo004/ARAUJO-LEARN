'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Switch, Textarea } from '@/components/ui/field';
import { Alert, Card, CardHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { createCourseAction, updateCourseAction } from '@/server/actions/courses';
import { emptyFormState } from '@/lib/form-state';

export interface CourseFormValues {
  id?: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  objective: string;
  audience: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  accessType: 'FREE' | 'RESTRICTED';
  durationMinutes: number | null;
  certificateEnabled: boolean;
}

const LEVELS = [
  { value: 'BEGINNER', label: 'Iniciante' },
  { value: 'INTERMEDIATE', label: 'Intermediário' },
  { value: 'ADVANCED', label: 'Avançado' },
];

const ACCESS = [
  { value: 'FREE', label: 'Aberto — qualquer aluno cadastrado pode se matricular' },
  { value: 'RESTRICTED', label: 'Restrito — só com liberação do tutor' },
];

export function CourseForm({ course }: { course?: CourseFormValues }) {
  const editing = Boolean(course?.id);
  const [state, action, pending] = useActionState(
    editing ? updateCourseAction : createCourseAction,
    emptyFormState,
  );
  const toast = useToast();

  const [certificateEnabled, setCertificateEnabled] = React.useState(
    course?.certificateEnabled ?? true,
  );

  React.useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state, toast]);

  return (
    <form action={action} className="flex flex-col gap-6">
      {course?.id && <input type="hidden" name="courseId" value={course.id} />}
      <input
        type="hidden"
        name="certificateEnabled"
        value={certificateEnabled ? 'true' : 'false'}
      />

      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      <Card>
        <CardHeader
          title="Identificação"
          description="É o que o aluno vê primeiro no catálogo."
        />
        <div className="flex flex-col gap-5 p-5">
          <Input
            label="Título do curso"
            name="title"
            required
            defaultValue={course?.title}
            error={state.errors?.title}
            placeholder="Ex.: Excel do Zero ao Profissional"
          />

          <Input
            label="Endereço do curso (slug)"
            name="slug"
            defaultValue={course?.slug}
            error={state.errors?.slug}
            hint="Deixe em branco para gerar a partir do título. Ex.: excel-do-zero-ao-profissional"
            placeholder="gerado-automaticamente"
          />

          <Textarea
            label="Descrição curta"
            name="shortDescription"
            required
            rows={3}
            maxLength={280}
            defaultValue={course?.shortDescription}
            error={state.errors?.shortDescription}
            hint="Até 280 caracteres. Aparece no cartão do catálogo."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="Nível"
              name="level"
              options={LEVELS}
              defaultValue={course?.level ?? 'BEGINNER'}
            />
            <Input
              label="Carga horária declarada (minutos)"
              name="durationMinutes"
              type="number"
              min={0}
              defaultValue={course?.durationMinutes ?? ''}
              error={state.errors?.durationMinutes}
              hint="Em branco: soma automática da duração das aulas."
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Apresentação"
          description="O texto da página do curso. Pode ficar para depois."
        />
        <div className="flex flex-col gap-5 p-5">
          <Textarea
            label="Sobre o curso"
            name="description"
            rows={7}
            defaultValue={course?.description}
            error={state.errors?.description}
            hint="Explique o que o curso entrega e como ele funciona."
          />
          <Textarea
            label="Objetivo"
            name="objective"
            rows={3}
            defaultValue={course?.objective}
            hint="O que o aluno será capaz de fazer ao terminar."
          />
          <Textarea
            label="Para quem é"
            name="audience"
            rows={3}
            defaultValue={course?.audience}
            hint="Ajuda o aluno certo a se reconhecer — e o errado a não se frustrar."
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Acesso e certificado" />
        <div className="flex flex-col gap-5 p-5">
          <Select
            label="Quem pode acessar"
            name="accessType"
            options={ACCESS}
            defaultValue={course?.accessType ?? 'FREE'}
          />
          <Switch
            label="Emitir certificado ao concluir"
            description="O certificado é gerado automaticamente quando o aluno conclui 100% do curso."
            checked={certificateEnabled}
            onCheckedChange={setCertificateEnabled}
          />
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" loading={pending} size="lg">
          <Save aria-hidden className="size-4" />
          {editing ? 'Salvar alterações' : 'Criar curso'}
        </Button>
      </div>
    </form>
  );
}
