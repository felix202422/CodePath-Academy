import { BookOpen, CircleCheck, GraduationCap } from 'lucide-react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SpinnerCentered } from '../../components/ui/Spinner';
import { useLearningDashboard } from './useLearning';
import { StudentCourseCard } from './StudentCourseCard';

/** Student overview uses only approved enrollments and recorded lesson progress. */
export function StudentDashboardPage() {
  const dashboard = useLearningDashboard();

  if (dashboard.isPending) return <SpinnerCentered label="Loading your learning dashboard…" />;
  if (dashboard.isError) {
    return <Alert tone="danger">{dashboard.error.message || 'Your learning dashboard could not be loaded.'}</Alert>;
  }

  const data = dashboard.data;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">Your learning</p>
        <h1 className="mt-2 text-3xl font-bold text-navy-950">Student dashboard</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Continue an enrolled course and see your progress from lessons you have actually completed.
        </p>
      </header>

      {data.enrolledCourseCount === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No approved course enrollments yet"
          description="Request access to a published course. Your courses will appear here after an administrator approves your request."
          action={(
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/courses"><Button size="sm">Browse courses</Button></Link>
              <Link to="/student/enrollments">
                <Button size="sm" variant="outline">View requests</Button>
              </Link>
            </div>
          )}
        />
      ) : (
        <>
          <section aria-label="Overall learning progress" className="grid gap-4 sm:grid-cols-3">
            <Card className="flex items-center gap-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
                <GraduationCap className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-ink-muted">Approved courses</p>
                <p className="text-2xl font-bold text-navy-950">{data.enrolledCourseCount}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <CircleCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-ink-muted">Lessons completed</p>
                <p className="text-2xl font-bold text-navy-950">
                  {data.completedLessonCount} <span className="text-base font-medium text-ink-muted">/ {data.totalLessonCount}</span>
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <BookOpen className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-ink-muted">Overall progress</p>
                <p className="text-2xl font-bold text-navy-950">{data.progressPercent}%</p>
              </div>
            </Card>
          </section>

          <section aria-labelledby="continue-learning-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="continue-learning-heading" className="text-xl font-bold text-navy-950">
                  Continue learning
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Your approved courses and their current published lesson progress.
                </p>
              </div>
              <Link to="/student/learning" className="text-sm font-semibold text-accent-700 hover:underline">
                View all courses
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.courses.map((course) => <StudentCourseCard key={course.courseId} course={course} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
