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
        label: 'Hacker News',
        timestamp: (s.time ?? 0) * 1000,
        // HN API doesn't include a snippet for link posts; leave blank per spec.
        snippet: '',
      };
    }),
  );
  return items.filter(Boolean) as Item[];
}

async function fetchReddit(sub: string): Promise<Item[]> {
  // Reddit's /*.json endpoint is blocked by their anti-bot CDN for Supabase
  // Edge IPs. The RSS feed at /*.rss is still open and served as Atom XML.
  try {
    const r = await fetch(`https://www.reddit.com/r/${sub}/top.rss?t=day&limit=15`, {
      headers: {
        'user-agent': 'antneenet-dashboard/0.1',
        accept: 'application/atom+xml, application/rss+xml, application/xml',
      },
    });
    if (!r.ok) {
      console.error(`[reddit] ${sub} fetch failed: ${r.status}`);
      return [];
    }
    const text = await r.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const doc = parser.parse(text);
    const entries = doc?.feed?.entry ?? doc?.rss?.channel?.item ?? [];
    const list = Array.isArray(entries) ? entries : [entries];
    return list.slice(0, 15).map((e: any) => {
      // Atom: link is {@_href, @_rel}; RSS: link is a string.
      const rawLink = e.link;
      const link =
        typeof rawLink === 'string'
          ? rawLink
          : Array.isArray(rawLink)
          ? rawLink[0]?.['@_href']
          : rawLink?.['@_href'];
      const pub = e.updated ?? e.published ?? e.pubDate;
      // Atom content is in e.content with @_type (text/html); RSS has e.description.
      const rawContent = e.content?.['#text'] ?? e.content ?? e.description ?? e.summary ?? '';
      return {
        title: (e.title?.['#text'] ?? e.title) ?? '',
        url: link ?? '',
        source: 'rdt' as const,
        label: `r/${sub}`,
        timestamp: pub ? Date.parse(pub) : 0,
        snippet: truncate(stripHtml(String(rawContent)), SNIPPET_MAX),
      } satisfies Item;
    }).filter((i: Item) => i.title && i.url);
  } catch (e) {
    console.error(`[reddit] ${sub} exception:`, e);
    return [];
  }
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'rss';
  }
}

async function fetchRSS(feed: string): Promise<Item[]> {
  try {
    const r = await fetch(feed);
    if (!r.ok) {
      console.error(`[rss] ${feed} fetch failed: ${r.status}`);
      return [];
    }
    const text = await r.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const doc = parser.parse(text);
    const entries = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? [];
    // Prefer the feed's own declared title over the URL hostname.
    const feedTitle: string | undefined =
      doc?.rss?.channel?.title ??
      (typeof doc?.feed?.title === 'string' ? doc.feed.title : doc?.feed?.title?.['#text']);
    const label = feedTitle ? String(feedTitle).trim() : hostLabel(feed);
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
          label,
          timestamp: pub ? Date.parse(pub) : 0,
          snippet: rssSnippet(e),
        } satisfies Item;
      })
      .filter((i: Item) => i.title && i.url);
  } catch (e) {
    console.error(`[rss] ${feed} exception:`, e);
    return [];
  }
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
