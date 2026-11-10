/**
 * Single typed HTTP client for the whole SPA. Every feature fetches through this
 * module so authentication, CSRF, and error handling stay in one place.
 */

export class ApiRequestError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Reads the CSRF cookie Spring Security sets (XSRF-TOKEN) for the double-submit pattern. */
function csrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match?.[1];
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers = new Headers(options.headers);

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const token = csrfToken();
  if (token && method !== 'GET' && method !== 'HEAD') {
    headers.set('X-XSRF-TOKEN', token);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload: unknown = text ? safeParse(text) : null;

  if (!response.ok) {
    const problem = payload as
      | { message?: string; fieldErrors?: Record<string, string> }
      | null;
    throw new ApiRequestError(
      response.status,
      problem?.message ?? `Request failed with status ${response.status}`,
      problem?.fieldErrors ?? {},
    );
  }

  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
