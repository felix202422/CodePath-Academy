import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700',
  secondary: 'bg-navy-900 text-white hover:bg-navy-950',
  outline:
    'border border-slate-300 bg-surface text-ink hover:border-accent-200 hover:bg-accent-50 hover:text-accent-700',
  ghost: 'text-ink hover:bg-accent-50 hover:text-accent-700',
  danger: 'bg-danger text-white hover:bg-red-700',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const baseClasses = [
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 ease-out',
  'hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500',
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100',
  'motion-reduce:transform-none motion-reduce:transition-none',
].join(' ');

/**
 * Class list for controls that *navigate*. An anchor styled as a button must
 * carry these directly: nesting a <button> inside a link is invalid HTML and
 * fragments the link's touch target (Lighthouse flags the leftover 1.6 px frame
 * as an undersized target). Same visuals, single interactive element.
 *
 * Lives in its own module so `Button.tsx` keeps exporting only components.
 */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
}
