import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Field';
import type { CourseLevel, CourseSummary } from './catalogApi';
import { CourseCard } from './CourseCard';
import { QueryState } from './QueryState';
import { useCatalog, useOverview, usePaths } from './useCatalog';
import { useFavoriteCourses } from './useFavoriteCourses';

const PAGE_SIZE = 12;

const LEVELS: Array<{ value: CourseLevel; label: string }> = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const LEVEL_ORDER: Record<CourseLevel, number> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
};

type SortOrder = 'curriculum' | 'title' | 'level';
type PageToken = number | 'start-ellipsis' | 'end-ellipsis';

interface FilterState {
  locationSearch: string;
  searchText: string;
  path: string;
  levels: CourseLevel[];
}

function getPageTokens(total: number, current: number): PageToken[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'end-ellipsis', total];
  }
  if (current >= total - 3) {
    return [1, 'start-ellipsis', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, 'start-ellipsis', current - 1, current, current + 1, 'end-ellipsis', total];
}

/**
 * Public catalog, styled after the recorded RIA reference. Filters and counts
 * are derived from published catalog data; fields the academy does not yet
 * track (price, ratings, popularity, and enrollments) are deliberately absent.
 */
export function CatalogPage() {
  const catalog = useCatalog();
  const paths = usePaths();
  const overview = useOverview();
  const favorites = useFavoriteCourses();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('q') ?? '';
  const urlPath = searchParams.get('path') ?? 'all';

  const initialFilters = useMemo<FilterState>(
    () => ({
      locationSearch: location.search,
      searchText: urlSearch,
      path: urlPath,
      levels: [],
    }),
    [location.search, urlPath, urlSearch],
  );
  const [filterState, setFilterState] = useState(initialFilters);
  const [sortOrder, setSortOrder] = useState<SortOrder>('curriculum');
  const [showFavorites, setShowFavorites] = useState(false);
  const [pageState, setPageState] = useState({ locationSearch: location.search, value: 1 });
  const filters = filterState.locationSearch === location.search ? filterState : initialFilters;
  const page = pageState.locationSearch === location.search ? pageState.value : 1;

  function setPage(value: number | ((current: number) => number)) {
    setPageState((currentState) => {
      const currentPage =
        currentState.locationSearch === location.search ? currentState.value : 1;
      return {
        locationSearch: location.search,
        value: typeof value === 'function' ? value(currentPage) : value,
      };
    });
  }

  function updateFilters(updates: Partial<Pick<FilterState, 'searchText' | 'path' | 'levels'>>) {
    setFilterState({ ...filters, ...updates, locationSearch: location.search });
    setPage(1);
  }

  const allCourses = useMemo(() => catalog.data ?? [], [catalog.data]);
  const levelCounts: Record<CourseLevel, number> = {
    BEGINNER: allCourses.filter((course) => course.level === 'BEGINNER').length,
    INTERMEDIATE: allCourses.filter((course) => course.level === 'INTERMEDIATE').length,
    ADVANCED: allCourses.filter((course) => course.level === 'ADVANCED').length,
  };

  const filteredCourses = useMemo(() => {
    const normalizedSearch = filters.searchText.trim().toLocaleLowerCase();
    const matches = allCourses.filter((course) => {
      const matchesPath = filters.path === 'all' || course.pathSlug === filters.path;
      const matchesLevel =
        filters.levels.length === 0 || filters.levels.includes(course.level);
      const matchesFavorite = !showFavorites || favorites.favoriteSlugs.includes(course.slug);
      const searchable = `${course.title} ${course.summary} ${course.pathName}`.toLocaleLowerCase();
      return (
        matchesPath &&
        matchesLevel &&
        matchesFavorite &&
        (!normalizedSearch || searchable.includes(normalizedSearch))
      );
    });

    if (sortOrder === 'title') {
      return matches.sort((left, right) => left.title.localeCompare(right.title));
    }
    if (sortOrder === 'level') {
      return matches.sort(
        (left, right) =>
          LEVEL_ORDER[left.level] - LEVEL_ORDER[right.level] ||
          left.title.localeCompare(right.title),
      );
    }
    // The API order is the curriculum's real path/course order.
    return matches;
  }, [allCourses, favorites.favoriteSlugs, filters, showFavorites, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageTokens = getPageTokens(totalPages, currentPage);
  const pageCourses = filteredCourses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const startHere = new Set(overview.data?.startHere.map((course) => course.slug) ?? []);
  const favoriteCount = allCourses.filter((course) => favorites.favoriteSlugs.includes(course.slug)).length;

  function toggleLevel(level: CourseLevel) {
    const levels = filters.levels.includes(level)
      ? filters.levels.filter((item) => item !== level)
      : [...filters.levels, level];
    updateFilters({ levels });
  }

  function clearFilters() {
    const empty: FilterState = {
      locationSearch: location.search,
      searchText: '',
      path: 'all',
      levels: [],
    };
    setFilterState(empty);
    setSortOrder('curriculum');
    setShowFavorites(false);
    setPage(1);
    setSearchParams({});
  }

  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...(paths.data ?? []).map((path) => ({
      value: path.slug,
      label: `${path.name} (${path.courseCount})`,
    })),
  ];

  return (
    <div>
      <section aria-labelledby="catalog-title" className="overflow-hidden border-b border-accent-100 bg-accent-50">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_21rem] md:py-14">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.16em] text-accent-700 uppercase">
              CodePath Academy · Published curriculum
            </p>
            <h1 id="catalog-title" className="mt-3 text-4xl font-bold tracking-tight text-navy-950 sm:text-5xl">
              Explore Our <span className="text-accent-600">Courses</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
              Discover a clear next step in software engineering, web development, data, and more.
              Browse published courses by learning path and level.
            </p>
          </div>

          <div className="group relative mx-auto hidden h-52 w-full max-w-sm overflow-hidden rounded-2xl border border-white/70 bg-navy-950 shadow-xl shadow-navy-950/15 md:block">
            <img
              src="/images/academy-learning.webp"
              alt="Illustrative stock photo of learners working together at computers with code on screen."
              loading="eager"
              decoding="async"
              className="absolute inset-0 size-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent"
            />
            <p className="absolute bottom-4 left-4 rounded-lg border border-white/30 bg-navy-950/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm">
              Learn. Build. Innovate.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Browse published courses"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10"
      >
        <div className="grid items-start gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:gap-8">
          <aside aria-label="Course filters" className="lg:sticky lg:top-24">
            <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-navy-950">Filters</h2>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="cursor-pointer rounded px-1 text-xs font-semibold text-accent-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-50 hover:underline"
                >
                  Clear all
                </button>
              </div>

              <div className="mt-5">
                <label htmlFor="catalog-filter-search" className="text-sm font-semibold text-ink">
                  Search
                </label>
                <div className="relative mt-2">
                  <Search
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="catalog-filter-search"
                    type="search"
                    value={filters.searchText}
                    onChange={(event) => updateFilters({ searchText: event.target.value })}
                    placeholder="Search courses..."
                    className="w-full rounded-lg border border-slate-200 bg-surface py-2.5 pr-3 pl-9 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
                  />
                </div>
              </div>

              <div className="mt-5">
                <Select
                  id="catalog-category"
                  label="Category"
                  value={filters.path}
                  onChange={(event) => updateFilters({ path: event.target.value })}
                  options={categoryOptions}
                  className="cursor-pointer py-2.5"
                />
              </div>

              <fieldset className="mt-5 border-t border-slate-100 pt-4">
                <legend className="text-sm font-semibold text-ink">Level</legend>
                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={filters.levels.length === 0}
                    onChange={() => updateFilters({ levels: [] })}
                    className="size-4 cursor-pointer rounded border-slate-300 accent-accent-600 focus:ring-accent-500"
                  />
                  <span className="flex-1">All levels</span>
                  <span className="text-xs text-ink-muted">{allCourses.length}</span>
                </label>
                <div className="mt-2 space-y-2">
                  {LEVELS.map((level) => (
                    <label
                      key={level.value}
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-ink"
                    >
                      <input
                        type="checkbox"
                        checked={filters.levels.includes(level.value)}
                        onChange={() => toggleLevel(level.value)}
                        className="size-4 cursor-pointer rounded border-slate-300 accent-accent-600 focus:ring-accent-500"
                      />
                      <span className="flex-1">{level.label}</span>
                      <span className="text-xs text-ink-muted">{levelCounts[level.value]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-ink-muted">
                The academy does not track pricing or subscription categories. Filter by learning
                path and level instead.
              </p>

            </div>
          </aside>

          <section aria-label="Course results" className="min-w-0">
            <QueryState query={catalog}>
              {() => {
                const results = filteredCourses;
                const resultCount = results.length;
                const firstResult = resultCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
                const lastResult = Math.min(currentPage * PAGE_SIZE, resultCount);

                return (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div
                        role="group"
                        aria-label="Course collection"
                        className="inline-flex rounded-lg border border-slate-200 bg-surface p-1 shadow-sm"
                      >
                        <button
                          type="button"
                          aria-pressed={!showFavorites}
                          onClick={() => {
                            setShowFavorites(false);
                            setPage(1);
                          }}
                          className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transform-none motion-reduce:transition-none ${
                            showFavorites
                              ? 'text-ink-muted hover:bg-accent-50 hover:text-accent-700'
                              : 'bg-accent-600 text-white shadow-sm hover:bg-accent-700'
                          }`}
                        >
                          All courses <span className="ml-1 text-xs opacity-80">{allCourses.length}</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={showFavorites}
                          onClick={() => {
                            setShowFavorites(true);
                            setPage(1);
                          }}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transform-none motion-reduce:transition-none ${
                            showFavorites
                              ? 'bg-accent-600 text-white shadow-sm hover:bg-accent-700'
                              : 'text-ink-muted hover:bg-accent-50 hover:text-accent-700'
                          }`}
                        >
                          <Heart
                            className={`size-4 ${showFavorites ? 'fill-current' : ''}`}
                            aria-hidden="true"
                          />
                          Favorites <span className="text-xs opacity-80">{favoriteCount}</span>
                        </button>
                      </div>
                      <p className="text-xs text-ink-muted">Favorites are saved in this browser.</p>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <p role="status" className="text-sm text-ink-muted">
                        {resultCount === 0
                          ? 'Showing 0 results'
                          : `Showing ${firstResult} to ${lastResult} of ${resultCount} results`}
                      </p>
                      <div className="flex items-center gap-2">
                        <label htmlFor="catalog-sort" className="whitespace-nowrap text-sm text-ink-muted">
                          Sort by:
                        </label>
                        <select
                          id="catalog-sort"
                          value={sortOrder}
                          onChange={(event) => {
                            setSortOrder(event.target.value as SortOrder);
                            setPage(1);
                          }}
                          className="cursor-pointer rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm font-medium text-ink outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
                        >
                          <option value="curriculum">Curriculum order</option>
                          <option value="title">Title A–Z</option>
                          <option value="level">Level</option>
                        </select>
                      </div>
                    </div>

                    {resultCount === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-surface px-6 py-12 text-center">
                        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-50 text-accent-700">
                          <Search className="size-5" aria-hidden="true" />
                        </span>
                        <h2 className="mt-4 text-lg font-semibold text-navy-950">
                          {showFavorites
                            ? favoriteCount === 0
                              ? 'No favorite courses yet'
                              : 'No favorites match these filters'
                            : 'No courses match these filters'}
                        </h2>
                        <p className="mt-2 text-sm text-ink-muted">
                          {showFavorites && favoriteCount === 0
                            ? 'Save a course with its heart button and it will appear here.'
                            : 'Try another search or clear the filters to see more published courses.'}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-5"
                          onClick={clearFilters}
                        >
                          {showFavorites && favoriteCount === 0 ? 'Browse all courses' : 'Clear filters'}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <ul
                          key={`${filters.searchText}|${filters.path}|${filters.levels.join(',')}|${sortOrder}|${currentPage}`}
                          className="catalog-results-enter grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        >
                          {pageCourses.map((course: CourseSummary, index) => (
                            <li
                              key={course.slug}
                              style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                            >
                              <CourseCard
                                course={course}
                                isStartHere={startHere.has(course.slug)}
                                isFavorite={favorites.isFavorite(course.slug)}
                                onToggleFavorite={favorites.toggleFavorite}
                              />
                            </li>
                          ))}
                        </ul>

                        {totalPages > 1 && (
                          <nav aria-label="Course catalog pages" className="mt-8 flex justify-center">
                            <ul className="flex flex-wrap items-center justify-center gap-1.5">
                              <li>
                                <button
                                  type="button"
                                  aria-label="Previous page"
                                  disabled={currentPage <= 1}
                                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-surface text-ink-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-200 hover:text-accent-700 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transform-none motion-reduce:transition-none"
                                >
                                  <ArrowLeft className="size-4" aria-hidden="true" />
                                </button>
                              </li>
                              {pageTokens.map((token) => (
                                <li key={typeof token === 'number' ? token : token}>
                                  {typeof token === 'number' ? (
                                    <button
                                      type="button"
                                      aria-label={`Go to page ${token}`}
                                      aria-current={token === currentPage ? 'page' : undefined}
                                      onClick={() => setPage(token)}
                                      className={
                                        token === currentPage
                                          ? 'inline-flex size-9 cursor-pointer items-center justify-center rounded-lg bg-accent-600 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-700 hover:shadow-md'
                                          : 'inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-surface text-sm font-medium text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-200 hover:text-accent-700 hover:shadow-sm motion-reduce:transform-none motion-reduce:transition-none'
                                      }
                                    >
                                      {token}
                                    </button>
                                  ) : (
                                    <span className="inline-flex size-9 items-center justify-center text-sm text-ink-muted" aria-hidden="true">
                                      …
                                    </span>
                                  )}
                                </li>
                              ))}
                              <li>
                                <button
                                  type="button"
                                  aria-label="Next page"
                                  disabled={currentPage >= totalPages}
                                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-surface text-ink-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-200 hover:text-accent-700 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transform-none motion-reduce:transition-none"
                                >
                                  <ArrowRight className="size-4" aria-hidden="true" />
                                </button>
                              </li>
                            </ul>
                          </nav>
                        )}
                      </>
                    )}
                  </>
                );
              }}
            </QueryState>
          </section>
        </div>
      </section>

      <section aria-labelledby="catalog-cta-heading" className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-navy-950 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
          <div aria-hidden="true" className="absolute -top-16 right-12 size-48 rounded-full border-[24px] border-white/5" />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-2xl">
              <Badge className="!bg-white/10 !text-white">CodePath Academy</Badge>
              <h2 id="catalog-cta-heading" className="mt-4 text-2xl font-bold sm:text-3xl">
                Ready to take your next step?
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
                Find a learning path that fits where you are today and build toward what comes next.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-500 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none motion-reduce:transition-none"
              >
                Apply Now
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                to="/paths"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none motion-reduce:transition-none"
              >
                Explore Career Paths
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
