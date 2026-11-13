import { ArrowLeft, BookOpen } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Card, CardTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SpinnerCentered } from '../../components/ui/Spinner';
import { LearningProgressBar } from './LearningProgressBar';
import type { LessonProgressStatus } from './learningApi';
import { useStudentCourse } from './useLearning';

function progressLabel(status: LessonProgressStatus | null) {
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'IN_PROGRESS') return 'In progress';
  return 'Not started';
}

function progressTone(status: LessonProgressStatus | null): 'success' | 'warning' | 'neutral' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'warning';
  return 'neutral';
}

/** Ordered course outline; only published modules and lessons reach this screen. */
export function StudentCoursePage() {
  const { courseSlug = '' } = useParams<{ courseSlug: string }>();
  const course = useStudentCourse(courseSlug);

  if (course.isPending) return <SpinnerCentered label="Loading your course…" />;
  if (course.isError) {
    return <Alert tone="danger">{course.error.message || 'This enrolled course could not be loaded.'}</Alert>;
  }

  const data = course.data;
  return (
    <div className="space-y-7">
      <Link
        to="/student/learning"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        My learning
      </Link>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{data.pathName}</Badge>
          <Badge>{data.totalLessonCount} {data.totalLessonCount === 1 ? 'lesson' : 'lessons'}</Badge>
        </div>
        <h1 className="text-3xl font-bold text-navy-950">{data.courseTitle}</h1>
        <p className="max-w-3xl text-ink-muted">{data.summary}</p>
        <div className="max-w-xl">
          <LearningProgressBar
            label={`${data.courseTitle} progress`}
            completed={data.completedLessonCount}
            total={data.totalLessonCount}
            percent={data.progressPercent}
          />
        </div>
      </header>

      {data.modules.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Published lesson content is not available yet"
          description="Course material stays hidden until an administrator publishes it. Check back when this course is ready."
        />
      ) : (
        <section aria-labelledby="course-outline-heading" className="space-y-4">
          <h2 id="course-outline-heading" className="text-xl font-bold text-navy-950">
            Course outline
          </h2>
          <ol className="space-y-4">
            {data.modules.map((module, moduleIndex) => (
              <li key={module.id}>
                <Card>
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-50 text-sm font-bold text-accent-700">
                      {moduleIndex + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <CardTitle>{module.title}</CardTitle>
                      {module.summary && <p className="mt-1 text-sm text-ink-muted">{module.summary}</p>}

                      {module.lessons.length === 0 ? (
                        <p className="mt-4 text-sm text-ink-muted">No published lessons in this module yet.</p>
                      ) : (
                        <ol className="mt-4 divide-y divide-slate-100">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="text-xs font-semibold text-ink-muted">
                                  {moduleIndex + 1}.{lessonIndex + 1}
                                </span>
                                <div className="min-w-0">
                                  <Link
                                    to={`/student/learning/${data.courseSlug}/lessons/${lesson.id}`}
                                    className="font-semibold text-ink hover:text-accent-700 hover:underline"
                                  >
                                    {lesson.title}
                                  </Link>
                                  {lesson.summary && <p className="mt-0.5 text-sm text-ink-muted">{lesson.summary}</p>}
                                </div>
                              </div>
                              <Badge tone={progressTone(lesson.progressStatus)}>
                                {progressLabel(lesson.progressStatus)}
                              </Badge>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
