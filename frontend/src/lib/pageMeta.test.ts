import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  applyPageMeta,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  usePageMeta,
} from './pageMeta';

/** Every head tag pageMeta.ts owns; removed between tests for isolation. */
const MANAGED_META = [
  'description',
  'robots',
  'og:site_name',
  'og:type',
  'og:title',
  'og:description',
  'og:url',
  'og:image',
  'og:image:alt',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
];

function resetManagedHead(): void {
  for (const key of MANAGED_META) {
    document.head
      .querySelectorAll(`meta[name="${key}"], meta[property="${key}"]`)
      .forEach((element) => element.remove());
  }
  document.head.querySelector('link[rel="canonical"]')?.remove();
  document.title = '';
}

function metaContent(attr: 'name' | 'property', key: string): string | null {
  return (
    document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)?.content ?? null
  );
}

afterEach(() => {
  resetManagedHead();
});

describe('applyPageMeta', () => {
  it('applies title, description, canonical and social tags for an indexable page', () => {
    const description = 'Browse published technology courses by level and path.';
    applyPageMeta({ title: 'Browse Courses', description });

    expect(document.title).toBe(`Browse Courses | ${SITE_NAME}`);
    expect(metaContent('name', 'description')).toBe(description);
    expect(metaContent('name', 'robots')).toBe('index, follow');

    const canonical = `${window.location.origin}${window.location.pathname}`;
    expect(
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
    ).toBe(canonical);
    expect(metaContent('property', 'og:url')).toBe(canonical);
    expect(metaContent('property', 'og:title')).toBe(document.title);
    expect(metaContent('property', 'og:description')).toBe(description);
    expect(metaContent('property', 'og:image')).toBe(
      `${window.location.origin}${DEFAULT_OG_IMAGE}`,
    );
    expect(metaContent('property', 'og:site_name')).toBe(SITE_NAME);

    expect(metaContent('name', 'twitter:card')).toBe('summary_large_image');
    expect(metaContent('name', 'twitter:title')).toBe(document.title);
    expect(metaContent('name', 'twitter:description')).toBe(description);
    expect(metaContent('name', 'twitter:image')).toBe(
      `${window.location.origin}${DEFAULT_OG_IMAGE}`,
    );
  });

  it('marks private pages noindex and falls back to the default description', () => {
    applyPageMeta({ title: 'Dashboard', noindex: true });

    expect(document.title).toBe(`Dashboard | ${SITE_NAME}`);
    expect(metaContent('name', 'robots')).toBe('noindex, nofollow');
    expect(metaContent('name', 'description')).toBe(DEFAULT_DESCRIPTION);
    // Canonical still points at the real URL so scrapers that ignore robots
    // never see two different pages claiming the same content.
    expect(
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
    ).toBe(`${window.location.origin}${window.location.pathname}`);
  });

  it('never duplicates the site name inside the title', () => {
    applyPageMeta({ title: SITE_NAME });
    expect(document.title).toBe(SITE_NAME);

    applyPageMeta({ title: 'Learn. Build. Innovate. Become.' });
    expect(document.title).toBe(`Learn. Build. Innovate. Become. | ${SITE_NAME}`);
  });

  it('updates existing tags in place instead of appending duplicates', () => {
    applyPageMeta({ title: 'First', description: 'first description' });
    applyPageMeta({ title: 'Second', description: 'second description' });

    expect(document.title).toBe(`Second | ${SITE_NAME}`);
    expect(metaContent('name', 'description')).toBe('second description');
    expect(metaContent('property', 'og:title')).toBe(`Second | ${SITE_NAME}`);
    expect(
      document.head.querySelectorAll('meta[name="description"]').length,
    ).toBe(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.head.querySelectorAll('meta[property="og:title"]').length).toBe(1);
  });

  it('resolves a custom sharing image against the origin', () => {
    applyPageMeta({ title: 'Custom', imagePath: '/images/og/custom.png' });

    expect(metaContent('property', 'og:image')).toBe(
      `${window.location.origin}/images/og/custom.png`,
    );
    expect(metaContent('name', 'twitter:image')).toBe(
      `${window.location.origin}/images/og/custom.png`,
    );
  });
});

describe('usePageMeta', () => {
  it('applies metadata on mount and re-applies when the page values change', () => {
    const { rerender } = renderHook(({ title }: { title: string }) => usePageMeta({ title }), {
      initialProps: { title: 'Course details' },
    });

    expect(document.title).toBe(`Course details | ${SITE_NAME}`);

    // A detail page finishing loading swaps in the real catalog title.
    rerender({ title: 'Java Programming' });
    expect(document.title).toBe(`Java Programming | ${SITE_NAME}`);
    expect(metaContent('property', 'og:title')).toBe(`Java Programming | ${SITE_NAME}`);
  });

  it('flips the robots policy when the page becomes a soft 404', () => {
    const { rerender } = renderHook(
      ({ noindex }: { noindex?: boolean }) => usePageMeta({ title: 'Course', noindex }),
      { initialProps: { noindex: false as boolean | undefined } },
    );

    expect(metaContent('name', 'robots')).toBe('index, follow');

    rerender({ noindex: true });
    expect(metaContent('name', 'robots')).toBe('noindex, nofollow');
  });
});
