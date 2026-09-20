'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Award, LayoutDashboard, Library, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/painel', label: 'Painel', icon: LayoutDashboard },
  { href: '/meus-cursos', label: 'Meus cursos', icon: Library },
  { href: '/certificados', label: 'Certificados', icon: Award },
  { href: '/conta', label: 'Minha conta', icon: UserCog },
];

/** Navegação da área do aluno. Rola na horizontal no celular. */
export function StudentNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-ink-200 bg-white">
      <nav
        aria-label="Área do aluno"
        className="scroll-slim mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6"
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors',
                active
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800',
              )}
            >
              <tab.icon aria-hidden className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
