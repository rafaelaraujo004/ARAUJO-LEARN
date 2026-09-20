import * as React from 'react';
import { cn } from '@/lib/utils';
import { clamp } from '@/lib/utils';

/** Peças visuais pequenas e reutilizáveis. Sem estado, sem 'use client'. */

export function Card({
  className,
  children,
  as: Tag = 'div',
}: {
  className?: string;
  children: React.ReactNode;
  as?: React.ElementType;
}) {
  return (
    <Tag
      className={cn(
        'rounded-card border border-ink-200 bg-white shadow-soft',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="font-sans text-base font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type BadgeTone = 'neutral' | 'brand' | 'accent' | 'progress' | 'danger' | 'muted';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  accent: 'bg-accent-50 text-accent-700 ring-accent-200',
  progress: 'bg-progress-100 text-progress-700 ring-progress-300/60',
  danger: 'bg-danger-50 text-danger-600 ring-danger-100',
  muted: 'bg-white/10 text-white ring-white/20',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
  icon,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        BADGE_TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function Progress({
  value,
  label,
  size = 'md',
  tone = 'progress',
  className,
  showValue = false,
}: {
  value: number;
  label?: string;
  size?: 'sm' | 'md';
  tone?: 'progress' | 'accent' | 'brand';
  className?: string;
  showValue?: boolean;
}) {
  const percent = Math.round(clamp(value, 0, 100));
  const bar =
    tone === 'accent' ? 'bg-accent-400' : tone === 'brand' ? 'bg-brand-500' : 'bg-progress-500';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `Progresso: ${percent}%`}
        className={cn(
          'relative w-full overflow-hidden rounded-pill bg-ink-200',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
        )}
      >
        <span
          className={cn('absolute inset-y-0 left-0 rounded-pill transition-[width] duration-500', bar)}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showValue && (
        <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-600">
          {percent}%
        </span>
      )}
    </div>
  );
}

/** Anel de progresso — usado nos cartões do dashboard. */
export function ProgressRing({
  value,
  size = 56,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const percent = Math.round(clamp(value, 0, 100));
  const stroke = size >= 56 ? 5 : 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-ink-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (percent / 100) * circumference}
          className={percent === 100 ? 'stroke-progress-500' : 'stroke-brand-500'}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums text-ink-700"
        aria-label={`${percent}% concluído`}
      >
        {percent}%
      </span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('shimmer rounded-lg', className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-ink-300 bg-white/60 px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-500">
          {icon}
        </span>
      )}
      <div>
        <p className="font-sans text-base font-semibold text-ink-800">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const ALERT_TONES: Record<AlertTone, string> = {
  info: 'border-brand-200 bg-brand-50 text-brand-800',
  success: 'border-progress-300 bg-progress-100 text-progress-700',
  warning: 'border-accent-200 bg-accent-50 text-accent-700',
  danger: 'border-danger-100 bg-danger-50 text-danger-600',
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  icon,
}: {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-xl border px-4 py-3 text-sm', ALERT_TONES[tone], className)}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-[0.8125rem]')}>{children}</div>}
      </div>
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-700 ring-1 ring-brand-200',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        letters || '?'
      )}
    </span>
  );
}

/** Separador com rótulo — usado entre blocos de formulário. */
export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn('border-ink-200', className)} />;
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="h-px flex-1 bg-ink-200" />
      <span className="text-xs font-medium tracking-wide text-ink-400 uppercase">{label}</span>
      <span className="h-px flex-1 bg-ink-200" />
    </div>
  );
}

/** Estatística compacta (painel do tutor e dashboard do aluno). */
export function Stat({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'brand' | 'accent' | 'progress';
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-accent-50 text-accent-600',
    progress: 'bg-progress-100 text-progress-700',
  } as const;

  return (
    <Card className="flex items-center gap-4 p-4">
      {icon && (
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', tones[tone])}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium tracking-wide text-ink-500 uppercase">{label}</p>
        <p className="font-display text-2xl leading-tight font-semibold text-brand-900 tabular-nums">
          {value}
        </p>
        {hint && <p className="truncate text-xs text-ink-500">{hint}</p>}
      </div>
    </Card>
  );
}
