import { apiFetch } from '../../lib/api';

/**
 * Typed client for the Phase 8 student assessment APIs. Requests flow through
 * lib/api.ts so session cookies and CSRF stay centralized; visibility
 * (approved enrollment, published course/module/assessment) and every grading
 * decision are enforced server-side.
 */

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MULTI_ANSWER' | 'SHORT_ANSWER';

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED';

/** One attempt's stored outcome; scores stay null until graded. */
export interface AttemptSummary {
  attemptId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  passed: boolean | null;
}

/** One published assessment with this student's real attempt history. */
export interface StudentAssessment {
  id: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  moduleId: string | null;
  title: string;
  description: string | null;
  passScorePercent: number;
  maxAttempts: number;
  timeLimitMinutes: number | null;
  questionCount: number;
  attemptsUsed: number;
  bestScore: number;
  bestMaxScore: number;
  passed: boolean;
  inProgressAttemptId: string | null;
  attempts: AttemptSummary[];
}

export interface TakingOption {
  id: string;
  optionText: string;
}

/** One question without correctness, explanation, or the answer key. */
export interface TakingQuestion {
  id: string;
  questionType: QuestionType;
  prompt: string;
  points: number;
  options: TakingOption[];
}

/** The taking view of one attempt: rules plus key-free questions. */
export interface AssessmentAttemptView {
  assessmentId: string;
  title: string;
  description: string | null;
  passScorePercent: number;
  maxAttempts: number;
  timeLimitMinutes: number | null;
  attemptId: string;
  attemptNumber: number;
  startedAt: string;
  questions: TakingQuestion[];
}

/** One question's stored outcome after server-side grading. */
export interface QuestionResult {
  questionId: string;
  questionType: QuestionType;
  prompt: string;
  points: number;
  explanation: string | null;
  yourOptionIds: string[];
  yourOptionTexts: string[];
  yourAnswerText: string | null;
  isCorrect: boolean;
  pointsAwarded: number;
  correctOptionIds: string[];
  correctOptionTexts: string[];
  correctAnswerText: string | null;
}

/** The graded result of one submitted attempt, computed only by the server. */
export interface AttemptResult {
  attemptId: string;
  attemptNumber: number;
  assessmentId: string;
  assessmentTitle: string;
  startedAt: string;
  submittedAt: string;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  passScorePercent: number;
  timeExpired: boolean;
  questions: QuestionResult[];
}

/** One answer in a submission: option ids for choice, text for short answer. */
export interface AnswerSubmission {
  questionId: string;
  optionIds?: string[] | null;
  answerText?: string | null;
}

/** Published assessments across the student's approved courses. */
export function listMyAssessments(): Promise<StudentAssessment[]> {
  return apiFetch<StudentAssessment[]>('/api/v1/me/assessments');
}

/** Start or resume — the server is idempotent for an in-progress attempt. */
export function startOrResumeAttempt(assessmentId: string): Promise<AssessmentAttemptView> {
  return apiFetch<AssessmentAttemptView>(
    `/api/v1/me/assessments/${encodeURIComponent(assessmentId)}/attempts`,
    { method: 'POST' },
  );
}

/** Submit answers for server-side grading; returns the stored result. */
export function submitAttempt(
  attemptId: string,
  answers: AnswerSubmission[],
): Promise<AttemptResult> {
  return apiFetch<AttemptResult>(
    `/api/v1/me/assessments/attempts/${encodeURIComponent(attemptId)}/submit`,
    { method: 'POST', body: { answers } },
  );
}

/** Graded results for one of the student's own submitted attempts. */
export function getAttemptResult(attemptId: string): Promise<AttemptResult> {
  return apiFetch<AttemptResult>(
    `/api/v1/me/assessments/attempts/${encodeURIComponent(attemptId)}`,
  );
}
