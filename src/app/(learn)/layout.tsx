import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { StudentNav } from '@/components/student/nav';
import { requireUser } from '@/server/auth/guards';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Área do aluno: exige login e mantém o topo e o rodapé do site. */
export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/painel');

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <SiteHeader user={user} />
      <StudentNav />
      <main id="conteudo" className="flex-1 bg-ink-50">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
