import {
  ArrowRight,
  BookOpen,
  Code2,
  Compass,
  Search,
  Route,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router';
import { ApiStatus } from '../health/ApiStatus';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Card, CardDescription, CardTitle } from '../../components/ui/Card';
import { SpinnerCentered } from '../../components/ui/Spinner';
import { ScrollReveal } from '../../components/ui/ScrollReveal';
import { ApiRequestError } from '../../lib/api';
import { CourseCard } from './CourseCard';
import { PathCard } from './PathCard';
import { useOverview } from './useCatalog';
import { useFavoriteCourses } from './useFavoriteCourses';

const FEATURES = [
  {
    icon: Route,
    title: 'Published learning paths',
    description:
      'Browse the learning paths currently available and see their real published course counts.',
  },
  {
    icon: BookOpen,
    title: 'Course details before you start',
    description:
      'Review each published course’s level, summary, prerequisites, and curriculum source before choosing.',
  },
  {
    icon: Compass,
    title: 'A clear starting point',
    description:
      'Use the real “Start here” recommendations or browse courses in curriculum order.',
  },
  {
    icon: UserCheck,
    title: 'Approved access',
    description:
      'Create an account; an administrator reviews registration before learning access is activated.',
  },
];

const START_STEPS = [
  {
    number: '01',
    icon: Search,
    title: 'Explore courses',
    description: 'Filter published courses by learning path and level to find a useful first step.',
    to: '/courses',
    action: 'Browse courses',
  },
  {
    number: '02',
    icon: Route,
    title: 'Choose a learning path',
    description: 'Compare the paths and follow the course sequence that fits your goals.',
    to: '/paths',
    action: 'Compare paths',
  },
  {
    number: '03',
    icon: UserCheck,
    title: 'Request an account',
    description: 'Register with your details; an administrator reviews each request before access.',
    to: '/register',
    action: 'Apply Now',
  },
];

/**
 * Public landing page: hero, live catalog counts and content from the public
 * API, feature overview, and a live health check.
 */
export function HomePage() {
  const overview = useOverview();
  const favorites = useFavoriteCourses();

  return (
    <div>
      <section className="overflow-hidden border-b border-accent-100 bg-accent-50 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-[1fr_21rem]">
          <div className="max-w-3xl">
            <p className="text-xs font-bold tracking-[0.16em] text-accent-700 uppercase">
              CodePath Academy
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-navy-950 sm:text-6xl">
              Learn. Build. Innovate. <span className="text-accent-600">Become.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-7 text-ink-muted">
              Explore the courses currently published, compare learning paths, and review
              prerequisites before choosing a clear place to begin.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses">
                <Button size="lg">Browse courses</Button>
              </Link>
              <Link to="/paths">
                <Button size="lg" variant="outline">
                  Explore learning paths
                </Button>
              </Link>
            </div>
          </div>

          <div aria-hidden="true" className="relative mx-auto hidden h-48 w-full max-w-sm md:block">
            <div className="absolute inset-x-8 top-3 bottom-1 rotate-[-5deg] rounded-3xl bg-violet-600/10" />
            <div className="absolute inset-x-4 top-1 bottom-3 rotate-[4deg] rounded-3xl bg-accent-600/10" />
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-white/80 bg-white/85 p-5 shadow-xl shadow-navy-950/10 backdrop-blur">
              <div className="grid w-full grid-cols-[0.8fr_1.2fr] gap-3">
                <div className="rounded-xl bg-accent-50 p-4">
                  <BookOpen className="size-7 text-accent-700" strokeWidth={1.7} />
                  <div className="mt-5 h-2 w-4/5 rounded-full bg-accent-200" />
                  <div className="mt-2 h-2 w-3/5 rounded-full bg-accent-100" />
                </div>
                <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-navy-950 via-accent-700 to-violet-600 p-4 text-white">
                  <Code2 className="size-8" strokeWidth={1.6} />
                  <div>
                    <div className="h-2 w-4/5 rounded-full bg-white/80" />
                    <div className="mt-2 h-2 w-3/5 rounded-full bg-white/40" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScrollReveal>
      <section aria-labelledby="catalog-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="catalog-heading" className="text-2xl font-bold text-navy-950">
              Start learning today
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-muted">
              Live counts from the academy catalog — every course below is published and
              ready to browse.
            </p>
          </div>
          <Link to="/courses" className="text-sm font-medium text-accent-600 hover:underline">
            Browse the full catalog
          </Link>
        </div>

        {overview.isPending && <SpinnerCentered label="Loading catalog…" />}
        {overview.isError && (
          <Alert tone="danger" className="mt-4">
            {overview.error instanceof ApiRequestError
              ? overview.error.message
              : 'The catalog could not be loaded. Please try again.'}
          </Alert>
        )}
        {overview.data && (
          <>
            <dl className="mt-6 flex flex-wrap gap-8">
              <div>
                <dt className="text-sm text-ink-muted">Published learning paths</dt>
                <dd className="text-3xl font-bold text-navy-950">{overview.data.pathCount}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-muted">Published courses</dt>
                <dd className="text-3xl font-bold text-navy-950">{overview.data.courseCount}</dd>
              </div>
            </dl>

            <h3 className="mt-8 text-base font-semibold text-ink">
              First courses in curriculum order
            </h3>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {overview.data.startHere.map((course, index) => (
                <li
                  key={course.slug}
                  className="scroll-reveal-item h-full"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <CourseCard
                    course={course}
                    isStartHere
                    isFavorite={favorites.isFavorite(course.slug)}
                    onToggleFavorite={favorites.toggleFavorite}
                  />
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-base font-semibold text-ink">Learning paths</h3>
              <Link
                to="/paths"
                className="text-sm font-medium text-accent-600 hover:underline"
              >
                Compare all paths
              </Link>
            </div>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {overview.data.paths.map((path, index) => (
                <li
                  key={path.slug}
                  className="scroll-reveal-item h-full"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <PathCard path={path} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section aria-labelledby="getting-started-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">
            New to CodePath Academy?
          </p>
          <h2 id="getting-started-heading" className="mt-2 text-2xl font-bold text-navy-950 sm:text-3xl">
            Your first three steps
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Start by exploring what is published, choose a path, then request an account for access.
          </p>
        </div>
        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          {START_STEPS.map((step, index) => (
            <li
              key={step.number}
              className="scroll-reveal-item h-full"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <Card className="group flex h-full flex-col transition-all duration-300 hover:-translate-y-1 hover:border-accent-300 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-[0.14em] text-accent-700">
                    STEP {step.number}
                  </span>
                  <step.icon
                    className="size-5 text-accent-600 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transform-none motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </div>
                <CardTitle className="mt-4">{step.title}</CardTitle>
                <CardDescription className="mt-2 flex-1">{step.description}</CardDescription>
                <Link
                  to={step.to}
                  className="group/step mt-5 inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-700 ring-1 ring-inset ring-accent-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-600 hover:text-white hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
                >
                  {step.action}
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover/step:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true" />
                </Link>
              </Card>
            </li>
          ))}
        </ol>
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 id="features-heading" className="text-2xl font-bold text-navy-950">
          What the academy offers
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="scroll-reveal-item h-full"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:border-accent-300 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none">
                <feature.icon className="size-6 text-accent-600" aria-hidden="true" />
                <CardTitle className="mt-3">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </Card>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section aria-labelledby="status-heading" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 id="status-heading" className="text-2xl font-bold text-navy-950">
          Platform status
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          This page reads live data from the academy API — a real end-to-end check that the
          frontend, backend, and database are connected.
        </p>
        <Card className="mt-4">
          <ApiStatus />
        </Card>
      </section>
      </ScrollReveal>
    </div>
  );
}
