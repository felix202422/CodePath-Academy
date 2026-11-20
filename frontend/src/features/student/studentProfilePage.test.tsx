import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import type { SessionUser } from '../auth/authApi';

const studentSession: SessionUser = {
  id: 'student-1',
  email: 'sam@example.test',
  fullName: 'Sam Learner',
  role: 'STUDENT',
  status: 'ACTIVE',
};

type ChangePasswordBehavior = 'success' | 'wrong-current' | 'server-message';

interface RecordedCall {
  path: string;
  method: string;
  body: Record<string, unknown> | null;
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

function mockProfileApi(behavior: ChangePasswordBehavior = 'success') {
  const calls: RecordedCall[] = [];

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const body =
      init?.body !== undefined && typeof init.body === 'string'
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : null;
    calls.push({ path: url.pathname, method, body });

    if (url.pathname === '/api/v1/auth/me') {
      return jsonResponse(studentSession);
    }
    if (url.pathname === '/api/v1/health') {
      return jsonResponse({ status: 'UP', service: 'codepath-academy' });
    }
    if (url.pathname === '/api/v1/auth/change-password' && method === 'POST') {
      if (behavior === 'wrong-current') {
        return jsonResponse(
          {
            status: 400,
            error: 'Wrong current password',
            message: 'The current password is incorrect.',
            path: '/api/v1/auth/change-password',
            fieldErrors: { currentPassword: 'The current password is incorrect.' },
          },
          400,
        );
      }
      if (behavior === 'server-message') {
        return jsonResponse(
          {
            status: 403,
            error: 'Account suspended',
            message: 'This account is suspended. Contact an administrator.',
            path: '/api/v1/auth/change-password',
            fieldErrors: {},
          },
          403,
        );
      }
      return jsonResponse({ message: 'Password updated.' });
    }
    return jsonResponse({ message: `Not found: ${url.pathname}` }, 404);
  });

  return calls;
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
  confirm: string,
) {
  await user.type(screen.getByLabelText(/Current password/), current);
  await user.type(screen.getByLabelText(/New password/), next);
  await user.type(screen.getByLabelText(/Confirm new password/), confirm);
  await user.click(screen.getByRole('button', { name: 'Update password' }));
}

beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=test-token-value; path=/';
});

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('student profile page', () => {
  it('shows the signed-in account details instead of the old placeholder', async () => {
    mockProfileApi();

    renderApp('/student/profile');

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Account details' })).toBeInTheDocument();
    expect(screen.getByText(studentSession.fullName)).toBeInTheDocument();
    expect(screen.getByText(studentSession.email)).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Change password' })).toBeInTheDocument();
    // The Phase 3 placeholder copy must be gone for good.
    expect(screen.queryByText(/delivers this screen/)).toBeNull();
    expect(screen.queryByText(/Phase 3/)).toBeNull();
  });

  it('blocks an empty submit with honest field errors and sends nothing', async () => {
    const calls = mockProfileApi();
    const user = userEvent.setup();

    renderApp('/student/profile');
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Enter your current password.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/api/v1/auth/change-password')).toHaveLength(0);
  });

  it('rejects a confirmation that does not match before any request', async () => {
    const calls = mockProfileApi();
    const user = userEvent.setup();

    renderApp('/student/profile');
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();

    await fillAndSubmit(user, 'original-pass-1', 'brandnew-secret-1', 'brandnew-secret-2');

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/api/v1/auth/change-password')).toHaveLength(0);
  });

  it('attaches a server field error to the current-password control', async () => {
    const calls = mockProfileApi('wrong-current');
    const user = userEvent.setup();

    renderApp('/student/profile');
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();

    await fillAndSubmit(user, 'not-my-password-1', 'brandnew-secret-1', 'brandnew-secret-1');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The current password is incorrect.');
    expect(screen.getByLabelText(/Current password/)).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toContainEqual({
      path: '/api/v1/auth/change-password',
      method: 'POST',
      body: {
        currentPassword: 'not-my-password-1',
        newPassword: 'brandnew-secret-1',
      },
    });
  });

  it('confirms success honestly, clears the form, and never sends the confirmation field', async () => {
    const calls = mockProfileApi('success');
    const user = userEvent.setup();

    renderApp('/student/profile');
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();

    await fillAndSubmit(user, 'original-pass-1', 'brandnew-secret-1', 'brandnew-secret-1');

    expect(await screen.findByText(/Password updated\./)).toBeInTheDocument();
    expect(screen.getByText(/other signed-in devices remain signed in/)).toBeInTheDocument();

    const submissions = calls.filter((c) => c.path === '/api/v1/auth/change-password');
    expect(submissions).toHaveLength(1);
    expect(submissions[0]?.body).toEqual({
      currentPassword: 'original-pass-1',
      newPassword: 'brandnew-secret-1',
    });

    expect(screen.getByLabelText(/Current password/)).toHaveValue('');
    expect(screen.getByLabelText(/New password/)).toHaveValue('');
    expect(screen.getByLabelText(/Confirm new password/)).toHaveValue('');
  });

  it('shows a message-only server failure as a page alert', async () => {
    mockProfileApi('server-message');
    const user = userEvent.setup();

    renderApp('/student/profile');
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();

    await fillAndSubmit(user, 'original-pass-1', 'brandnew-secret-1', 'brandnew-secret-1');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This account is suspended. Contact an administrator.');
  });
});
