import { Button } from '../../components/ui/Button';
import type { ContentStatus } from './adminApi';
import { statusActions } from './statusUi';

interface StatusButtonsProps {
  current: ContentStatus;
  /** Status the in-flight mutation is moving to, for its loading spinner. */
  pendingTarget?: ContentStatus | undefined;
  disabled?: boolean;
  onSelect: (status: ContentStatus) => void;
}

/**
 * Publish/Unpublish/Archive controls for one entity. Labels derive from the
 * current status so every row always offers both available transitions.
 */
export function StatusButtons({ current, pendingTarget, disabled = false, onSelect }: StatusButtonsProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {statusActions(current).map((action) => (
        <Button
          key={action.target}
          size="sm"
          variant="outline"
          disabled={disabled}
          loading={pendingTarget === action.target}
          onClick={() => onSelect(action.target)}
        >
          {action.label}
        </Button>
      ))}
    </span>
  );
}
