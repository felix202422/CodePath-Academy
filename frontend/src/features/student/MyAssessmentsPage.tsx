import { ClipboardList, Play, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { usePageMeta } from '../../lib/pageMeta';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/buttonStyles';
import { Card, CardTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import type { StudentAssessment } from './assessmentApi';
import { useMyAssessments } from './useAssessments';

/**
 * Published assessments for the student's approved courses, with the real
 * attempt history the server stores. Start/resume navigation only — limits,
 * visibility and grading are decided by the backend.
 */
export function MyAssessmentsPage() {
  usePageMeta({ title: 'My Assessments', noindex: true });
  const assessments = useMyAssessments();
  const navigate = useNavigate();

  function primaryAction(assessment: StudentAssessment) {
    const target = `/student/assessments/${assessment.id}`;
    if (assessment.inProgressAttemptId) {
      return (
        <Button size="sm" onClick={() => navigate(target)}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Resume attempt
        </Button>
      );
    }
    if (assessment.attemptsUsed < assessment.maxAttempts) {
      return (
        <Button size="sm" onClick={() => navigate(target)}>
          <Play className="size-4" aria-hidden="true" />
          Start attempt
        </Button>
      );
    }
    return (
      <Button size="sm" disabled title="You have used every allowed attempt.">
        No attempts left
      </Button>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">
          Student account
        </p>
        <h1 className="mt-2 text-3xl font-bold text-navy-950">Assessments</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Quizzes and assignments for your enrolled courses. Every submission is graded on the
          server against the stored answer key, and results show the honest per-question
          breakdown.
        </p>
      </header>

      {assessments.isPending && (
        <p className="text-sm text-ink-muted" role="status">
          Loading your assessments…
        </p>
      )}
      {assessments.isError && (
        <Alert tone="danger">
          {assessments.error.message || 'Your assessments could not be loaded.'}
        </Alert>
      )}
      {assessments.data && assessments.data.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No assessments yet"
          description="Published assessments for your enrolled courses appear here once your access is approved."
          action={(
            <Link to="/student/learning" className={buttonClasses('primary', 'sm')}>
              Go to my learning
            </Link>
          )}
        />
      )}
      {assessments.data && assessments.data.length > 0 && (
        <ul className="space-y-4">
          {assessments.data.map((assessment) => (
            <li key={assessment.id}>
              <Card className="flex flex-col gap-4 transition-all duration-200 hover:border-accent-300 hover:shadow-md sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{assessment.title}</CardTitle>
                    {assessment.passed && <Badge tone="success">Passed</Badge>}
                    {assessment.inProgressAttemptId && <Badge tone="info">In progress</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{assessment.courseTitle}</p>
                  {assessment.description && (
                    <p className="mt-2 text-sm text-ink-muted">{assessment.description}</p>
                  )}
                  <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
                    <div>
                      <dt className="inline font-medium">Questions: </dt>
                      <dd className="inline">{assessment.questionCount}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium">Pass at: </dt>
                      <dd className="inline">{assessment.passScorePercent}%</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium">Attempts: </dt>
                      <dd className="inline">
                        {assessment.attemptsUsed}/{assessment.maxAttempts} used
                      </dd>
                    </div>
                    {assessment.timeLimitMinutes != null && (
                      <div>
                        <dt className="inline font-medium">Time limit: </dt>
                        <dd className="inline">{assessment.timeLimitMinutes} min</dd>
                      </div>
                    )}
                    {assessment.bestMaxScore > 0 && (
                      <div>
                        <dt className="inline font-medium">Best: </dt>
                        <dd className="inline">
                          {assessment.bestScore}/{assessment.bestMaxScore}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {assessment.attempts.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-slate-200 pt-3">
                      {assessment.attempts.map((attempt) => (
                        <li
                          key={attempt.attemptId}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-ink-muted">
                            Attempt {attempt.attemptNumber} ·{' '}
                            {attempt.status === 'IN_PROGRESS'
                              ? 'In progress'
                              : `${attempt.score ?? 0}/${attempt.maxScore ?? 0} · ${
                                  attempt.passed ? 'Passed' : 'Not passed'
                                }`}
                          </span>
                          {attempt.status === 'SUBMITTED' && (
                            <Link
                              to={`/student/assessments/attempts/${attempt.attemptId}`}
                              className="font-medium text-accent-600 underline-offset-2 hover:underline"
                            >
                              View result
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="shrink-0">{primaryAction(assessment)}</div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
