import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { ApiRequestError } from '../../lib/api';

/** True when the server rejected individual fields (400 with fieldErrors). */
export function isServerFieldError(error: unknown): boolean {
  return error instanceof ApiRequestError && Object.keys(error.fieldErrors).length > 0;
}

/**
 * Mirrors the server's fieldErrors onto the matching react-hook-form fields so
 * each message appears next to its input. Returns true when at least one field
 * was mapped (the caller then skips the generic error alert).
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiRequestError)) return false;
  const entries = Object.entries(error.fieldErrors);
  for (const [field, message] of entries) {
    setError(field as FieldPath<T>, { type: 'server', message });
  }
  return entries.length > 0;
}
