import { ApiRequestError, apiFetch } from '../../lib/api';

export type UserRole = 'STUDENT' | 'ADMIN';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'ACTIVE';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegistrationInput {
  fullName: string;
  email: string;
  password: string;
  interests?: string;
}

export interface RegistrationResult {
  message: string;
}

export const SESSION_QUERY_KEY = ['session'] as const;

/** An unauthenticated session is a normal SPA state, not a query failure. */
export async function getSession(): Promise<SessionUser | null> {
  try {
    return await apiFetch<SessionUser>('/api/v1/auth/me');
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) return null;
    throw error;
  }
}

export function login(input: LoginInput): Promise<SessionUser> {
  return apiFetch<SessionUser>('/api/v1/auth/login', {
    method: 'POST',
    body: input,
  });
}

export function register(input: RegistrationInput): Promise<RegistrationResult> {
  return apiFetch<RegistrationResult>('/api/v1/registration', {
    method: 'POST',
    body: input,
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>('/api/v1/auth/logout', { method: 'POST' });
}

export function homeForRole(role: UserRole): '/student' | '/admin' {
  return role === 'ADMIN' ? '/admin' : '/student';
}
