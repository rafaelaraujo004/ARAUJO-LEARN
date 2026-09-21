'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Award,
  BookOpen,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { Avatar } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/server/auth/session';

const NAV = [
  { href: '/admin', label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/cursos', label: 'Cursos', icon: BookOpen },
  { href: '/admin/solicitacoes', label: 'Solicitações', icon: Inbox },
  { href: '/admin/alunos', label: 'Alunos', icon: Users },
  { href: '/admin/certificados', label: 'Certificados', icon: Award },
  { href: '/admin/perfil', label: 'Perfil do tutor', icon: UserCircle },
];

/** Casca do painel do tutor: navegação lateral fixa e conteúdo à direita. */
export function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // O menu guarda em qual rota foi aberto. Assim ele se fecha sozinho ao
  // navegar, sem um efeito que dispara render em cascata.
  const [openedAt, setOpenedAt] = React.useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (value: boolean) => setOpenedAt(value ? pathname : null);

  const nav = (
    <nav aria-label="Seções do painel" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-white/10 text-white'
                : 'text-brand-200 hover:bg-white/5 hover:text-white',
            )}
          >
            <item.icon aria-hidden className="size-4.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <a href="#painel" className="skip-link">
        Pular para o conteúdo
      </a>

      {/* Topo mobile */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 bg-brand-950 px-4 lg:hidden">
        <Link href="/admin" aria-label="Painel, ARAÚJO LEARN">
          <Logo variant="light" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="admin-nav"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          className="rounded-lg p-2 text-white transition-colors hover:bg-white/10"
        >
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </div>

      {open && (
        <div id="admin-nav" className="animate-fade bg-brand-950 px-4 py-4 lg:hidden">
          {nav}
          <AccountBlock user={user} className="mt-4 border-t border-white/10 pt-4" />
        </div>
      )}

      {/* Lateral desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-white/10 bg-brand-950 p-5 lg:flex">
        <div>
          <Link href="/admin" aria-label="Painel, ARAÚJO LEARN" className="block">
            <Logo variant="light" />
          </Link>
          <p className="mt-1 ml-[3.1rem] text-[0.6875rem] font-medium tracking-[0.14em] text-accent-300 uppercase">
            Painel do tutor
          </p>
          <div className="mt-8">{nav}</div>
        </div>
        <AccountBlock user={user} />
      </aside>

      <main id="painel" className="min-w-0 flex-1 bg-ink-50">
        {children}
      </main>
    </div>
  );
}

function AccountBlock({ user, className }: { user: SessionUser; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Link
        href="/"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-200 transition-colors hover:bg-white/5 hover:text-white"
      >
        <ExternalLink aria-hidden className="size-4.5 shrink-0" />
        Ver o site
      </Link>

      <div className="mt-2 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
        <Avatar name={user.name} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-brand-300">
            {user.role === 'ADMIN' ? 'Administrador' : 'Tutor'}
          </p>
        </div>
      </div>

      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-200 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut aria-hidden className="size-4.5 shrink-0" />
          Sair
        </button>
      </form>
    </div>
  );
}

/** Cabeçalho padrão das páginas do painel. */
export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}) {
  return (
    <header className="border-b border-ink-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
        {breadcrumb && <div className="mb-3 text-sm text-ink-500">{breadcrumb}</div>}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold text-brand-900 sm:text-3xl">
              {title}
            </h1>
            {description && <p className="mt-1.5 text-sm text-ink-600">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
        </div>
      </div>
    </header>
  );
}
