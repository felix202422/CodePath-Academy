import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import type { CourseDetail, CourseSummary, Overview, PathDetail, PathSummary } from './catalogApi';

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

const foundations: CourseSummary = {
  id: 'c1',
  slug: 'computer-foundations',
  title: 'Computer Foundations',
  summary: 'Before writing programs, you need a working mental model of the machine.',
  level: 'BEGINNER',
  pathSlug: 'software-engineering',
  pathName: 'Software Engineering',
};

const webFoundations: CourseSummary = {
  id: 'c2',
  slug: 'internet-and-web-foundations',
  title: 'Internet and Web Foundations',
  summary: 'Everything you build from here on is a participant in a network.',
  level: 'BEGINNER',
  pathSlug: 'frontend-development',
  pathName: 'Frontend Development',
};

const frontendEngineering: CourseSummary = {
  id: 'c3',
  slug: 'frontend-engineering',
  title: 'Frontend Engineering',
  summary: 'Professional frontend development with React.',
  level: 'INTERMEDIATE',
  pathSlug: 'frontend-development',
  pathName: 'Frontend Development',
};

const courses: CourseSummary[] = [foundations, webFoundations, frontendEngineering];

const softwareEngineeringPath: PathSummary = {
  id: 'p1',
  slug: 'software-engineering',
  name: 'Software Engineering',
  summary: 'The broad core track.',
  accentColor: '#2563eb',
  courseCount: 1,
};

const frontendDevelopmentPath: PathSummary = {
  id: 'p2',
  slug: 'frontend-development',
  name: 'Frontend Development',
  summary: 'Internet foundations through React.',
  accentColor: '#db2777',
  courseCount: 2,
};

const paths: PathSummary[] = [softwareEngineeringPath, frontendDevelopmentPath];

const overview: Overview = {
  pathCount: 7,
  courseCount: 20,
  paths,
  startHere: courses,
};

const courseDetail: CourseDetail = {
  ...foundations,
  description:
    'Before writing programs, you need a working mental model of the machine.\n\n' +
    'Source: CodePath-Masterclass subject 01-COMPUTER-FOUNDATIONS (MIT), ' +
    'commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
  sourceRepository: 'https://github.com/felix202422/CodePath-Masterclass',
  moduleCount: 0,
  lessonCount: 0,
  prerequisites: [webFoundations],
};

const pathDetail: PathDetail = {
  ...frontendDevelopmentPath,
  description: 'Built from audited subjects 06-09 in prerequisite order.',
  courses: [webFoundations, frontendEngineering],
};

/** Routes the public catalog endpoints to fixtures; anonymous session otherwise. */
function mockPublicApi() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    if (url.includes('/api/v1/auth/me')) {
      return json({ message: 'Authentication required' }, 401);
    }
    if (url.includes('/api/v1/health')) {
      return json({ status: 'UP', service: 'codepath-academy', time: '2026-11-10T00:00:00Z' });
    }
    if (url.includes('/api/v1/public/overview')) {
      return json(overview);
    }
    if (url.includes('/api/v1/public/paths/')) {
      const slug = url.split('/').pop() ?? '';
      const found = paths.find((path) => path.slug === slug);
      return found
        ? json({ ...pathDetail, ...found, courses: courses.filter((c) => c.pathSlug === slug) })
        : json({ message: 'Learning path not found.' }, 404);
    }
    if (url.includes('/api/v1/public/paths')) {
      return json(paths);
    }
    if (url.includes('/api/v1/public/courses/')) {
      const slug = url.split('/').pop() ?? '';
      return slug === courseDetail.slug
        ? json(courseDetail)
        : json({ message: 'Course not found.' }, 404);
    }
    if (url.includes('/api/v1/public/courses')) {
      return json(courses);
    }
    return json({ message: 'Not found' }, 404);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HomePage', () => {
  it('shows live catalog counts and the start-here courses', async () => {
    mockPublicApi();

    renderApp('/');

    expect(await screen.findByText('Start learning today')).toBeInTheDocument();
    expect(await screen.findByText('Published learning paths')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Computer Foundations')).toBeInTheDocument();
    expect(screen.getByText('Internet and Web Foundations')).toBeInTheDocument();
    // Paths from the overview render as cards linking into the path detail.
    expect(screen.getByRole('link', { name: /Frontend Development/ })).toBeInTheDocument();
  });
});

describe('CatalogPage', () => {
  it('lists published courses and filters by learning path', async () => {
    mockPublicApi();
    const user = userEvent.setup();

    renderApp('/courses');

    expect(await screen.findByRole('heading', { level: 1, name: 'Course catalog' })).toBeInTheDocument();
    expect(await screen.findByText('Computer Foundations')).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineering')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Frontend Development' }));

    expect(screen.queryByText('Computer Foundations')).not.toBeInTheDocument();
    expect(screen.getByText('Internet and Web Foundations')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All paths' }));

    expect(screen.getByText('Computer Foundations')).toBeInTheDocument();
  });
});

describe('CourseDetailPage', () => {
  it('renders course metadata, prerequisites, and the honest empty-content notice', async () => {
    mockPublicApi();

    renderApp('/courses/computer-foundations');

    expect(await screen.findByRole('heading', { level: 1, name: 'Computer Foundations' })).toBeInTheDocument();
    expect(
      await screen.findByText(/Lesson content for this course has not been imported yet/),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Prerequisites' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Internet and Web Foundations' })).toBeInTheDocument();
    expect(screen.getByText('0 modules')).toBeInTheDocument();
    expect(screen.getByText('0 lessons')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'CodePath-Masterclass' }),
    ).toHaveAttribute('href', 'https://github.com/felix202422/CodePath-Masterclass');
  });

  it('shows an honest not-found screen for unknown courses', async () => {
    mockPublicApi();

    renderApp('/courses/does-not-exist');

    expect(await screen.findByRole('heading', { level: 1, name: 'Course not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the course catalog' })).toBeInTheDocument();
  });
});

describe('LearningPathsPage', () => {
  it('lists published paths with real course counts', async () => {
    mockPublicApi();

    renderApp('/paths');

    expect(await screen.findByRole('heading', { level: 1, name: 'Learning paths' })).toBeInTheDocument();
    expect(await screen.findByText('Frontend Development')).toBeInTheDocument();
    expect(screen.getByText('2 courses')).toBeInTheDocument();
    expect(screen.getByText('1 course')).toBeInTheDocument();
  });
});

describe('PathDetailPage', () => {
  it('renders the path with its courses', async () => {
    mockPublicApi();

    renderApp('/paths/frontend-development');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Frontend Development' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Courses in this path' })).toBeInTheDocument();
    expect(screen.getByText('Internet and Web Foundations')).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineering')).toBeInTheDocument();
  });

  it('shows an honest not-found screen for draft or unknown paths', async () => {
    mockPublicApi();

    renderApp('/paths/computer-networking');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Learning path not found' }),
    ).toBeInTheDocument();
  });
});
