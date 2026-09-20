'use client';

import { useActionState } from 'react';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/primitives';
import { continueAction, enrollAction } from '@/server/actions/enrollment';
import { emptyFormState } from '@/lib/form-state';

/**
 * Um único botão que muda de papel conforme a situação do aluno:
 * matricular-se, começar ou continuar de onde parou.
 */
export function EnrollButton({
  slug,
  mode,
  label,
}: {
  slug: string;
  mode: 'enroll' | 'continue';
  label: string;
}) {
  const [state, action, pending] = useActionState(
    mode === 'enroll' ? enrollAction : continueAction,
    emptyFormState,
  );

  return (
    <div className="flex flex-col gap-3">
      <form action={action}>
        <input type="hidden" name="slug" value={slug} />
        <Button type="submit" variant="accent" size="lg" loading={pending} block>
          {mode === 'enroll' ? (
            <ArrowRight aria-hidden className="size-4.5" />
          ) : (
            <PlayCircle aria-hidden className="size-4.5" />
          )}
          {label}
        </Button>
      </form>
      {state.message && <Alert tone="warning">{state.message}</Alert>}
    </div>
  );
}
