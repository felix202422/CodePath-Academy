import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieBanner } from './CookieBanner';
import { getConsent, requestPreferencesOpen } from '../../lib/consent';

function renderBanner() {
  return render(
    <MemoryRouter>
      <CookieBanner />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.getElementById('cpa-analytics-script')?.remove();
});

afterEach(() => {
  vi.unstubAllEnvs();
  document.getElementById('cpa-analytics-script')?.remove();
});

describe('CookieBanner', () => {
  it('shows the notice on a first visit with a link to the Privacy Policy', () => {
    renderBanner();

    const region = screen.getByRole('region', { name: 'Cookie notice' });
    expect(region).toHaveTextContent(/optional analytics stays off unless you allow it/i);
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('button', { name: 'Allow analytics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Essential only' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cookie preferences' })).toBeInTheDocument();
  });

  it('records an explicit refusal and hides the notice', async () => {
    renderBanner();

    await userEvent.click(screen.getByRole('button', { name: 'Essential only' }));

    expect(getConsent()?.analytics).toBe(false);
    expect(screen.queryByRole('region', { name: 'Cookie notice' })).not.toBeInTheDocument();
  });

  it('records an explicit allow and hides the notice', async () => {
    renderBanner();

    await userEvent.click(screen.getByRole('button', { name: 'Allow analytics' }));

    expect(getConsent()?.analytics).toBe(true);
    expect(screen.queryByRole('region', { name: 'Cookie notice' })).not.toBeInTheDocument();
  });

  it('opens the preference center and saves a toggled choice', async () => {
    renderBanner();

    await userEvent.click(screen.getByRole('button', { name: 'Cookie preferences' }));

    const dialog = await screen.findByRole('dialog', { name: 'Cookie preferences' });
    expect(dialog).toHaveTextContent(/essential — always active/i);
    const toggle = screen.getByRole('checkbox', { name: /allow analytics/i });
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    await waitFor(() => expect(getConsent()?.analytics).toBe(true));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Cookie notice' })).not.toBeInTheDocument();
  });

  it('keeps the notice up when the dialog is cancelled without a choice', async () => {
    renderBanner();

    await userEvent.click(screen.getByRole('button', { name: 'Cookie preferences' }));
    await screen.findByRole('dialog', { name: 'Cookie preferences' });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getConsent()).toBeNull();
    expect(screen.getByRole('region', { name: 'Cookie notice' })).toBeInTheDocument();
  });

  it('reopens the dialog on the shared event after a decision (footer link)', async () => {
    renderBanner();
    await userEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Footer's "Cookie preferences" button dispatches this.
    requestPreferencesOpen();

    const dialog = await screen.findByRole('dialog', { name: 'Cookie preferences' });
    // Seeded from the stored decision: analytics stays off in the toggle.
    expect(screen.getByRole('checkbox', { name: /allow analytics/i })).not.toBeChecked();
    expect(dialog).toBeInTheDocument();
  });
});
