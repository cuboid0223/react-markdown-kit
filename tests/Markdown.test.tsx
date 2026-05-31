import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Markdown } from '../src/components/Markdown';
import { mdToReactElement } from '../src/utils/mdToReactElement';

describe('Markdown', () => {
  it('renders a heading and paragraph from markdown', () => {
    render(<Markdown content={'# Hello\n\nSome **text**.'} />);
    const heading = screen.getByRole('heading', { name: 'Hello' });
    expect(heading.tagName).toBe('H1');
    expect(screen.getByText(/Some/)).toBeInTheDocument();
  });

  it('applies the brand prose classes to the wrapper by default', () => {
    const { container } = render(<Markdown content="# Title" />);
    const wrapper = container.querySelector('.rmk-root')!;
    expect(wrapper).toHaveClass('prose');
    expect(wrapper.className).toContain('prose-headings:text-brand-heading');
  });

  it('drops brand classes when brand={false}', () => {
    const { container } = render(<Markdown content="# Title" brand={false} />);
    const wrapper = container.querySelector('.rmk-root')!;
    expect(wrapper).not.toHaveClass('prose');
  });

  it('appends custom className', () => {
    const { container } = render(<Markdown content="# Title" className="prose-lg" />);
    expect(container.querySelector('.rmk-root')!).toHaveClass('prose-lg');
  });

  it('lets you override a component', () => {
    render(
      <Markdown
        content="[link](https://example.com)"
        components={{ a: ({ children }) => <a data-testid="custom-link">{children}</a> }}
      />,
    );
    expect(screen.getByTestId('custom-link')).toBeInTheDocument();
  });

  it('mdToReactElement returns a renderable element', () => {
    render(mdToReactElement('## Sub'));
    expect(screen.getByRole('heading', { name: 'Sub' }).tagName).toBe('H2');
  });
});
