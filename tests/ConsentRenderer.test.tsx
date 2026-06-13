import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ConsentRenderer,
  type ConsentCheckboxComponentProps,
} from '../src/client/ConsentRenderer';
import type { ConsentData } from '../src/types';

const data: ConsentData = {
  id: 'c1',
  title: 'Consent',
  contentMarkdown: 'Please read **carefully**.',
  status: 'pending',
  checkboxes: [
    { id: 'terms', label: 'I accept the terms', required: true },
    { id: 'news', label: 'Send me news', required: false },
  ],
};

describe('ConsentRenderer', () => {
  it('renders the markdown body and the checkboxes', () => {
    render(<ConsentRenderer data={data} />);
    expect(
      screen.getByRole('heading', { name: 'Consent' }),
    ).toBeInTheDocument();
    expect(screen.getByText('carefully')).toBeInTheDocument();
    expect(screen.getByLabelText('I accept the terms')).toBeInTheDocument();
    expect(screen.getByLabelText('Send me news')).toBeInTheDocument();
  });

  it('hides the checkboxes when showCheckboxes is false', () => {
    render(<ConsentRenderer data={data} showCheckboxes={false} />);
    expect(screen.getByText('carefully')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('I accept the terms'),
    ).not.toBeInTheDocument();
  });

  it('renders an injected checkbox component instead of the native input', () => {
    function FakeCheckbox({
      id,
      checked,
      onCheckedChange,
    }: ConsentCheckboxComponentProps) {
      return (
        <button
          type="button"
          role="checkbox"
          id={id}
          aria-checked={checked}
          data-testid={`fake-${id}`}
          onClick={() => onCheckedChange(!checked)}
        />
      );
    }

    render(
      <ConsentRenderer data={data} components={{ Checkbox: FakeCheckbox }} />,
    );

    // No native checkboxes; the injected component is used instead.
    expect(screen.queryAllByRole('checkbox', { hidden: true })).toHaveLength(2);
    const fake = screen.getByLabelText('I accept the terms');
    expect(fake.tagName).toBe('BUTTON');
    expect(fake).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(fake);
    expect(fake).toHaveAttribute('aria-checked', 'true');
  });

  it('fires onChange with the live checkbox state', () => {
    const onChange = vi.fn();
    render(<ConsentRenderer data={data} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('I accept the terms'));
    const last = onChange.mock.lastCall?.[0];
    expect(last).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'terms', checked: true }),
      ]),
    );
  });
});
