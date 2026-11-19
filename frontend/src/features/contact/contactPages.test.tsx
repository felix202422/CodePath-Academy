import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactPage } from './ContactPage';
import { ContactSuccessPage } from './ContactSuccessPage';

function renderContact(initialPath = '/contact') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/contact/thank-you" element={<ContactSuccessPage />} />
        </Routes>
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

beforeEach(() => {
  // jsdom starts without cookies; mutations echo the double-submit CSRF cookie.
  document.cookie = 'XSRF-TOKEN=test-token-value; path=/';
});

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('ContactPage', () => {
  it('rejects an empty or malformed form before contacting the server', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    renderContact();

    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter a subject.')).toBeInTheDocument();
    expect(screen.getByText('Enter your message.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits a valid message and lands on the thank-you page', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/v1/contact') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        expect(body).toEqual({
          name: 'Casey Caller',
          email: 'casey@example.test',
          subject: 'Question about paths',
          message: 'How do the paths sequence?',
        });
        return jsonResponse(
          { message: 'Your message has been recorded. An administrator will review it.' },
          201,
        );
      }
      return jsonResponse({ message: 'Authentication required' }, 401);
    });

    renderContact();

    await userEvent.type(screen.getByLabelText('Your name'), 'Casey Caller');
    await userEvent.type(screen.getByLabelText('Email'), 'casey@example.test');
    await userEvent.type(screen.getByLabelText('Subject'), 'Question about paths');
    await userEvent.type(screen.getByLabelText('Message'), 'How do the paths sequence?');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(
      await screen.findByRole('heading', { name: 'Your message has been recorded' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your message has been recorded. An administrator will review it.'),
    ).toBeInTheDocument();
    // Honest receipt: recorded, not emailed; no reply guarantee.
    expect(screen.getByText(/does not guarantee a reply/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Send another message' })).toHaveAttribute(
      'href',
      '/contact',
    );

    // Transactional screen: noindex with a unique title.
    await waitFor(() => expect(document.title).toBe('Message received | CodePath-Academy'));
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );

    const postCall = fetchMock.mock.calls.find(
      ([, init]) => String((init as RequestInit | undefined)?.method) === 'POST',
    );
    expect(postCall?.[0]).toContain('/api/v1/contact');
  });

  it('surfaces a server rejection as an honest error above the form', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/v1/contact') && init?.method === 'POST') {
        return jsonResponse({ message: 'The message inbox is unavailable right now.' }, 503);
      }
      return jsonResponse({ message: 'Authentication required' }, 401);
    });

    renderContact();
    await userEvent.type(screen.getByLabelText('Your name'), 'Casey Caller');
    await userEvent.type(screen.getByLabelText('Email'), 'casey@example.test');
    await userEvent.type(screen.getByLabelText('Subject'), 'Hello');
    await userEvent.type(screen.getByLabelText('Message'), 'Are paths free?');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(
      await screen.findByText('The message inbox is unavailable right now.'),
    ).toBeInTheDocument();
    // Still on the form — no fake success.
    expect(screen.getByRole('heading', { name: 'Contact the academy' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your message has been recorded' })).not.toBeInTheDocument();
  });

  it('renders a unique indexable meta description', async () => {
    renderContact();
    await waitFor(() => expect(document.title).toBe('Contact | CodePath-Academy'));
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'Contact the CodePath-Academy team',
    );
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow',
    );
  });
});

describe('ContactSuccessPage', () => {
  it('states plainly that the message was recorded, not emailed', async () => {
    renderContact('/contact/thank-you');

    expect(
      screen.getByRole('heading', { name: 'Your message has been recorded' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/stored in the academy's message inbox/i)).toBeInTheDocument();
    expect(screen.getByText(/does not guarantee a reply/i)).toBeInTheDocument();
    // No implied delivery, response time, or approval language.
    expect(screen.queryByText(/we will (email|reply) (you|back)/i)).not.toBeInTheDocument();

    await waitFor(() => expect(document.title).toBe('Message received | CodePath-Academy'));
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
  });
});
