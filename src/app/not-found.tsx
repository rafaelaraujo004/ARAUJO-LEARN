import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui/button';

/** 404 com a cara da plataforma, e um caminho de volta. */
export default function NotFound() {
  return (
    <main className="bg-night bg-grid relative grid min-h-dvh place-items-center px-4">
      <div className="relative max-w-md text-center">
        <Link href="/" aria-label="ARAÚJO LEARN — página inicial" className="inline-block">
          <Logo variant="light" />
        </Link>

        <span className="mx-auto mt-10 grid size-14 place-items-center rounded-full bg-white/10 text-accent-300">
          <Compass aria-hidden className="size-7" />
        </span>
        <p className="mt-6 font-display text-6xl font-semibold text-white">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-white">
          Essa página não existe.
        </h1>
        <p className="mt-3 text-brand-100">
          O endereço pode ter mudado ou o conteúdo não está mais disponível. Vamos te levar de volta
          ao caminho.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" variant="accent" size="lg">
            Ir para o início
          </ButtonLink>
          <ButtonLink href="/cursos" variant="outline-light" size="lg">
            Ver os cursos
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
