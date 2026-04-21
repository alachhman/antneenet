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
        <div
          key={i}
          style={{
            // minmax(0, ...) + min-width:0 on inputs lets the URL column
            // shrink below its content width on narrow viewports so the
            // trailing × never overflows off-screen.
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr) auto',
            gap: 6,
            marginBottom: 6,
            alignItems: 'center',
          }}
        >
          <input
            aria-label="name"
            value={it.name}
            onChange={(e) => update(i, { name: e.target.value })}
            style={{
              boxShadow: 'var(--inset)',
              padding: 6,
              borderRadius: 6,
              minWidth: 0,
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <input
            aria-label="url"
            value={it.url}
            onChange={(e) => update(i, { url: e.target.value })}
            style={{
              boxShadow: 'var(--inset)',
              padding: 6,
              borderRadius: 6,
              minWidth: 0,
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={() => remove(i)}
            aria-label={`remove ${it.name || 'bookmark'}`}
            style={{
              color: 'var(--down)',
              padding: '4px 8px',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
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
