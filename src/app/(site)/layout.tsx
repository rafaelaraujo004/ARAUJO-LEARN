import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { getCurrentUser } from '@/server/auth/session';

/** Casca da área pública: topo, conteúdo e rodapé. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <SiteHeader user={user} />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
