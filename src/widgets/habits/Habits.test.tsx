import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { View } from './View';

vi.mock('./queries', () => ({
  useHabits: () => ({ data: [] }),
  useCheckins: () => ({ data: [] }),
  useToggleCheckin: () => ({ mutate: vi.fn() }),
  todayISO: () => '2026-04-20',
}));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('habits view', () => {
  it('shows placeholder when no habits', () => {
    render(wrap(<View instanceId="x" config={{}} />));
    expect(screen.getByText(/add habits/i)).toBeInTheDocument();
  });
});
