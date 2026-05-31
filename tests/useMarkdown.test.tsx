import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useMarkdown } from '../src/hooks/useMarkdown';

function Harness({ md }: { md: string }) {
  const el = useMarkdown(md);
  return <article data-testid="article">{el}</article>;
}

describe('useMarkdown', () => {
  it('renders markdown via the hook', () => {
    render(<Harness md={'# Hooked\n\nbody'} />);
    expect(screen.getByRole('heading', { name: 'Hooked' })).toBeInTheDocument();
    expect(screen.getByTestId('article')).toContainElement(
      screen.getByText('body'),
    );
  });
});
