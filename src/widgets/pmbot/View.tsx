import { useEffect, useState } from 'react';
import { Label, DataRow, Inset, ScrollableArea } from '../../ui';
import type {
  PmbotSnapshot,
  PmbotStrategy,
  PmbotOrder,
  PmbotFill,
  PmbotNewsDecision,
  PmbotHealth,
} from '../../lib/database-types';
import { usePmbotSnapshot } from './queries';

export type PmbotConfig = Record<string, never>;

const STALE_MS = 180_000;
const AMBER = '#d97706';

function fmtUsd(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ago(iso: string, now: number): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  return `${Math.round(secs / 3600)}h ago`;
}

// "now" as state so render stays pure; ticks every 15s to keep "ago"/staleness fresh.
function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => new Date().getTime());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date().getTime()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const dim = { fontSize: 11, color: 'var(--text-dim)' } as const;
const empty = (text: string) => (
  <div style={{ ...dim, padding: '6px 0', fontStyle: 'italic' }}>{text}</div>
);

export function View(_: { instanceId: string; config: PmbotConfig }) {
  const { data } = usePmbotSnapshot();
  const now = useNow();
  const snap = (data?.data ?? {}) as Partial<PmbotSnapshot>;
  const hasData = Boolean(snap.generated_at);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label>Trading Bot</Label>
        {hasData && (
          <Freshness generatedAt={snap.generated_at!} killed={snap.health?.kill_switch} now={now} />
        )}
      </div>

      {!hasData ? (
        empty('Waiting for first snapshot from the bot…')
      ) : (
        <ScrollableArea>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
            <PnlSection snap={snap as PmbotSnapshot} />
            <StrategiesSection strategies={snap.strategies ?? []} decisions={snap.news_decisions ?? []} />
            <TradesSection orders={snap.open_orders ?? []} fills={snap.recent_fills ?? []} />
            <HealthSection health={snap.health} />
          </div>
        </ScrollableArea>
      )}
    </div>
  );
}

function Freshness({ generatedAt, killed, now }: { generatedAt: string; killed?: boolean; now: number }) {
  const stale = now - new Date(generatedAt).getTime() > STALE_MS;
  if (killed) {
    return <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--down)' }}>● KILL SWITCH</span>;
  }
  if (stale) {
    return <span style={{ fontSize: 10, fontWeight: 600, color: AMBER }}>● stale (laptop asleep?)</span>;
  }
  return <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>updated {ago(generatedAt, now)}</span>;
}

function PnlSection({ snap }: { snap: PmbotSnapshot }) {
  const realized = snap.pnl?.today_realized ?? 0;
  const limit = snap.pnl?.daily_loss_limit ?? 0;
  const lossToday = Math.max(0, -realized);
  const lossPct = limit > 0 ? Math.min(100, (lossToday / limit) * 100) : 0;
  const notional = snap.risk?.open_notional ?? 0;
  const maxNotional = snap.risk?.max_total_notional_usd ?? 0;

  return (
    <Inset style={{ padding: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ ...dim, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Balance</span>
        <span style={{ fontSize: 24, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {fmtUsd(snap.balance?.current ?? 0)}
        </span>
      </div>
      <DataRow
        label="Today realized"
        value={fmtUsd(realized)}
        trend={realized > 0 ? 'up' : realized < 0 ? 'down' : 'neutral'}
      />
      <DataRow
        label={`Loss vs limit`}
        value={`${fmtUsd(lossToday)} / ${fmtUsd(limit)}`}
        trend={lossToday > 0 ? 'down' : 'neutral'}
      />
      <Bar pct={lossPct} color={lossPct > 80 ? 'var(--down)' : AMBER} />
      <DataRow label="Open notional vs cap" value={`${fmtUsd(notional)} / ${fmtUsd(maxNotional)}`} />
    </Inset>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 5, borderRadius: 3, background: 'var(--divider)', overflow: 'hidden', margin: '4px 0 2px' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 300ms' }} />
    </div>
  );
}

function StrategiesSection({
  strategies,
  decisions,
}: {
  strategies: PmbotStrategy[];
  decisions: PmbotNewsDecision[];
}) {
  return (
    <div>
      <Label>Strategies</Label>
      {strategies.length === 0
        ? empty('No strategy runs recorded.')
        : strategies.map((s) => (
            <DataRow
              key={s.name}
              label={s.name}
              value={
                <span style={{ fontWeight: 600, color: s.live ? 'var(--up)' : 'var(--text-dim)' }}>
                  {s.live ? '● LIVE' : '○ stopped'}
                </span>
              }
            />
          ))}
      <div style={{ ...dim, marginTop: 8, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        Recent news decisions
      </div>
      {decisions.length === 0
        ? empty('No news-driven bets yet (most articles → no bet).')
        : decisions.slice(0, 8).map((d, i) => (
            <DataRow
              key={`${d.market_slug}-${i}`}
              label={
                <span title={d.reasoning} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, display: 'inline-block' }}>
                  {d.market_slug}
                </span>
              }
              value={
                <span style={{ color: d.placed ? 'var(--up)' : 'var(--text-dim)' }}>
                  {d.outcome}
                  {d.confidence != null ? ` ${Math.round(d.confidence * 100)}%` : ''}
                  {d.placed ? ' ✓' : ''}
                </span>
              }
            />
          ))}
    </div>
  );
}

function TradesSection({ orders, fills }: { orders: PmbotOrder[]; fills: PmbotFill[] }) {
  return (
    <div>
      <Label>Trades</Label>
      <div style={{ ...dim, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Open orders</div>
      {orders.length === 0
        ? empty('No open orders.')
        : orders.map((o, i) => (
            <DataRow
              key={`o-${i}`}
              label={`${o.side} ${o.outcome} · ${o.market_id}`}
              value={`${o.size} @ ${fmtUsd(o.price)}`}
            />
          ))}
      <div style={{ ...dim, marginTop: 8, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Recent fills</div>
      {fills.length === 0
        ? empty('No fills yet.')
        : fills.slice(0, 10).map((f, i) => (
            <DataRow
              key={`f-${i}`}
              label={`${f.side} ${f.outcome} · ${f.market_id}`}
              value={`${f.size} @ ${fmtUsd(f.price)}`}
            />
          ))}
    </div>
  );
}

function HealthSection({ health }: { health?: PmbotHealth }) {
  const daemons = health?.daemons ?? [];
  return (
    <div>
      <Label>Health</Label>
      {daemons.length === 0
        ? empty('No daemon info.')
        : daemons.map((d) => (
            <DataRow
              key={d.name}
              label={d.name}
              value={
                <span style={{ color: d.up ? 'var(--up)' : 'var(--down)', fontWeight: 600 }}>
                  {d.up ? `● up (pid ${d.pid ?? '?'})` : '● down'}
                </span>
              }
            />
          ))}
      <DataRow
        label="Kill switch"
        value={
          <span style={{ color: health?.kill_switch ? 'var(--down)' : 'var(--up)', fontWeight: 600 }}>
            {health?.kill_switch ? 'TRIPPED' : 'armed'}
          </span>
        }
      />
      <DataRow label="News feeds OK" value={`${health?.feeds_ok ?? 0} / 5`} />
    </div>
  );
}
