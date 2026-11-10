import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Card, CardDescription, CardTitle } from '../../components/ui/Card';
import type { CourseLevel, CourseSummary } from './catalogApi';

const LEVEL_LABEL: Record<CourseLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const LEVEL_TONE: Record<CourseLevel, BadgeTone> = {
  BEGINNER: 'success',
  INTERMEDIATE: 'info',
  ADVANCED: 'warning',
};

/** Catalog card for one published course. */
export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={LEVEL_TONE[course.level]}>{LEVEL_LABEL[course.level]}</Badge>
        <Badge>{course.pathName}</Badge>
      </div>
      <CardTitle className="mt-3">
        <Link
          to={`/courses/${course.slug}`}
          className="transition-colors hover:text-accent-600"
        >
          {course.title}
        </Link>
      </CardTitle>
      <CardDescription className="mt-2 flex-1">{course.summary}</CardDescription>
      <Link
        to={`/courses/${course.slug}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:underline"
      >
        View course
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Card>
  );
}
