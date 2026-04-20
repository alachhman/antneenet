import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { View } from './View';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('stocks view', () => {
  it('shows placeholder when no tickers', () => {
    render(wrap(<View instanceId="x" config={{ tickers: [] }} />));
    expect(screen.getByText(/add tickers/i)).toBeInTheDocument();
  });
});
