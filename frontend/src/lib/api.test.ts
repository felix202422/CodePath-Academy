import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiRequestError } from './api';

describe('apiFetch', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token-value; path=/';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('returns parsed JSON on success', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'UP' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await apiFetch<{ status: string }>('/api/v1/health');

    expect(result.status).toBe('UP');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/health',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('sends the CSRF header on mutations but not on GET', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      // Fresh Response per call: a body can only be read once.
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await apiFetch('/api/v1/health');
    const getHeaders = (fetchMock.mock.calls[0]?.[1]?.headers as Headers).get('X-XSRF-TOKEN');
    expect(getHeaders).toBeNull();

    await apiFetch('/api/v1/auth/login', { method: 'POST', body: { email: 'a@b.c' } });
    const postHeaders = (fetchMock.mock.calls[1]?.[1]?.headers as Headers).get('X-XSRF-TOKEN');
    expect(postHeaders).toBe('test-token-value');
  });

  it('throws ApiRequestError with server message and field errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'One or more fields are invalid.',
          fieldErrors: { email: 'Email is already registered.' },
        }),
        { status: 400 },
      ),
    );

    const failure = apiFetch('/api/v1/registration', { method: 'POST', body: {} });

    await expect(failure).rejects.toBeInstanceOf(ApiRequestError);
    await expect(failure).rejects.toMatchObject({
      status: 400,
      fieldErrors: { email: 'Email is already registered.' },
    });
  });

  it('falls back to a generic message when the body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>gateway error</html>', { status: 502 }),
    );

    await expect(apiFetch('/api/v1/health')).rejects.toMatchObject({
      status: 502,
      message: 'Request failed with status 502',
    });
  });

  it('returns undefined for 204 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch('/api/v1/thing', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
