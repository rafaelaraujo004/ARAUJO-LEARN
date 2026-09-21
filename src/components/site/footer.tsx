import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { SITE } from '@/lib/constants';

const GROUPS = [
  {
    title: 'Plataforma',
    links: [
      { href: '/cursos', label: 'Cursos e valores' },
      { href: '/tutor', label: 'Quem ensina' },
      { href: '/#metodologia', label: 'Como funciona' },
      { href: '/validar', label: 'Validar certificado' },
    ],
  },
  {
    title: 'Sua conta',
    links: [
      { href: '/entrar', label: 'Entrar' },
      { href: '/criar-conta', label: 'Criar conta' },
      { href: '/painel', label: 'Meu painel' },
      { href: '/recuperar', label: 'Recuperar acesso' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-brand-950 text-brand-200">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo variant="light" showSlogan />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-300">
            {SITE.description}
          </p>
        </div>

        {GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="font-sans text-xs font-semibold tracking-[0.14em] text-white uppercase">
              {group.title}
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-brand-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Todos os direitos reservados.
          </p>
          <p>{SITE.slogan}</p>
        </div>
      </div>
    </footer>
  );
}
