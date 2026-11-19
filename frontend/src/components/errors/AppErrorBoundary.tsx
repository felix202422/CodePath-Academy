import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  /** Changing this value clears a caught error (route changes reset the boundary). */
  resetKey?: string;
  /** Overridable for tests; defaults to a full page reload. */
  onReload?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Route-aware error boundary. A render crash in one screen replaces the app
 * area with an honest fallback instead of a blank page; navigating elsewhere
 * resets it so the rest of the site stays usable.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console output is the only telemetry this app has; no data is sent anywhere.
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const reload = this.props.onReload ?? (() => window.location.reload());

    return (
      <div
        role="alert"
        className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center"
      >
        <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">
          Unexpected error
        </p>
        <h1 className="mt-3 text-2xl font-bold text-navy-950">Something went wrong</h1>
        <p className="mt-4 text-sm leading-6 text-ink-muted">
          This screen hit an unexpected problem, so it could not be displayed. The rest of
          the site still works — try again, or head back to the home page.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reload}>Reload the page</Button>
          <Link
            to="/"
            className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50"
          >
            Go to the home page
          </Link>
        </div>
        <p className="mt-6 text-xs text-ink-muted">
          Error details for developers: <code className="font-mono">{error.message}</code>
        </p>
      </div>
    );
  }
}

/** Binds the boundary to the current pathname so navigation clears errors. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <AppErrorBoundary resetKey={location.pathname}>{children}</AppErrorBoundary>;
}
