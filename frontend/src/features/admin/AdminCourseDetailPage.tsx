import { ArrowLeft, Layers, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SpinnerCentered } from '../../components/ui/Spinner';
import { AdminQueryState } from './AdminQueryState';
import { LessonFormModal } from './LessonFormModal';
import { ModuleFormModal } from './ModuleFormModal';
import { StatusButtons } from './StatusButtons';
import {
  useAdminCourseDetail,
  useModuleLessons,
  useSetCourseStatus,
  useSetLessonStatus,
  useSetModuleStatus,
  type ModuleAdminResponse,
} from './adminApi';
import { statusTone } from './statusUi';

interface ModuleModalState {
  open: boolean;
  module: ModuleAdminResponse | null;
}

interface LessonModalState {
  open: boolean;
  moduleId: string;
  lessonId: string | null;
}

/**
 * /admin/courses/:courseId — module and lesson management for one course:
 * status controls at every level, plus lazy lesson lists and lesson editing.
 */
export function AdminCourseDetailPage() {
  const { courseId = '' } = useParams();
  const detail = useAdminCourseDetail(courseId);
  const courseStatus = useSetCourseStatus();
  const moduleStatus = useSetModuleStatus();
  const lessonStatus = useSetLessonStatus();
  const [moduleModal, setModuleModal] = useState<ModuleModalState>({
    open: false,
    module: null,
  });
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [lessonModal, setLessonModal] = useState<LessonModalState | null>(null);
  const expandedLessons = useModuleLessons(expandedModuleId ?? '', expandedModuleId !== null);

  const pendingCourseId = courseStatus.isPending ? courseStatus.variables?.id : undefined;
  const pendingCourseTarget = courseStatus.isPending
    ? courseStatus.variables?.status
    : undefined;
  const pendingModuleId = moduleStatus.isPending ? moduleStatus.variables?.id : undefined;
  const pendingModuleTarget = moduleStatus.isPending
    ? moduleStatus.variables?.status
    : undefined;
  const pendingLessonId = lessonStatus.isPending ? lessonStatus.variables?.id : undefined;
  const pendingLessonTarget = lessonStatus.isPending
    ? lessonStatus.variables?.status
    : undefined;

  return (
    <div>
      <AdminQueryState query={detail} loadingLabel="Loading course…" subject="course">
        {({ course, modules }) => (
          <div className="space-y-8">
            <header className="space-y-4">
              <Link
                to="/admin/courses"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 underline-offset-2 hover:underline"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to courses
              </Link>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold text-navy-950">{course.title}</h1>
                  <Badge tone={statusTone(course.status)}>{course.status}</Badge>
                </div>
                <StatusButtons
                  current={course.status}
                  disabled={courseStatus.isPending}
                  pendingTarget={pendingCourseId === course.id ? pendingCourseTarget : undefined}
                  onSelect={(status) => courseStatus.mutate({ id: course.id, status })}
                />
              </div>
              {courseStatus.error && <Alert tone="danger">{courseStatus.error.message}</Alert>}
              <p className="max-w-3xl text-ink-muted">{course.summary}</p>
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
                <div>
                  <dt className="inline font-medium">Path: </dt>
                  <dd className="inline">{course.pathName}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Level: </dt>
                  <dd className="inline">{course.level}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Modules: </dt>
                  <dd className="inline">
                    {course.publishedModuleCount}/{course.moduleCount} published
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium">Lessons: </dt>
                  <dd className="inline">
                    {course.publishedLessonCount}/{course.lessonCount} published
                  </dd>
                </div>
                {course.sourcePath && (
                  <div>
                    <dt className="inline font-medium">Source: </dt>
                    <dd className="inline">
                      <code>{course.sourcePath}</code>
                    </dd>
                  </div>
                )}
              </dl>
            </header>

            <section aria-labelledby="modules-heading" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="modules-heading" className="text-xl font-semibold text-navy-950">
                  Modules
                </h2>
                <Button size="sm" onClick={() => setModuleModal({ open: true, module: null })}>
                  <Plus className="size-4" aria-hidden="true" />
                  Add module
                </Button>
              </div>

              {moduleStatus.error && <Alert tone="danger">{moduleStatus.error.message}</Alert>}

              {modules.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No modules yet"
                  description="No modules yet — add the first module to structure this course."
                  action={
                    <Button
                      size="sm"
                      onClick={() => setModuleModal({ open: true, module: null })}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Add module
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-4">
                  {modules.map((module) => {
                    const expanded = expandedModuleId === module.id;
                    const lessonsPanelId = `module-lessons-${module.id}`;
                    return (
                      <li key={module.id} className="rounded-lg border border-slate-200 bg-surface p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-ink">{module.title}</h3>
                              <Badge tone={statusTone(module.status)}>{module.status}</Badge>
                            </div>
                            {module.summary && (
                              <p className="mt-1 text-sm text-ink-muted">{module.summary}</p>
                            )}
                            <p className="mt-1 text-sm text-ink-muted">
                              {module.publishedLessonCount}/{module.lessonCount} published
                              lessons
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              aria-expanded={expanded}
                              aria-controls={lessonsPanelId}
                              onClick={() => setExpandedModuleId(expanded ? null : module.id)}
                            >
                              Lessons
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setLessonModal({ open: true, moduleId: module.id, lessonId: null })
                              }
                            >
                              Add lesson
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setModuleModal({ open: true, module })}
                            >
                              Edit
                            </Button>
                            <StatusButtons
                              current={module.status}
                              disabled={moduleStatus.isPending}
                              pendingTarget={
                                pendingModuleId === module.id ? pendingModuleTarget : undefined
                              }
                              onSelect={(status) =>
                                moduleStatus.mutate({ id: module.id, status })
                              }
                            />
                          </div>
                        </div>

                        {expanded && (
                          <div id={lessonsPanelId} className="mt-4 border-t border-slate-200 pt-4">
                            {expandedLessons.isPending && (
                              <SpinnerCentered label="Loading lessons…" />
                            )}
                            {expandedLessons.isError && (
                              <Alert tone="danger">
                                {expandedLessons.error.message ||
                                  'The lessons could not be loaded. Please try again.'}
                              </Alert>
                            )}
                            {expandedLessons.data && (
                              <>
                                {lessonStatus.error && (
                                  <Alert tone="danger" className="mb-3">
                                    {lessonStatus.error.message}
                                  </Alert>
                                )}
                                {expandedLessons.data.length === 0 ? (
                                  <p className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-ink-muted">
                                    No lessons in this module yet — add the first lesson.
                                  </p>
                                ) : (
                                  <ul className="space-y-3">
                                    {expandedLessons.data.map((lesson) => (
                                      <li
                                        key={lesson.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
                                      >
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-ink">
                                              {lesson.title}
                                            </span>
                                            <Badge tone={statusTone(lesson.status)}>
                                              {lesson.status}
                                            </Badge>
                                            {lesson.editedByAdmin && (
                                              <Badge tone="warning">Edited</Badge>
                                            )}
                                            {lesson.sourcePath && (
                                              <Badge tone="info">Imported</Badge>
                                            )}
                                          </div>
                                          <code className="mt-1 block text-xs text-ink-muted">
                                            {lesson.slug}
                                          </code>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                              setLessonModal({
                                                open: true,
                                                moduleId: module.id,
                                                lessonId: lesson.id,
                                              })
                                            }
                                          >
                                            Edit
                                          </Button>
                                          <StatusButtons
                                            current={lesson.status}
                                            disabled={lessonStatus.isPending}
                                            pendingTarget={
                                              pendingLessonId === lesson.id
                                                ? pendingLessonTarget
                                                : undefined
                                            }
                                            onSelect={(status) =>
                                              lessonStatus.mutate({ id: lesson.id, status })
                                            }
                                          />
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {moduleModal.open && (
              <ModuleFormModal
                courseId={course.id}
                module={moduleModal.module}
                onClose={() => setModuleModal({ open: false, module: null })}
              />
            )}
            {lessonModal && (
              <LessonFormModal
                moduleId={lessonModal.moduleId}
                lessonId={lessonModal.lessonId}
                onClose={() => setLessonModal(null)}
              />
            )}
          </div>
        )}
      </AdminQueryState>
    </div>
  );
}
