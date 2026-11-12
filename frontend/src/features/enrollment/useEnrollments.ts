import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyCourseEnrollment,
  listAdminEnrollments,
  listMyEnrollments,
  requestEnrollment,
  reviewEnrollment,
  type EnrollmentStatus,
} from './enrollmentApi';

export const myEnrollmentsQueryKey = ['me', 'enrollments'] as const;
export const myCourseEnrollmentQueryPrefix = ['me', 'enrollments', 'course'] as const;
export const myCourseEnrollmentQueryKey = (courseId: string) =>
  [...myCourseEnrollmentQueryPrefix, courseId] as const;
export const adminEnrollmentsQueryKey = (status?: EnrollmentStatus) =>
  ['admin', 'enrollments', status ?? 'all'] as const;

export function useMyEnrollments() {
  return useQuery({ queryKey: myEnrollmentsQueryKey, queryFn: listMyEnrollments });
}

export function useMyCourseEnrollment(courseId: string, enabled: boolean) {
  return useQuery({
    queryKey: myCourseEnrollmentQueryKey(courseId),
    queryFn: () => getMyCourseEnrollment(courseId),
    enabled: enabled && courseId.length > 0,
  });
}

export function useRequestEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestEnrollment,
    onSuccess: (enrollment) => {
      queryClient.setQueryData(myCourseEnrollmentQueryKey(enrollment.courseId), {
        courseId: enrollment.courseId,
        status: enrollment.status,
        requestedAt: enrollment.requestedAt,
        reviewedAt: enrollment.reviewedAt,
        reviewNotes: enrollment.reviewNotes,
      });
      void queryClient.invalidateQueries({ queryKey: myEnrollmentsQueryKey, exact: true });
    },
  });
}

export function useAdminEnrollments(status?: EnrollmentStatus) {
  return useQuery({
    queryKey: adminEnrollmentsQueryKey(status),
    queryFn: () => listAdminEnrollments(status),
  });
}

export function useReviewEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision, notes }: {
      id: string;
      decision: 'approve' | 'reject';
      notes: string;
    }) => reviewEnrollment(id, decision, notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'enrollments'] });
      void queryClient.invalidateQueries({ queryKey: myEnrollmentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: myCourseEnrollmentQueryPrefix });
      void queryClient.invalidateQueries({ queryKey: ['public'] });
    },
  });
}
