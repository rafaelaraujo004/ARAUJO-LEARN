'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Campos de formulário.
 * Cada campo tem label associada, descrição opcional e mensagem de erro ligada
 * por `aria-describedby` — leitores de tela anunciam o erro junto com o campo.
 */

const CONTROL =
  'w-full rounded-xl border bg-white px-3.5 text-[0.9375rem] text-ink-900 shadow-inset-line ' +
  'placeholder:text-ink-400 transition-colors ' +
  'border-ink-200 hover:border-ink-300 focus:border-brand-400 ' +
  'disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500';

const INVALID = 'border-danger-500 hover:border-danger-500 focus:border-danger-500';

let idCounter = 0;
function useFieldId(provided?: string): string {
  const [generated] = React.useState(() => `field-${++idCounter}`);
  return provided ?? generated;
}

interface BaseFieldProps {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: BaseFieldProps & { id: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink-700">
          {label}
          {required && (
            <span className="ml-0.5 text-danger-500" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-danger-600"
        >
          <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseFieldProps {
  /** Ícone à esquerda (busca, e-mail…). */
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id: providedId, icon, required, ...props },
  ref,
) {
  const id = useFieldId(providedId);
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="relative">
        {icon && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400"
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(CONTROL, 'h-11', icon && 'pl-10', error && INVALID)}
          {...props}
        />
      </div>
    </FieldShell>
  );
});

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseFieldProps {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id: providedId, required, rows = 4, ...props },
  ref,
) {
  const id = useFieldId(providedId);
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(CONTROL, 'resize-y py-2.5 leading-relaxed', error && INVALID)}
        {...props}
      />
    </FieldShell>
  );
});

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    BaseFieldProps {
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id: providedId, options, required, ...props },
  ref,
) {
  const id = useFieldId(providedId);
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          CONTROL,
          "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%236b7889%22><path d=%22M5.5 7.5 10 12l4.5-4.5%22 stroke=%22%236b7889%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-[length:1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat pr-10",
          error && INVALID,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

export function Checkbox({
  label,
  description,
  className,
  id: providedId,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  const id = useFieldId(providedId);
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4.5 shrink-0 cursor-pointer rounded border-ink-300 text-brand-600 accent-brand-600"
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer text-sm text-ink-700 select-none">
        <span className="font-medium">{label}</span>
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </label>
    </div>
  );
}

/** Interruptor para opções on/off no painel do tutor. */
export function Switch({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-700">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-progress-500' : 'bg-ink-300',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}
