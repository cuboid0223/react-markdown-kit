import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useConsent } from '../src/hooks/useConsent';
import type { ConsentData } from '../src/types';

function Harness(props: Parameters<typeof useConsent>[0]) {
  const { data, loading, error, checkboxes, toggle, allRequiredChecked } =
    useConsent(props);
  if (loading) return <p>loading</p>;
  if (error) return <p>error: {error.message}</p>;
  return (
    <div>
      <h1 data-testid="title">{data?.title}</h1>
      <p data-testid="gate">{String(allRequiredChecked)}</p>
      {checkboxes.map((cb) => (
        <button key={cb.id} data-testid={`cb-${cb.id}`} onClick={() => toggle(cb.id)}>
          {cb.id}:{String(cb.checked)}
        </button>
      ))}
    </div>
  );
}

const data: ConsentData = {
  title: 'Direct',
  contentMarkdown: '# Direct',
  status: 'pending',
  checkboxes: [
    { id: 'r', label: 'required', required: true },
    { id: 'o', label: 'optional', required: false, defaultChecked: true },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useConsent', () => {
  it('uses provided data without fetching and tracks required gating', () => {
    render(<Harness data={data} />);
    expect(screen.getByTestId('title')).toHaveTextContent('Direct');
    // optional starts checked (defaultChecked), required does not.
    expect(screen.getByTestId('cb-o')).toHaveTextContent('o:true');
    expect(screen.getByTestId('cb-r')).toHaveTextContent('r:false');
    expect(screen.getByTestId('gate')).toHaveTextContent('false');

    fireEvent.click(screen.getByTestId('cb-r'));
    expect(screen.getByTestId('gate')).toHaveTextContent('true');
  });

  it('fetches via fetchOptions and normalizes the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: 'en\n# Fetched Title\nbody\n- [] A',
        status: 0,
        version: '1',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <Harness fetchOptions={{ endpoint: '/api/consent' }} locale="en" />,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('title')).toHaveTextContent('Fetched Title'),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/consent',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('surfaces a fetch error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    render(<Harness fetchOptions={{ endpoint: '/api/consent' }} />);
    await waitFor(() =>
      expect(screen.getByText(/error:/)).toBeInTheDocument(),
    );
  });
});
