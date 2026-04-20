import { XMLParser } from 'fast-xml-parser';

type Item = {
  title: string;
  url: string;
  source: 'hn' | 'rss' | 'rdt';
  label: string;
  timestamp: number;
  snippet?: string;
};
type Source = { type: 'hn' | 'reddit' | 'rss'; value: string };

const SNIPPET_MAX = 220;

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json',
  };
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + '…';
}

function redditSnippet(selftext: string | undefined): string {
  if (!selftext) return '';
  if (selftext === '[deleted]' || selftext === '[removed]') return '';
  return truncate(stripHtml(selftext), SNIPPET_MAX);
}

function rssSnippet(entry: any): string {
  // Try description, summary, content:encoded — in that priority.
  const raw =
    entry?.description ??
    entry?.summary?.['#text'] ??
    entry?.summary ??
    entry?.['content:encoded'] ??
    entry?.content?.['#text'] ??
    entry?.content ??
    '';
  const text = typeof raw === 'string' ? raw : raw?.['#text'] ?? '';
  return truncate(stripHtml(String(text)), SNIPPET_MAX);
}

async function fetchHN(): Promise<Item[]> {
  const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  const ids: number[] = (await topRes.json()).slice(0, 20);
  const items = await Promise.all(
    ids.map(async (id) => {
      const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      const s = await r.json();
      if (!s || !s.title) return null;
      return {
        title: s.title,
        url: s.url ?? `https://news.ycombinator.com/item?id=${id}`,
        source: 'hn' as const,
        label: 'hn',
        timestamp: (s.time ?? 0) * 1000,
        // HN API doesn't include a snippet for link posts; leave blank per spec.
        snippet: '',
      };
    }),
  );
  return items.filter(Boolean) as Item[];
}

async function fetchReddit(sub: string): Promise<Item[]> {
  const r = await fetch(`https://www.reddit.com/r/${sub}/top.json?limit=15&t=day`, {
    headers: { 'user-agent': 'antneenet-dashboard/0.1' },
  });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.data?.children ?? []).map((c: any) => ({
    title: c.data.title,
    url: `https://reddit.com${c.data.permalink}`,
    source: 'rdt' as const,
    label: `r/${sub}`,
    timestamp: (c.data.created_utc ?? 0) * 1000,
    snippet: redditSnippet(c.data.selftext),
  }));
}

async function fetchRSS(feed: string): Promise<Item[]> {
  const r = await fetch(feed);
  if (!r.ok) return [];
  const text = await r.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(text);
  const entries = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? [];
  return (Array.isArray(entries) ? entries : [entries])
    .slice(0, 15)
    .map((e: any) => {
      const link =
        typeof e.link === 'string' ? e.link : e.link?.['@_href'] ?? e.link?.[0]?.['@_href'];
      const pub = e.pubDate ?? e.published ?? e.updated;
      return {
        title: (e.title?.['#text'] ?? e.title) ?? '',
        url: link ?? '',
        source: 'rss' as const,
        label: 'rss',
        timestamp: pub ? Date.parse(pub) : 0,
        snippet: rssSnippet(e),
      } satisfies Item;
    })
    .filter((i: Item) => i.title && i.url);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: cors() });
  }
  let body: { sources?: Source[] };
  try {
    body = await req.json();
  } catch {
    return new Response('{}', { status: 400, headers: cors() });
  }
  const sources = body.sources ?? [];
  const results = await Promise.all(
    sources.map((s) => {
      if (s.type === 'hn') return fetchHN();
      if (s.type === 'reddit') return fetchReddit(s.value);
      return fetchRSS(s.value);
    }),
  );
  const merged = results.flat().sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  return new Response(JSON.stringify({ items: merged }), { headers: cors() });
});
