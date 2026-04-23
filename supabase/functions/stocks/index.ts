// Finnhub proxy. Supports equity symbols + XAU (gold) via OANDA:XAU_USD.
//
// For each symbol we fetch /quote (price + change) plus /stock/profile2
// (company name) in parallel. Gold / forex has no profile, so we hand-roll
// a friendly display name instead.
const KEY = Deno.env.get('FINNHUB_API_KEY')!;
const QUOTE = 'https://finnhub.io/api/v1/quote';
const PROFILE = 'https://finnhub.io/api/v1/stock/profile2';

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'GET, OPTIONS',
    'content-type': 'application/json',
  };
}

type Quote = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
};

async function fetchQuoteRaw(apiSym: string) {
  const r = await fetch(`${QUOTE}?symbol=${encodeURIComponent(apiSym)}&token=${KEY}`);
  if (!r.ok) return null;
  const j = await r.json();
  if (typeof j.c !== 'number' || j.c === 0) return null;
  return { price: j.c as number, changePct: (j.dp ?? 0) as number };
}

async function fetchProfileName(apiSym: string): Promise<string> {
  const r = await fetch(`${PROFILE}?symbol=${encodeURIComponent(apiSym)}&token=${KEY}`);
  if (!r.ok) return '';
  const j = await r.json();
  return typeof j.name === 'string' ? j.name : '';
}

async function fetchOne(sym: string): Promise<Quote | null> {
  // Gold is a first-class ticker in the UI — it maps to OANDA's forex feed
  // and has no /stock/profile2 entry, so we short-circuit the name.
  if (sym === 'XAU') {
    const q = await fetchQuoteRaw('OANDA:XAU_USD');
    if (!q) return null;
    return { symbol: 'XAU', name: 'Gold (spot)', ...q };
  }
  const [q, name] = await Promise.all([fetchQuoteRaw(sym), fetchProfileName(sym)]);
  if (!q) return null;
  return { symbol: sym, name: name || sym, ...q };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  const url = new URL(req.url);
  const symbols = (url.searchParams.get('symbols') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!symbols.length) return new Response(JSON.stringify({ quotes: [] }), { headers: cors() });
  const quotes = (await Promise.all(symbols.map(fetchOne))).filter(Boolean);
  return new Response(JSON.stringify({ quotes }), { headers: cors() });
});
