import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { View } from './View';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('github view', () => {
  it('shows placeholder when unconfigured', () => {
    render(wrap(<View instanceId="x" config={{ owner: '', repo: '', projectNumber: 0 }} />));
    expect(screen.getByText(/configure/i)).toBeInTheDocument();
  });

  it('renders the header link when configured', () => {
    render(
      wrap(<View instanceId="x" config={{ owner: 'me', repo: 'proj', projectNumber: 1 }} />),
    );
    expect(screen.getByText('me/proj')).toBeInTheDocument();
  });
});
