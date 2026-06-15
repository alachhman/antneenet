import type { PmbotConfig } from './View';

// No user-configurable options for MVP — the widget shows the whole bot state.
export function Settings(_: { config: PmbotConfig; onChange: (next: PmbotConfig) => void }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
      Live view of the Polymarket bot. Data is pushed from the laptop exporter every ~60s.
    </div>
  );
}
