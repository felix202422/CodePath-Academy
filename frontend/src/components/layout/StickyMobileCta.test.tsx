import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { StickyMobileCta } from './StickyMobileCta';

function renderCta(path = '/', signedIn = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StickyMobileCta signedIn={signedIn} />
    </MemoryRouter>,
  );
}

describe('StickyMobileCta', () => {
  it('shows quick actions with home-indicator safe-area padding below xl', () => {
    renderCta('/');

    const region = screen.getByRole('region', { name: 'Quick actions' });
    expect(region).toHaveClass('xl:hidden');
    expect(region.style.paddingBottom).toContain('env(safe-area-inset-bottom)');
    expect(screen.getByRole('link', { name: 'Browse courses' })).toHaveAttribute(
      'href',
      '/courses',
    );
    expect(screen.getByRole('link', { name: 'Apply Now' })).toHaveAttribute('href', '/register');
  });

  it('stays off authentication and legal routes', () => {
    for (const path of ['/login', '/register', '/register/success', '/privacy', '/terms']) {
      const { unmount } = renderCta(path);
      expect(screen.queryByRole('region', { name: 'Quick actions' })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('disappears once the visitor is signed in', () => {
    renderCta('/', true);
    expect(screen.queryByRole('region', { name: 'Quick actions' })).not.toBeInTheDocument();
  });
});
