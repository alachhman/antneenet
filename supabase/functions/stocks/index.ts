// Finnhub proxy. Supports equity symbols + XAU (gold) via OANDA:XAU_USD.
const KEY = Deno.env.get('FINNHUB_API_KEY')!;
const QUOTE = 'https://finnhub.io/api/v1/quote';
const FOREX = 'https://finnhub.io/api/v1/forex/rates';

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'GET, OPTIONS',
    'content-type': 'application/json',
  };
}

type Quote = { symbol: string; price: number; changePct: number };

async function fetchOne(sym: string): Promise<Quote | null> {
  if (sym === 'XAU') {
    const r = await fetch(`${FOREX}?base=XAU&token=${KEY}`);
    if (!r.ok) return null;
    const j = await r.json();
    const usd = j.quote?.USD ? 1 / Number(j.quote.USD) : null;
    if (!usd) return null;
    return { symbol: 'XAU', price: usd, changePct: 0 };
  }
  const r = await fetch(`${QUOTE}?symbol=${encodeURIComponent(sym)}&token=${KEY}`);
  if (!r.ok) return null;
  const j = await r.json();
  if (typeof j.c !== 'number' || j.c === 0) return null;
  return { symbol: sym, price: j.c, changePct: j.dp ?? 0 };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  const url = new URL(req.url);
  const symbols = (url.searchParams.get('symbols') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!symbols.length) return new Response(JSON.stringify({ quotes: [] }), { headers: cors() });
  const quotes = (await Promise.all(symbols.map(fetchOne))).filter(Boolean);
  return new Response(JSON.stringify({ quotes }), { headers: cors() });
});
