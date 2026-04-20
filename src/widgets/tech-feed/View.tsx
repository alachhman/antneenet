import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Label, ScrollableArea } from '../../ui';
import { useIsNarrow } from '../../lib/use-breakpoint';

type FeedSource = { type: 'hn' | 'reddit' | 'rss'; value: string };
type FeedCategory = { name: string; sources: FeedSource[] };

// Config shape supports both the current categorized form and legacy flat sources.
// Legacy shape is coerced into a single "News" category on read.
export type TechFeedConfig =
  | { categories: FeedCategory[] }
  | { sources: FeedSource[] };

type Item = {
  title: string;
  url: string;
  source: string;
  label: string;
  timestamp: number;
  snippet?: string;
};

function normalizeConfig(config: TechFeedConfig): FeedCategory[] {
  if ('categories' in config && Array.isArray(config.categories)) {
    return config.categories;
  }
  if ('sources' in config && Array.isArray(config.sources)) {
    return [{ name: 'News', sources: config.sources }];
  }
  return [];
}

async function fetchFeed(sources: FeedSource[]): Promise<Item[]> {
  if (!sources.length) return [];
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

const BADGE_PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [20, 184, 166],   // teal
  [249, 115, 22],   // orange
  [225, 29, 72],    // rose
  [139, 92, 246],   // violet
  [37, 99, 235],    // blue
  [22, 163, 74],    // green
  [219, 39, 119],   // pink
  [8, 145, 178],    // cyan
  [217, 119, 6],    // amber
  [79, 70, 229],    // indigo
];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function badgeColors(label: string): { bg: string; fg: string } {
  const [r, g, b] = BADGE_PALETTE[hashIndex(label, BADGE_PALETTE.length)];
  return { bg: `rgba(${r}, ${g}, ${b}, 0.14)`, fg: `rgb(${r}, ${g}, ${b})` };
}

export function View({ config }: { instanceId: string; config: TechFeedConfig }) {
  const categories = normalizeConfig(config);
  const [activeIdx, setActiveIdx] = useState(0);
  const isNarrow = useIsNarrow();
  const safeIdx = Math.min(activeIdx, Math.max(0, categories.length - 1));
  const activeCategory = categories[safeIdx];

  // Fetch each category in parallel so pill-count badges can show live totals.
  // Queries are keyed on sources so cache is stable across tab switches.
  const queries = useQueries({
    queries: categories.map((c) => ({
      queryKey: ['tech-feed', c.name, JSON.stringify(c.sources)],
      queryFn: () => fetchFeed(c.sources),
      staleTime: 5 * 60_000,
      refetchInterval: 5 * 60_000,
      enabled: c.sources.length > 0,
    })),
  });

  const activeQuery = queries[safeIdx];
  const activeData: Item[] = activeQuery?.data ?? [];
  const activeIsLoading = !!activeQuery?.isLoading;

  if (categories.length === 0) {
    return (
      <div>
        <Label>News Feed</Label>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          Enter edit mode → gear icon to configure feeds.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Label>
        News Feed{activeCategory ? ` · ${activeCategory.name}` : ''}
      </Label>

      {/* Category pills */}
      {categories.length > 1 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 14,
          }}
        >
          {categories.map((c, idx) => {
            const isActive = idx === safeIdx;
            const q = queries[idx];
            const count = q?.data?.length;
            return (
              <button
                key={c.name}
                onClick={() => setActiveIdx(idx)}
                style={{
                  boxShadow: isActive ? 'var(--inset)' : 'var(--raised-sm)',
                  padding: '5px 14px',
                  borderRadius: 8,
                  fontSize: 11,
                  color: isActive ? 'var(--accent)' : 'var(--text)',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {c.name}
                {typeof count === 'number' && (
                  <span style={{ marginLeft: 5, opacity: 0.7 }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Feed items for active category */}
      <ScrollableArea>
        {activeIsLoading && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loading…</div>
        )}
        {activeData.map((i, idx) => {
          const colors = badgeColors(i.label);
          return (
            <a
              key={idx}
              href={i.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                padding: '10px 0',
                fontSize: isNarrow ? 13 : 12,
                borderTop: '1px solid var(--divider)',
                color: 'var(--text)',
              }}
            >
              <div>
                <span
                  title={i.label}
                  style={{
                    display: 'inline-block',
                    width: isNarrow ? 90 : 110,
                    padding: '2px 8px',
                    marginRight: 8,
                    borderRadius: 5,
                    background: colors.bg,
                    color: colors.fg,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.2px',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    verticalAlign: '1px',
                    boxSizing: 'border-box',
                  }}
                >
                  {i.label}
                </span>
                <span style={{ color: 'var(--text-dim)', marginRight: 8 }}>{ago(i.timestamp)}</span>
                {i.title}
              </div>
              {i.snippet && (
                <div
                  style={{
                    marginTop: 5,
                    fontSize: isNarrow ? 12 : 11,
                    color: 'var(--text-dim)',
                    lineHeight: 1.45,
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
          );
        })}
      </ScrollableArea>
    </div>
  );
}
