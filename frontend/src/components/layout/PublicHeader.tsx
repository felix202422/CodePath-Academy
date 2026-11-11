import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Cloud,
  Code2,
  Database,
  Menu,
  Monitor,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { cn } from '../../lib/cn';
import { usePaths } from '../../features/public/useCatalog';

const PATH_ICONS: Record<string, LucideIcon> = {
  'software-engineering': Code2,
  'frontend-development': Monitor,
  'backend-development': Server,
  'database-engineering': Database,
  'mobile-development': Smartphone,
  cybersecurity: ShieldCheck,
  'devops-and-cloud': Cloud,
};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'text-accent-700' : 'text-ink-muted hover:text-ink',
  );

interface CourseSearchProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  className?: string;
}

function CourseSearch({ id, value, onChange, onSubmit, className }: CourseSearchProps) {
  return (
    <form role="search" aria-label="Course search" onSubmit={onSubmit} className={className}>
      <label htmlFor={id} className="sr-only">
        Search for courses
      </label>
      <div className="relative flex w-full items-center">
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search for courses..."
          className="w-full rounded-lg border border-slate-200 bg-surface py-2 pr-10 pl-3 text-sm text-ink shadow-sm outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
        />
        <button
          type="submit"
          aria-label="Search courses"
          className="absolute right-1.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-all duration-200 hover:scale-110 hover:bg-accent-50 hover:text-accent-700 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-500 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <Search className="size-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

interface PublicHeaderProps {
  actions?: ReactNode;
}

/**
 * Public-facing header follows the catalog reference: compact brand and nav,
 * a real client-side catalog search, and a learning-path category menu. There
 * is intentionally no popularity column because the catalog has no popularity
 * or rating data.
 */
export function PublicHeader({ actions }: PublicHeaderProps) {
  const paths = usePaths();
  const location = useLocation();
  const navigate = useNavigate();
  const urlSearch = new URLSearchParams(location.search).get('q') ?? '';
  const [searchDraft, setSearchDraft] = useState({
    locationSearch: location.search,
    value: urlSearch,
  });
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePathsOpen, setMobilePathsOpen] = useState(false);
  const coursesButtonRef = useRef<HTMLButtonElement>(null);
  const isCoursesRoute = location.pathname.startsWith('/courses');
  const searchText = searchDraft.locationSearch === location.search ? searchDraft.value : urlSearch;

  function setSearchText(value: string) {
    setSearchDraft({ locationSearch: location.search, value });
  }

  function closeMenus() {
    setCoursesOpen(false);
    setMobileOpen(false);
    setMobilePathsOpen(false);
  }

  useEffect(() => {
    if (!coursesOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setCoursesOpen(false);
        coursesButtonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [coursesOpen]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchText.trim();
    closeMenus();
    navigate(query ? `/courses?q=${encodeURIComponent(query)}` : '/courses');
  }

  function openPath(pathSlug: string) {
    closeMenus();
    navigate(`/courses?path=${encodeURIComponent(pathSlug)}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-surface/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-[4.25rem] max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="CodePath Academy home"
          onClick={closeMenus}
        >
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-xl bg-navy-900 text-xs font-bold tracking-tight text-white shadow-sm"
          >
            CP
          </span>
          <span className="whitespace-nowrap text-base font-bold tracking-tight text-navy-950 sm:text-lg">
            CodePath Academy
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-1 xl:flex">
          <NavLink to="/" end className={navLinkClass} onClick={closeMenus}>
            Home
          </NavLink>
          <div className="relative">
            <button
              ref={coursesButtonRef}
              type="button"
              aria-expanded={coursesOpen}
              aria-controls="public-courses-menu"
              aria-haspopup="true"
              onClick={() => setCoursesOpen((open) => !open)}
              className={cn(
                'flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5',
                isCoursesRoute || coursesOpen
                  ? 'text-accent-700'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              Courses
              <ChevronDown
                className={cn('size-4 transition-transform', coursesOpen && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
          </div>
          <NavLink to="/paths" className={navLinkClass} onClick={closeMenus}>
            Career Paths
          </NavLink>
          <NavLink to="/about" className={navLinkClass} onClick={closeMenus}>
            About Us
          </NavLink>
        </nav>

        <CourseSearch
          id="public-course-search-desktop"
          value={searchText}
          onChange={setSearchText}
          onSubmit={submitSearch}
          className="hidden w-56 shrink-0 lg:block xl:w-60"
        />

        <div className="ml-auto hidden shrink-0 items-center gap-2 xl:flex">{actions}</div>

        <button
          type="button"
          className="ml-auto inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-all duration-200 hover:scale-105 hover:bg-accent-50 hover:text-accent-700 active:scale-95 xl:hidden motion-reduce:transform-none motion-reduce:transition-none"
          aria-expanded={mobileOpen}
          aria-controls="public-mobile-navigation"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {coursesOpen && (
        <div
          id="public-courses-menu"
          className="catalog-menu-enter absolute inset-x-0 top-full border-t border-slate-100 bg-surface shadow-xl"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setCoursesOpen(false);
              coursesButtonRef.current?.focus();
            }
          }}
        >
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[1fr_15rem]">
            <section aria-labelledby="course-categories-heading">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id="course-categories-heading"
                  className="text-xs font-semibold tracking-wide text-ink-muted uppercase"
                >
                  Course categories
                </h2>
                <Link
                  to="/courses"
                  onClick={closeMenus}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:underline"
                >
                  View all courses
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
              {paths.isPending && (
                <p className="mt-4 text-sm text-ink-muted">Loading published learning paths…</p>
              )}
              {paths.isError && (
                <p className="mt-4 text-sm text-ink-muted">
                  Learning paths are temporarily unavailable. Browse all published courses instead.
                </p>
              )}
              {paths.data && (
                <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                  {paths.data.map((path) => {
                    const Icon = PATH_ICONS[path.slug] ?? BookOpen;
                    return (
                      <li key={path.slug}>
                        <button
                          type="button"
                          onClick={() => openPath(path.slug)}
                          className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-all duration-200 hover:translate-x-0.5 hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-accent-500 motion-reduce:transform-none motion-reduce:transition-none"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-100 text-accent-700">
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink group-hover:text-accent-700">
                              {path.name}
                            </span>
                            <span className="block text-xs text-ink-muted">
                              {path.courseCount} {path.courseCount === 1 ? 'course' : 'courses'}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <aside className="flex flex-col justify-between rounded-xl bg-accent-50 p-5">
              <div>
                <span className="flex size-10 items-center justify-center rounded-lg bg-surface text-accent-700 shadow-sm">
                  <BookOpen className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-sm font-semibold text-navy-950">
                  Find your next step
                </h2>
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  Browse published courses in curriculum order, or compare learning paths to see
                  where to begin.
                </p>
              </div>
              <Link
                to="/paths"
                onClick={closeMenus}
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent-700 hover:underline"
              >
                Explore Career Paths
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </div>
      )}

      {mobileOpen && (
        <nav
          id="public-mobile-navigation"
          aria-label="Primary mobile"
          className="border-t border-slate-200 bg-surface px-4 py-4 xl:hidden sm:px-6"
        >
          <ul className="flex flex-col gap-1">
            <li>
              <NavLink to="/" end className={navLinkClass} onClick={closeMenus}>
                Home
              </NavLink>
            </li>
            <li>
              <Link
                to="/courses"
                onClick={closeMenus}
                className="block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-accent-50"
              >
                Courses
              </Link>
            </li>
            <li>
              <NavLink to="/paths" className={navLinkClass} onClick={closeMenus}>
                Career Paths
              </NavLink>
            </li>
            <li>
              <NavLink to="/about" className={navLinkClass} onClick={closeMenus}>
                About Us
              </NavLink>
            </li>
          </ul>

          {paths.data && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                aria-expanded={mobilePathsOpen}
                aria-controls="mobile-course-categories"
                onClick={() => setMobilePathsOpen((open) => !open)}
                className="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-accent-50 hover:text-accent-700"
              >
                Browse by learning path
                <ChevronDown
                  className={cn('size-4 transition-transform', mobilePathsOpen && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>
              {mobilePathsOpen && (
                <ul id="mobile-course-categories" className="grid gap-1 pl-3">
                  {paths.data.map((path) => (
                    <li key={path.slug}>
                      <button
                        type="button"
                        onClick={() => openPath(path.slug)}
                        className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-ink-muted hover:bg-accent-50 hover:text-accent-700"
                      >
                        {path.name} ({path.courseCount})
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <CourseSearch
            id="public-course-search-mobile"
            value={searchText}
            onChange={setSearchText}
            onSubmit={submitSearch}
            className="mt-4"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            {actions}
          </div>
        </nav>
      )}
    </header>
  );
}
