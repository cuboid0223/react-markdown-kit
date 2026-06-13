import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ConsentRenderer,
  type ConsentCheckboxComponentProps,
} from '../src/client/ConsentRenderer';
import type { ConsentData } from '../src/types';

const data: ConsentData = {
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

  it('fires onValidityChange as the required gate flips', () => {
    const onValidityChange = vi.fn();
    render(
      <ConsentRenderer data={data} onValidityChange={onValidityChange} />,
    );

    // Initial: the required "terms" box is unchecked → invalid.
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByLabelText('I accept the terms'));
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it('renders nothing by default for a non-pending (consented) document', () => {
    const { container } = render(
      <ConsentRenderer data={{ ...data, status: 'consented' }} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('carefully')).not.toBeInTheDocument();
  });

  it('renders inline markdown in a checkbox label as a real link', () => {
    const withLink: ConsentData = {
      ...data,
      checkboxes: [
        {
          id: 'terms',
          label: 'I accept the [terms](https://example.com/terms)',
          required: true,
        },
      ],
    };
    render(<ConsentRenderer data={withLink} />);

    const link = screen.getByRole('link', { name: 'terms' });
    expect(link).toHaveAttribute('href', 'https://example.com/terms');
    // Markdown is rendered, not shown as literal text.
    expect(screen.queryByText(/\[terms\]/)).not.toBeInTheDocument();
    // The box is still labelled by the full accessible text.
    expect(screen.getByLabelText('I accept the terms')).toBeInTheDocument();
  });

  it('does not toggle the checkbox when its label link is clicked', () => {
    const withLink: ConsentData = {
      ...data,
      checkboxes: [
        {
          id: 'terms',
          label: 'I accept the [terms](https://example.com/terms)',
          required: true,
        },
      ],
    };
    render(<ConsentRenderer data={withLink} />);

    const box = screen.getByLabelText('I accept the terms') as HTMLInputElement;
    expect(box.checked).toBe(false);

    fireEvent.click(screen.getByRole('link', { name: 'terms' }));
    expect(box.checked).toBe(false);
  });

  it('uses renderStatus to override non-pending rendering', () => {
    render(
      <ConsentRenderer
        data={{ ...data, status: 'expired' }}
        renderStatus={({ status }) => <p>status: {status}</p>}
      />,
    );
    expect(screen.getByText('status: expired')).toBeInTheDocument();
    // The signable form is not shown.
    expect(screen.queryByText('carefully')).not.toBeInTheDocument();
  });
});
