import { cn } from '@/lib/utils';

/**
 * Marca ARAÚJO LEARN.
 *
 * O símbolo é o "A" original do Rafael (`public/marca/a.png`). Ele é aplicado
 * como máscara CSS em vez de <img>: assim o mesmo arquivo serve em fundo claro
 * e escuro, assumindo a cor do texto ao redor — sem precisar de duas versões.
 */

const MARK_STYLE: React.CSSProperties = {
  WebkitMaskImage: 'url(/marca/a.png)',
  maskImage: 'url(/marca/a.png)',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
};

export function LogoMark({
  className,
  title = 'ARAÚJO LEARN',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      role="img"
      aria-label={title}
      style={MARK_STYLE}
      className={cn('inline-block size-9 shrink-0 bg-current', className)}
    />
  );
}

/**
 * Logotipo: o "A" de ARAÚJO é o próprio símbolo da marca — [A]RAÚJO LEARN.
 * O símbolo entra no lugar da letra, no mesmo alinhamento da linha de base.
 */
export function Logo({
  className,
  variant = 'dark',
  showSlogan = false,
}: {
  className?: string;
  variant?: 'dark' | 'light';
  showSlogan?: boolean;
}) {
  const light = variant === 'light';
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span
        role="img"
        aria-label="ARAÚJO LEARN"
        className={cn(
          'inline-flex items-center font-display text-[1.25rem] font-semibold tracking-tight',
          light ? 'text-white' : 'text-brand-900',
        )}
      >
        <span
          aria-hidden
          style={MARK_STYLE}
          className="-mr-[0.12em] inline-block h-[1.55em] w-[1.55em] shrink-0 bg-current"
        />
        <span aria-hidden>RAÚJO</span>
        <span aria-hidden className={light ? 'text-accent-300' : 'text-accent-500'}>
          &nbsp;LEARN
        </span>
      </span>
      {showSlogan && (
        <span
          className={cn(
            'mt-1.5 text-[0.6875rem] font-medium tracking-[0.14em] uppercase',
            light ? 'text-brand-200' : 'text-ink-500',
          )}
        >
          Aprenda. Evolua. Conquiste.
        </span>
      )}
    </span>
  );
}

/**
 * Assinatura do tutor — o "A" sobre o nome, como na marca pessoal do Amilton.
 *
 * Usada onde quem assina é a pessoa, não a plataforma: certificado, perfil do
 * tutor e cartão do tutor na página do curso.
 */
export function TutorSignature({
  name = 'AMILTON',
  surname = 'ARAÚJO',
  prefix = 'ENG.',
  variant = 'dark',
  size = 'md',
  className,
}: {
  name?: string;
  surname?: string;
  prefix?: string;
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const marks = { sm: 'size-10', md: 'size-16', lg: 'size-24' } as const;
  const names = { sm: 'text-base', md: 'text-2xl', lg: 'text-4xl' } as const;
  const prefixes = { sm: 'text-[0.5rem]', md: 'text-[0.625rem]', lg: 'text-xs' } as const;

  const ink = variant === 'light' ? 'text-white' : 'text-brand-900';

  return (
    <span
      className={cn('inline-flex flex-col items-center', ink, className)}
      role="img"
      aria-label={`${prefix} ${name} ${surname}`}
    >
      <span style={MARK_STYLE} aria-hidden className={cn('bg-current', marks[size])} />
      <span
        aria-hidden
        className={cn(
          'mt-1.5 font-semibold tracking-[0.3em]',
          prefixes[size],
          variant === 'light' ? 'text-brand-200' : 'text-ink-600',
        )}
      >
        {prefix} {name}
      </span>
      <span
        aria-hidden
        className={cn('font-sans leading-none font-extrabold tracking-[0.04em]', names[size])}
      >
        {surname}
      </span>
    </span>
  );
}
