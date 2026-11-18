import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

/**
 * Typed client for every /api/v1/admin endpoint used by Phase 5 (course
 * management and curriculum imports), plus the TanStack Query keys and hooks
 * that keep those screens in sync. Requests flow through lib/api.ts so session
 * cookies and CSRF stay centralized; ROLE_ADMIN is enforced server-side.
 */

/** Content publication state shared by paths, courses, modules, and lessons. */
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/** Outcome of one row in an import run. */
export type ImportStatus = 'IMPORTED' | 'UNCHANGED' | 'CONFLICT' | 'FAILED';

/** Where an import run reads its source from. */
export type ImportMode = 'LOCAL' | 'REMOTE';

export interface PathAdminResponse {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string | null;
  accentColor: string | null;
  displayOrder: number;
  status: ContentStatus;
  courseCount: number;
  updatedAt: string;
}

export interface CourseAdminResponse {
  id: string;
  pathId: string;
  pathSlug: string;
  pathName: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  level: CourseLevel;
  estimatedHours: number | null;
  displayOrder: number;
  status: ContentStatus;
  sourceRepository: string | null;
  sourcePath: string | null;
  moduleCount: number;
  lessonCount: number;
  publishedModuleCount: number;
  publishedLessonCount: number;
  updatedAt: string;
}

export interface ModuleAdminResponse {
  id: string;
  courseId: string;
  title: string;
  summary: string | null;
  displayOrder: number;
  status: ContentStatus;
  sourcePath: string | null;
  lessonCount: number;
  publishedLessonCount: number;
  updatedAt: string;
}

export interface LessonAdminResponse {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  summary: string | null;
  displayOrder: number;
  status: ContentStatus;
  editedByAdmin: boolean;
  publishedAt: string | null;
  sourcePath: string | null;
  updatedAt: string;
}

export interface LessonDetailAdminResponse extends LessonAdminResponse {
  bodyMarkdown: string;
  contentHash: string;
  sourceRepository: string | null;
  sourceCommit: string | null;
  sourceHash: string | null;
  createdAt: string;
}

export interface CreatePathRequest {
  slug: string;
  name: string;
  summary: string;
  description?: string | null;
  accentColor?: string | null;
  displayOrder?: number | null;
}

export type UpdatePathRequest = CreatePathRequest;

export interface CreateCourseRequest {
  pathId: string;
  slug: string;
  title: string;
  summary: string;
  description?: string | null;
  level: CourseLevel;
  estimatedHours?: number | null;
  displayOrder?: number | null;
  sourcePath?: string | null;
}

export type UpdateCourseRequest = CreateCourseRequest;

export interface CreateModuleRequest {
  title: string;
  summary?: string | null;
  displayOrder?: number | null;
  sourcePath?: string | null;
}

export interface UpdateModuleRequest {
  title: string;
  summary?: string | null;
  sourcePath?: string | null;
}

export interface CreateLessonRequest {
  slug: string;
  title: string;
  summary?: string | null;
  bodyMarkdown: string;
  displayOrder?: number | null;
}

export interface UpdateLessonRequest {
  slug: string;
  title: string;
  summary?: string | null;
  bodyMarkdown: string;
}

/** GET /admin/courses/{id} payload: the course plus its ordered modules. */
export interface CourseDetailAdminResponse {
  course: CourseAdminResponse;
  modules: ModuleAdminResponse[];
}

export interface ImportSourceResponse {
  repository: string;
  localPathConfigured: boolean;
  localPath: string;
  commitPin: string;
}

export interface ImportRunResponse {
  mode: ImportMode;
  repository: string;
  commit: string;
  durationMs: number;
  subjectsScanned: number;
  unmappedSubjects: string[];
  lessonsCreated: number;
  lessonsUpdated: number;
  lessonsUnchanged: number;
  conflictsStaged: number;
  failures: number;
  mediaFilesStored: number;
  warnings: string[];
}

export interface ImportRowResponse {
  id: string;
  sourceRepository: string;
  sourcePath: string;
  sourceCommit: string;
  sourceHash: string;
  status: ImportStatus;
  message: string | null;
  targetLessonId: string | null;
  targetLessonTitle: string | null;
  importedById: string | null;
  createdAt: string;
  resolvedAt: string | null;
  hasProposal: boolean;
}

export interface ImportRowDetailResponse extends ImportRowResponse {
  currentBody: string | null;
  currentContentHash: string | null;
  proposedBody: string | null;
}

/* ------------------------------------------------------------ assessments */

/** Question kinds an administrator can author; grading rules live server-side. */
export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MULTI_ANSWER' | 'SHORT_ANSWER';

/** List row for one assessment with the real question and attempt counts. */
export interface AssessmentAdminResponse {
  id: string;
  courseId: string;
  moduleId: string | null;
  title: string;
  description: string | null;
  passScorePercent: number;
  maxAttempts: number;
  timeLimitMinutes: number | null;
  displayOrder: number;
  status: ContentStatus;
  questionCount: number;
  attemptCount: number;
  updatedAt: string;
}

/** One option including whether it is the correct answer. */
export interface AssessmentOptionAdminResponse {
  id: string;
  optionText: string;
  correct: boolean;
  displayOrder: number;
}

/** One authored question with its options and answer key. */
export interface AssessmentQuestionAdminResponse {
  id: string;
  questionType: QuestionType;
  prompt: string;
  explanation: string | null;
  correctText: string | null;
  points: number;
  displayOrder: number;
  options: AssessmentOptionAdminResponse[];
}

/** Authoring detail: the list row plus the full question set. */
export interface AssessmentDetailAdminResponse extends AssessmentAdminResponse {
  questions: AssessmentQuestionAdminResponse[];
}

export interface AssessmentOptionWriteRequest {
  optionText: string;
  isCorrect: boolean;
}

export interface AssessmentQuestionWriteRequest {
  questionType: QuestionType;
  prompt: string;
  explanation?: string | null;
  /** Required for SHORT_ANSWER; ignored for every other type. */
  correctText?: string | null;
  points: number;
  options?: AssessmentOptionWriteRequest[] | null;
}

/**
 * Create/update payload. Omitting `questions` on update leaves the stored
 * set untouched; supplying it replaces the whole set (a conflict once any
 * attempt exists). `displayOrder` is create-only — the server leaves the
 * stored order unchanged when it is null.
 */
export interface AssessmentWriteRequest {
  title: string;
  description?: string | null;
  passScorePercent?: number | null;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  displayOrder?: number | null;
  moduleId?: string | null;
  questions?: AssessmentQuestionWriteRequest[] | null;
}

/* ------------------------------------------ administration (Phase 9) */

/** Account lifecycle as administrators manage it. */
export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

/** Review state of a registration request in the queue. */
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Authoring intent for an announcement's audience. */
export type AnnouncementAudience = 'STUDENTS' | 'ALL';

/** Live administrator home-screen aggregates; every number is a real count. */
export interface AdminDashboardResponse {
  pendingRegistrations: number;
  pendingEnrollments: number;
  activeStudents: number;
  suspendedStudents: number;
  publishedCourses: number;
  publishedPaths: number;
  publishedAnnouncements: number;
  recentAudit: AuditEntryResponse[];
}

/** Administrator view of one student account. */
export interface StudentAdminResponse {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  interests: string | null;
  createdAt: string;
}

/** One registration request including the applicant's account. */
export interface RegistrationRequestResponse {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  status: RegistrationStatus;
  interests: string | null;
  createdAt: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
}

/** Administrator view of one announcement, drafts and archives included. */
export interface AnnouncementAdminResponse {
  id: string;
  title: string;
  bodyMarkdown: string;
  audience: AnnouncementAudience;
  status: ContentStatus;
  courseId: string | null;
  courseTitle: string | null;
  createdByEmail: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create/update payload. `courseId` null means platform-wide. Status is
 * deliberately absent — publication only ever happens through /status.
 */
export interface AnnouncementWriteRequest {
  title: string;
  bodyMarkdown: string;
  audience: AnnouncementAudience;
  courseId?: string | null;
}

/** One append-only audit-trail row. */
export interface AuditEntryResponse {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  createdAt: string;
}

/**
 * Query keys. The `*` roots (paths, courses, course, module, lesson, imports)
 * exist only as invalidation prefixes — individual queries always use the
 * keyed helpers so lists and detail screens refetch independently.
 */
export const adminQueryKeys = {
  paths: () => ['admin', 'paths'] as const,
  dashboard: () => ['admin', 'dashboard'] as const,
  students: (status?: UserStatus) => ['admin', 'students', status ?? 'all'] as const,
  registrations: (status?: RegistrationStatus) =>
    ['admin', 'registrations', status ?? 'all'] as const,
  announcements: (status?: ContentStatus) =>
    ['admin', 'announcements', status ?? 'all'] as const,
  audit: (entityType?: string) => ['admin', 'audit', entityType ?? 'all'] as const,
  courses: (pathId?: string) => ['admin', 'courses', pathId ?? 'all'] as const,
  course: (courseId: string) => ['admin', 'course', courseId] as const,
  module: (moduleId: string) => ['admin', 'module', moduleId] as const,
  lessons: (moduleId: string) => ['admin', 'module', moduleId, 'lessons'] as const,
  lesson: (lessonId: string) => ['admin', 'lesson', lessonId] as const,
  assessments: (courseId: string) => ['admin', 'course', courseId, 'assessments'] as const,
  assessment: (assessmentId: string) => ['admin', 'assessment', assessmentId] as const,
  importSource: () => ['admin', 'import-source'] as const,
  imports: (status?: ImportStatus) => ['admin', 'imports', status ?? 'all'] as const,
  importRow: (importId: string) => ['admin', 'import', importId] as const,
};

const PATHS_KEY = ['admin', 'paths'] as const;
const COURSES_KEY = ['admin', 'courses'] as const;
const COURSE_KEY = ['admin', 'course'] as const;
const MODULE_KEY = ['admin', 'module'] as const;
const ADMIN_KEY = ['admin'] as const;

/* ------------------------------------------------------------------ paths */

export function listPaths(): Promise<PathAdminResponse[]> {
  return apiFetch<PathAdminResponse[]>('/api/v1/admin/paths');
}

export function createPath(body: CreatePathRequest): Promise<PathAdminResponse> {
  return apiFetch<PathAdminResponse>('/api/v1/admin/paths', { method: 'POST', body });
}

export function updatePath(id: string, body: UpdatePathRequest): Promise<PathAdminResponse> {
  return apiFetch<PathAdminResponse>(`/api/v1/admin/paths/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export function setPathStatus(id: string, status: ContentStatus): Promise<PathAdminResponse> {
  return apiFetch<PathAdminResponse>(`/api/v1/admin/paths/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: { status },
  });
}

/* ---------------------------------------------------------------- courses */

export function listCourses(pathId?: string): Promise<CourseAdminResponse[]> {
  const query = pathId ? `?pathId=${encodeURIComponent(pathId)}` : '';
  return apiFetch<CourseAdminResponse[]>(`/api/v1/admin/courses${query}`);
}

export function createCourse(body: CreateCourseRequest): Promise<CourseAdminResponse> {
  return apiFetch<CourseAdminResponse>('/api/v1/admin/courses', { method: 'POST', body });
}

export function getCourseDetail(courseId: string): Promise<CourseDetailAdminResponse> {
  return apiFetch<CourseDetailAdminResponse>(
    `/api/v1/admin/courses/${encodeURIComponent(courseId)}`,
  );
}

export function updateCourse(
  id: string,
  body: UpdateCourseRequest,
): Promise<CourseAdminResponse> {
  return apiFetch<CourseAdminResponse>(`/api/v1/admin/courses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export function setCourseStatus(
  id: string,
  status: ContentStatus,
): Promise<CourseAdminResponse> {
  return apiFetch<CourseAdminResponse>(`/api/v1/admin/courses/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: { status },
  });
}

export function createModule(
  courseId: string,
  body: CreateModuleRequest,
): Promise<ModuleAdminResponse> {
  return apiFetch<ModuleAdminResponse>(
    `/api/v1/admin/courses/${encodeURIComponent(courseId)}/modules`,
    { method: 'POST', body },
  );
}

/* ---------------------------------------------------------------- modules */

export function getModule(moduleId: string): Promise<ModuleAdminResponse> {
  return apiFetch<ModuleAdminResponse>(`/api/v1/admin/modules/${encodeURIComponent(moduleId)}`);
}

export function updateModule(
  id: string,
  body: UpdateModuleRequest,
): Promise<ModuleAdminResponse> {
  return apiFetch<ModuleAdminResponse>(`/api/v1/admin/modules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export function setModuleStatus(
  id: string,
  status: ContentStatus,
): Promise<ModuleAdminResponse> {
  return apiFetch<ModuleAdminResponse>(
    `/api/v1/admin/modules/${encodeURIComponent(id)}/status`,
    { method: 'POST', body: { status } },
  );
}

export function listLessons(moduleId: string): Promise<LessonAdminResponse[]> {
  return apiFetch<LessonAdminResponse[]>(
    `/api/v1/admin/modules/${encodeURIComponent(moduleId)}/lessons`,
  );
}

export function createLesson(
  moduleId: string,
  body: CreateLessonRequest,
): Promise<LessonDetailAdminResponse> {
  return apiFetch<LessonDetailAdminResponse>(
    `/api/v1/admin/modules/${encodeURIComponent(moduleId)}/lessons`,
    { method: 'POST', body },
  );
}

/* ---------------------------------------------------------------- lessons */

export function getLesson(lessonId: string): Promise<LessonDetailAdminResponse> {
  return apiFetch<LessonDetailAdminResponse>(
    `/api/v1/admin/lessons/${encodeURIComponent(lessonId)}`,
  );
}

export function updateLesson(
  id: string,
  body: UpdateLessonRequest,
): Promise<LessonDetailAdminResponse> {
  return apiFetch<LessonDetailAdminResponse>(`/api/v1/admin/lessons/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export function setLessonStatus(
  id: string,
  status: ContentStatus,
): Promise<LessonDetailAdminResponse> {
  return apiFetch<LessonDetailAdminResponse>(
    `/api/v1/admin/lessons/${encodeURIComponent(id)}/status`,
    { method: 'POST', body: { status } },
  );
}

/* ---------------------------------------------------------- assessments */

export function listAssessments(courseId: string): Promise<AssessmentAdminResponse[]> {
  return apiFetch<AssessmentAdminResponse[]>(
    `/api/v1/admin/courses/${encodeURIComponent(courseId)}/assessments`,
  );
}

export function createAssessment(
  courseId: string,
  body: AssessmentWriteRequest,
): Promise<AssessmentAdminResponse> {
  return apiFetch<AssessmentAdminResponse>(
    `/api/v1/admin/courses/${encodeURIComponent(courseId)}/assessments`,
    { method: 'POST', body },
  );
}

export function getAssessment(id: string): Promise<AssessmentDetailAdminResponse> {
  return apiFetch<AssessmentDetailAdminResponse>(
    `/api/v1/admin/assessments/${encodeURIComponent(id)}`,
  );
}

export function updateAssessment(
  id: string,
  body: AssessmentWriteRequest,
): Promise<AssessmentAdminResponse> {
  return apiFetch<AssessmentAdminResponse>(`/api/v1/admin/assessments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export function setAssessmentStatus(
  id: string,
  status: ContentStatus,
): Promise<AssessmentAdminResponse> {
  return apiFetch<AssessmentAdminResponse>(
    `/api/v1/admin/assessments/${encodeURIComponent(id)}/status`,
    { method: 'POST', body: { status } },
  );
}

/** 204 on success; the server rejects the delete once attempts exist. */
export function deleteAssessment(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/admin/assessments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/* --------------------------------------------------------------- imports */

export function getImportSource(): Promise<ImportSourceResponse> {
  return apiFetch<ImportSourceResponse>('/api/v1/admin/content/import-source');
}

/** Synchronous run; remote mode can take about a minute. */
export function runImport(mode: ImportMode | null): Promise<ImportRunResponse> {
  return apiFetch<ImportRunResponse>('/api/v1/admin/content/imports', {
    method: 'POST',
    // Auto mode omits the key entirely so the server picks the source.
    body: mode === null ? {} : { mode },
  });
}

export function listImports(
  status?: ImportStatus,
  limit = 100,
): Promise<ImportRowResponse[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', String(limit));
  return apiFetch<ImportRowResponse[]>(`/api/v1/admin/content/imports?${params.toString()}`);
}

export function getImportRow(importId: string): Promise<ImportRowDetailResponse> {
  return apiFetch<ImportRowDetailResponse>(
    `/api/v1/admin/content/imports/${encodeURIComponent(importId)}`,
  );
}

/** Apply the staged source version to the academy lesson. */
export function acceptImport(importId: string): Promise<ImportRowDetailResponse> {
  return apiFetch<ImportRowDetailResponse>(
    `/api/v1/admin/content/imports/${encodeURIComponent(importId)}/accept`,
    { method: 'POST' },
  );
}

/** Keep the academy-edited lesson version and drop the staged proposal. */
export function discardImport(importId: string): Promise<ImportRowDetailResponse> {
  return apiFetch<ImportRowDetailResponse>(
    `/api/v1/admin/content/imports/${encodeURIComponent(importId)}/discard`,
    { method: 'POST' },
  );
}

/* ------------------------------------------------------------- queries */

export function useAdminPaths() {
  return useQuery({ queryKey: adminQueryKeys.paths(), queryFn: listPaths });
}

export function useAdminCourses(pathId?: string) {
  return useQuery({
    queryKey: adminQueryKeys.courses(pathId),
    queryFn: () => listCourses(pathId),
  });
}

export function useAdminCourseDetail(courseId: string) {
  return useQuery({
    queryKey: adminQueryKeys.course(courseId),
    queryFn: () => getCourseDetail(courseId),
    enabled: courseId.length > 0,
  });
}

/** Lessons of one module, fetched only while its row is expanded. */
export function useModuleLessons(moduleId: string, enabled: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.lessons(moduleId),
    queryFn: () => listLessons(moduleId),
    enabled: enabled && moduleId.length > 0,
  });
}

/** Full lesson body for the edit modal (the list response has no body). */
export function useLessonDetail(lessonId: string, enabled: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.lesson(lessonId),
    queryFn: () => getLesson(lessonId),
    enabled: enabled && lessonId.length > 0,
  });
}

export function useAdminAssessments(courseId: string) {
  return useQuery({
    queryKey: adminQueryKeys.assessments(courseId),
    queryFn: () => listAssessments(courseId),
    enabled: courseId.length > 0,
  });
}

/** Question set for the authoring modal; fetched only while it is open. */
export function useAssessmentDetail(assessmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.assessment(assessmentId),
    queryFn: () => getAssessment(assessmentId),
    enabled: enabled && assessmentId.length > 0,
  });
}

export function useImportSource() {
  return useQuery({ queryKey: adminQueryKeys.importSource(), queryFn: getImportSource });
}

export function useImportRows(status?: ImportStatus) {
  return useQuery({
    queryKey: adminQueryKeys.imports(status),
    queryFn: () => listImports(status),
  });
}

export function useImportRow(importId: string, enabled: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.importRow(importId),
    queryFn: () => getImportRow(importId),
    enabled: enabled && importId.length > 0,
  });
}

/* ------------------------------------------------------------ mutations */

export function useCreatePath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPath,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PATHS_KEY });
    },
  });
}

export function useUpdatePath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePathRequest }) => updatePath(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PATHS_KEY });
      // Course rows echo their path's name, so a rename must refresh them.
      void queryClient.invalidateQueries({ queryKey: COURSES_KEY });
    },
  });
}

export function useSetPathStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) =>
      setPathStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PATHS_KEY });
    },
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCourse,
    onSuccess: (course) => {
      void queryClient.invalidateQueries({ queryKey: COURSES_KEY });
      void queryClient.invalidateQueries({ queryKey: PATHS_KEY });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.course(course.id) });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCourseRequest }) =>
      updateCourse(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COURSES_KEY });
      void queryClient.invalidateQueries({ queryKey: COURSE_KEY });
      // Moving a course between paths changes both paths' course counts.
      void queryClient.invalidateQueries({ queryKey: PATHS_KEY });
    },
  });
}

export function useSetCourseStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) =>
      setCourseStatus(id, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: COURSES_KEY });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.course(variables.id) });
    },
  });
}

export function useCreateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, body }: { courseId: string; body: CreateModuleRequest }) =>
      createModule(courseId, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.course(variables.courseId) });
      void queryClient.invalidateQueries({ queryKey: COURSES_KEY });
    },
  });
}

export function useUpdateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateModuleRequest }) =>
      updateModule(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COURSE_KEY });
      void queryClient.invalidateQueries({ queryKey: MODULE_KEY });
    },
  });
}

export function useSetModuleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) =>
      setModuleStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COURSE_KEY });
      void queryClient.invalidateQueries({ queryKey: MODULE_KEY });
      void queryClient.invalidateQueries({ queryKey: COURSES_KEY });
    },
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, body }: { moduleId: string; body: CreateLessonRequest }) =>
      createLesson(moduleId, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.lessons(variables.moduleId) });
      void queryClient.invalidateQueries({ queryKey: COURSE_KEY });
      void queryClient.invalidateQueries({ queryKey: COURSES_KEY });
    },
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLessonRequest }) =>
      updateLesson(id, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.lesson(variables.id) });
      void queryClient.invalidateQueries({ queryKey: MODULE_KEY });
      void queryClient.invalidateQueries({ queryKey: COURSE_KEY });
      void queryClient.invalidateQueries({ queryKey: COURSES_KEY });
    },
  });
}

export function useSetLessonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) =>
      setLessonStatus(id, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.lesson(variables.id) });
      void queryClient.invalidateQueries({ queryKey: MODULE_KEY });
      void queryClient.invalidateQueries({ queryKey: COURSE_KEY });
      void queryClient.invalidateQueries({ queryKey: COURSES_KEY });
    },
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, body }: { courseId: string; body: AssessmentWriteRequest }) =>
      createAssessment(courseId, body),
    onSuccess: (assessment) => {
      void queryClient.invalidateQueries({
        queryKey: adminQueryKeys.assessments(assessment.courseId),
      });
    },
  });
}

export function useUpdateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AssessmentWriteRequest }) =>
      updateAssessment(id, body),
    onSuccess: (assessment) => {
      void queryClient.invalidateQueries({
        queryKey: adminQueryKeys.assessments(assessment.courseId),
      });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.assessment(assessment.id) });
    },
  });
}

export function useSetAssessmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) =>
      setAssessmentStatus(id, status),
    onSuccess: (assessment) => {
      void queryClient.invalidateQueries({
        queryKey: adminQueryKeys.assessments(assessment.courseId),
      });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.assessment(assessment.id) });
    },
  });
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; courseId: string }) => deleteAssessment(id),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminQueryKeys.assessments(variables.courseId),
      });
    },
  });
}

export function useRunImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runImport,
    onSuccess: () => {
      // A run can create or change lessons anywhere, so refresh every admin read.
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
    },
  });
}

export function useAcceptImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptImport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
    },
  });
}

export function useDiscardImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: discardImport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
    },
  });
}

/* ------------------------------------- administration (Phase 9) queries */

export function getAdminDashboard(): Promise<AdminDashboardResponse> {
  return apiFetch<AdminDashboardResponse>('/api/v1/admin/dashboard');
}

export function listStudents(status?: UserStatus): Promise<StudentAdminResponse[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<StudentAdminResponse[]>(`/api/v1/admin/students${query}`);
}

export function suspendStudent(id: string): Promise<StudentAdminResponse> {
  return apiFetch<StudentAdminResponse>(
    `/api/v1/admin/students/${encodeURIComponent(id)}/suspend`,
    { method: 'POST' },
  );
}

export function reactivateStudent(id: string): Promise<StudentAdminResponse> {
  return apiFetch<StudentAdminResponse>(
    `/api/v1/admin/students/${encodeURIComponent(id)}/reactivate`,
    { method: 'POST' },
  );
}

export function listRegistrations(
  status?: RegistrationStatus,
): Promise<RegistrationRequestResponse[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<RegistrationRequestResponse[]>(`/api/v1/admin/registrations${query}`);
}

export function reviewRegistration(
  id: string,
  decision: 'approve' | 'reject',
  notes: string,
): Promise<RegistrationRequestResponse> {
  return apiFetch<RegistrationRequestResponse>(
    `/api/v1/admin/registrations/${encodeURIComponent(id)}/${decision}`,
    { method: 'POST', body: { notes } },
  );
}

export function listAnnouncements(status?: ContentStatus): Promise<AnnouncementAdminResponse[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<AnnouncementAdminResponse[]>(`/api/v1/admin/announcements${query}`);
}

export function createAnnouncement(
  body: AnnouncementWriteRequest,
): Promise<AnnouncementAdminResponse> {
  return apiFetch<AnnouncementAdminResponse>('/api/v1/admin/announcements', {
    method: 'POST',
    body,
  });
}

export function updateAnnouncement(
  id: string,
  body: AnnouncementWriteRequest,
): Promise<AnnouncementAdminResponse> {
  return apiFetch<AnnouncementAdminResponse>(
    `/api/v1/admin/announcements/${encodeURIComponent(id)}`,
    { method: 'PUT', body },
  );
}

/** The only publication path: drafts and archives never take status from a payload. */
export function setAnnouncementStatus(
  id: string,
  status: ContentStatus,
): Promise<AnnouncementAdminResponse> {
  return apiFetch<AnnouncementAdminResponse>(
    `/api/v1/admin/announcements/${encodeURIComponent(id)}/status`,
    { method: 'POST', body: { status } },
  );
}

export function listAudit(
  entityType?: string,
  limit = 50,
): Promise<AuditEntryResponse[]> {
  const params = new URLSearchParams();
  if (entityType) params.set('entityType', entityType);
  params.set('limit', String(limit));
  return apiFetch<AuditEntryResponse[]>(`/api/v1/admin/audit?${params.toString()}`);
}

export function useAdminDashboard() {
  return useQuery({ queryKey: adminQueryKeys.dashboard(), queryFn: getAdminDashboard });
}

export function useAdminStudents(status?: UserStatus) {
  return useQuery({
    queryKey: adminQueryKeys.students(status),
    queryFn: () => listStudents(status),
  });
}

export function useAdminRegistrations(status?: RegistrationStatus) {
  return useQuery({
    queryKey: adminQueryKeys.registrations(status),
    queryFn: () => listRegistrations(status),
  });
}

export function useAdminAnnouncements(status?: ContentStatus) {
  return useQuery({
    queryKey: adminQueryKeys.announcements(status),
    queryFn: () => listAnnouncements(status),
  });
}

export function useAuditLog(entityType?: string, limit = 50) {
  return useQuery({
    queryKey: [...adminQueryKeys.audit(entityType), limit],
    queryFn: () => listAudit(entityType, limit),
  });
}

/* ---------------------------------- administration (Phase 9) mutations */

/** Suspends/reactivates also refresh the dashboard counts they move. */
function useAccountMutation(mutationFn: (id: string) => Promise<StudentAdminResponse>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    },
  });
}

export function useSuspendStudent() {
  return useAccountMutation(suspendStudent);
}

export function useReactivateStudent() {
  return useAccountMutation(reactivateStudent);
}

export function useReviewRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      notes,
    }: {
      id: string;
      decision: 'approve' | 'reject';
      notes: string;
    }) => reviewRegistration(id, decision, notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'registrations'] });
      // Approving creates an ACTIVE account, so the student list moves too.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AnnouncementWriteRequest }) =>
      updateAnnouncement(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    },
  });
}

export function useSetAnnouncementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) =>
      setAnnouncementStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    },
  });
}
