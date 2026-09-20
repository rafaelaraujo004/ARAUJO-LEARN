'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

/**
 * Diálogo sobre <dialog> nativo: foco preso, Esc fecha e backdrop acessível
 * vêm do navegador, sem biblioteca. Usado em formulários rápidos do painel e
 * na confirmação de ações destrutivas.
 */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Trava a rolagem do fundo enquanto o diálogo está aberto.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' } as const;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // Clique no backdrop (fora do conteúdo) fecha.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'w-[calc(100vw-2rem)] rounded-card border border-ink-200 bg-white p-0 shadow-lift backdrop:bg-brand-950/50 backdrop:backdrop-blur-sm',
        'my-auto max-h-[calc(100dvh-4rem)] overflow-visible',
        widths[size],
      )}
      aria-labelledby="modal-title"
    >
      <div className="flex max-h-[calc(100dvh-4rem)] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="modal-title" className="font-sans text-base font-semibold text-ink-900">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mt-1 -mr-1 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <X aria-hidden className="size-4.5" />
          </button>
        </div>

        {children && <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>}

        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

/** Confirmação obrigatória antes de qualquer ação destrutiva. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Excluir',
  loading = false,
  tone = 'danger',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  tone?: 'danger' | 'primary';
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-ink-600">{message}</div>
    </Modal>
  );
}
