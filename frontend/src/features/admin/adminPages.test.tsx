import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import type {
  CourseAdminResponse,
  ImportRowDetailResponse,
  ImportRowResponse,
  ImportRunResponse,
  LessonAdminResponse,
  LessonDetailAdminResponse,
  ModuleAdminResponse,
  PathAdminResponse,
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

    return jsonResponse({ message: 'Not found' }, 404);
  });

  return calls;
}

function notFound() {
  return { message: 'Not found.' };
}

describe('AdminCoursesPage', () => {
  it('renders paths and courses, and creates a learning path through the modal', async () => {
    const calls = mockAdminApi();
    const user = userEvent.setup();

    renderApp('/admin/courses');

    expect(await screen.findByRole('heading', { level: 1, name: 'Courses' })).toBeInTheDocument();
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
      const post = calls.find((call) => call.method === 'POST' && call.url === '/api/v1/admin/paths');
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
  });

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
