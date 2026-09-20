'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'outline-light';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-800 text-white hover:bg-brand-700 active:bg-brand-900 shadow-soft disabled:bg-ink-300',
  accent:
    'bg-accent-400 text-brand-950 hover:bg-accent-300 active:bg-accent-500 shadow-soft font-semibold disabled:bg-ink-300 disabled:text-ink-500',
  secondary:
    'bg-white text-brand-800 border border-ink-200 hover:border-brand-300 hover:bg-brand-50 active:bg-brand-100',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 shadow-soft',
  'outline-light':
    'border border-white/25 text-white hover:bg-white/10 active:bg-white/15 backdrop-blur-sm',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-[0.9375rem] gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-xl',
};

const BASE =
  'inline-flex items-center justify-center font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 select-none ' +
  'disabled:cursor-not-allowed disabled:opacity-60 active:translate-y-px whitespace-nowrap';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Ocupa toda a largura — usado nos formulários em telas pequenas. */
  block?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)}
      {...props}
    >
      {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)}
      {...props}
    >
      {children}
    </Link>
  );
}

/** Botão só com ícone — exige `aria-label`. */
export function IconButton({
  label,
  className,
  children,
  variant = 'ghost',
  ...props
}: Omit<ButtonProps, 'size' | 'children'> & { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        BASE,
        VARIANTS[variant],
        'size-9 rounded-lg p-0',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
