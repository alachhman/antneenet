import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { View } from './View';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('tech feed', () => {
  it('renders the header', () => {
    render(wrap(<View instanceId="x" config={{ sources: [] }} />));
    expect(screen.getByText(/tech feed/i)).toBeInTheDocument();
  });
});
