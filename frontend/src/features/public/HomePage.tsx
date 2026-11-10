import { BookOpen, FolderKanban, Route, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { ApiStatus } from '../health/ApiStatus';
import { Button } from '../../components/ui/Button';
import { Card, CardDescription, CardTitle } from '../../components/ui/Card';

const FEATURES = [
  {
    icon: Route,
    title: 'Structured learning paths',
    description:
      'Follow curated paths across software engineering, cybersecurity, and networking — from fundamentals to real-world projects.',
  },
  {
    icon: BookOpen,
    title: 'Lessons that build',
    description:
      'Every course is organized into modules and lessons with practical exercises, so you learn by doing instead of watching.',
  },
  {
    icon: FolderKanban,
    title: 'Real-world projects',
    description:
      'Apply what you learn to portfolio-ready projects that demonstrate skills to employers.',
  },
  {
    icon: ShieldCheck,
    title: 'Assessments you can trust',
    description:
      'Quizzes and assignments are graded on the server, with honest feedback and persistent progress tracking.',
  },
];

/** Public landing page: what the academy offers plus a live API status check. */
export function HomePage() {
  return (
    <div>
      <section className="bg-navy-950 px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold tracking-wide text-blue-300 uppercase">
            CodePath Academy
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold sm:text-6xl">
            Learn. Build. Innovate. Become.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Structured technology courses, practical exercises, assessments, and real-world
            projects — organized into learning paths that take you from fundamentals to
            job-ready skills.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/courses">
              <Button size="lg">Browse courses</Button>
            </Link>
            <Link to="/paths">
              <Button size="lg" variant="outline" className="border-slate-500 bg-transparent text-white hover:bg-white/10">
                Explore learning paths
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 id="features-heading" className="text-2xl font-bold text-navy-950">
          What the academy offers
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <feature.icon className="size-6 text-accent-600" aria-hidden="true" />
              <CardTitle className="mt-3">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

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
    </div>
  );
}
