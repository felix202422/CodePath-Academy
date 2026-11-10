import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input, Select, Textarea } from './Field';

describe('Input', () => {
  it('associates the label with the control', () => {
    render(<Input label="Email address" name="email" />);

    expect(screen.getByLabelText('Email address')).toHaveAttribute('name', 'email');
  });

  it('links error text via aria-describedby and aria-invalid', () => {
    render(<Input label="Email address" name="email" error="Email is already registered." />);

    const input = screen.getByLabelText(/Email address/);
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const errorId = input.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId ?? '')).toHaveTextContent(
      'Email is already registered.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Email is already registered.');
  });

  it('links hint text when there is no error', () => {
    render(<Input label="Password" name="password" hint="At least 12 characters." />);

    const input = screen.getByLabelText('Password');
    const hintId = input.getAttribute('aria-describedby')?.split(' ')[0];
    expect(document.getElementById(hintId ?? '')).toHaveTextContent('At least 12 characters.');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('forwards typed values', async () => {
    const onChange = vi.fn();
    render(<Input label="Email" name="email" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Email'), 'a@b.c');

    expect(onChange).toHaveBeenCalled();
  });
});

describe('Textarea and Select', () => {
  it('renders a labelled textarea', () => {
    render(<Textarea label="Lesson summary" name="summary" />);
    expect(screen.getByLabelText('Lesson summary').tagName).toBe('TEXTAREA');
  });

  it('renders a labelled select with its options', () => {
    render(
      <Select
        label="Status"
        name="status"
        options={[
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
        ]}
      />,
    );

    const select = screen.getByLabelText('Status');
    expect(select).toHaveTextContent('Draft');
    expect(select).toHaveTextContent('Published');
  });
});
