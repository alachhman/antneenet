import { useQuery } from '@tanstack/react-query';
import { Label } from '../../ui';

export type StocksConfig = { tickers: string[] };

type Quote = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
};

function isMarketHours(d = new Date()) {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  // 13:30–20:00 UTC = 9:30–16:00 ET (ignoring DST nuance; close enough for refetch cadence)
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  return mins >= 13 * 60 + 30 && mins <= 20 * 60;
}

async function fetchQuotes(tickers: string[]): Promise<Quote[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stocks?symbols=${tickers.join(',')}`;
  const r = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}`,
    },
  });
  if (!r.ok) throw new Error('stocks failed');
  const j = await r.json();
  return j.quotes as Quote[];
}

function formatPrice(p: number): string {
  // Show 2 decimals for typical equity/gold prices.
  return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function View({ config }: { instanceId: string; config: StocksConfig }) {
  const live = isMarketHours();
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['stocks-rich', config.tickers.join(',')],
    queryFn: () => fetchQuotes(config.tickers),
    staleTime: live ? 60_000 : 15 * 60_000,
    refetchInterval: live ? 60_000 : 15 * 60_000,
    enabled: config.tickers.length > 0,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Label>Stocks</Label>

      {config.tickers.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Add tickers via settings.</div>
      )}

      {isLoading && config.tickers.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading…</div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: 'var(--down)' }}>Error loading quotes</div>
      )}

      {/* Responsive grid: cards flow into columns on wider tiles, stack on narrow.
          minmax(0, 1fr) keeps them from overflowing the widget. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))',
          gap: 8,
        }}
      >
        {data.map((q) => (
          <StockCard key={q.symbol} quote={q} />
        ))}
      </div>
    </div>
  );
}

function StockCard({ quote }: { quote: Quote }) {
  const up = quote.changePct > 0;
  const down = quote.changePct < 0;
  const color = up ? 'var(--up)' : down ? 'var(--down)' : 'var(--text-dim)';
  const arrow = up ? '▲' : down ? '▼' : '·';

  return (
    <div
      style={{
        boxShadow: 'var(--raised-sm)',
        borderRadius: 'var(--radius-inset)',
        background: 'var(--bg)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.6px',
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
        }}
      >
        {quote.symbol}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)' }}>
          {formatPrice(quote.price)}
        </span>
        <span style={{ fontSize: 12, color, fontWeight: 500 }}>
          {arrow} {Math.abs(quote.changePct).toFixed(2)}%
        </span>
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-dim)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={quote.name}
      >
        {quote.name}
      </div>
    </div>
  );
}
