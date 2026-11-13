import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import type { SessionUser } from '../auth/authApi';
import type {
  StudentCourseLearning,
  StudentDashboard,
  StudentLesson,
} from './learningApi';

const studentSession: SessionUser = {
  id: 'student-1',
  email: 'sam@example.test',
  fullName: 'Sam Learner',
  role: 'STUDENT',
  status: 'ACTIVE',
};

const dashboard: StudentDashboard = {
  enrolledCourseCount: 1,
  totalLessonCount: 2,
  completedLessonCount: 1,
  progressPercent: 50,
  courses: [{
    courseId: 'course-1',
    courseSlug: 'software-engineering',
    courseTitle: 'Software Engineering',
    summary: 'Learn the foundations of building software.',
    pathName: 'Software Engineering',
    totalLessonCount: 2,
    completedLessonCount: 1,
    progressPercent: 50,
    continueLessonId: 'lesson-2',
    continueLessonTitle: 'Variables and Types',
    lastAccessedAt: '2026-11-12T08:00:00Z',
  }],
};

const course: StudentCourseLearning = {
  courseId: 'course-1',
  courseSlug: 'software-engineering',
  courseTitle: 'Software Engineering',
  summary: 'Learn the foundations of building software.',
  pathName: 'Software Engineering',
  totalLessonCount: 2,
  completedLessonCount: 1,
  progressPercent: 50,
  modules: [{
    id: 'module-1',
    title: 'Programming basics',
    summary: 'The core ideas.',
    displayOrder: 1,
    lessons: [
      {
        id: 'lesson-1',
        slug: 'first-steps',
        title: 'First Steps',
        summary: null,
        displayOrder: 1,
        progressStatus: 'COMPLETED',
        completedAt: '2026-11-11T08:00:00Z',
      },
      {
        id: 'lesson-2',
        slug: 'variables-and-types',
        title: 'Variables and Types',
        summary: 'Store and describe values.',
        displayOrder: 2,
        progressStatus: 'IN_PROGRESS',
        completedAt: null,
      },
    ],
  }],
};

const lesson: StudentLesson = {
  id: 'lesson-2',
  slug: 'variables-and-types',
  title: 'Variables and Types',
  summary: 'Store and describe values.',
  bodyMarkdown: '## Concepts\n\nRead the **whole** lesson.\n\n<script>alert("unsafe")</script>',
  displayOrder: 2,
  courseId: course.courseId,
  courseSlug: course.courseSlug,
  courseTitle: course.courseTitle,
  moduleId: 'module-1',
  moduleTitle: 'Programming basics',
  progressStatus: null,
  completedAt: null,
  previousLessonId: 'lesson-1',
  nextLessonId: null,
  resources: [{
    id: 'resource-1',
    kind: 'FILE',
    title: 'Lesson reference',
    location: '/media/lessons/reference.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2000,
  }, {
    id: 'resource-2',
    kind: 'LINK',
    title: 'Unsafe resource',
    location: 'javascript:alert(1)',
    mimeType: null,
    sizeBytes: null,
  }],
};

interface RecordedCall {
  path: string;
  method: string;
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

function mockLearningApi(session: SessionUser | null, hasEnrollment = true) {
  const calls: RecordedCall[] = [];
  let completed = false;

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ path: url.pathname, method });

    if (url.pathname === '/api/v1/auth/me') {
      return session
        ? jsonResponse(session)
        : jsonResponse({ message: 'Authentication required' }, 401);
    }
    if (url.pathname === '/api/v1/health') {
      return jsonResponse({ status: 'UP', service: 'codepath-academy' });
    }
    if (url.pathname === '/api/v1/me/learning') {
      return jsonResponse(hasEnrollment ? dashboard : {
        enrolledCourseCount: 0,
        totalLessonCount: 0,
        completedLessonCount: 0,
        progressPercent: 0,
        courses: [],
      });
    }
    if (url.pathname === `/api/v1/me/learning/courses/${course.courseSlug}`) {
      return hasEnrollment
        ? jsonResponse(course)
        : jsonResponse({ message: 'Course not found.' }, 404);
    }
    if (url.pathname === `/api/v1/me/learning/courses/${course.courseSlug}/lessons/lesson-2`) {
      return hasEnrollment
        ? jsonResponse({
            ...lesson,
            progressStatus: completed ? 'COMPLETED' : 'IN_PROGRESS',
            completedAt: completed ? '2026-11-12T08:15:00Z' : null,
          })
        : jsonResponse({ message: 'Lesson not found.' }, 404);
    }
    if (url.pathname.endsWith('/lessons/lesson-2/access') && method === 'POST') {
      return jsonResponse({
        lessonId: lesson.id,
        courseSlug: course.courseSlug,
        status: completed ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: completed ? '2026-11-12T08:15:00Z' : null,
        lastAccessedAt: '2026-11-12T08:10:00Z',
      });
    }
    if (url.pathname.endsWith('/lessons/lesson-2/complete') && method === 'POST') {
      completed = true;
      return jsonResponse({
        lessonId: lesson.id,
        courseSlug: course.courseSlug,
        status: 'COMPLETED',
        completedAt: '2026-11-12T08:15:00Z',
        lastAccessedAt: '2026-11-12T08:15:00Z',
      });
    }
    return jsonResponse({ message: `Not found: ${url.pathname}` }, 404);
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

describe('student learning dashboard and outline', () => {
  it('shows approved-course totals and continues from a real last-accessed lesson', async () => {
    mockLearningApi(studentSession);

    renderApp('/student');

    expect(await screen.findByRole('heading', { level: 1, name: 'Student dashboard' }))
      .toBeInTheDocument();
    expect(screen.getByText('Approved courses').parentElement).toHaveTextContent('1');
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue learning/ })).toHaveAttribute(
      'href',
      `/student/learning/${course.courseSlug}/lessons/lesson-2`,
    );
    expect(screen.getByRole('progressbar', { name: `${course.courseTitle} progress` }))
      .toHaveAttribute('aria-valuenow', '50');
  });

  it('renders only the ordered published lesson outline and per-lesson status', async () => {
    mockLearningApi(studentSession);

    renderApp(`/student/learning/${course.courseSlug}`);

    expect(await screen.findByRole('heading', { level: 1, name: course.courseTitle }))
      .toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Course outline' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'First Steps' })).toHaveAttribute(
      'href',
      `/student/learning/${course.courseSlug}/lessons/lesson-1`,
    );
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('explains the empty state when approved enrollments have no published courses', async () => {
    mockLearningApi(studentSession, false);

    renderApp('/student');

    expect(await screen.findByRole('heading', { name: 'No approved course enrollments yet' }))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse courses' })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: 'View requests' })).toHaveAttribute(
      'href',
      '/student/enrollments',
    );
  });
});

describe('student lesson reader', () => {
  it('renders sanitized Markdown, records access, and persists completion', async () => {
    const calls = mockLearningApi(studentSession);
    const user = userEvent.setup();

    renderApp(`/student/learning/${course.courseSlug}/lessons/lesson-2`);

    expect(await screen.findByRole('heading', { level: 1, name: lesson.title }, { timeout: 10000 }))
      .toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Concepts' })).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === 'Read the whole lesson.'))
      .toBeInTheDocument();
    expect(document.querySelector('script')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lesson reference' })).toHaveAttribute(
      'href',
      '/media/lessons/reference.pdf',
    );
    expect(screen.getByText('Unsafe resource').closest('a')).toBeNull();

    await waitFor(() => {
      expect(calls).toContainEqual({
        path: `/api/v1/me/learning/courses/${course.courseSlug}/lessons/${lesson.id}/access`,
        method: 'POST',
      });
    });
    await user.click(screen.getByRole('button', { name: 'Mark lesson complete' }));

    expect(await screen.findByRole('button', { name: 'Lesson completed' })).toBeDisabled();
    await waitFor(() => {
      expect(calls).toContainEqual({
        path: `/api/v1/me/learning/courses/${course.courseSlug}/lessons/${lesson.id}/complete`,
        method: 'POST',
      });
    });
    expect(screen.getByRole('link', { name: 'Previous lesson' })).toHaveAttribute(
      'href',
      `/student/learning/${course.courseSlug}/lessons/lesson-1`,
    );
  }, 30000);
});
