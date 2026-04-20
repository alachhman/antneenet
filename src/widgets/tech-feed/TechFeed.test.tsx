import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { View } from './View';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('news feed', () => {
  it('renders the header when unconfigured', () => {
    render(wrap(<View instanceId="x" config={{ categories: [] }} />));
    expect(screen.getByText(/news feed/i)).toBeInTheDocument();
  });

  it('accepts legacy flat-sources config', () => {
    render(wrap(<View instanceId="x" config={{ sources: [] }} />));
    expect(screen.getByText(/news feed/i)).toBeInTheDocument();
  });

  it('renders category pills when multiple categories', () => {
    render(
      wrap(
        <View
          instanceId="x"
          config={{
            categories: [
              { name: 'Tech', sources: [] },
              { name: 'Finance', sources: [] },
              { name: 'Politics', sources: [] },
            ],
          }}
        />,
      ),
    );
    expect(screen.getByRole('button', { name: /tech/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /finance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /politics/i })).toBeInTheDocument();
  });
});
