import { Label, Inset } from '../../ui';
import { useIsNarrow } from '../../lib/use-breakpoint';

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
  const isNarrow = useIsNarrow();
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isNarrow
            ? 'repeat(3, 1fr)'
            : 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: 8,
        }}
      >
        {config.items.map((b, i) => (
          <a
            key={i}
            href={b.url}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Inset style={{ textAlign: 'center', padding: isNarrow ? '12px 6px' : '10px 6px' }}>
              <img
                src={faviconFor(b.url) ?? ''}
                alt={b.name}
                width={isNarrow ? 24 : 20}
                height={isNarrow ? 24 : 20}
                style={{ display: 'block', margin: '0 auto 6px' }}
              />
              <div
                style={{
                  fontSize: isNarrow ? 12 : 11,
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {b.name}
              </div>
            </Inset>
          </a>
        ))}
      </div>
    </div>
  );
}
