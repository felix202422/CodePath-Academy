import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import type { SessionUser } from '../auth/authApi';
import type {
  AdminEnrollmentResponse,
  EnrollmentStatusResponse,
  MyEnrollmentResponse,
} from './enrollmentApi';

const studentSession: SessionUser = {
  id: 'student-1',
  email: 'maya@example.test',
  fullName: 'Maya Student',
  role: 'STUDENT',
  status: 'ACTIVE',
};

const adminSession: SessionUser = {
  id: 'admin-1',
  email: 'admin@example.test',
  fullName: 'Academy Admin',
  role: 'ADMIN',
  status: 'ACTIVE',
};

const course = {
  id: 'course-1',
  slug: 'computer-foundations',
  title: 'Computer Foundations',
  summary: 'A practical introduction to computers.',
  description: 'Learn how computers work.',
  level: 'BEGINNER' as const,
  pathSlug: 'software-engineering',
  pathName: 'Software Engineering',
  sourceRepository: null,
  enrollmentCount: 1,
  moduleCount: 0,
  lessonCount: 0,
  prerequisites: [],
};

const studentEnrollment: MyEnrollmentResponse = {
  id: 'enrollment-1',
  courseId: course.id,
  courseSlug: course.slug,
  courseTitle: course.title,
  status: 'PENDING',
  requestedAt: '2026-11-12T08:00:00Z',
  reviewedAt: null,
  reviewNotes: null,
};

const approvedEnrollment: MyEnrollmentResponse = {
  ...studentEnrollment,
  id: 'enrollment-2',
  courseId: 'course-2',
  courseSlug: 'frontend-engineering',
  courseTitle: 'Frontend Engineering',
  status: 'APPROVED',
  requestedAt: '2026-11-09T08:00:00Z',
  reviewedAt: '2026-11-11T08:00:00Z',
  reviewNotes: 'Welcome to the course.',
};

const adminEnrollment: AdminEnrollmentResponse = {
  ...studentEnrollment,
  studentId: studentSession.id,
  studentName: studentSession.fullName,
  studentEmail: studentSession.email,
};

interface RecordedCall {
  path: string;
  method: string;
  body: Record<string, unknown> | undefined;
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

/** Mock the enrollment endpoints and record mutations for contract assertions. */
function mockEnrollmentApi(session: SessionUser | null, courseStatus?: EnrollmentStatusResponse) {
  const calls: RecordedCall[] = [];
  let adminDecisionMade = false;

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body
      ? (JSON.parse(String(init.body)) as Record<string, unknown>)
      : undefined;
    calls.push({ path: url.pathname + url.search, method, body });

    if (url.pathname === '/api/v1/auth/me') {
      return session
        ? jsonResponse(session)
        : jsonResponse({ message: 'Authentication required' }, 401);
    }
    if (url.pathname === '/api/v1/health') {
      return jsonResponse({ status: 'UP', service: 'codepath-academy' });
    }
    if (url.pathname === `/api/v1/public/courses/${course.slug}`) {
      return jsonResponse(course);
    }
    if (url.pathname === `/api/v1/me/enrollments/${course.id}`) {
      const status: EnrollmentStatusResponse = courseStatus ?? {
        courseId: course.id,
        status: null,
        requestedAt: null,
        reviewedAt: null,
        reviewNotes: null,
      };
      if (method === 'POST') return jsonResponse(studentEnrollment, 201);
      return jsonResponse(status);
    }
    if (url.pathname === '/api/v1/me/enrollments') {
      return jsonResponse([studentEnrollment, approvedEnrollment]);
    }
    if (url.pathname === '/api/v1/admin/enrollments') {
      return jsonResponse(adminDecisionMade ? [] : [adminEnrollment]);
    }
    if (url.pathname === `/api/v1/admin/enrollments/${adminEnrollment.id}/approve`
      && method === 'POST') {
      adminDecisionMade = true;
      return jsonResponse({ ...adminEnrollment, status: 'APPROVED' });
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

describe('student course enrollment', () => {
  it('shows guests the real count and directs them to sign in or apply', async () => {
    mockEnrollmentApi(null);

    renderApp(`/courses/${course.slug}`);

    expect(await screen.findByRole('heading', { name: 'Computer Foundations' })).toBeInTheDocument();
    expect(screen.getByText('1 learner is currently enrolled.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in to request' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Apply Now' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('button', { name: 'Request enrollment' })).not.toBeInTheDocument();
  });

  it('lets an active student request enrollment and shows the pending decision', async () => {
    const calls = mockEnrollmentApi(studentSession);
    const user = userEvent.setup();

    renderApp(`/courses/${course.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Request enrollment' }));

    await waitFor(() => expect(calls.some((call) => call.method === 'POST'
      && call.path === `/api/v1/me/enrollments/${course.id}`)).toBe(true));
    expect(await screen.findByText('Request pending review')).toBeInTheDocument();
    expect(screen.getByText('Request sent. An administrator will review your enrollment.'))
      .toBeInTheDocument();
    await waitFor(() => {
      expect(calls).toContainEqual({
        path: `/api/v1/me/enrollments/${course.id}`,
        method: 'POST',
        body: undefined,
      });
    });
  });

  it('explains a rejected request without offering a duplicate enrollment request', async () => {
    mockEnrollmentApi(studentSession, {
      courseId: course.id,
      status: 'REJECTED',
      requestedAt: '2026-11-10T08:00:00Z',
      reviewedAt: '2026-11-11T08:00:00Z',
      reviewNotes: 'Please complete the prerequisites first.',
    });

    renderApp(`/courses/${course.slug}`);

    expect(await screen.findByText('Request declined')).toBeInTheDocument();
    expect(screen.getByText(/This request has already been reviewed/)).toBeInTheDocument();
    expect(screen.getByText('Please complete the prerequisites first.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request enrollment' })).not.toBeInTheDocument();
  });

  it('shows only the signed-in student enrollment history and notes', async () => {
    mockEnrollmentApi(studentSession);

    renderApp('/student/enrollments');

    expect(await screen.findByRole('heading', { level: 1, name: 'My enrollments' }))
      .toBeInTheDocument();
    expect(await screen.findByRole('link', { name: course.title })).toHaveAttribute(
      'href',
      `/courses/${course.slug}`,
    );
    expect(screen.getByText('Awaiting review')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText(/Requested Nov 12, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Reviewed Nov 11, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Administrator note: Welcome to the course\./)).toBeInTheDocument();
  });
});

describe('administrator enrollment review', () => {
  it('records an approval decision and optional note', async () => {
    const calls = mockEnrollmentApi(adminSession);
    const user = userEvent.setup();

    renderApp('/admin/enrollments');

    expect(await screen.findByRole('heading', { level: 1, name: 'Enrollment requests' }))
      .toBeInTheDocument();
    expect(await screen.findByText(/Requested by Maya Student \(maya@example\.test\)/))
      .toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Review note for Maya Student' }), 'Welcome!');
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(calls).toContainEqual({
        path: `/api/v1/admin/enrollments/${adminEnrollment.id}/approve`,
        method: 'POST',
        body: { notes: 'Welcome!' },
      });
    });
    expect(await screen.findByText('No requests waiting for review')).toBeInTheDocument();
  });
});
