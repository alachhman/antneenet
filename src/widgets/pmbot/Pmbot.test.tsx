import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import type { PmbotSnapshot } from '../../lib/database-types';

const snapshotMock = vi.hoisted(() => ({ value: null as unknown }));
const tradesMock = vi.hoisted(() => ({ value: [] as unknown[] }));

vi.mock('./queries', () => ({
  usePmbotSnapshot: () => ({ data: snapshotMock.value, isLoading: false, error: null }),
  usePmbotTrades: () => ({ data: tradesMock.value, isLoading: false, error: null }),
}));

import { View } from './View';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

function fullSnapshot(overrides: Partial<PmbotSnapshot> = {}): PmbotSnapshot {
  return {
    generated_at: new Date().toISOString(),
    balance: { current: 20.01, buying_power: 20.01, currency: 'USD' },
    pnl: { today_realized: -3.5, daily_loss_limit: 10 },
    risk: { max_order_usd: 5, max_total_notional_usd: 40, open_notional: 7 },
    strategies: [
      { name: 'basket_arb', live: true, run_started_at: null, last_activity: null },
      { name: 'news_signal', live: true, run_started_at: null, last_activity: null },
    ],
    open_orders: [],
    recent_fills: [],
    news_decisions: [],
    health: {
      daemons: [
        { name: 'basket_arb', up: true, pid: 719 },
        { name: 'news_signal', up: false, pid: null },
      ],
      kill_switch: false,
      feeds_ok: 5,
    },
    ...overrides,
  };
}

describe('pmbot view', () => {
  it('shows a waiting state before the first snapshot', () => {
    snapshotMock.value = { data: {}, updated_at: new Date().toISOString() };
    render(wrap(<View instanceId="x" config={{}} />));
    expect(screen.getByText(/waiting for first snapshot/i)).toBeInTheDocument();
  });

  it('renders balance and today P&L', () => {
    snapshotMock.value = { data: fullSnapshot(), updated_at: new Date().toISOString() };
    render(wrap(<View instanceId="x" config={{}} />));
    // $20.01 appears as both the hero balance and the buying-power stat.
    expect(screen.getAllByText(/\$20\.01/).length).toBeGreaterThan(0);
    // negative realized today shows as a loss
    expect(screen.getByText(/-\$3\.50/)).toBeInTheDocument();
  });

  it('shows each strategy with its live state', () => {
    snapshotMock.value = { data: fullSnapshot(), updated_at: new Date().toISOString() };
    render(wrap(<View instanceId="x" config={{}} />));
    // Names render inside richer chips ("basket_arb LIVE") and appear in both
    // the Strategies and Health sections, so use substring getAllByText.
    expect(screen.getAllByText(/basket_arb/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/news_signal/).length).toBeGreaterThan(0);
    // Strategy live badges render.
    expect(screen.getAllByText(/LIVE/).length).toBeGreaterThan(0);
  });

  it('flags stale data when the snapshot is old', () => {
    const old = new Date(Date.now() - 10 * 60_000).toISOString();
    snapshotMock.value = { data: fullSnapshot({ generated_at: old }), updated_at: old };
    render(wrap(<View instanceId="x" config={{}} />));
    expect(screen.getByText(/stale/i)).toBeInTheDocument();
  });

  it('shows empty-state rows when there are no open orders or fills', () => {
    snapshotMock.value = { data: fullSnapshot(), updated_at: new Date().toISOString() };
    render(wrap(<View instanceId="x" config={{}} />));
    expect(screen.getByText(/no open orders/i)).toBeInTheDocument();
  });
});
