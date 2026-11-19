import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import type {
  AdminDashboardResponse,
  AnnouncementAdminResponse,
  AssessmentAdminResponse,
  AssessmentDetailAdminResponse,
  AuditEntryResponse,
  CourseAdminResponse,
  ImportRowDetailResponse,
  ImportRowResponse,
  ImportRunResponse,
  LessonAdminResponse,
  LessonDetailAdminResponse,
  ModuleAdminResponse,
  PathAdminResponse,
  RegistrationRequestResponse,
  StudentAdminResponse,
} from './adminApi';

function renderApp(initialPath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  // jsdom starts without cookies; mutations echo the double-submit CSRF cookie.
  document.cookie = 'XSRF-TOKEN=test-token-value; path=/';
});

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

const adminSession = {
  id: 'a-1',
  email: 'admin@example.com',
  fullName: 'Ada Admin',
  role: 'ADMIN',
  status: 'ACTIVE',
};

const pathSE: PathAdminResponse = {
  id: 'p1',
  slug: 'software-engineering',
  name: 'Software Engineering',
  summary: 'The broad core track.',
  description: null,
  accentColor: '#2563eb',
  displayOrder: 1,
  status: 'PUBLISHED',
  courseCount: 2,
  updatedAt: '2026-11-01T10:00:00Z',
};

const paths: PathAdminResponse[] = [pathSE];

const draftCourse: CourseAdminResponse = {
  id: 'c-draft',
  pathId: 'p1',
  pathSlug: 'software-engineering',
  pathName: 'Software Engineering',
  slug: 'frontend-engineering',
  title: 'Frontend Engineering',
  summary: 'Professional frontend development with React.',
  description: null,
  level: 'INTERMEDIATE',
  estimatedHours: 12,
  displayOrder: 1,
  status: 'DRAFT',
  sourceRepository: null,
  sourcePath: '06-FRONTEND-ENGINEERING',
  moduleCount: 1,
  lessonCount: 2,
  publishedModuleCount: 0,
  publishedLessonCount: 1,
  updatedAt: '2026-11-02T10:00:00Z',
};

const publishedCourse: CourseAdminResponse = {
  id: 'c-pub',
  pathId: 'p1',
  pathSlug: 'software-engineering',
  pathName: 'Software Engineering',
  slug: 'computer-foundations',
  title: 'Computer Foundations',
  summary: 'How machines actually work.',
  description: null,
  level: 'BEGINNER',
  estimatedHours: 8,
  displayOrder: 2,
  status: 'PUBLISHED',
  sourceRepository: null,
  sourcePath: null,
  moduleCount: 2,
  lessonCount: 6,
  publishedModuleCount: 2,
  publishedLessonCount: 6,
  updatedAt: '2026-11-03T10:00:00Z',
};

const courses: CourseAdminResponse[] = [draftCourse, publishedCourse];

const moduleOne: ModuleAdminResponse = {
  id: 'm1',
  courseId: 'c-draft',
  title: 'Module One',
  summary: 'Orientation and setup.',
  displayOrder: 1,
  status: 'DRAFT',
  sourcePath: '06-FRONTEND-ENGINEERING/01-orientation',
  lessonCount: 2,
  publishedLessonCount: 0,
  updatedAt: '2026-11-04T10:00:00Z',
};

const modules: ModuleAdminResponse[] = [moduleOne];

const lessonOne: LessonAdminResponse = {
  id: 'l1',
  moduleId: 'm1',
  slug: 'variables-and-types',
  title: 'Variables and types',
  summary: 'Declarations and bindings.',
  displayOrder: 1,
  status: 'DRAFT',
  editedByAdmin: true,
  publishedAt: null,
  sourcePath: '06-FRONTEND-ENGINEERING/01-orientation/variables.md',
  updatedAt: '2026-11-05T10:00:00Z',
};

const lessons: LessonAdminResponse[] = [lessonOne];

const lessonDetail: LessonDetailAdminResponse = {
  ...lessonOne,
  bodyMarkdown: '# Variables\n\nInitial body.',
  contentHash: 'hash-academy',
  sourceRepository: 'https://github.com/felix202422/CodePath-Masterclass',
  sourceCommit: '62afa4143c26c036169429810fe8bc0b4e9a4de6',
  sourceHash: 'hash-source',
  createdAt: '2026-11-01T08:00:00Z',
};

/* Assessment fixtures: one editable draft with questions and no attempts, and
   one published assessment locked by three student attempts. */
const assessmentRow: AssessmentAdminResponse = {
  id: 'as-1',
  courseId: 'c-draft',
  moduleId: 'm1',
  title: 'Orientation quiz',
  description: 'Checks the basics from module one.',
  passScorePercent: 70,
  maxAttempts: 2,
  timeLimitMinutes: 15,
  displayOrder: 1,
  status: 'DRAFT',
  questionCount: 2,
  attemptCount: 0,
  updatedAt: '2026-11-06T10:00:00Z',
};

const lockedAssessmentRow: AssessmentAdminResponse = {
  id: 'as-2',
  courseId: 'c-draft',
  moduleId: null,
  title: 'Final assessment',
  description: null,
  passScorePercent: 80,
  maxAttempts: 1,
  timeLimitMinutes: null,
  displayOrder: 2,
  status: 'PUBLISHED',
  questionCount: 1,
  attemptCount: 3,
  updatedAt: '2026-11-07T10:00:00Z',
};

const assessments: AssessmentAdminResponse[] = [assessmentRow, lockedAssessmentRow];

const assessmentDetail: AssessmentDetailAdminResponse = {
  ...assessmentRow,
  questions: [
    {
      id: 'q1',
      questionType: 'MULTIPLE_CHOICE',
      prompt: 'Which command compiles a Java file?',
      explanation: 'javac compiles; java runs bytecode.',
      correctText: null,
      points: 2,
      displayOrder: 1,
      options: [
        { id: 'o1', optionText: 'javac', correct: true, displayOrder: 1 },
        { id: 'o2', optionText: 'java', correct: false, displayOrder: 2 },
        { id: 'o3', optionText: 'jar', correct: false, displayOrder: 3 },
      ],
    },
    {
      id: 'q2',
      questionType: 'SHORT_ANSWER',
      prompt: 'What does CI stand for?',
      explanation: null,
      correctText: 'continuous integration',
      points: 3,
      displayOrder: 2,
      options: [],
    },
  ],
};

const lockedAssessmentDetail: AssessmentDetailAdminResponse = {
  ...lockedAssessmentRow,
  questions: [
    {
      id: 'q3',
      questionType: 'MULTIPLE_CHOICE',
      prompt: 'What does JVM stand for?',
      explanation: null,
      correctText: null,
      points: 5,
      displayOrder: 1,
      options: [
        { id: 'o4', optionText: 'Java Virtual Machine', correct: true, displayOrder: 1 },
        { id: 'o5', optionText: 'Java Variable Memory', correct: false, displayOrder: 2 },
      ],
    },
  ],
};

const importSource = {
  repository: 'https://github.com/felix202422/CodePath-Masterclass',
  localPathConfigured: true,
  localPath: 'C:/curriculum/CodePath-Masterclass',
  commitPin: '62afa4143c26',
};

const importedRow: ImportRowResponse = {
  id: 'imp-imported',
  sourceRepository: 'https://github.com/felix202422/CodePath-Masterclass',
  sourcePath: '06-FRONTEND-ENGINEERING/variables.md',
  sourceCommit: '62afa4143c26c036169429810fe8bc0b4e9a4de6',
  sourceHash: 'hash-source',
  status: 'IMPORTED',
  message: null,
  targetLessonId: 'l1',
  targetLessonTitle: 'Variables and types',
  importedById: 'a-1',
  createdAt: '2026-11-10T09:00:00Z',
  resolvedAt: null,
  hasProposal: false,
};

const conflictRow: ImportRowResponse = {
  id: 'imp-conflict',
  sourceRepository: 'https://github.com/felix202422/CodePath-Masterclass',
  sourcePath: '04-JAVA-PROGRAMMING/objects.md',
  sourceCommit: 'ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12',
  sourceHash: 'hash-source-2',
  status: 'CONFLICT',
  message: 'Both versions changed since the last import.',
  targetLessonId: 'l2',
  targetLessonTitle: 'Objects and classes',
  importedById: null,
  createdAt: '2026-11-11T09:00:00Z',
  resolvedAt: null,
  hasProposal: true,
};

const importRows: ImportRowResponse[] = [importedRow, conflictRow];

const conflictDetail: ImportRowDetailResponse = {
  ...conflictRow,
  currentBody: '# Objects\n\nAcademy edited text that diverged from the source.',
  currentContentHash: 'hash-academy-2',
  proposedBody: '# Objects\n\nProposed source text staged by the importer.',
};

const importRun: ImportRunResponse = {
  mode: 'LOCAL',
  repository: 'https://github.com/felix202422/CodePath-Masterclass',
  commit: '62afa4143c26c036169429810fe8bc0b4e9a4de6',
  durationMs: 4210,
  subjectsScanned: 18,
  unmappedSubjects: ['99-MISC'],
  lessonsCreated: 12,
  lessonsUpdated: 5,
  lessonsUnchanged: 101,
  conflictsStaged: 3,
  failures: 1,
  mediaFilesStored: 7,
  warnings: ['Skipped unknown front-matter field "level".'],
};

/* Phase 9 administration fixtures: live dashboard counts, the registration
   queue, student accounts with mixed lifecycle states, announcements across
   the publication lifecycle, and append-only audit rows. */

const dashboard: AdminDashboardResponse = {
  pendingRegistrations: 2,
  pendingEnrollments: 1,
  activeStudents: 4,
  suspendedStudents: 1,
  publishedCourses: 1,
  publishedPaths: 1,
  publishedAnnouncements: 1,
  recentAudit: [],
};

const activeStudent: StudentAdminResponse = {
  id: 'stu-active',
  email: 'ada@example.test',
  fullName: 'Ada Student',
  status: 'ACTIVE',
  interests: 'Java',
  createdAt: '2026-11-01T09:00:00Z',
};

const suspendedStudent: StudentAdminResponse = {
  id: 'stu-suspended',
  email: 'sid@example.test',
  fullName: 'Sid Suspended',
  status: 'SUSPENDED',
  interests: null,
  createdAt: '2026-11-02T09:00:00Z',
};

const students: StudentAdminResponse[] = [activeStudent, suspendedStudent];

const pendingRegistration: RegistrationRequestResponse = {
  id: 'reg-pending',
  userId: 'stu-new',
  email: 'new@example.test',
  fullName: 'New Student',
  status: 'PENDING',
  interests: 'Frontend',
  createdAt: '2026-11-10T09:00:00Z',
  reviewNotes: null,
  reviewedAt: null,
};

const reviewedRegistration: RegistrationRequestResponse = {
  id: 'reg-approved',
  userId: 'stu-done',
  email: 'done@example.test',
  fullName: 'Done Student',
  status: 'APPROVED',
  interests: null,
  createdAt: '2026-11-08T09:00:00Z',
  reviewNotes: 'Welcome aboard.',
  reviewedAt: '2026-11-09T10:00:00Z',
};

const registrations: RegistrationRequestResponse[] = [pendingRegistration, reviewedRegistration];

const draftAnnouncement: AnnouncementAdminResponse = {
  id: 'ann-draft',
  title: 'Draft notice',
  bodyMarkdown: 'Still being written.',
  audience: 'STUDENTS',
  status: 'DRAFT',
  courseId: null,
  courseTitle: null,
  createdByEmail: 'admin@example.com',
  publishedAt: null,
  createdAt: '2026-11-12T09:00:00Z',
  updatedAt: '2026-11-12T09:00:00Z',
};

const publishedAnnouncement: AnnouncementAdminResponse = {
  id: 'ann-published',
  title: 'Maintenance window',
  bodyMarkdown: 'The academy will be read-only on Sunday.',
  audience: 'ALL',
  status: 'PUBLISHED',
  courseId: 'c-pub',
  courseTitle: 'Computer Foundations',
  createdByEmail: 'admin@example.com',
  publishedAt: '2026-11-13T10:00:00Z',
  createdAt: '2026-11-12T11:00:00Z',
  updatedAt: '2026-11-13T10:00:00Z',
};

const announcements: AnnouncementAdminResponse[] = [draftAnnouncement, publishedAnnouncement];

const auditEntries: AuditEntryResponse[] = [
  {
    id: 'audit-1',
    action: 'POST /api/v1/admin/students/{id}/suspend',
    entityType: 'students',
    entityId: 'stu-suspended',
    details: 'status=200',
    ipAddress: '127.0.0.1',
    actorId: 'a-1',
    actorEmail: 'admin@example.com',
    actorName: 'Ada Admin',
    createdAt: '2026-11-14T12:00:00Z',
  },
  {
    id: 'audit-2',
    action: 'POST /api/v1/admin/announcements',
    entityType: 'announcements',
    entityId: null,
    details: 'status=201',
    ipAddress: '127.0.0.1',
    actorId: 'a-1',
    actorEmail: 'admin@example.com',
    actorName: 'Ada Admin',
    createdAt: '2026-11-14T11:00:00Z',
  },
];

interface RecordedCall {
  url: string;
  method: string;
  body: unknown;
}

interface MockOptions {
  /** Answer course status changes with a 409 publish-cascade violation. */
  statusConflict?: boolean;
}

/**
 * Routes the admin endpoints to fixtures (URL + method), records every call so
 * tests can assert exact request bodies, and answers the session probe with an
 * administrator.
 */
function mockAdminApi(options: MockOptions = {}) {
  const calls: RecordedCall[] = [];

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body
      ? (JSON.parse(String(init.body)) as Record<string, unknown>)
      : undefined;
    calls.push({ url: url.pathname + url.search, method, body });
    const path = url.pathname;
    const match = (pattern: RegExp) => path.match(pattern);

    if (path === '/api/v1/auth/me') return jsonResponse(adminSession);
    if (path === '/api/v1/health') {
      return jsonResponse({ status: 'UP', service: 'codepath-academy' });
    }

    // Learning paths.
    if (path === '/api/v1/admin/paths') {
      if (method === 'POST') return jsonResponse({ ...pathSE, ...body, id: 'p-new' }, 201);
      return jsonResponse(paths);
    }
    const pathStatus = match(/^\/api\/v1\/admin\/paths\/([^/]+)\/status$/);
    if (pathStatus && method === 'POST') {
      const found = paths.find((item) => item.id === (pathStatus[1] ?? ''));
      return found ? jsonResponse({ ...found, status: body?.status }) : jsonResponse(notFound(), 404);
    }
    const pathPut = match(/^\/api\/v1\/admin\/paths\/([^/]+)$/);
    if (pathPut && method === 'PUT') {
      const found = paths.find((item) => item.id === (pathPut[1] ?? ''));
      return found ? jsonResponse({ ...found, ...body }) : jsonResponse(notFound(), 404);
    }

    // Courses.
    if (path === '/api/v1/admin/courses') {
      if (method === 'POST') return jsonResponse({ ...draftCourse, ...body, id: 'c-new' }, 201);
      const pathId = url.searchParams.get('pathId');
      return jsonResponse(
        pathId ? courses.filter((course) => course.pathId === pathId) : courses,
      );
    }
    const courseStatus = match(/^\/api\/v1\/admin\/courses\/([^/]+)\/status$/);
    if (courseStatus && method === 'POST') {
      const status = body?.status;
      if (options.statusConflict && status === 'PUBLISHED') {
        return jsonResponse(
          { message: 'Publishing this course requires its learning path to be published first.' },
          409,
        );
      }
      const found = courses.find((course) => course.id === (courseStatus[1] ?? ''));
      return found ? jsonResponse({ ...found, status }) : jsonResponse(notFound(), 404);
    }
    const createModule = match(/^\/api\/v1\/admin\/courses\/([^/]+)\/modules$/);
    if (createModule && method === 'POST') {
      return jsonResponse({ ...moduleOne, ...body, id: 'm-new' }, 201);
    }
    const courseDetail = match(/^\/api\/v1\/admin\/courses\/([^/]+)$/);
    if (courseDetail && method === 'GET') {
      const found = courses.find((course) => course.id === (courseDetail[1] ?? ''));
      return found
        ? jsonResponse({ course: found, modules })
        : jsonResponse(notFound(), 404);
    }

    // Modules.
    const moduleStatus = match(/^\/api\/v1\/admin\/modules\/([^/]+)\/status$/);
    if (moduleStatus && method === 'POST') {
      return jsonResponse({ ...moduleOne, status: body?.status });
    }
    const moduleLessons = match(/^\/api\/v1\/admin\/modules\/([^/]+)\/lessons$/);
    if (moduleLessons && method === 'GET') return jsonResponse(lessons);
    if (moduleLessons && method === 'POST') {
      return jsonResponse({ ...lessonDetail, ...body, id: 'l-new' }, 201);
    }
    const modulePut = match(/^\/api\/v1\/admin\/modules\/([^/]+)$/);
    if (modulePut && method === 'PUT') {
      return jsonResponse({ ...moduleOne, ...body });
    }
    if (modulePut && method === 'GET') return jsonResponse(moduleOne);

    // Lessons.
    const lessonStatus = match(/^\/api\/v1\/admin\/lessons\/([^/]+)\/status$/);
    if (lessonStatus && method === 'POST') {
      return jsonResponse({ ...lessonDetail, status: body?.status });
    }
    const lessonRoute = match(/^\/api\/v1\/admin\/lessons\/([^/]+)$/);
    if (lessonRoute && method === 'PUT') {
      return jsonResponse({ ...lessonDetail, ...body });
    }
    if (lessonRoute && method === 'GET') return jsonResponse(lessonDetail);

    // Assessments.
    const courseAssessments = match(/^\/api\/v1\/admin\/courses\/([^/]+)\/assessments$/);
    if (courseAssessments && method === 'GET') return jsonResponse(assessments);
    if (courseAssessments && method === 'POST') {
      const questions = body?.questions;
      const count = Array.isArray(questions) ? questions.length : 0;
      return jsonResponse({ ...assessmentRow, ...body, id: 'as-new', questionCount: count }, 201);
    }
    const assessmentStatus = match(/^\/api\/v1\/admin\/assessments\/([^/]+)\/status$/);
    if (assessmentStatus && method === 'POST') {
      const found = assessments.find((row) => row.id === (assessmentStatus[1] ?? ''));
      return found
        ? jsonResponse({ ...found, status: body?.status })
        : jsonResponse(notFound(), 404);
    }
    const assessmentRoute = match(/^\/api\/v1\/admin\/assessments\/([^/]+)$/);
    if (assessmentRoute && method === 'GET') {
      const id = assessmentRoute[1] ?? '';
      if (id === assessmentRow.id) return jsonResponse(assessmentDetail);
      if (id === lockedAssessmentRow.id) return jsonResponse(lockedAssessmentDetail);
      return jsonResponse(notFound(), 404);
    }
    if (assessmentRoute && method === 'PUT') {
      const found = assessments.find((row) => row.id === (assessmentRoute[1] ?? ''));
      return found ? jsonResponse({ ...found, ...body }) : jsonResponse(notFound(), 404);
    }
    if (assessmentRoute && method === 'DELETE') {
      const found = assessments.find((row) => row.id === (assessmentRoute[1] ?? ''));
      if (!found) return jsonResponse(notFound(), 404);
      if (found.attemptCount > 0) {
        return jsonResponse(
          { message: 'Students have attempted this assessment — archive it instead of deleting.' },
          409,
        );
      }
      return new Response(null, { status: 204 });
    }

    // Content import.
    if (path === '/api/v1/admin/content/import-source') return jsonResponse(importSource);
    if (path === '/api/v1/admin/content/imports') {
      if (method === 'POST') return jsonResponse(importRun);
      const status = url.searchParams.get('status');
      return jsonResponse(
        status ? importRows.filter((row) => row.status === status) : importRows,
      );
    }
    const importAction = match(
      /^\/api\/v1\/admin\/content\/imports\/([^/]+)\/(accept|discard)$/,
    );
    if (importAction && method === 'POST') {
      const found = importRows.find((row) => row.id === (importAction[1] ?? ''));
      return found
        ? jsonResponse({ ...found, status: 'IMPORTED', resolvedAt: '2026-11-11T10:00:00Z' })
        : jsonResponse(notFound(), 404);
    }
    const importDetail = match(/^\/api\/v1\/admin\/content\/imports\/([^/]+)$/);
    if (importDetail && method === 'GET') {
      const found = importRows.find((row) => row.id === (importDetail[1] ?? ''));
      return found?.id === conflictRow.id
        ? jsonResponse(conflictDetail)
        : jsonResponse(notFound(), 404);
    }

    // Phase 9: administration dashboard, student accounts, registration review.
    if (path === '/api/v1/admin/dashboard') {
      return jsonResponse({
        ...dashboard,
        recentAudit: auditEntries,
      });
    }
    if (path === '/api/v1/admin/students') {
      const status = url.searchParams.get('status');
      return jsonResponse(
        status ? students.filter((row) => row.status === status) : students,
      );
    }
    const studentAction = match(
      /^\/api\/v1\/admin\/students\/([^/]+)\/(suspend|reactivate)$/,
    );
    if (studentAction && method === 'POST') {
      const found = students.find((row) => row.id === (studentAction[1] ?? ''));
      if (!found) return jsonResponse(notFound(), 404);
      const action = studentAction[2];
      if (action === 'suspend' && found.status !== 'ACTIVE') {
        return jsonResponse({ message: 'Only active accounts can be suspended.' }, 409);
      }
      if (action === 'reactivate' && found.status !== 'SUSPENDED') {
        return jsonResponse({ message: 'Only suspended accounts can be reactivated.' }, 409);
      }
      return jsonResponse({
        ...found,
        status: action === 'suspend' ? 'SUSPENDED' : 'ACTIVE',
      });
    }
    if (path === '/api/v1/admin/registrations') {
      const status = url.searchParams.get('status');
      return jsonResponse(
        status ? registrations.filter((row) => row.status === status) : registrations,
      );
    }
    const registrationReview = match(
      /^\/api\/v1\/admin\/registrations\/([^/]+)\/(approve|reject)$/,
    );
    if (registrationReview && method === 'POST') {
      const found = registrations.find((row) => row.id === (registrationReview[1] ?? ''));
      if (!found) return jsonResponse(notFound(), 404);
      const decision = registrationReview[2];
      return jsonResponse({
        ...found,
        status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewNotes: typeof body?.notes === 'string' ? body.notes : null,
        reviewedAt: '2026-11-15T10:00:00Z',
      });
    }

    // Phase 9: announcements (status only ever moves through /status).
    if (path === '/api/v1/admin/announcements') {
      if (method === 'POST') {
        return jsonResponse(
          { ...draftAnnouncement, ...body, id: 'ann-new', courseId: body?.courseId ?? null },
          201,
        );
      }
      const status = url.searchParams.get('status');
      return jsonResponse(
        status ? announcements.filter((row) => row.status === status) : announcements,
      );
    }
    const announcementStatus = match(
      /^\/api\/v1\/admin\/announcements\/([^/]+)\/status$/,
    );
    if (announcementStatus && method === 'POST') {
      const found = announcements.find((row) => row.id === (announcementStatus[1] ?? ''));
      if (!found) return jsonResponse(notFound(), 404);
      const status = body?.status;
      return jsonResponse({
        ...found,
        status,
        publishedAt: status === 'PUBLISHED' ? '2026-11-15T11:00:00Z' : null,
      });
    }
    const announcementPut = match(/^\/api\/v1\/admin\/announcements\/([^/]+)$/);
    if (announcementPut && method === 'PUT') {
      const found = announcements.find((row) => row.id === (announcementPut[1] ?? ''));
      return found ? jsonResponse({ ...found, ...body }) : jsonResponse(notFound(), 404);
    }

    // Phase 9: append-only audit trail.
    if (path === '/api/v1/admin/audit') {
      const entityType = url.searchParams.get('entityType');
      return jsonResponse(
        entityType ? auditEntries.filter((row) => row.entityType === entityType) : auditEntries,
      );
    }

    return jsonResponse({ message: 'Not found' }, 404);
  });

  return calls;
}

function notFound() {
  return { message: 'Not found.' };
}

describe('AdminCoursesPage', () => {
  it(
    'renders paths and courses, and creates a learning path through the modal',
    async () => {
      const calls = mockAdminApi();
      const user = userEvent.setup();

      renderApp('/admin/courses');

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Courses' }),
      ).toBeInTheDocument();
      expect(await screen.findByRole('heading', { name: 'Learning paths' })).toBeInTheDocument();
      // Path name appears in both the paths table and the course rows.
      expect((await screen.findAllByText('Software Engineering')).length).toBeGreaterThan(0);
      expect(screen.getByText('Frontend Engineering')).toBeInTheDocument();
      expect(screen.getByText('Computer Foundations')).toBeInTheDocument();
      expect(screen.getByText('1/2 published lessons')).toBeInTheDocument();
      expect(screen.getByText('DRAFT')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'New path' }));

      const dialog = await screen.findByRole('dialog', { name: 'New learning path' });
      await user.type(within(dialog).getByLabelText(/^Name/), 'Data Science');
      await user.type(within(dialog).getByLabelText(/^Slug/), 'data-science');
      await user.type(
        within(dialog).getByLabelText(/^Summary/),
        'Analytical thinking with real datasets.',
      );
      await user.click(within(dialog).getByRole('button', { name: 'Create path' }));

      await waitFor(() => {
        const post = calls.find(
          (call) => call.method === 'POST' && call.url === '/api/v1/admin/paths',
        );
        expect(post).toBeDefined();
        expect(post?.body).toEqual({
          slug: 'data-science',
          name: 'Data Science',
          summary: 'Analytical thinking with real datasets.',
          description: null,
          accentColor: null,
          displayOrder: null,
        });
      });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    },
    30000,
  );

  it('publishes a draft course with a /status POST carrying the target status', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/courses');

    const title = await screen.findByText('Frontend Engineering');
    const row = title.closest('tr');
    expect(row).not.toBeNull();

    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      const post = calls.find(
        (call) =>
          call.method === 'POST' && call.url === '/api/v1/admin/courses/c-draft/status',
      );
      expect(post).toBeDefined();
      expect(post?.body).toEqual({ status: 'PUBLISHED' });
    });
  });

  it('surfaces a 409 publish-cascade violation as a danger alert', async () => {
    mockAdminApi({ statusConflict: true });
    const user = userEvent.setup();

    renderApp('/admin/courses');

    const title = await screen.findByText('Frontend Engineering');
    const row = title.closest('tr');

    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Publish' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Publishing this course requires its learning path to be published first.',
    );
  });
});

describe('AdminCourseDetailPage', () => {
  it('lists modules, expands to lessons, and saves a lesson edit via PUT', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/courses/c-draft');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Frontend Engineering' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Module One' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lessons' }));

    expect(await screen.findByText('Variables and types')).toBeInTheDocument();
    expect(screen.getByText('Edited')).toBeInTheDocument();
    expect(screen.getByText('Imported')).toBeInTheDocument();

    const lessonRow = screen.getByText('Variables and types').closest('li');
    expect(lessonRow).not.toBeNull();
    await user.click(within(lessonRow as HTMLElement).getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit lesson' });
    await waitFor(() =>
      expect(within(dialog).getByLabelText(/^Body/)).toHaveValue('# Variables\n\nInitial body.'),
    );

    const titleInput = within(dialog).getByLabelText(/^Title/);
    await user.clear(titleInput);
    await user.type(titleInput, 'Variables, types and values');
    await user.click(within(dialog).getByRole('button', { name: 'Save lesson' }));

    await waitFor(() => {
      const put = calls.find(
        (call) => call.method === 'PUT' && call.url === '/api/v1/admin/lessons/l1',
      );
      expect(put).toBeDefined();
      expect(put?.body).toEqual({
        slug: 'variables-and-types',
        title: 'Variables, types and values',
        summary: 'Declarations and bindings.',
        bodyMarkdown: '# Variables\n\nInitial body.',
      });
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('AdminContentPage', () => {
  it('renders the source configuration and the import history rows', async () => {
    mockAdminApi();

    renderApp('/admin/content');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Content import' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('https://github.com/felix202422/CodePath-Masterclass'),
    ).toBeInTheDocument();
    expect(screen.getByText('C:/curriculum/CodePath-Masterclass')).toBeInTheDocument();
    expect(screen.getByText('62afa4143c26')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Conflicts' })).toBeInTheDocument();
    // The conflict path renders in both the review queue and the history table.
    expect(
      screen.getAllByText('04-JAVA-PROGRAMMING/objects.md').length,
    ).toBeGreaterThan(0);

    expect(await screen.findByRole('heading', { name: 'Recent imports' })).toBeInTheDocument();
    expect(await screen.findByText('06-FRONTEND-ENGINEERING/variables.md')).toBeInTheDocument();
    expect(screen.getByText('62afa41')).toBeInTheDocument();
    expect(screen.getByText('IMPORTED')).toBeInTheDocument();
    expect(screen.getAllByText('CONFLICT').length).toBeGreaterThan(0);
  });

  it('runs an import and shows the numbers the server returned', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/content');

    await user.click(await screen.findByRole('button', { name: 'Run import' }));

    expect(await screen.findByRole('heading', { name: /Import finished/ })).toBeInTheDocument();
    expect(screen.getByText('Lessons created')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Lessons updated')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Failures')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/Unmapped subjects/)).toBeInTheDocument();

    const post = calls.find(
      (call) => call.method === 'POST' && call.url === '/api/v1/admin/content/imports',
    );
    expect(post).toBeDefined();
    // Auto mode omits the mode key so the server picks the source.
    expect(post?.body).toEqual({});
  });

  it('opens a conflict review and accepts the source version', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/content');

    await user.click(await screen.findByRole('button', { name: 'Review' }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Review import conflict',
    });
    expect(dialog).toHaveTextContent('Academy version (edited)');
    expect(dialog).toHaveTextContent('Proposed source version');
    expect(dialog).toHaveTextContent('Academy edited text that diverged from the source.');
    expect(dialog).toHaveTextContent('Proposed source text staged by the importer.');
    expect(dialog).toHaveTextContent('Both versions changed since the last import.');

    await user.click(within(dialog).getByRole('button', { name: 'Accept source version' }));

    await waitFor(() => {
      const post = calls.find(
        (call) =>
          call.method === 'POST' &&
          call.url === '/api/v1/admin/content/imports/imp-conflict/accept',
      );
      expect(post).toBeDefined();
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

/** First match or a clear failure — indexes are possibly-undefined here. */
function firstMatch<T>(matches: T[], label: string): T {
  const first = matches[0];
  if (first === undefined) throw new Error(`Expected at least one ${label}.`);
  return first;
}

describe('AssessmentsSection', () => {
  it('lists real counts, publishes, and deletes only after an inline confirm', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/courses/c-draft');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Frontend Engineering' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Assessments' })).toBeInTheDocument();
    expect(await screen.findByText('Orientation quiz')).toBeInTheDocument();
    expect(screen.getByText('Final assessment')).toBeInTheDocument();

    // Counts, rules and module labels come from the server rows.
    expect(screen.getByText(/2 questions · 0 attempts · pass at 70%/)).toBeInTheDocument();
    expect(screen.getByText(/1 question · 3 attempts · pass at 80%/)).toBeInTheDocument();
    expect(screen.getByText('Questions locked')).toBeInTheDocument();
    expect(screen.getByText('Module: Module One')).toBeInTheDocument();
    expect(screen.getByText('Course-level')).toBeInTheDocument();

    // The attempted assessment can never be deleted — archive instead.
    const lockedRow = screen.getByText('Final assessment').closest('li');
    expect(lockedRow).not.toBeNull();
    expect(
      within(lockedRow as HTMLElement).getByRole('button', { name: 'Delete' }),
    ).toBeDisabled();

    // The draft publishes through the /status POST carrying the target status.
    await user.click(
      within(screen.getByText('Orientation quiz').closest('li') as HTMLElement).getByRole(
        'button',
        { name: 'Publish' },
      ),
    );
    await waitFor(() => {
      const post = calls.find(
        (call) =>
          call.method === 'POST' &&
          call.url === '/api/v1/admin/assessments/as-1/status',
      );
      expect(post).toBeDefined();
      expect(post?.body).toEqual({ status: 'PUBLISHED' });
    });

    // Deleting needs a second, explicit click inside the row.
    const row = screen.getByText('Orientation quiz').closest('li') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Delete' }));
    expect(within(row).getByText('Delete this assessment?')).toBeInTheDocument();
    expect(
      calls.some((call) => call.method === 'DELETE'),
    ).toBe(false);
    await user.click(within(row).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      const del = calls.find(
        (call) => call.method === 'DELETE' && call.url === '/api/v1/admin/assessments/as-1',
      );
      expect(del).toBeDefined();
    });
  }, 30000);

  it('creates an assessment with the authored question set in the POST body', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/courses/c-draft');

    await user.click(await screen.findByRole('button', { name: 'Add assessment' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add assessment' });

    await user.type(within(dialog).getByLabelText(/^Title/), 'Midterm check');
    await user.type(within(dialog).getByLabelText(/^Time limit/), '10');
    await user.type(within(dialog).getByLabelText(/^Display order/), '3');

    // Author one multiple-choice question: prompt, two options, one correct.
    await user.click(within(dialog).getByRole('button', { name: 'Add question' }));
    await user.type(
      within(dialog).getByLabelText(/^Prompt/),
      'Which command compiles a Java file?',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Remove option 4' }));
    await user.click(within(dialog).getByRole('button', { name: 'Remove option 3' }));
    await user.type(within(dialog).getByLabelText(/^Option 1/), 'javac');
    await user.type(within(dialog).getByLabelText(/^Option 2/), 'java');
    await user.click(
      firstMatch(
        within(dialog).getAllByRole('radio', { name: 'Correct' }),
        'correct-answer radio',
      ),
    );

    await user.click(within(dialog).getByRole('button', { name: 'Create assessment' }));

    await waitFor(() => {
      const post = calls.find(
        (call) =>
          call.method === 'POST' && call.url === '/api/v1/admin/courses/c-draft/assessments',
      );
      expect(post).toBeDefined();
      expect(post?.body).toEqual({
        title: 'Midterm check',
        description: null,
        passScorePercent: 70,
        maxAttempts: 1,
        timeLimitMinutes: 10,
        moduleId: null,
        questions: [
          {
            questionType: 'MULTIPLE_CHOICE',
            prompt: 'Which command compiles a Java file?',
            explanation: null,
            correctText: null,
            points: 1,
            options: [
              { optionText: 'javac', isCorrect: true },
              { optionText: 'java', isCorrect: false },
            ],
          },
        ],
        displayOrder: 3,
      });
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  }, 30000);

  it('blocks a save whose question set the server would reject', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/courses/c-draft');

    await user.click(await screen.findByRole('button', { name: 'Add assessment' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add assessment' });

    // Metadata is valid; the new question is not, so nothing may leave the page.
    await user.type(within(dialog).getByLabelText(/^Title/), 'Incomplete quiz');
    await user.click(within(dialog).getByRole('button', { name: 'Add question' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create assessment' }));

    expect(await within(dialog).findByText('Enter the question prompt.')).toBeInTheDocument();
    expect(within(dialog).getByText('Mark exactly one option as correct.')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Enter the option text.')).toHaveLength(4);

    expect(calls.some((call) => call.method === 'POST')).toBe(false);
    expect(screen.getByRole('dialog', { name: 'Add assessment' })).toBeInTheDocument();
  }, 30000);

  it('saves settings on a locked assessment without sending its questions', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/courses/c-draft');

    const lockedRow = (await screen.findByText('Final assessment')).closest('li') as HTMLElement;
    await user.click(within(lockedRow).getByRole('button', { name: 'Edit' }));

    // The dialog swaps from a loading shell to the loaded form, so wait for
    // the form's own content before grabbing a stable handle on it.
    await screen.findByLabelText(/^Pass score/);
    const dialog = screen.getByRole('dialog', { name: 'Edit assessment' });
    expect(within(dialog).getByDisplayValue('Final assessment')).toBeInTheDocument();

    // Locked set renders read-only, answer key included, with no add control.
    expect(within(dialog).getByText(/so its questions are locked/)).toBeInTheDocument();
    expect(within(dialog).getByText('What does JVM stand for?')).toBeInTheDocument();
    expect(within(dialog).getByText('Java Virtual Machine')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Add question' })).not.toBeInTheDocument();

    // Settings stay editable: raise the pass mark and save.
    const passInput = within(dialog).getByLabelText(/^Pass score/);
    await user.clear(passInput);
    await user.type(passInput, '85');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      const put = calls.find(
        (call) => call.method === 'PUT' && call.url === '/api/v1/admin/assessments/as-2',
      );
      expect(put).toBeDefined();
      expect(put?.body).toEqual({
        title: 'Final assessment',
        description: null,
        passScorePercent: 85,
        maxAttempts: 1,
        timeLimitMinutes: null,
        moduleId: null,
      });
      // Replace-all would 409 here — settings-only saves omit the key.
      expect(put?.body).not.toHaveProperty('questions');
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  }, 30000);
});

describe('AdminDashboardPage', () => {
  it('renders live queue/account counts and recent audit activity', async () => {
    mockAdminApi();

    renderApp('/admin');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeInTheDocument();

    // Every number comes from the dashboard endpoint — no placeholder values.
    const pendingRegistrations = await screen.findByRole('link', {
      name: /Pending registrations/,
    });
    expect(pendingRegistrations).toHaveTextContent('Pending registrations');
    expect(pendingRegistrations).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: /Pending enrollments/ })).toHaveTextContent('1');
    expect(screen.getByRole('link', { name: /Active students/ })).toHaveTextContent('4');
    expect(screen.getByRole('link', { name: /Suspended students/ })).toHaveTextContent('1');
    expect(screen.getByRole('link', { name: /Published courses/ })).toHaveTextContent('1');
    expect(screen.getByRole('link', { name: /Published announcements/ })).toHaveTextContent('1');

    // Recent activity lists the audit rows the endpoint returned.
    expect(
      await screen.findByText('POST /api/v1/admin/students/{id}/suspend'),
    ).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View full audit log' })).toBeInTheDocument();
  });
});

describe('AdminStudentsPage', () => {
  it('approves a registration with the reviewer note the admin typed', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/students');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Students' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('New Student')).toBeInTheDocument();
    expect(screen.getByText('new@example.test')).toBeInTheDocument();

    // The reviewed request is not in the default PENDING filter.
    expect(screen.queryByText('Done Student')).not.toBeInTheDocument();

    const note = screen.getByLabelText(/^Review note for New Student/);
    await user.type(note, 'Verified via waitlist.');

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      const post = calls.find(
        (call) =>
          call.method === 'POST' &&
          call.url === '/api/v1/admin/registrations/reg-pending/approve',
      );
      expect(post).toBeDefined();
      expect(post?.body).toEqual({ notes: 'Verified via waitlist.' });
    });
  }, 30000);

  it('suspends an active account and reactivates a suspended one', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/students');

    const suspendRow = (await screen.findByText('Ada Student')).closest('tr');
    expect(suspendRow).not.toBeNull();
    const reactivateRow = (await screen.findByText('Sid Suspended')).closest('tr');
    expect(reactivateRow).not.toBeNull();

    // Only legal transitions are offered: active → suspend, suspended → reactivate.
    await user.click(within(suspendRow as HTMLElement).getByRole('button', { name: 'Suspend' }));
    await waitFor(() => {
      expect(
        calls.some(
          (call) =>
            call.method === 'POST' &&
            call.url === '/api/v1/admin/students/stu-active/suspend',
        ),
      ).toBe(true);
    });

    await user.click(
      within(reactivateRow as HTMLElement).getByRole('button', { name: 'Reactivate' }),
    );
    await waitFor(() => {
      expect(
        calls.some(
          (call) =>
            call.method === 'POST' &&
            call.url === '/api/v1/admin/students/stu-suspended/reactivate',
        ),
      ).toBe(true);
    });

    // Neither action invents a request body — the server resolves the actor.
    const suspendCall = calls.find(
      (call) => call.method === 'POST' && call.url.endsWith('/stu-active/suspend'),
    );
    expect(suspendCall?.body).toBeUndefined();
  }, 30000);
});

describe('AdminAnnouncementsPage', () => {
  it('creates an announcement without ever sending a status', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/announcements');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Announcements' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Draft notice')).toBeInTheDocument();
    expect(screen.getByText('Maintenance window')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New announcement' }));
    const dialog = await screen.findByRole('dialog', { name: 'New announcement' });

    await user.type(within(dialog).getByLabelText(/^Title/), 'Schedule change');
    await user.type(
      within(dialog).getByLabelText(/^Body/),
      'Week 4 workshops move to Friday.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Create announcement' }));

    await waitFor(() => {
      const post = calls.find(
        (call) => call.method === 'POST' && call.url === '/api/v1/admin/announcements',
      );
      expect(post).toBeDefined();
      // Status is never part of a write payload — publication is /status only.
      expect(post?.body).not.toHaveProperty('status');
      expect(post?.body).toEqual({
        title: 'Schedule change',
        bodyMarkdown: 'Week 4 workshops move to Friday.',
        audience: 'STUDENTS',
        courseId: null,
      });
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  }, 30000);

  it('publishes a draft through the explicit status transition', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/announcements');

    const draftCard = (await screen.findByText('Draft notice')).closest('li') as HTMLElement;
    await user.click(within(draftCard).getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      const post = calls.find(
        (call) =>
          call.method === 'POST' &&
          call.url === '/api/v1/admin/announcements/ann-draft/status',
      );
      expect(post).toBeDefined();
      expect(post?.body).toEqual({ status: 'PUBLISHED' });
    });
  }, 30000);
});

describe('AdminAuditPage', () => {
  it('lists audit rows newest-first and narrows them by surface', async () => {
    mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/audit');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Audit log' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('POST /api/v1/admin/students/{id}/suspend'),
    ).toBeInTheDocument();
    expect(screen.getByText('POST /api/v1/admin/announcements')).toBeInTheDocument();
    expect(screen.getAllByText('Ada Admin')).toHaveLength(2);

    await user.selectOptions(screen.getByLabelText('Filter by surface'), 'students');

    expect(await screen.findByText('POST /api/v1/admin/students/{id}/suspend')).toBeInTheDocument();
    expect(screen.queryByText('POST /api/v1/admin/announcements')).not.toBeInTheDocument();
    expect(screen.getByText('stu-suspended')).toBeInTheDocument();
  });
});

/**
 * Phase 10 responsive/a11y contract for the data-dense admin screens: every
 * table scrolls horizontally inside its own container instead of breaking the
 * layout on a narrow viewport, and every column header is associated with its
 * column for screen readers. jsdom does no layout, so the scroll behaviour is
 * asserted through the wrapper the stylesheet hooks onto.
 */
describe('responsive data tables', () => {
  it(
    'wraps every admin table in a horizontal scroll container with scoped headers',
    async () => {
      mockAdminApi();
      const routes = ['/admin/students', '/admin/courses', '/admin/content', '/admin/audit'];

      for (const route of routes) {
        const view = renderApp(route);
        const tables = await screen.findAllByRole('table');
        expect(tables.length, `${route} must render at least one data table`).toBeGreaterThan(0);

        for (const table of tables) {
          expect(
            table.parentElement,
            `${route}: the table wrapper must scroll horizontally`,
          ).toHaveClass('overflow-x-auto');

          const headers = within(table).getAllByRole('columnheader');
          expect(headers.length, `${route}: table must have column headers`).toBeGreaterThan(0);
          for (const header of headers) {
            expect(header, `${route}: column header must be scoped`).toHaveAttribute(
              'scope',
              'col',
            );
          }
        }

        view.unmount();
      }
    },
    30000,
  );
});
