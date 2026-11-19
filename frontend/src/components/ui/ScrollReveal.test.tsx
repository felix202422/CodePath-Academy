import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScrollReveal } from './ScrollReveal';

/**
 * Minimal IntersectionObserver stand-in: records the callback so a test can
 * play the role of the browser scrolling content into view.
 */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  constructor(readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: number[] = [];
}

function stubIntersectionObserver() {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: FakeIntersectionObserver,
  });
}

/** jsdom ships no matchMedia, so the preference is installed for the test. */
function stubReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) =>
      ({ matches, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }) as MediaQueryList,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (window as { IntersectionObserver?: unknown }).IntersectionObserver;
  delete (window as { matchMedia?: unknown }).matchMedia;
  FakeIntersectionObserver.instances.length = 0;
});

describe('ScrollReveal', () => {
  it('keeps its content visible when IntersectionObserver is unavailable', () => {
    render(
      <ScrollReveal>
        <h2>First steps</h2>
      </ScrollReveal>,
    );

    expect(screen.getByRole('heading', { name: 'First steps' })).toBeInTheDocument();
    expect(screen.getByText('First steps').parentElement).toHaveClass('scroll-reveal-visible');
  });

  it('shows content immediately when the visitor prefers reduced motion', () => {
    stubIntersectionObserver();
    stubReducedMotion(true);

    render(
      <ScrollReveal>
        <h2>No animation for me</h2>
      </ScrollReveal>,
    );

    expect(screen.getByText('No animation for me').parentElement).toHaveClass(
      'scroll-reveal-visible',
    );
    // The reveal never arms an observer when motion is reduced.
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it('reveals content only once it enters the viewport', () => {
    stubIntersectionObserver();
    stubReducedMotion(false);

    render(
      <ScrollReveal>
        <h2>Deferred section</h2>
      </ScrollReveal>,
    );

    const wrapper = screen.getByText('Deferred section').parentElement;
    expect(wrapper).not.toHaveClass('scroll-reveal-visible');
    expect(FakeIntersectionObserver.instances).toHaveLength(1);

    const observer = FakeIntersectionObserver.instances[0] as FakeIntersectionObserver;
    act(() => {
      observer.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver,
      );
    });

    expect(wrapper).toHaveClass('scroll-reveal-visible');
  });
});
