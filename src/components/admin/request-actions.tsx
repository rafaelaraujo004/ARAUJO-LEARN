'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { approveRequestAction, declineRequestAction } from '@/server/actions/requests';

/** Aprovar libera o acesso na hora e avisa o aluno. */
export function RequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<'approve' | 'decline' | null>(null);

  async function run(kind: 'approve' | 'decline') {
    setBusy(kind);
    try {
      const result =
        kind === 'approve'
          ? await approveRequestAction(requestId)
          : await declineRequestAction(requestId);
      if (result.message) {
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button size="sm" loading={busy === 'approve'} disabled={busy !== null} onClick={() => run('approve')}>
        <Check aria-hidden className="size-4" />
        Liberar acesso
      </Button>
      <Button
        size="sm"
        variant="ghost"
        loading={busy === 'decline'}
        disabled={busy !== null}
        onClick={() => run('decline')}
      >
        <X aria-hidden className="size-4" />
        Recusar
      </Button>
    </div>
  );
}
