'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Avisos temporários — confirmação de ações do tutor e do aluno.
 * `aria-live="polite"` para que leitores de tela anunciem sem interromper.
 */

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  description?: string;
}

interface ToastContextValue {
  toast: (message: string, options?: { tone?: ToastTone; description?: string }) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return context;
}

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 aria-hidden className="size-5 text-progress-500" />,
  error: <AlertCircle aria-hidden className="size-5 text-danger-500" />,
  info: <Info aria-hidden className="size-5 text-brand-500" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue['toast']>(
    (message, options) => {
      const id = ++nextId.current;
      setToasts((current) => [
        ...current,
        { id, message, tone: options?.tone ?? 'info', description: options?.description },
      ]);
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message, description) => toast(message, { tone: 'success', description }),
      error: (message, description) => toast(message, { tone: 'error', description }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:bottom-0 sm:items-end"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              'animate-rise pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lift',
              item.tone === 'error' ? 'border-danger-100' : 'border-ink-200',
            )}
          >
            <span className="mt-px shrink-0">{ICONS[item.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">{item.message}</p>
              {item.description && (
                <p className="mt-0.5 text-xs text-ink-500">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Fechar aviso"
              className="-mt-1 -mr-1 rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
