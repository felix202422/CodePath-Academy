import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const tones: Record<AlertTone, { classes: string; Icon: typeof Info }> = {
  info: { classes: 'border-blue-200 bg-blue-50 text-blue-900', Icon: Info },
  success: { classes: 'border-green-200 bg-green-50 text-green-900', Icon: CheckCircle2 },
  warning: { classes: 'border-amber-200 bg-amber-50 text-amber-900', Icon: TriangleAlert },
  danger: { classes: 'border-red-200 bg-red-50 text-red-900', Icon: AlertCircle },
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
}

/** Inline message block. danger/warning alerts announce themselves via role=alert. */
export function Alert({ tone = 'info', className, children, ...rest }: AlertProps) {
  const { classes, Icon } = tones[tone];
  const assertive = tone === 'danger' || tone === 'warning';

  return (
    <div
      role={assertive ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-md border px-4 py-3 text-sm', classes, className)}
      {...rest}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
