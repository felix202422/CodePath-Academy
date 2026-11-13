import { apiFetch } from '../../lib/api';

export type LessonProgressStatus = 'IN_PROGRESS' | 'COMPLETED';
export type LessonResourceKind = 'IMAGE' | 'FILE' | 'LINK' | 'VIDEO';

/** One approved course and the real published-lesson progress for a student. */
export interface StudentCourseProgress {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  summary: string;
  pathName: string;
  totalLessonCount: number;
  completedLessonCount: number;
  progressPercent: number;
  continueLessonId: string | null;
  continueLessonTitle: string | null;
  lastAccessedAt: string | null;
}

export interface StudentDashboard {
  enrolledCourseCount: number;
  totalLessonCount: number;
  completedLessonCount: number;
  progressPercent: number;
  courses: StudentCourseProgress[];
}

export interface LearningLessonSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  displayOrder: number;
  progressStatus: LessonProgressStatus | null;
  completedAt: string | null;
}

export interface LearningModule {
  id: string;
  title: string;
  summary: string | null;
  displayOrder: number;
  lessons: LearningLessonSummary[];
}

export interface StudentCourseLearning {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  summary: string;
  pathName: string;
  totalLessonCount: number;
  completedLessonCount: number;
  progressPercent: number;
  modules: LearningModule[];
}

export interface LearningResource {
  id: string;
  kind: LessonResourceKind;
  title: string;
  location: string;
  mimeType: string | null;
  sizeBytes: number | null;
}

export interface StudentLesson {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  bodyMarkdown: string;
  displayOrder: number;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  progressStatus: LessonProgressStatus | null;
  completedAt: string | null;
  previousLessonId: string | null;
  nextLessonId: string | null;
  resources: LearningResource[];
}

export interface LessonProgress {
  lessonId: string;
  courseSlug: string;
  status: LessonProgressStatus;
  completedAt: string | null;
  lastAccessedAt: string;
}

export function getStudentDashboard(): Promise<StudentDashboard> {
  return apiFetch<StudentDashboard>('/api/v1/me/learning');
}

export function getStudentCourse(courseSlug: string): Promise<StudentCourseLearning> {
  return apiFetch<StudentCourseLearning>(
    `/api/v1/me/learning/courses/${encodeURIComponent(courseSlug)}`,
  );
}

export function getStudentLesson(courseSlug: string, lessonId: string): Promise<StudentLesson> {
  return apiFetch<StudentLesson>(
    `/api/v1/me/learning/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonId)}`,
  );
}

export function recordLessonAccess(courseSlug: string, lessonId: string): Promise<LessonProgress> {
  return apiFetch<LessonProgress>(
    `/api/v1/me/learning/courses/${encodeURIComponent(courseSlug)}`
      + `/lessons/${encodeURIComponent(lessonId)}/access`,
    { method: 'POST' },
  );
}

export function completeStudentLesson(courseSlug: string, lessonId: string): Promise<LessonProgress> {
  return apiFetch<LessonProgress>(
    `/api/v1/me/learning/courses/${encodeURIComponent(courseSlug)}`
      + `/lessons/${encodeURIComponent(lessonId)}/complete`,
    { method: 'POST' },
  );
}
