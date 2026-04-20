import type { BookmarksConfig } from './View';

export function Settings({
  config,
  onChange,
}: {
  config: BookmarksConfig;
  onChange: (c: BookmarksConfig) => void;
}) {
  function update(i: number, patch: Partial<{ name: string; url: string }>) {
    const items = config.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange({ items });
  }
  function remove(i: number) {
    onChange({ items: config.items.filter((_, idx) => idx !== i) });
  }
  function add() {
    onChange({ items: [...config.items, { name: 'New', url: 'https://' }] });
  }
  return (
    <div>
      {config.items.map((it, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 6, marginBottom: 6 }}>
          <input
            aria-label="name"
            value={it.name}
            onChange={(e) => update(i, { name: e.target.value })}
            style={{ boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
          />
          <input
            aria-label="url"
            value={it.url}
            onChange={(e) => update(i, { url: e.target.value })}
            style={{ boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
          />
          <button onClick={() => remove(i)} style={{ color: 'var(--down)' }}>×</button>
        </div>
      ))}
      <button
        onClick={add}
        style={{ boxShadow: 'var(--raised-sm)', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: 'var(--accent)' }}
      >
        + Add bookmark
      </button>
    </div>
  );
}
