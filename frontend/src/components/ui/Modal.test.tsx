import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

const props = {
  title: 'Reject enrollment request',
  children: <p>Confirm rejecting this student&apos;s request.</p>,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(<Modal {...props} open={false} onClose={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a labelled dialog', () => {
    render(<Modal {...props} open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Reject enrollment request');
    expect(screen.getByText(/Confirm rejecting/)).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<Modal {...props} open onClose={onClose} />);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked but not the dialog body', async () => {
    const onClose = vi.fn();
    render(<Modal {...props} open onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    await userEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    // The modal is portaled to document.body, so query the whole document.
    const backdrop = document.querySelector('.fixed.inset-0 > div[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the close button', async () => {
    const onClose = vi.fn();
    render(<Modal {...props} open onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/**
 * Phase 10 focus contract: opening moves focus into the dialog, Tab cannot
 * walk focus out into the page behind it, and closing gives focus back to the
 * control that opened it. jsdom performs no layout, so the trap's visibility
 * filter treats the focused node as the only candidate — the assertion below
 * therefore proves focus never escapes, which is the property that matters.
 */
function FocusHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Review request
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Reject enrollment request"
        footer={
          <button type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
        }
      >
        <p>Confirm rejecting this student&apos;s request.</p>
      </Modal>
    </div>
  );
}

describe('Modal focus management', () => {
  it('moves focus into the dialog when it opens', async () => {
    render(<FocusHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Review request' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('keeps Tab and Shift+Tab inside the dialog while it is open', async () => {
    render(<FocusHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Review request' }));
    const dialog = screen.getByRole('dialog');

    for (let step = 0; step < 4; step += 1) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await userEvent.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    // The page behind the dialog is never focused instead.
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Review request' }));
  });

  it('restores focus to the trigger after the dialog closes', async () => {
    render(<FocusHarness />);
    const trigger = screen.getByRole('button', { name: 'Review request' });
    await userEvent.click(trigger);

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});
