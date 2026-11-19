import { useEffect } from 'react';

/**
 * Per-page document metadata for the SPA. Crawlers that run JavaScript see the
 * tags this hook applies; the static tags in index.html (with their
 * env-resolved origin) cover scrapers that do not. Private shells pass
 * `noindex` so student/admin screens are never presented for indexing even
 * though robots.txt already blocks crawling them.
 *
 * The hook intentionally does not depend on router context: the canonical URL
 * is read from `window.location`, which BrowserRouter keeps in sync in the
 * running app (MemoryRouter-based tests simply read the jsdom location).
 */

export const SITE_NAME = 'CodePath-Academy';

/** Fallback description; pages with indexable content pass their own. */
export const DEFAULT_DESCRIPTION =
  'CodePath-Academy — structured technology courses, practical exercises, assessments, and real-world projects.';

/** Sharing image under the site root; absolute URLs are built from the origin. */
export const DEFAULT_OG_IMAGE = '/images/og/codepath-academy-og.png';

export interface PageMeta {
  /** Title fragment; the document title becomes `${title} | CodePath-Academy`. */
  title: string;
  /** Page-specific description for indexable pages. */
  description?: string;
  /** Search engines must not index this page (private areas, 404s). */
  noindex?: boolean;
  /** Override the sharing image (root-relative path). */
  imagePath?: string;
}

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLElement>(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLink(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/**
 * Applies title, description, robots policy, canonical URL, and Open
 * Graph / Twitter tags to the document head. Pure DOM mutation — no state —
 * so it is directly unit-testable; `path` defaults to the current location.
 */
export function applyPageMeta(meta: PageMeta, path: string = window.location.pathname): void {
  const title =
    meta.title === SITE_NAME || meta.title.includes(SITE_NAME)
      ? meta.title
      : `${meta.title} | ${SITE_NAME}`;
  const description = meta.description ?? DEFAULT_DESCRIPTION;
  const origin = window.location.origin;
  const pageUrl = origin + path;
  const image = origin + (meta.imagePath ?? DEFAULT_OG_IMAGE);

  document.title = title;
  setMeta('name', 'description', description);
  setMeta('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');
  setLink('canonical', pageUrl);

  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', pageUrl);
  setMeta('property', 'og:image', image);
  setMeta('property', 'og:image:alt', `CodePath-Academy — Learn. Build. Innovate. Become.`);

  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);
}

/**
 * Applies page metadata on mount and whenever the page's meta values change
 * (e.g. when a detail page finishes loading its real title and summary).
 */
export function usePageMeta(meta: PageMeta): void {
  const { title, description, noindex, imagePath } = meta;
  useEffect(() => {
    applyPageMeta({ title, description, noindex, imagePath });
  }, [title, description, noindex, imagePath]);
}
