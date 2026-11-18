import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { AnnouncementAudience } from '../admin/adminApi';

/**
 * Read side of the announcement feed for the signed-in student. The server
 * only ever returns PUBLISHED rows that are platform-wide or scoped to a
 * course with an APPROVED enrollment — visibility is decided server-side.
 */

/** One published announcement as the student sees it. */
export interface MyAnnouncement {
  id: string;
  title: string;
  bodyMarkdown: string;
  audience: AnnouncementAudience;
  courseId: string | null;
  courseTitle: string | null;
  publishedAt: string | null;
}

export const myAnnouncementsQueryKey = ['me', 'announcements'] as const;

export function listMyAnnouncements(): Promise<MyAnnouncement[]> {
  return apiFetch<MyAnnouncement[]>('/api/v1/me/announcements');
}

export function useMyAnnouncements() {
  return useQuery({ queryKey: myAnnouncementsQueryKey, queryFn: listMyAnnouncements });
}
