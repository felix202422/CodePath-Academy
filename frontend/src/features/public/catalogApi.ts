import { apiFetch } from '../../lib/api';

/** Public catalog types — mirrors of the /api/v1/public DTOs. */
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: CourseLevel;
  pathSlug: string;
  pathName: string;
}

export interface CourseDetail extends CourseSummary {
  description: string;
  sourceRepository: string | null;
  moduleCount: number;
  lessonCount: number;
  prerequisites: CourseSummary[];
}

export interface PathSummary {
  id: string;
  slug: string;
  name: string;
  summary: string;
  accentColor: string | null;
  courseCount: number;
}

export interface PathDetail extends PathSummary {
  description: string | null;
  courses: CourseSummary[];
}

export interface Overview {
  pathCount: number;
  courseCount: number;
  paths: PathSummary[];
  startHere: CourseSummary[];
}

export function getOverview(): Promise<Overview> {
  return apiFetch<Overview>('/api/v1/public/overview');
}

export function listPaths(): Promise<PathSummary[]> {
  return apiFetch<PathSummary[]>('/api/v1/public/paths');
}

export function getPath(slug: string): Promise<PathDetail> {
  return apiFetch<PathDetail>(`/api/v1/public/paths/${encodeURIComponent(slug)}`);
}

export function listCourses(): Promise<CourseSummary[]> {
  return apiFetch<CourseSummary[]>('/api/v1/public/courses');
}

export function getCourse(slug: string): Promise<CourseDetail> {
  return apiFetch<CourseDetail>(`/api/v1/public/courses/${encodeURIComponent(slug)}`);
}
