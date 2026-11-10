import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

beforeEach(() => {
  // jsdom starts without cookies; mutations echo the double-submit CSRF cookie.
  document.cookie = 'XSRF-TOKEN=test-token-value; path=/';
});

function renderPage(initialPath: '/login' | '/register') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/student" element={<h1>Student dashboard</h1>} />
          <Route path="/admin" element={<h1>Administration dashboard</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('LoginPage', () => {
  it('shows a validation error when submitting an empty form', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ message: 'Authentication required' }, 401),
    );
    renderPage('/login');

    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(await screen.findByText('Enter your password.')).toBeInTheDocument();
  });

  it('signs in and routes the student to their dashboard', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/v1/auth/login')) {
        expect(init?.method).toBe('POST');
        return jsonResponse(
          {
            id: 's-1',
            email: 'sam@example.com',
            fullName: 'Sam Student',
            role: 'STUDENT',
            status: 'ACTIVE',
          },
          200,
        );
      }
      // Session probe after the session cache is seeded answers with the user.
      return jsonResponse({ message: 'Authentication required' }, 401);
    });

    renderPage('/login');
    await userEvent.type(await screen.findByLabelText(/Email/), 'sam@example.com');
    await userEvent.type(screen.getByLabelText(/Password/), 'correct horse');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Student dashboard' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('surfaces the server reason when credentials are refused', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      if (init?.method === 'POST') {
        return jsonResponse({ message: 'Email or password is incorrect.' }, 401);
      }
      return jsonResponse({ message: 'Authentication required' }, 401);
    });

    renderPage('/login');
    await userEvent.type(await screen.findByLabelText(/Email/), 'sam@example.com');
    await userEvent.type(screen.getByLabelText(/Password/), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email or password is incorrect.')).toBeInTheDocument();
  });
});

describe('RegisterPage', () => {
  it('rejects mismatched passwords before contacting the server', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    renderPage('/register');

    await userEvent.type(await screen.findByLabelText(/Full name/), 'Sam Student');
    await userEvent.type(screen.getByLabelText(/Email/), 'sam@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'password123');
    await userEvent.type(screen.getByLabelText(/Confirm password/), 'password999');
    await userEvent.click(screen.getByRole('button', { name: /Submit registration/ }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits the request and shows the admin-approval message', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      expect(String(url)).not.toContain('/auth/login');
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        // Role and status must never be sent by the client.
        expect(body).not.toHaveProperty('role');
        expect(body).not.toHaveProperty('status');
        return jsonResponse(
          { message: 'Registration submitted for administrator approval.' },
          201,
        );
      }
      return jsonResponse({ message: 'Authentication required' }, 401);
    });

    renderPage('/register');
    await userEvent.type(await screen.findByLabelText(/Full name/), 'Sam Student');
    await userEvent.type(screen.getByLabelText(/Email/), 'sam@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'password123');
    await userEvent.type(screen.getByLabelText(/Confirm password/), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Submit registration/ }));

    expect(
      await screen.findByText('Registration submitted for administrator approval.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/sign in after an administrator approves/i)).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.method).toBe('POST');
  });
});
