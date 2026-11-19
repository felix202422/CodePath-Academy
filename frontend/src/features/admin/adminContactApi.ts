import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

/** One stored contact-form message as seen in the administrator inbox. */
export interface ContactMessageResponse {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  /** Null until an administrator first opens the message. */
  readAt: string | null;
}

export const adminContactQueryKey = ['admin', 'contact-messages'] as const;

/** Newest-first inbox listing, capped at 100 rows server-side. */
export function listContactMessages(): Promise<ContactMessageResponse[]> {
  return apiFetch<ContactMessageResponse[]>('/api/v1/admin/contact-messages');
}

/**
 * Mark one message read. Idempotent server-side: the first open stamps
 * readAt, later calls return the same row unchanged.
 */
export function markContactMessageRead(id: string): Promise<ContactMessageResponse> {
  return apiFetch<ContactMessageResponse>(
    `/api/v1/admin/contact-messages/${encodeURIComponent(id)}/read`,
    { method: 'POST' },
  );
}

export function useContactMessages() {
  return useQuery({ queryKey: adminContactQueryKey, queryFn: listContactMessages });
}

export function useMarkContactMessageRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markContactMessageRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminContactQueryKey });
    },
  });
}
