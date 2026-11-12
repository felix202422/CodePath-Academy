import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../features/theme/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

afterEach(() => {
  window.localStorage.removeItem('codepath-academy:theme');
  delete document.documentElement.dataset.theme;
});

describe('ThemeToggle', () => {
  it('switches the shared palette and persists the preference', async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    const lightModeButton = screen.getByRole('button', { name: 'Switch to light mode' });
    expect(lightModeButton).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem('codepath-academy:theme')).toBe('dark');

    await user.click(lightModeButton);
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('restores a previously saved dark theme', () => {
    window.localStorage.setItem('codepath-academy:theme', 'dark');

    renderToggle();

    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
