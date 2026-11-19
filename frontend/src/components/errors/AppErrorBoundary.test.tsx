import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary, RouteErrorBoundary } from './AppErrorBoundary';

function ThrowingScreen(): React.JSX.Element {
  throw new Error('render exploded');
}

/** Mirrors App.tsx: boundary outside Routes, keyed by pathname. */
function renderBoundary(initialPath = '/boom') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <RouteErrorBoundary>
        <Routes>
          <Route path="/boom" element={<ThrowingScreen />} />
          <Route path="/" element={<p>All good</p>} />
        </Routes>
      </RouteErrorBoundary>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RouteErrorBoundary', () => {
  it('replaces a crashing screen with an honest alert fallback', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderBoundary();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveTextContent('render exploded');
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('clears the error after navigation so the rest of the site stays usable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderBoundary();
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'Go to the home page' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByText('All good')).toBeInTheDocument();
  });
});

describe('AppErrorBoundary reload', () => {
  it('invokes the reload action from the fallback button', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReload = vi.fn();

    render(
      <MemoryRouter initialEntries={['/x']}>
        <AppErrorBoundary onReload={onReload} resetKey="/x">
          <ThrowingScreen />
        </AppErrorBoundary>
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Reload the page' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('recovers on its own when resetKey changes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <MemoryRouter>
        <AppErrorBoundary resetKey="/first">
          <ThrowingScreen />
        </AppErrorBoundary>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AppErrorBoundary resetKey="/second">
          <p>Recovered screen</p>
        </AppErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Recovered screen')).toBeInTheDocument();
  });
});
