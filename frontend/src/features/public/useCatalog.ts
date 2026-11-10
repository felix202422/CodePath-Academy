import { useQuery } from '@tanstack/react-query';
import {
  getCourse,
  getOverview,
  getPath,
  listCourses,
  listPaths,
} from './catalogApi';

export const overviewQueryKey = ['public', 'overview'] as const;
export const coursesQueryKey = ['public', 'courses'] as const;
export const pathsQueryKey = ['public', 'paths'] as const;

/** Homepage stats and start-here courses. */
export function useOverview() {
  return useQuery({ queryKey: overviewQueryKey, queryFn: getOverview });
}

/** Full published course catalog. */
export function useCatalog() {
  return useQuery({ queryKey: coursesQueryKey, queryFn: listCourses });
}

/** Published learning paths with course counts. */
export function usePaths() {
  return useQuery({ queryKey: pathsQueryKey, queryFn: listPaths });
}

export function useCourse(slug: string) {
  return useQuery({
    queryKey: ['public', 'course', slug],
    queryFn: () => getCourse(slug),
    enabled: slug.length > 0,
  });
}

export function usePath(slug: string) {
  return useQuery({
    queryKey: ['public', 'path', slug],
    queryFn: () => getPath(slug),
    enabled: slug.length > 0,
  });
}
