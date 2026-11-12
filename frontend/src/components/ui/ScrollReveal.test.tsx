import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrollReveal } from './ScrollReveal';

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
});
