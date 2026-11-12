import { render, screen, waitFor } from '@testing-library/react';
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
  enrollmentCount: 0,
};

const webFoundations: CourseSummary = {
  id: 'c2',
  slug: 'internet-and-web-foundations',
  title: 'Internet and Web Foundations',
  summary: 'Everything you build from here on is a participant in a network.',
  level: 'BEGINNER',
  pathSlug: 'frontend-development',
  pathName: 'Frontend Development',
  enrollmentCount: 0,
};

const frontendEngineering: CourseSummary = {
  id: 'c3',
  slug: 'frontend-engineering',
  title: 'Frontend Engineering',
  summary: 'Professional frontend development with React.',
  level: 'INTERMEDIATE',
  pathSlug: 'frontend-development',
  pathName: 'Frontend Development',
  enrollmentCount: 0,
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

/** Routes public endpoints to fixtures; anonymous session otherwise. */
function mockPublicApi(
  overrides: {
    courses?: CourseSummary[];
    paths?: PathSummary[];
    overview?: Overview;
  } = {},
) {
  const apiCourses = overrides.courses ?? courses;
  const apiPaths = overrides.paths ?? paths;
  const apiOverview = overrides.overview ?? overview;

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
      return json(apiOverview);
    }
    if (url.includes('/api/v1/public/paths/')) {
      const slug = url.split('/').pop() ?? '';
      const found = apiPaths.find((path) => path.slug === slug);
      return found
        ? json({ ...pathDetail, ...found, courses: apiCourses.filter((c) => c.pathSlug === slug) })
        : json({ message: 'Learning path not found.' }, 404);
    }
    if (url.includes('/api/v1/public/paths')) {
      return json(apiPaths);
    }
    if (url.includes('/api/v1/public/courses/')) {
      const slug = url.split('/').pop() ?? '';
      return slug === courseDetail.slug
        ? json(courseDetail)
        : json({ message: 'Course not found.' }, 404);
    }
    if (url.includes('/api/v1/public/courses')) {
      return json(apiCourses);
    }
    return json({ message: 'Not found' }, 404);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('HomePage', () => {
  it('shows live catalog counts and the start-here courses', async () => {
    mockPublicApi();

    renderApp('/');

    expect(await screen.findByText('Start learning today')).toBeInTheDocument();
    expect(await screen.findByText('Published learning paths')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Your first three steps' })).toBeInTheDocument();
    expect(screen.getByText('Request an account')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Computer Foundations')).toBeInTheDocument();
    expect(screen.getByText('Internet and Web Foundations')).toBeInTheDocument();
    // Paths from the overview render as cards linking into the path detail.
    expect(screen.getByRole('link', { name: /Frontend Development/ })).toBeInTheDocument();
  });
});

describe('CatalogPage', () => {
  it('updates results immediately for text, learning-path, and level filters', async () => {
    mockPublicApi();
    const user = userEvent.setup();

    renderApp('/courses');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Explore Our Courses' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /learners working together at computers/i }),
    ).toHaveAttribute('src', '/images/academy-learning.webp');
    expect(await screen.findByText('Computer Foundations')).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineering')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /computer circuit board and electronic components/i }),
    ).toHaveAttribute('src', '/images/courses/circuit-board.webp');

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Frontend');
    expect(screen.queryByText('Computer Foundations')).not.toBeInTheDocument();
    expect(screen.getByText('Frontend Engineering')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'frontend-development');

    expect(screen.queryByText('Computer Foundations')).not.toBeInTheDocument();
    expect(screen.getByText('Internet and Web Foundations')).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineering')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Intermediate/ }));

    expect(screen.queryByText('Internet and Web Foundations')).not.toBeInTheDocument();
    expect(screen.getByText('Frontend Engineering')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 to 1 of 1 results');
  });

  it('searches the real catalog from the header and opens path categories', async () => {
    mockPublicApi();
    const user = userEvent.setup();

    renderApp('/courses');

    const headerSearch = await screen.findByRole('searchbox', { name: 'Search for courses' });
    await user.type(headerSearch, 'Frontend');
    await user.click(screen.getByRole('button', { name: 'Search courses' }));

    expect(await screen.findByText('Frontend Engineering')).toBeInTheDocument();
    expect(screen.queryByText('Computer Foundations')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Courses/ }));
    expect(await screen.findByRole('heading', { name: 'Course categories' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Frontend Development/ }));

    expect(await screen.findByText('Internet and Web Foundations')).toBeInTheDocument();
    expect(screen.queryByText('Computer Foundations')).not.toBeInTheDocument();
  });

  it('saves favorites in this browser and shows them in the favorites view', async () => {
    mockPublicApi();
    const user = userEvent.setup();
    window.localStorage.clear();

    renderApp('/courses');

    expect(await screen.findByText('Computer Foundations')).toBeInTheDocument();
    const addFavorite = screen.getByRole('button', {
      name: 'Add Computer Foundations to favorites',
    });
    await user.click(addFavorite);

    const removeFavorite = await screen.findByRole('button', {
      name: 'Remove Computer Foundations from favorites',
    });
    expect(removeFavorite).toHaveAttribute('aria-pressed', 'true');
    expect(removeFavorite).toHaveClass('text-danger');
    expect(removeFavorite.querySelector('svg')).toHaveClass('fill-current');
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('codepath-academy:favorite-course-slugs') ?? '[]'))
        .toEqual(['computer-foundations']);
    });

    await user.click(screen.getByRole('button', { name: 'Favorites 1' }));

    expect(await screen.findByText('Showing 1 to 1 of 1 results')).toBeInTheDocument();
    expect(screen.getByText('Computer Foundations')).toBeInTheDocument();
    expect(screen.queryByText('Programming Fundamentals')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All courses 3' }));
    expect(await screen.findByText('Showing 1 to 3 of 3 results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Computer Foundations from favorites' }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('paginates using the real filtered result total', async () => {
    const pageCourses = Array.from({ length: 13 }, (_, index): CourseSummary => ({
      ...foundations,
      id: `page-${index + 1}`,
      slug: `page-course-${String(index + 1).padStart(2, '0')}`,
      title: `Course ${String(index + 1).padStart(2, '0')}`,
      summary: 'A deterministic catalog fixture for pagination.',
    }));
    mockPublicApi({
      courses: pageCourses,
      paths: [{ ...softwareEngineeringPath, courseCount: pageCourses.length }],
      overview: { ...overview, pathCount: 1, courseCount: pageCourses.length, startHere: pageCourses.slice(0, 4) },
    });
    const user = userEvent.setup();

    renderApp('/courses');

    expect(await screen.findByText('Showing 1 to 12 of 13 results')).toBeInTheDocument();
    expect(screen.getByText('Course 12')).toBeInTheDocument();
    expect(screen.queryByText('Course 13')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('Showing 13 to 13 of 13 results')).toBeInTheDocument();
    expect(screen.getByText('Course 13')).toBeInTheDocument();
    expect(screen.queryByText('Course 12')).not.toBeInTheDocument();
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
