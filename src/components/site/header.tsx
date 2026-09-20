'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, Menu, Settings, X } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui/button';
import { Avatar } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/server/auth/session';

const LINKS = [
  { href: '/cursos', label: 'Cursos' },
  { href: '/tutor', label: 'O tutor' },
  { href: '/#metodologia', label: 'Metodologia' },
  { href: '/validar', label: 'Validar certificado' },
];

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  // O menu guarda em qual rota foi aberto. Assim ele se fecha sozinho ao
  // navegar, sem um efeito que dispara render em cascata.
  const [openedAt, setOpenedAt] = React.useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (value: boolean) => setOpenedAt(value ? pathname : null);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-950/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="ARAÚJO LEARN — página inicial" className="shrink-0">
          <Logo variant="light" />
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-white/10 text-white' : 'text-brand-200 hover:bg-white/5 hover:text-white',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <ButtonLink
                href={user.role === 'STUDENT' ? '/painel' : '/admin'}
                variant="outline-light"
                size="sm"
              >
                <LayoutDashboard aria-hidden className="size-4" />
                {user.role === 'STUDENT' ? 'Meu painel' : 'Painel do tutor'}
              </ButtonLink>
              <Link
                href="/conta"
                className="rounded-full transition-opacity hover:opacity-80"
                aria-label={`Conta de ${user.name}`}
              >
                <Avatar name={user.name} size={36} />
              </Link>
            </>
          ) : (
            <>
              <ButtonLink href="/entrar" variant="outline-light" size="sm">
                Entrar
              </ButtonLink>
              <ButtonLink href="/criar-conta" variant="accent" size="sm">
                Criar conta
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          className="rounded-lg p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
        >
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </div>

      {open && (
        <div
          id="menu-mobile"
          className="animate-fade border-t border-white/10 bg-brand-950 lg:hidden"
        >
          <nav aria-label="Navegação principal" className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
            <ul className="flex flex-col">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-lg px-3 py-3 text-[0.9375rem] font-medium text-brand-100 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
              {user ? (
                <>
                  <ButtonLink
                    href={user.role === 'STUDENT' ? '/painel' : '/admin'}
                    variant="accent"
                    block
                  >
                    <LayoutDashboard aria-hidden className="size-4" />
                    {user.role === 'STUDENT' ? 'Meu painel' : 'Painel do tutor'}
                  </ButtonLink>
                  <ButtonLink href="/conta" variant="outline-light" block>
                    <Settings aria-hidden className="size-4" />
                    Minha conta
                  </ButtonLink>
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[0.9375rem] font-medium text-brand-200 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <LogOut aria-hidden className="size-4" />
                      Sair
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <ButtonLink href="/entrar" variant="outline-light" block>
                    Entrar
                  </ButtonLink>
                  <ButtonLink href="/criar-conta" variant="accent" block>
                    Criar conta
                  </ButtonLink>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
