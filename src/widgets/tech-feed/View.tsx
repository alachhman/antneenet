import { useQuery } from '@tanstack/react-query';
import { Label } from '../../ui';

type FeedSource = { type: 'hn' | 'reddit' | 'rss'; value: string };
export type TechFeedConfig = { sources: FeedSource[] };

type Item = {
  title: string;
  url: string;
  source: string;
  label: string;
  timestamp: number;
  snippet?: string;
};

async function fetchFeed(sources: FeedSource[]): Promise<Item[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tech-feed`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}`,
    },
    body: JSON.stringify({ sources }),
  });
  if (!r.ok) throw new Error('feed failed');
  const j = await r.json();
  return j.items ?? [];
}

function ago(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function View({ config }: { instanceId: string; config: TechFeedConfig }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['tech-feed', JSON.stringify(config.sources)],
    queryFn: () => fetchFeed(config.sources),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    enabled: config.sources.length > 0,
  });

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <Label>Tech Feed · {data.length}</Label>
      {isLoading && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loading…</div>}
      {data.map((i, idx) => (
        <a
          key={idx}
          href={i.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'block',
            padding: '6px 0',
            fontSize: 11,
            borderTop: '1px solid var(--divider)',
            color: 'var(--text)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>{i.label}</span>
              {i.title}
            </span>
            <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{ago(i.timestamp)}</span>
          </div>
          {i.snippet && (
            <div
              style={{
                marginTop: 3,
                fontSize: 10,
                color: 'var(--text-dim)',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {i.snippet}
            </div>
          )}
        </a>
      ))}
    </div>
  );
}
