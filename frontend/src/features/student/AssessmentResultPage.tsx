import { ArrowLeft, Check, X } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { usePageMeta } from '../../lib/pageMeta';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { buttonClasses } from '../../components/ui/buttonStyles';
import { SpinnerCentered } from '../../components/ui/Spinner';
import type { QuestionResult } from './assessmentApi';
import { useAttemptResult } from './useAssessments';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** Your answer rendered from the stored option texts the server returns. */
function yourAnswer(question: QuestionResult): string {
  if (question.questionType === 'SHORT_ANSWER') {
    return question.yourAnswerText?.trim() ? question.yourAnswerText : 'Not answered';
  }
  return question.yourOptionTexts.length > 0
    ? question.yourOptionTexts.join(', ')
    : 'Not answered';
}

function correctAnswer(question: QuestionResult): string {
  if (question.questionType === 'SHORT_ANSWER') {
    return question.correctAnswerText ?? '—';
  }
  return question.correctOptionTexts.length > 0
    ? question.correctOptionTexts.join(', ')
    : '—';
}

/**
 * The stored, server-computed result of one submitted attempt: score, pass
 * decision and the per-question breakdown with the answer key. Nothing here
 * is computed in the browser.
 */
export function AssessmentResultPage() {
  usePageMeta({ title: 'Assessment Result', noindex: true });
  const { attemptId = '' } = useParams();
  const result = useAttemptResult(attemptId);

  if (result.isPending) return <SpinnerCentered label="Loading your result…" />;
  if (result.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-navy-950">Attempt result</h1>
        <Alert tone="danger">
          {result.error.message || 'This result could not be loaded.'}
        </Alert>
        <Link
          to="/student/assessments"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 underline-offset-2 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to assessments
        </Link>
      </div>
    );
  }

  const data = result.data;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          to="/student/assessments"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 underline-offset-2 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to assessments
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-navy-950">{data.assessmentTitle}</h1>
          <Badge tone={data.passed ? 'success' : 'danger'}>
            {data.passed ? 'Passed' : 'Not passed'}
          </Badge>
          <Badge tone="neutral">Attempt {data.attemptNumber}</Badge>
        </div>
        <p className="text-sm text-ink-muted">Submitted {formatDateTime(data.submittedAt)}</p>
      </header>

      {data.timeExpired && (
        <Alert tone="warning">
          The time limit had passed when this attempt was submitted, so it was recorded with a
          zero score.
        </Alert>
      )}

      <section
        aria-label="Score"
        className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border border-slate-200 bg-surface p-5"
      >
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">Score</p>
          <p className="mt-1 text-3xl font-bold text-navy-950">
            {data.score}/{data.maxScore}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">Percent</p>
          <p className="mt-1 text-3xl font-bold text-navy-950">{data.percent}%</p>
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">Pass mark</p>
          <p className="mt-1 text-3xl font-bold text-navy-950">{data.passScorePercent}%</p>
        </div>
        <p className="max-w-sm text-sm text-ink-muted">
          Graded by the server against the stored answer key. Each question shows your answer,
          the correct answer, and the points awarded.
        </p>
      </section>

      <ol className="space-y-4">
        {data.questions.map((question, index) => (
          <li
            key={question.questionId}
            className="rounded-lg border border-slate-200 bg-surface p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full ${
                    question.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                  aria-hidden="true"
                >
                  {question.isCorrect ? (
                    <Check className="size-4" />
                  ) : (
                    <X className="size-4" />
                  )}
                </span>
                <h2 className="font-semibold text-ink">Question {index + 1}</h2>
                <Badge tone={question.isCorrect ? 'success' : 'danger'}>
                  {question.isCorrect ? 'Correct' : 'Incorrect'}
                </Badge>
              </div>
              <span className="text-sm text-ink-muted">
                {question.pointsAwarded}/{question.points} points
              </span>
            </div>

            <p className="mt-2 whitespace-pre-wrap text-ink">{question.prompt}</p>

            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-ink-muted">Your answer:</dt>
                <dd className="text-ink">{yourAnswer(question)}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-ink-muted">Correct answer:</dt>
                <dd className="text-ink">{correctAnswer(question)}</dd>
              </div>
            </dl>

            {question.explanation && (
              <p className="mt-3 rounded-md bg-canvas px-3 py-2 text-sm text-ink-muted">
                {question.explanation}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3">
        <Link to="/student/assessments" className={buttonClasses('outline')}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to assessments
        </Link>
      </div>
    </div>
  );
}
