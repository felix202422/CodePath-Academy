import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { cn } from '../../lib/cn';

export interface NavItem {
  to: string;
  label: string;
  /** Exact-match for index routes so /student doesn't highlight on /student/… */
  end?: boolean;
}

export interface AppHeaderProps {
  items: NavItem[];
  actions?: ReactNode;
  /** Rendered on small screens next to the toggle (e.g. user menu). */
  trailing?: ReactNode;
  /**
   * Breakpoint where the inline nav replaces the mobile menu. Dense navigation
   * (the admin shell) uses 'lg' so six items never crowd or wrap.
   */
  breakpoint?: 'md' | 'lg';
}

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'text-accent-600' : 'text-ink-muted hover:text-ink',
  );

const NAV_VISIBILITY = {
  md: { nav: 'hidden md:flex', toggle: 'md:hidden', panel: 'md:hidden' },
  lg: { nav: 'hidden lg:flex', toggle: 'lg:hidden', panel: 'lg:hidden' },
} as const;

/**
 * Responsive site header shared by the public, student, and admin shells:
 * inline nav on wide screens, an accessible disclosure panel on small screens.
 */
export function AppHeader({ items, actions, trailing, breakpoint = 'md' }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const panelId = 'site-nav-panel';
  const visibility = NAV_VISIBILITY[breakpoint];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink to="/" end className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-navy-900 text-sm font-bold text-white"
          >
            CP
          </span>
          <span className="whitespace-nowrap text-base font-semibold text-navy-950">
            CodePath Academy
          </span>
        </NavLink>

        <nav aria-label="Primary" className={cn('items-center gap-1', visibility.nav)}>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClasses}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={cn('items-center gap-2', visibility.nav)}>
          {trailing}
          {actions}
        </div>

        <button
          type="button"
          className={cn(
            'rounded-md p-2 text-ink-muted hover:bg-slate-100 hover:text-ink',
            visibility.toggle,
          )}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <nav
          id={panelId}
          aria-label="Primary mobile"
          className={cn('border-t border-slate-200 px-4 py-3', visibility.panel)}
        >
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={linkClasses}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3">
            {trailing}
            {actions}
          </div>
        </nav>
      )}
    </header>
  );
}
