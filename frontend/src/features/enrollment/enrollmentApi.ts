import { apiFetch } from '../../lib/api';

export type EnrollmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Enrollment row belonging to the currently signed-in student. */
export interface MyEnrollmentResponse {
  id: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  status: EnrollmentStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

/** Null status means this student has not requested this course yet. */
export interface EnrollmentStatusResponse {
  courseId: string;
  status: EnrollmentStatus | null;
  requestedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

/** Administrator queue row includes the applicant identity for review. */
export interface AdminEnrollmentResponse extends MyEnrollmentResponse {
  studentId: string;
  studentName: string;
  studentEmail: string;
}

export function listMyEnrollments(): Promise<MyEnrollmentResponse[]> {
  return apiFetch<MyEnrollmentResponse[]>('/api/v1/me/enrollments');
}

export function getMyCourseEnrollment(courseId: string): Promise<EnrollmentStatusResponse> {
  return apiFetch<EnrollmentStatusResponse>(
    `/api/v1/me/enrollments/${encodeURIComponent(courseId)}`,
  );
}

export function requestEnrollment(courseId: string): Promise<MyEnrollmentResponse> {
  return apiFetch<MyEnrollmentResponse>(`/api/v1/me/enrollments/${encodeURIComponent(courseId)}`, {
    method: 'POST',
  });
}

export function listAdminEnrollments(status?: EnrollmentStatus): Promise<AdminEnrollmentResponse[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<AdminEnrollmentResponse[]>(`/api/v1/admin/enrollments${query}`);
}

export function reviewEnrollment(
  id: string,
  decision: 'approve' | 'reject',
  notes: string,
): Promise<AdminEnrollmentResponse> {
  return apiFetch<AdminEnrollmentResponse>(
    `/api/v1/admin/enrollments/${encodeURIComponent(id)}/${decision}`,
    { method: 'POST', body: { notes } },
  );
}
