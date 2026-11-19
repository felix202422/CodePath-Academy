import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrivacyPage } from './PrivacyPage';
import { TermsPage } from './TermsPage';

function renderPage(Page: () => React.JSX.Element) {
  // Legal pages only need router context for their internal links.
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  window.history.pushState({}, '', '/');
});

describe('PrivacyPage', () => {
  it('renders an indexable page with unique title and description', async () => {
    // usePageMeta reads the real location for the canonical URL.
    window.history.pushState({}, '', '/privacy');
    renderPage(PrivacyPage);

    await waitFor(() => expect(document.title).toBe('Privacy Policy | CodePath-Academy'));
    const description = document
      .querySelector('meta[name="description"]')
      ?.getAttribute('content');
    expect(description).toContain('How CodePath-Academy collects, uses, and protects');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow',
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain(
      '/privacy',
    );
  });

  it('describes the data the app actually stores and the default-off analytics gate', () => {
    renderPage(PrivacyPage);

    expect(screen.getByRole('heading', { name: 'Who we are' })).toBeInTheDocument();
    expect(screen.getByText(/bcrypt hash/i)).toBeInTheDocument();
    expect(screen.getByText(/contact form \(name, email, subject, message\)/i)).toBeInTheDocument();
    expect(screen.getByText(/off\s+by default/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cookie preferences' })).toBeInTheDocument();
  });

  it('shows no invented contact address when the deployment sets none', () => {
    renderPage(PrivacyPage);

    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('renders the configured contact address and nothing else', () => {
    vi.stubEnv('VITE_CONTACT_EMAIL', 'hello@academy.example');

    renderPage(PrivacyPage);

    expect(screen.getByRole('link', { name: 'hello@academy.example' })).toHaveAttribute(
      'href',
      'mailto:hello@academy.example',
    );
    expect(document.querySelectorAll('a[href^="mailto:"]').length).toBe(1);
  });

  it('links to the contact form and the Terms of Use', () => {
    renderPage(PrivacyPage);

    expect(screen.getAllByRole('link', { name: 'contact form' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms');
  });
});

describe('TermsPage', () => {
  it('renders an indexable page with a unique title and description', async () => {
    window.history.pushState({}, '', '/terms');
    renderPage(TermsPage);

    await waitFor(() => expect(document.title).toBe('Terms of Use | CodePath-Academy'));
    const description = document
      .querySelector('meta[name="description"]')
      ?.getAttribute('content');
    expect(description).toContain('accounts, enrollment review, acceptable use');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow',
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain(
      '/terms',
    );
  });

  it('states that registration is a request until an administrator approves it', () => {
    renderPage(TermsPage);

    expect(screen.getByRole('heading', { name: '2. Accounts and approval' })).toBeInTheDocument();
    expect(screen.getByText(/sign-in stays disabled — until an administrator/i)).toBeInTheDocument();
    expect(screen.getByText(/not an enrollment: access begins only when the request is approved/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });

  it('shows no invented contact address when none is configured', () => {
    renderPage(TermsPage);

    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});
