interface SkeletonProps {
  /** Extra classes to control the block's size and layout. */
  className?: string;
  /** Accessible label announced while the real content loads. */
  label?: string;
}

/**
 * Loading skeleton block. Decorative by default (aria-hidden); pass `label`
 * once per loading region to expose an accessible status message instead of
 * silence. Respects prefers-reduced-motion via motion-reduce:animate-none.
 */
export function Skeleton({ className = '', label }: SkeletonProps) {
  return (
    <span role={label ? 'status' : undefined} className="contents">
      {label && <span className="sr-only">{label}</span>}
      <span
        aria-hidden="true"
        className={`block animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none dark:bg-slate-700 ${className}`}
      />
    </span>
  );
}
