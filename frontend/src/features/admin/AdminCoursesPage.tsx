import { BookOpen, Plus, Route } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Field';
import { AdminQueryState } from './AdminQueryState';
import { CourseFormModal } from './CourseFormModal';
import { PathFormModal } from './PathFormModal';
import { StatusButtons } from './StatusButtons';
import {
  useAdminCourses,
  useAdminPaths,
  useSetCourseStatus,
  useSetPathStatus,
  type CourseAdminResponse,
  type PathAdminResponse,
} from './adminApi';
import { statusTone } from './statusUi';

interface PathModalState {
  open: boolean;
  path: PathAdminResponse | null;
}

interface CourseModalState {
  open: boolean;
  course: CourseAdminResponse | null;
}

/**
 * /admin/courses: learning-path CRUD with status controls, then a
 * path-filtered course list with its own create/edit/status actions.
 */
export function AdminCoursesPage() {
  const paths = useAdminPaths();
  const [pathFilter, setPathFilter] = useState('');
  const courses = useAdminCourses(pathFilter || undefined);
  const pathStatus = useSetPathStatus();
  const courseStatus = useSetCourseStatus();
  const [pathModal, setPathModal] = useState<PathModalState>({ open: false, path: null });
  const [courseModal, setCourseModal] = useState<CourseModalState>({
    open: false,
    course: null,
  });

  const pendingPathId = pathStatus.isPending ? pathStatus.variables?.id : undefined;
  const pendingPathTarget = pathStatus.isPending ? pathStatus.variables?.status : undefined;
  const pendingCourseId = courseStatus.isPending ? courseStatus.variables?.id : undefined;
  const pendingCourseTarget = courseStatus.isPending
    ? courseStatus.variables?.status
    : undefined;

  const filterOptions = [
    { value: '', label: 'All paths' },
    ...(paths.data ?? []).map((path) => ({ value: path.id, label: path.name })),
  ];
  const canCreateCourse = (paths.data?.length ?? 0) > 0;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold text-navy-950">Courses</h1>
        <p className="mt-2 max-w-3xl text-ink-muted">
          Learning paths and courses with their publication state. Draft content stays
          invisible to students until you publish it.
        </p>
      </header>

      <section aria-labelledby="paths-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="paths-heading" className="text-xl font-semibold text-navy-950">
            Learning paths
          </h2>
          <Button size="sm" onClick={() => setPathModal({ open: true, path: null })}>
            <Plus className="size-4" aria-hidden="true" />
            New path
          </Button>
        </div>

        {pathStatus.error && <Alert tone="danger">{pathStatus.error.message}</Alert>}

        <AdminQueryState query={paths} loadingLabel="Loading paths…" subject="learning paths">
          {(list) =>
            list.length === 0 ? (
              <EmptyState
                icon={Route}
                title="No paths yet"
                description="No paths yet — create the first learning path."
                action={
                  <Button size="sm" onClick={() => setPathModal({ open: true, path: null })}>
                    <Plus className="size-4" aria-hidden="true" />
                    New path
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <th scope="col" className="px-4 py-3">
                        Name
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Slug
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Courses
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {list.map((path) => (
                      <tr key={path.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{path.name}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">{path.summary}</p>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs text-ink-muted">{path.slug}</code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={statusTone(path.status)}>{path.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {path.courseCount} {path.courseCount === 1 ? 'course' : 'courses'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPathModal({ open: true, path })}
                            >
                              Edit
                            </Button>
                            <StatusButtons
                              current={path.status}
                              disabled={pathStatus.isPending}
                              pendingTarget={
                                pendingPathId === path.id ? pendingPathTarget : undefined
                              }
                              onSelect={(status) =>
                                pathStatus.mutate({ id: path.id, status })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </AdminQueryState>
      </section>

      <section aria-labelledby="courses-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="courses-heading" className="text-xl font-semibold text-navy-950">
              Courses
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Each course lives in one path and holds ordered modules and lessons.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Filter by path"
              options={filterOptions}
              value={pathFilter}
              onChange={(event) => setPathFilter(event.target.value)}
            />
            <Button
              size="sm"
              disabled={!canCreateCourse}
              title={canCreateCourse ? undefined : 'Create a learning path first'}
              onClick={() => setCourseModal({ open: true, course: null })}
            >
              <Plus className="size-4" aria-hidden="true" />
              New course
            </Button>
          </div>
        </div>

        {courseStatus.error && <Alert tone="danger">{courseStatus.error.message}</Alert>}

        <AdminQueryState query={courses} loadingLabel="Loading courses…" subject="courses">
          {(list) =>
            list.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses"
                description={
                  pathFilter
                    ? 'No courses in this learning path yet.'
                    : 'No courses yet — create the first course.'
                }
                action={
                  canCreateCourse ? (
                    <Button
                      size="sm"
                      onClick={() => setCourseModal({ open: true, course: null })}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      New course
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <th scope="col" className="px-4 py-3">
                        Title
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Path
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Level
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Modules
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Lessons
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {list.map((course) => (
                      <tr key={course.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{course.title}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">{course.summary}</p>
                          {course.sourcePath && (
                            <code className="mt-1 block text-xs text-ink-muted">
                              {course.sourcePath}
                            </code>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{course.pathName}</td>
                        <td className="px-4 py-3">
                          <Badge tone="info">{course.level}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={statusTone(course.status)}>{course.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {course.publishedLessonCount}/{course.lessonCount} published lessons
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/admin/courses/${course.id}`}
                              className="font-medium text-accent-600 underline underline-offset-2"
                            >
                              Manage
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setCourseModal({ open: true, course })}
                            >
                              Edit
                            </Button>
                            <StatusButtons
                              current={course.status}
                              disabled={courseStatus.isPending}
                              pendingTarget={
                                pendingCourseId === course.id ? pendingCourseTarget : undefined
                              }
                              onSelect={(status) =>
                                courseStatus.mutate({ id: course.id, status })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </AdminQueryState>
      </section>

      {pathModal.open && (
        <PathFormModal
          path={pathModal.path}
          onClose={() => setPathModal({ open: false, path: null })}
        />
      )}
      {courseModal.open && (
        <CourseFormModal
          course={courseModal.course}
          paths={paths.data ?? []}
          onClose={() => setCourseModal({ open: false, course: null })}
        />
      )}
    </div>
  );
}
