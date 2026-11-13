import { BookOpen } from 'lucide-react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SpinnerCentered } from '../../components/ui/Spinner';
import { StudentCourseCard } from './StudentCourseCard';
import { useLearningDashboard } from './useLearning';

/** All approved courses for the current student. */
export function MyLearningPage() {
  const dashboard = useLearningDashboard();

  if (dashboard.isPending) return <SpinnerCentered label="Loading your courses…" />;
  if (dashboard.isError) {
    return <Alert tone="danger">{dashboard.error.message || 'Your courses could not be loaded.'}</Alert>;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">Student account</p>
        <h1 className="mt-2 text-3xl font-bold text-navy-950">My learning</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Published course lessons and your completion progress appear here after enrollment approval.
        </p>
      </header>

      {dashboard.data.courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses to show yet"
          description="Browse published courses and request access. Approved enrollments will appear here."
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
        <ul className="grid gap-4 md:grid-cols-2">
          {dashboard.data.courses.map((course) => (
            <li key={course.courseId}>
              <StudentCourseCard course={course} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
