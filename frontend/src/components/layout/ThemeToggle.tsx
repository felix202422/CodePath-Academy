import { Moon, Sun } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useTheme } from '../../features/theme/useTheme';

/** Accessible light/dark palette toggle shared by all application headers. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      onClick={toggleTheme}
      className={cn(
        'inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-surface text-ink-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-200 hover:bg-accent-50 hover:text-accent-700 hover:shadow-md active:translate-y-0 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 motion-reduce:transform-none motion-reduce:transition-none',
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
