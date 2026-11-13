import { ArrowLeft, ArrowRight, CheckCircle2, Paperclip } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SpinnerCentered } from '../../components/ui/Spinner';
import { MarkdownContent } from '../../components/ui/MarkdownContent';
import { useCompleteStudentLesson, useRecordLessonAccess, useStudentLesson } from './useLearning';

function isSafeResourceLocation(location: string) {
  if (location.startsWith('/media/')) return true;
  try {
    const protocol = new URL(location).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Reader for one published lesson under an approved student enrollment. */
export function LessonReaderPage() {
  const { courseSlug = '', lessonId = '' } = useParams<{
    courseSlug: string;
    lessonId: string;
  }>();
  const lesson = useStudentLesson(courseSlug, lessonId);
  const recordAccess = useRecordLessonAccess();
  const complete = useCompleteStudentLesson();
  const accessedLessonId = useRef<string | null>(null);
  const loadedLessonId = lesson.data?.id;
  const recordAccessMutation = recordAccess.mutate;

  useEffect(() => {
    if (loadedLessonId && accessedLessonId.current !== loadedLessonId) {
      accessedLessonId.current = loadedLessonId;
      recordAccessMutation({ courseSlug, lessonId: loadedLessonId });
    }
  }, [courseSlug, loadedLessonId, recordAccessMutation]);

  if (lesson.isPending) return <SpinnerCentered label="Loading lesson…" />;
  if (lesson.isError) {
    return (
      <div className="space-y-4">
        <Alert tone="danger">{lesson.error.message || 'This lesson could not be loaded.'}</Alert>
        <Link to={`/student/learning/${courseSlug}`} className="text-sm font-semibold text-accent-700 hover:underline">
          Back to course outline
        </Link>
      </div>
    );
  }

  const data = lesson.data;
  const isComplete = data.progressStatus === 'COMPLETED';

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <nav aria-label="Lesson location" className="flex flex-wrap items-center gap-2 text-sm">
        <Link to="/student/learning" className="font-medium text-accent-700 hover:underline">
          My learning
        </Link>
        <span className="text-ink-muted" aria-hidden="true">/</span>
        <Link
          to={`/student/learning/${data.courseSlug}`}
          className="font-medium text-accent-700 hover:underline"
        >
          {data.courseTitle}
        </Link>
      </nav>

      <header className="space-y-4 border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{data.moduleTitle}</Badge>
          {isComplete ? <Badge tone="success">Completed</Badge> : (
            <Badge tone={data.progressStatus === 'IN_PROGRESS' ? 'warning' : 'neutral'}>
              {data.progressStatus === 'IN_PROGRESS' ? 'In progress' : 'Not started'}
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold text-navy-950">{data.title}</h1>
        {data.summary && <p className="max-w-3xl text-lg text-ink-muted">{data.summary}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            loading={complete.isPending}
            disabled={isComplete || complete.isPending || recordAccess.isPending}
            onClick={() => complete.mutate({ courseSlug: data.courseSlug, lessonId: data.id })}
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {isComplete ? 'Lesson completed' : 'Mark lesson complete'}
          </Button>
          {recordAccess.isPending && (
            <span className="text-sm text-ink-muted" role="status">Saving your place…</span>
          )}
        </div>
        {recordAccess.error && <Alert tone="danger">{recordAccess.error.message}</Alert>}
        {complete.error && <Alert tone="danger">{complete.error.message}</Alert>}
        {complete.isSuccess && !isComplete && (
          <Alert tone="success">Lesson marked complete. Your course progress has been updated.</Alert>
        )}
      </header>

      <section aria-label="Lesson content" className="min-h-48">
        {data.bodyMarkdown.trim() ? (
          <MarkdownContent markdown={data.bodyMarkdown} />
        ) : (
          <Alert tone="info">There is no lesson text available yet.</Alert>
        )}
      </section>

      {data.resources.length > 0 && (
        <section aria-labelledby="lesson-resources-heading">
          <Card>
            <h2 id="lesson-resources-heading" className="inline-flex items-center gap-2 font-semibold text-navy-950">
              <Paperclip className="size-4" aria-hidden="true" />
              Lesson resources
            </h2>
            <ul className="mt-3 space-y-2">
              {data.resources.map((resource) => (
                <li key={resource.id}>
                  {isSafeResourceLocation(resource.location) ? (
                    <a
                      href={resource.location}
                      target={resource.location.startsWith('http') ? '_blank' : undefined}
                      rel={resource.location.startsWith('http') ? 'noreferrer' : undefined}
                      className="text-sm font-medium text-accent-700 hover:underline"
                    >
                      {resource.title}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-ink">{resource.title}</span>
                  )}
                  <span className="ml-2 text-xs text-ink-muted">{resource.kind.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <nav aria-label="Lesson navigation" className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-5">
        {data.previousLessonId ? (
          <Link to={`/student/learning/${data.courseSlug}/lessons/${data.previousLessonId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Previous lesson
            </Button>
          </Link>
        ) : <span />}
        {data.nextLessonId ? (
          <Link to={`/student/learning/${data.courseSlug}/lessons/${data.nextLessonId}`}>
            <Button variant="primary" size="sm">
              Next lesson
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </Link>
        ) : (
          <Link to={`/student/learning/${data.courseSlug}`}>
            <Button variant="outline" size="sm">Back to course outline</Button>
          </Link>
        )}
      </nav>
    </article>
  );
}
