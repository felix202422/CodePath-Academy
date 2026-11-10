import { Construction } from 'lucide-react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';

export interface PlaceholderPageProps {
  title: string;
  /** Phase that will deliver this screen, e.g. "Phase 6 — Enrollment". */
  phase: string;
  description: string;
}

/**
 * Honest stand-in for a screen whose feature has not been built yet. States
 * exactly which phase delivers it instead of showing fake data.
 */
export function PlaceholderPage({ title, phase, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <Construction className="size-7 text-warning" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-navy-950">{title}</h1>
      </div>
      <p className="mt-4 text-ink-muted">{description}</p>
      <div className="mt-6">
        <Alert tone="info">
          <strong>{phase}</strong> delivers this screen. The project implementation register
          tracks the current status of every phase.
        </Alert>
      </div>
      <div className="mt-6">
        <Link to="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
