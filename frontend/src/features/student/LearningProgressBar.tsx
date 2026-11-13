interface LearningProgressBarProps {
  label: string;
  completed: number;
  total: number;
  percent: number;
}

/** Accessible progress display backed by published lessons and completion rows. */
export function LearningProgressBar({ label, completed, total, percent }: LearningProgressBarProps) {
  return (
    <div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-accent-600 transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">
        {total === 0
          ? 'No published lessons yet'
          : `${completed} of ${total} ${total === 1 ? 'lesson' : 'lessons'} complete`}
      </p>
    </div>
  );
}
