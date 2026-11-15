import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SpinnerCentered } from '../../components/ui/Spinner';
import { Textarea } from '../../components/ui/Field';
import { ApiRequestError } from '../../lib/api';
import type { AnswerSubmission, TakingQuestion } from './assessmentApi';
import { useStartAttempt, useSubmitAttempt } from './useAssessments';

interface DraftAnswer {
  optionIds: string[];
  text: string;
}

type AnswerMap = Record<string, DraftAnswer>;

function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Attempt surface for one assessment. Mounting starts or resumes the attempt
 * (the server is idempotent), answers are collected per question, and submit
 * sends everything for server-side grading before navigating to the result.
 */
export function TakeAssessmentPage() {
  const { assessmentId = '' } = useParams();
  const navigate = useNavigate();
  const start = useStartAttempt();
  const submit = useSubmitAttempt();
  const startedFor = useRef<string | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [confirming, setConfirming] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [now, setNow] = useState(() => Date.now());

  // Start or resume once per assessment id; a ref keeps the effect idempotent
  // under StrictMode's double invoke and across re-renders.
  useEffect(() => {
    if (assessmentId && startedFor.current !== assessmentId) {
      startedFor.current = assessmentId;
      start.mutate(assessmentId);
    }
  }, [assessmentId, start]);

  const attempt = start.data;
  const timeLimitMinutes = attempt?.timeLimitMinutes ?? null;

  useEffect(() => {
    if (timeLimitMinutes == null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [timeLimitMinutes]);

  function chooseOne(question: TakingQuestion, optionId: string) {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { optionIds: [optionId], text: prev[question.id]?.text ?? '' },
    }));
  }

  function toggleOption(question: TakingQuestion, optionId: string) {
    setAnswers((prev) => {
      const current = prev[question.id]?.optionIds ?? [];
      const optionIds = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [question.id]: { optionIds, text: prev[question.id]?.text ?? '' } };
    });
  }

  function typeAnswer(question: TakingQuestion, text: string) {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { optionIds: prev[question.id]?.optionIds ?? [], text },
    }));
  }

  async function doSubmit() {
    if (!attempt) return;
    setSubmitError(null);
    const payload: AnswerSubmission[] = attempt.questions.map((question) => {
      const draft = answers[question.id];
      if (question.questionType === 'SHORT_ANSWER') {
        return { questionId: question.id, answerText: draft?.text ?? '' };
      }
      return { questionId: question.id, optionIds: draft?.optionIds ?? [] };
    });
    try {
      const result = await submit.mutateAsync({ attemptId: attempt.attemptId, answers: payload });
      navigate(`/student/assessments/attempts/${result.attemptId}`);
    } catch (caught) {
      // A 409 means the attempt was already graded (double submit, another
      // tab) — the stored result is the honest destination.
      if (caught instanceof ApiRequestError && caught.status === 409) {
        navigate(`/student/assessments/attempts/${attempt.attemptId}`);
        return;
      }
      setSubmitError(caught);
    }
  }

  if (start.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-navy-950">Assessment</h1>
        <Alert tone="danger">
          {start.error.message || 'This assessment could not be opened.'}
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

  if (!attempt) {
    return <SpinnerCentered label="Opening your attempt…" />;
  }

  const answeredCount = attempt.questions.filter((question) => {
    const draft = answers[question.id];
    if (!draft) return false;
    if (question.questionType === 'SHORT_ANSWER') return draft.text.trim().length > 0;
    return draft.optionIds.length > 0;
  }).length;

  let remainingSeconds: number | null = null;
  if (timeLimitMinutes != null) {
    const deadline = new Date(attempt.startedAt).getTime() + timeLimitMinutes * 60_000;
    remainingSeconds = Math.floor((deadline - now) / 1000);
  }

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
          <h1 className="text-3xl font-bold text-navy-950">{attempt.title}</h1>
          <Badge tone="info">Attempt {attempt.attemptNumber}</Badge>
        </div>
        {attempt.description && (
          <p className="max-w-2xl text-ink-muted">{attempt.description}</p>
        )}
        <p className="text-sm text-ink-muted">
          {attempt.questions.length} question{attempt.questions.length === 1 ? '' : 's'} · pass
          at {attempt.passScorePercent}% · {attempt.maxAttempts} attempt
          {attempt.maxAttempts === 1 ? '' : 's'} allowed · grading happens on the server
        </p>
        {remainingSeconds != null && (
          <p
            className={`text-sm font-medium ${remainingSeconds <= 0 ? 'text-danger' : 'text-ink'}`}
          >
            <span role="timer">
              {remainingSeconds > 0
                ? `Time left: ${formatClock(remainingSeconds)}`
                : 'Time limit reached — submit to record your attempt.'}
            </span>
          </p>
        )}
      </header>

      {submitError instanceof ApiRequestError && (
        <Alert tone="danger">{submitError.message}</Alert>
      )}
      {submitError != null && !(submitError instanceof ApiRequestError) && (
        <Alert tone="danger">Your attempt could not be submitted. Please try again.</Alert>
      )}

      <ol className="space-y-6">
        {attempt.questions.map((question, index) => {
          const draft = answers[question.id];
          return (
            <li key={question.id} className="space-y-3 rounded-lg border border-slate-200 bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-ink">Question {index + 1}</h2>
                <Badge tone="neutral">{question.points} pt</Badge>
              </div>
              <p className="whitespace-pre-wrap text-ink">{question.prompt}</p>

              {question.questionType === 'SHORT_ANSWER' ? (
                <Textarea
                  label="Your answer"
                  rows={3}
                  maxLength={4000}
                  value={draft?.text ?? ''}
                  onChange={(event) => typeAnswer(question, event.target.value)}
                />
              ) : (
                <fieldset>
                  <legend className="text-sm font-medium text-ink">
                    {question.questionType === 'MULTI_ANSWER'
                      ? 'Select all that apply'
                      : question.questionType === 'TRUE_FALSE'
                        ? 'True or false'
                        : 'Choose one answer'}
                  </legend>
                  <div className="mt-2 space-y-2">
                    {question.options.map((option) => {
                      const checked =
                        question.questionType === 'MULTI_ANSWER'
                          ? (draft?.optionIds.includes(option.id) ?? false)
                          : (draft?.optionIds[0] ?? null) === option.id;
                      return (
                        <label
                          key={option.id}
                          className="flex cursor-pointer items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-ink transition-colors hover:border-accent-300 hover:bg-accent-50"
                        >
                          <input
                            type={
                              question.questionType === 'MULTI_ANSWER' ? 'checkbox' : 'radio'
                            }
                            name={`question-${question.id}`}
                            checked={checked}
                            onChange={() =>
                              question.questionType === 'MULTI_ANSWER'
                                ? toggleOption(question, option.id)
                                : chooseOne(question, option.id)
                            }
                            className="size-4 shrink-0 accent-accent-600"
                          />
                          {option.optionText}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </li>
          );
        })}
      </ol>

      <section aria-label="Submit attempt" className="space-y-3 rounded-lg border border-slate-200 bg-surface p-5">
        <p className="text-sm text-ink-muted">
          {answeredCount} of {attempt.questions.length} question
          {attempt.questions.length === 1 ? '' : 's'} answered.
        </p>
        {confirming ? (
          <div className="space-y-3 rounded-md border border-accent-200 bg-accent-50 p-4">
            <p className="text-sm text-ink">
              Submit your attempt now? It cannot be changed afterwards — the server stores the
              result and shows you the full breakdown.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button loading={submit.isPending} onClick={() => void doSubmit()}>
                Submit attempt
              </Button>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Keep working
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setConfirming(true)}>
              <AlertCircle className="size-4" aria-hidden="true" />
              Submit attempt
            </Button>
            <span className="text-sm text-ink-muted">
              You will review your answers on the next step.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
