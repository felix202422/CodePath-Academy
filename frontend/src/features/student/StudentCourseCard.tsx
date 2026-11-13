import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardDescription, CardTitle } from '../../components/ui/Card';
import type { StudentCourseProgress } from './learningApi';
import { LearningProgressBar } from './LearningProgressBar';

interface StudentCourseCardProps {
  course: StudentCourseProgress;
}

/** A student's approved course with real progress and an honest continue target. */
export function StudentCourseCard({ course }: StudentCourseCardProps) {
  const isComplete = course.totalLessonCount > 0
    && course.completedLessonCount === course.totalLessonCount;
  const target = course.continueLessonId
    ? `/student/learning/${course.courseSlug}/lessons/${course.continueLessonId}`
    : `/student/learning/${course.courseSlug}`;
  const actionLabel = course.totalLessonCount === 0
    ? 'View course'
    : isComplete
      ? 'Review course'
      : course.continueLessonTitle
        ? 'Continue learning'
        : 'Start learning';

  return (
    <Card className="flex h-full flex-col gap-4 transition-all duration-200 hover:border-accent-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>
            <Link
              to={`/student/learning/${course.courseSlug}`}
              className="hover:text-accent-700 hover:underline"
            >
              {course.courseTitle}
            </Link>
          </CardTitle>
          <CardDescription className="mt-1">{course.pathName}</CardDescription>
        </div>
        <Badge tone={isComplete ? 'success' : 'info'}>
          {isComplete ? 'Complete' : 'Enrolled'}
        </Badge>
      </div>

      <p className="line-clamp-2 text-sm text-ink-muted">{course.summary}</p>

      <LearningProgressBar
        label={`${course.courseTitle} progress`}
        completed={course.completedLessonCount}
        total={course.totalLessonCount}
        percent={course.progressPercent}
      />

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <BookOpen className="size-4" aria-hidden="true" />
          {course.totalLessonCount} {course.totalLessonCount === 1 ? 'lesson' : 'lessons'}
        </span>
        <Link to={target}>
          <Button size="sm" variant="outline">
            {actionLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
