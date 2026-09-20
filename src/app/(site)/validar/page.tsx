import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'Validar certificado',
  description:
    'Confira a autenticidade de um certificado emitido pela ARAÚJO LEARN usando o código impresso no documento.',
};

/**
 * Validação pública de certificado.
 * Funciona sem JavaScript: é um formulário GET que redireciona para a página
 * do código — assim o endereço pode ser copiado, salvo e compartilhado.
 */
export default function ValidatePage() {
  async function search(formData: FormData) {
    'use server';
    const raw = String(formData.get('codigo') ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    if (!raw) redirect('/validar');
    redirect(`/validar/${encodeURIComponent(raw)}`);
  }

  return (
    <>
      <section className="bg-night bg-grid">
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/10 text-accent-300 ring-1 ring-white/20">
            <ShieldCheck aria-hidden className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold text-white">
            Validar certificado
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-200">
            Todo certificado emitido pela ARAÚJO LEARN tem um código único. Digite o código para
            conferir a autenticidade, o curso e a carga horária.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <Card className="p-6">
          <form action={search} className="flex flex-col gap-4">
            <div>
              <label htmlFor="codigo" className="text-sm font-medium text-ink-700">
                Código do certificado
              </label>
              <div className="relative mt-1.5">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400"
                />
                <input
                  id="codigo"
                  name="codigo"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="AL-XXXX-XXXX"
                  className="h-12 w-full rounded-xl border border-ink-200 bg-white pr-3.5 pl-10 font-mono text-base tracking-wider uppercase shadow-inset-line placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-400"
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-500">
                O código fica no rodapé do certificado, no formato AL-XXXX-XXXX.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-800 px-6 text-[0.9375rem] font-semibold text-white shadow-soft transition-colors hover:bg-brand-700"
            >
              <ShieldCheck aria-hidden className="size-4.5" />
              Verificar
            </button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-ink-500">
          Empresas e instituições podem usar esta página para conferir certificados apresentados por
          candidatos.
        </p>
      </div>
    </>
  );
}
