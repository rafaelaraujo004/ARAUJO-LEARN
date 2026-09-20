import { cn } from '@/lib/utils';

/**
 * Marca ARAÚJO LEARN.
 *
 * O símbolo é um "A" construído por três degraus ascendentes — a leitura visual
 * do slogan: Aprenda (base), Evolua (meio), Conquiste (topo, em dourado).
 */

export function LogoMark({
  className,
  title = 'ARAÚJO LEARN',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label={title}
      className={cn('h-9 w-9', className)}
      fill="none"
    >
      <rect width="40" height="40" rx="11" className="fill-brand-900" />
      {/* degrau 1 — Aprenda */}
      <path d="M9 30h6.4l2.2-5.4H14L9 30Z" className="fill-brand-400" />
      {/* degrau 2 — Evolua */}
      <path d="M15.7 23.2h7.5l2.2-5.4h-7.5l-2.2 5.4Z" className="fill-brand-200" />
      {/* topo — Conquiste */}
      <path d="M22.4 16.4 25.9 8l5.1 22h-6.2l-1.6-7.6h-4.3l3.5-6Z" className="fill-accent-300" />
    </svg>
  );
}

export function Logo({
  className,
  variant = 'dark',
  showSlogan = false,
}: {
  className?: string;
  variant?: 'dark' | 'light';
  showSlogan?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-[1.0625rem] font-semibold tracking-tight',
            variant === 'light' ? 'text-white' : 'text-brand-900',
          )}
        >
          ARAÚJO<span className={variant === 'light' ? 'text-accent-300' : 'text-accent-500'}>
            {' '}
            LEARN
          </span>
        </span>
        {showSlogan && (
          <span
            className={cn(
              'mt-1 text-[0.6875rem] font-medium tracking-[0.14em] uppercase',
              variant === 'light' ? 'text-brand-200' : 'text-ink-500',
            )}
          >
            Aprenda. Evolua. Conquiste.
          </span>
        )}
      </span>
    </span>
  );
}
