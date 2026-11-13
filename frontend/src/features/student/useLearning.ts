import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeStudentLesson,
  getStudentCourse,
  getStudentDashboard,
  getStudentLesson,
  recordLessonAccess,
  type LessonProgress,
  type StudentLesson,
} from './learningApi';

export const learningQueryPrefix = ['student-learning'] as const;
export const learningDashboardQueryKey = [...learningQueryPrefix, 'dashboard'] as const;
export const studentCourseQueryKey = (slug: string) =>
  [...learningQueryPrefix, 'course', slug] as const;
export const studentLessonQueryKey = (courseSlug: string, lessonId: string) =>
  [...learningQueryPrefix, 'lesson', courseSlug, lessonId] as const;

export function useLearningDashboard() {
  return useQuery({ queryKey: learningDashboardQueryKey, queryFn: getStudentDashboard });
}

export function useStudentCourse(courseSlug: string) {
  return useQuery({
    queryKey: studentCourseQueryKey(courseSlug),
    queryFn: () => getStudentCourse(courseSlug),
    enabled: courseSlug.length > 0,
  });
}

export function useStudentLesson(courseSlug: string, lessonId: string) {
  return useQuery({
    queryKey: studentLessonQueryKey(courseSlug, lessonId),
    queryFn: () => getStudentLesson(courseSlug, lessonId),
    enabled: courseSlug.length > 0 && lessonId.length > 0,
  });
}

function updateLessonProgress(
  queryClient: ReturnType<typeof useQueryClient>,
  progress: LessonProgress,
) {
  queryClient.setQueryData<StudentLesson>(
    studentLessonQueryKey(progress.courseSlug, progress.lessonId),
    (current) => current
      ? {
          ...current,
          progressStatus: progress.status,
          completedAt: progress.completedAt,
        }
      : current,
  );
  void queryClient.invalidateQueries({ queryKey: learningDashboardQueryKey });
  void queryClient.invalidateQueries({ queryKey: studentCourseQueryKey(progress.courseSlug) });
}

export function useRecordLessonAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseSlug, lessonId }: { courseSlug: string; lessonId: string }) =>
      recordLessonAccess(courseSlug, lessonId),
    onSuccess: (progress) => updateLessonProgress(queryClient, progress),
  });
}

export function useCompleteStudentLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseSlug, lessonId }: { courseSlug: string; lessonId: string }) =>
      completeStudentLesson(courseSlug, lessonId),
    onSuccess: (progress) => {
      updateLessonProgress(queryClient, progress);
      void queryClient.invalidateQueries({
        queryKey: studentLessonQueryKey(progress.courseSlug, progress.lessonId),
      });
    },
  });
}
