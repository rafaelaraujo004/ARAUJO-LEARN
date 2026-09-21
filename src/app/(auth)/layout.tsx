import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { SITE } from '@/lib/constants';

/**
 * Casca das telas de conta.
 * Duas colunas no desktop: formulário à esquerda, identidade à direita.
 * No celular, só o formulário — nada disputa espaço com o que importa.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <div className="flex flex-col px-4 py-8 sm:px-8">
        <Link href="/" aria-label="ARAÚJO LEARN, página inicial" className="self-start">
          <Logo />
        </Link>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>

        <footer className="text-center text-xs text-ink-400">
          © {new Date().getFullYear()} {SITE.name}
        </footer>
      </div>

      <aside className="bg-night bg-grid relative hidden flex-col justify-between p-10 lg:flex">
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.14em] text-accent-300 uppercase">
            {SITE.shortName}
          </p>
        </div>

        <div className="relative max-w-sm">
          <p className="font-display text-3xl leading-tight font-semibold text-white">
            Aprenda. Evolua. Conquiste.
          </p>
          <p className="mt-4 leading-relaxed text-brand-100">
            Cada aula assistida é um passo a menos entre você e a obra que você quer fechar. A
            plataforma guarda onde você parou, você só precisa voltar.
          </p>
        </div>

        <ul className="relative flex flex-col gap-3 text-sm text-brand-200">
          {[
            'Retoma exatamente de onde você parou',
            'Apostila e materiais para baixar',
            'Certificado que qualquer um pode conferir',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <span aria-hidden className="size-1.5 rounded-full bg-accent-300" />
              {item}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
