import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import type { SessionUser } from '../auth/authApi';
import type {
  AssessmentAttemptView,
  AttemptResult,
  StudentAssessment,
} from './assessmentApi';

const studentSession: SessionUser = {
  id: 'student-1',
  email: 'sam@example.test',
  fullName: 'Sam Learner',
  role: 'STUDENT',
  status: 'ACTIVE',
};

const assessment: StudentAssessment = {
  id: 'assessment-1',
  courseId: 'course-1',
  courseSlug: 'software-engineering',
  courseTitle: 'Software Engineering',
  moduleId: null,
  title: 'Phase 8 check',
  description: 'Covers attempts and server-side grading.',
  passScorePercent: 70,
  maxAttempts: 2,
  timeLimitMinutes: 15,
  questionCount: 3,
  attemptsUsed: 1,
  bestScore: 6,
  bestMaxScore: 10,
  passed: false,
  inProgressAttemptId: null,
  attempts: [
    {
      attemptId: 'attempt-old',
      attemptNumber: 1,
      status: 'SUBMITTED',
      startedAt: '2026-11-14T09:00:00Z',
      submittedAt: '2026-11-14T09:10:00Z',
      score: 6,
      maxScore: 10,
      passed: false,
    },
  ],
};

const inProgressAssessment: StudentAssessment = {
  ...assessment,
  id: 'assessment-2',
  title: 'Module quiz',
  attemptsUsed: 2,
  bestScore: 8,
  bestMaxScore: 10,
  passed: true,
  inProgressAttemptId: 'attempt-live',
  attempts: [
    {
      attemptId: 'attempt-done',
      attemptNumber: 1,
      status: 'SUBMITTED',
      startedAt: '2026-11-13T09:00:00Z',
      submittedAt: '2026-11-13T09:08:00Z',
      score: 8,
      maxScore: 10,
      passed: true,
    },
    {
      attemptId: 'attempt-live',
      attemptNumber: 2,
      status: 'IN_PROGRESS',
      startedAt: '2026-11-15T10:00:00Z',
      submittedAt: null,
      score: null,
      maxScore: null,
      passed: null,
    },
  ],
};

const exhaustedAssessment: StudentAssessment = {
  ...assessment,
  id: 'assessment-3',
  title: 'Capstone quiz',
  attemptsUsed: 2,
  inProgressAttemptId: null,
  attempts: [
    {
      attemptId: 'attempt-a',
      attemptNumber: 1,
      status: 'SUBMITTED',
      startedAt: '2026-11-12T09:00:00Z',
      submittedAt: '2026-11-12T09:05:00Z',
      score: 4,
      maxScore: 10,
      passed: false,
    },
    {
      attemptId: 'attempt-b',
      attemptNumber: 2,
      status: 'SUBMITTED',
      startedAt: '2026-11-12T09:06:00Z',
      submittedAt: '2026-11-12T09:11:00Z',
      score: 6,
      maxScore: 10,
      passed: false,
    },
  ],
};

const attemptView: AssessmentAttemptView = {
  assessmentId: 'assessment-1',
  title: 'Phase 8 check',
  description: 'Covers attempts and server-side grading.',
  passScorePercent: 70,
  maxAttempts: 2,
  timeLimitMinutes: 10,
  attemptId: 'attempt-new',
  attemptNumber: 2,
  // One minute behind real time so the countdown reads about nine minutes.
  startedAt: new Date(Date.now() - 60_000).toISOString(),
  questions: [
    {
      id: 'q-mc',
      questionType: 'MULTIPLE_CHOICE',
      prompt: 'Which command compiles a Java file?',
      points: 4,
      options: [
        { id: 'opt-javac', optionText: 'javac' },
        { id: 'opt-java', optionText: 'java' },
        { id: 'opt-jar', optionText: 'jar' },
      ],
    },
    {
      id: 'q-multi',
      questionType: 'MULTI_ANSWER',
      prompt: 'Select the build tools.',
      points: 3,
      options: [
        { id: 'opt-maven', optionText: 'Maven' },
        { id: 'opt-gradle', optionText: 'Gradle' },
        { id: 'opt-notepad', optionText: 'Notepad' },
      ],
    },
    {
      id: 'q-short',
      questionType: 'SHORT_ANSWER',
      prompt: 'What does CI stand for?',
      points: 3,
      options: [],
    },
  ],
};

const result: AttemptResult = {
  attemptId: 'attempt-new',
  attemptNumber: 2,
  assessmentId: 'assessment-1',
  assessmentTitle: 'Phase 8 check',
  startedAt: attemptView.startedAt,
  submittedAt: '2026-11-15T10:05:00Z',
  score: 7,
  maxScore: 10,
  percent: 70,
  passed: true,
  passScorePercent: 70,
  timeExpired: false,
  questions: [
    {
      questionId: 'q-mc',
      questionType: 'MULTIPLE_CHOICE',
      prompt: 'Which command compiles a Java file?',
      points: 4,
      explanation: 'javac compiles source files; java runs them.',
      yourOptionIds: ['opt-javac'],
      yourOptionTexts: ['javac'],
      yourAnswerText: null,
      isCorrect: true,
      pointsAwarded: 4,
      correctOptionIds: ['opt-javac'],
      correctOptionTexts: ['javac'],
      correctAnswerText: null,
    },
    {
      questionId: 'q-multi',
      questionType: 'MULTI_ANSWER',
      prompt: 'Select the build tools.',
      points: 3,
      explanation: null,
      yourOptionIds: ['opt-maven'],
      yourOptionTexts: ['Maven'],
      yourAnswerText: null,
      isCorrect: false,
      pointsAwarded: 0,
      correctOptionIds: ['opt-gradle', 'opt-maven'],
      correctOptionTexts: ['Gradle', 'Maven'],
      correctAnswerText: null,
    },
    {
      questionId: 'q-short',
      questionType: 'SHORT_ANSWER',
      prompt: 'What does CI stand for?',
      points: 3,
      explanation: 'Continuous integration.',
      yourOptionIds: [],
      yourOptionTexts: [],
      yourAnswerText: 'Continuous Integration',
      isCorrect: true,
      pointsAwarded: 3,
      correctOptionIds: [],
      correctOptionTexts: [],
      correctAnswerText: 'Continuous integration',
    },
  ],
};

interface RecordedCall {
  path: string;
  method: string;
  body: unknown;
}

interface MockOptions {
  /** Row fixtures for GET /me/assessments; defaults to the full set. */
  assessments?: StudentAssessment[];
  /** Answer the start-attempt POST with the server's attempt-limit 409. */
  startConflict?: boolean;
}

function renderApp(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockAssessmentApi(options: MockOptions = {}) {
  const calls: RecordedCall[] = [];
  const rows = options.assessments ?? [assessment, inProgressAssessment, exhaustedAssessment];

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path: url.pathname, method, body });
    const path = url.pathname;

    if (path === '/api/v1/auth/me') return jsonResponse(studentSession);
    if (path === '/api/v1/health') {
      return jsonResponse({ status: 'UP', service: 'codepath-academy' });
    }
    if (path === '/api/v1/me/assessments' && method === 'GET') return jsonResponse(rows);
    if (path === '/api/v1/me/assessments/assessment-1/attempts' && method === 'POST') {
      if (options.startConflict) {
        return jsonResponse(
          { message: 'You have used all 2 attempt(s) for this assessment.' },
          409,
        );
      }
      return jsonResponse(attemptView);
    }
    if (path === '/api/v1/me/assessments/attempts/attempt-new/submit' && method === 'POST') {
      return jsonResponse(result);
    }
    if (path === '/api/v1/me/assessments/attempts/attempt-new' && method === 'GET') {
      return jsonResponse(result);
    }
    return jsonResponse({ message: `Not found: ${path}` }, 404);
  });

  return calls;
}

beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=test-token-value; path=/';
});

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('student assessment list', () => {
  it('shows real attempt history with start, resume, and exhausted actions', async () => {
    mockAssessmentApi();

    renderApp('/student/assessments');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Assessments' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Phase 8 check')).toBeInTheDocument();
    expect(screen.getByText('1/2 used')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start attempt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume attempt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No attempts left' })).toBeDisabled();

    // Each submitted attempt links to its own stored result.
    const firstCard = screen.getByText('Phase 8 check').closest('li');
    expect(firstCard).not.toBeNull();
    expect(within(firstCard as HTMLElement).getByText('6/10')).toBeInTheDocument();
    expect(
      within(firstCard as HTMLElement).getByRole('link', { name: 'View result' }),
    ).toHaveAttribute('href', '/student/assessments/attempts/attempt-old');
    expect(screen.getByText('Attempt 2 · In progress')).toBeInTheDocument();
  });

  it('explains the empty state when no published assessments are visible', async () => {
    mockAssessmentApi({ assessments: [] });

    renderApp('/student/assessments');

    expect(await screen.findByRole('heading', { name: 'No assessments yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to my learning' })).toHaveAttribute(
      'href',
      '/student/learning',
    );
  });
});

describe('student assessment taking', () => {
  it('starts an attempt, collects answers, and submits them for server grading', async () => {
    const calls = mockAssessmentApi();
    const user = userEvent.setup();

    renderApp('/student/assessments/assessment-1');

    // The start POST opens the taking view with the attempt number and timer.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Phase 8 check' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Attempt 2')).toBeInTheDocument();
    expect(screen.getByText(/Time left: 0[89]:\d{2}/)).toBeInTheDocument();

    await waitFor(() => {
      expect(calls).toContainEqual({
        path: '/api/v1/me/assessments/assessment-1/attempts',
        method: 'POST',
        body: undefined,
      });
    });

    // Answer every question type.
    await user.click(screen.getByRole('radio', { name: 'javac' }));
    await user.click(screen.getByRole('checkbox', { name: 'Maven' }));
    await user.click(screen.getByRole('checkbox', { name: 'Gradle' }));
    await user.type(screen.getByLabelText('Your answer'), 'Continuous Integration');

    expect(screen.getByText('3 of 3 questions answered.')).toBeInTheDocument();

    // Two-step submit: confirm, then send.
    await user.click(screen.getByRole('button', { name: 'Submit attempt' }));
    expect(screen.getByText(/cannot be changed afterwards/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit attempt' }));

    await waitFor(() => {
      const submit = calls.find((call) => call.path.endsWith('/submit'));
      expect(submit).toBeDefined();
      expect(submit?.body).toEqual({
        answers: [
          { questionId: 'q-mc', optionIds: ['opt-javac'] },
          { questionId: 'q-multi', optionIds: ['opt-maven', 'opt-gradle'] },
          { questionId: 'q-short', answerText: 'Continuous Integration' },
        ],
      });
    });

    // The stored server result renders: score, pass decision, breakdown.
    expect(await screen.findByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('7/10')).toBeInTheDocument();
    expect(screen.getByText('javac compiles source files; java runs them.')).toBeInTheDocument();
    expect(screen.getByText('Gradle, Maven')).toBeInTheDocument();
    expect(screen.getByText('Continuous integration')).toBeInTheDocument();
    expect(screen.getByText('4/4 points')).toBeInTheDocument();
    expect(screen.getByText('0/3 points')).toBeInTheDocument();
  }, 30000);

  it('surfaces the server attempt-limit conflict instead of a silent failure', async () => {
    mockAssessmentApi({ startConflict: true });

    renderApp('/student/assessments/assessment-1');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You have used all 2 attempt(s) for this assessment.',
    );
    expect(screen.getByRole('link', { name: /Back to assessments/ })).toHaveAttribute(
      'href',
      '/student/assessments',
    );
  });
});
