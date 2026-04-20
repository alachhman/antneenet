import { useState } from 'react';
import type { StocksConfig } from './View';

export function Settings({ config, onChange }: { config: StocksConfig; onChange: (c: StocksConfig) => void }) {
  const [sym, setSym] = useState('');
  function add() {
    const v = sym.trim().toUpperCase();
    if (!v || config.tickers.includes(v)) return;
    onChange({ tickers: [...config.tickers, v] });
    setSym('');
  }
  function remove(t: string) {
    onChange({ tickers: config.tickers.filter((x) => x !== t) });
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          aria-label="ticker"
          value={sym}
          onChange={(e) => setSym(e.target.value)}
          placeholder="AAPL, XAU, ..."
          style={{ flex: 1, boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
        />
        <button onClick={add} style={{ color: 'var(--accent)' }}>Add</button>
      </div>
      {config.tickers.map((t) => (
        <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: 4, fontSize: 12 }}>
          <span>{t}</span>
          <button onClick={() => remove(t)} style={{ color: 'var(--down)' }}>×</button>
        </div>
      ))}
    </div>
  );
}
