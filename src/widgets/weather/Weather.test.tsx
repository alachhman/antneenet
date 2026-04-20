import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { View } from './View';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('weather view', () => {
  it('renders the header', () => {
    render(wrap(<View instanceId="x" config={{ city: 'SF', lat: NaN, lon: NaN, units: 'F' }} />));
    expect(screen.getByText(/weather · sf/i)).toBeInTheDocument();
  });
});
