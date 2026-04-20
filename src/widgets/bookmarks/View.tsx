import { Label, Inset } from '../../ui';

export type BookmarksConfig = { items: Array<{ name: string; url: string }> };

function faviconFor(url: string) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=32&domain=${host}`;
  } catch {
    return null;
  }
}

export function View({ config }: { instanceId: string; config: BookmarksConfig }) {
  if (!config.items.length) {
    return (
      <div>
        <Label>Bookmarks</Label>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          Enter edit mode → gear icon to add bookmarks.
        </div>
      </div>
    );
  }
  return (
    <div>
      <Label>Bookmarks</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {config.items.map((b, i) => (
          <a key={i} href={b.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <Inset style={{ textAlign: 'center', padding: 8 }}>
              <img src={faviconFor(b.url) ?? ''} alt={b.name} width={18} height={18} style={{ display: 'block', margin: '0 auto 4px' }} />
              <div style={{ fontSize: 10, color: 'var(--text)' }}>{b.name}</div>
            </Inset>
          </a>
        ))}
      </div>
    </div>
  );
}
