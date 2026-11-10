import { useId } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface FieldShellProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  children: (ids: { describedBy: string | undefined }) => React.ReactNode;
}

/** Label + control + hint/error wiring with correct aria-describedby pairing. */
function FieldShell({ id, label, error, hint, required, children }: FieldShellProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {' *'}
          </span>
        )}
      </label>
      {children({ describedBy: describedBy || undefined })}
      {hint && !error && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const controlClasses =
  'w-full rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm text-ink ' +
  'placeholder:text-slate-400 focus:border-accent-500 focus:outline-2 focus:outline-accent-500/40 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-ink-muted';

const invalidClasses = 'border-danger focus:border-danger focus:outline-danger/40';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export function Input({ label, error, hint, id, className, required, ...rest }: InputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required}>
      {({ describedBy }) => (
        <input
          id={fieldId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          className={cn(controlClasses, error && invalidClasses, className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export function Textarea({ label, error, hint, id, className, required, ...rest }: TextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required}>
      {({ describedBy }) => (
        <textarea
          id={fieldId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          className={cn(controlClasses, 'min-h-24 resize-y', error && invalidClasses, className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  options: Array<{ value: string; label: string }>;
}

export function Select({
  label,
  error,
  hint,
  id,
  className,
  required,
  options,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required}>
      {({ describedBy }) => (
        <select
          id={fieldId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          className={cn(controlClasses, error && invalidClasses, className)}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
