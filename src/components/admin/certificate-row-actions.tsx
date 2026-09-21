'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ExternalLink } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { revokeCertificateAction } from '@/server/actions/students';

/** Ver, conferir e revogar um certificado emitido. */
export function CertificateRowActions({
  code,
  studentName,
  revoked,
}: {
  code: string;
  studentName: string;
  revoked: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function revoke() {
    setBusy(true);
    try {
      const result = await revokeCertificateAction(code);
      if (result.ok) toast.success(result.message ?? 'Certificado revogado.');
      else toast.error(result.message ?? 'Não foi possível revogar.');
      router.refresh();
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <>
      <div className="flex shrink-0 gap-1.5">
        <ButtonLink href={`/validar/${code}`} variant="secondary" size="sm" target="_blank">
          <ExternalLink aria-hidden className="size-4" />
          Conferir
        </ButtonLink>
        {!revoked && (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger-600 hover:bg-danger-50"
            onClick={() => setConfirm(true)}
          >
            <Ban aria-hidden className="size-4" />
            Revogar
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={busy}
        title="Revogar certificado?"
        confirmLabel="Sim, revogar"
        message={
          <>
            <p>
              O certificado <strong>{code}</strong> de <strong>{studentName}</strong> deixa de ser
              válido: a página pública de validação passa a mostrá-lo como revogado e o PDF não pode
              mais ser baixado.
            </p>
            <p className="mt-2">Use apenas em caso de erro ou fraude.</p>
          </>
        }
        onConfirm={revoke}
      />
    </>
  );
}
