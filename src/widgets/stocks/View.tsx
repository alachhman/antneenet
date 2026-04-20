import { useQuery } from '@tanstack/react-query';
import { Label, DataRow } from '../../ui';

export type StocksConfig = { tickers: string[] };

function isMarketHours(d = new Date()) {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  // 13:30–20:00 UTC = 9:30–16:00 ET (ignoring DST nuance; close enough for refetch cadence)
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  return mins >= 13 * 60 + 30 && mins <= 20 * 60;
}

async function fetchQuotes(tickers: string[]) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stocks?symbols=${tickers.join(',')}`;
  const r = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string } });
  if (!r.ok) throw new Error('stocks failed');
  const j = await r.json();
  return j.quotes as Array<{ symbol: string; price: number; changePct: number }>;
}

export function View({ config }: { instanceId: string; config: StocksConfig }) {
  const live = isMarketHours();
  const { data = [] } = useQuery({
    queryKey: ['stocks', config.tickers.join(',')],
    queryFn: () => fetchQuotes(config.tickers),
    staleTime: live ? 60_000 : 15 * 60_000,
    refetchInterval: live ? 60_000 : 15 * 60_000,
    enabled: config.tickers.length > 0,
  });

  return (
    <div>
      <Label>Stocks</Label>
      {config.tickers.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Add tickers via settings.</div>
      )}
      {data.map((q) => (
        <DataRow
          key={q.symbol}
          label={q.symbol}
          value={`${q.price.toFixed(2)} ${q.changePct >= 0 ? '▲' : '▼'}${q.changePct.toFixed(2)}%`}
          trend={q.changePct > 0 ? 'up' : q.changePct < 0 ? 'down' : 'neutral'}
        />
      ))}
    </div>
  );
}
