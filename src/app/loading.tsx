import { Loader2 } from 'lucide-react';

/** Estado de carregamento padrão: aparece na hora, enquanto a página é preparada. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-[50dvh] place-items-center px-4 py-20"
    >
      <div className="flex flex-col items-center gap-3 text-ink-500">
        <Loader2 aria-hidden className="size-8 animate-spin text-brand-500" />
        <p className="text-sm">Carregando…</p>
      </div>
    </div>
  );
}
