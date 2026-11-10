import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
