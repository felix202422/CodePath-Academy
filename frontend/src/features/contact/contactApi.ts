import { apiFetch } from '../../lib/api';

/** Public contact-form payload; mirrors the backend V6 column limits. */
export interface ContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/** Honest acknowledgement returned after the message is stored. */
export interface ContactSubmitResult {
  message: string;
}

/**
 * Submit the public contact form. Anonymous by design — no session is
 * created; CSRF is handled by the shared apiFetch client.
 */
export function submitContact(input: ContactMessageInput): Promise<ContactSubmitResult> {
  return apiFetch<ContactSubmitResult>('/api/v1/contact', {
    method: 'POST',
    body: input,
  });
}
