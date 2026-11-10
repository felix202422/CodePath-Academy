import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-ink-muted">
      <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden="true" />
      {label}
    </span>
  );
}

export function SpinnerCentered({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner label={label} />
    </div>
  );
}
