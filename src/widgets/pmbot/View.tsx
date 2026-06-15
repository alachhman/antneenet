import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ScrollableArea } from '../../ui';
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

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };

function fmtUsd(n: number, decimals = 2): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
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

// ── primitives ──────────────────────────────────────────────────────────────

const STYLE = `
.pmbot-root { --pm-gap: 12px; }
.pmbot-card { transition: box-shadow .18s ease, transform .18s ease; }
.pmbot-card:hover { transform: translateY(-1px); }
@keyframes pmbot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: .45; transform: scale(.82); }
}
.pmbot-dot-live { animation: pmbot-pulse 1.8s ease-in-out infinite; }
`;

function Dot({ color, live = false }: { color: string; live?: boolean }) {
  return (
    <span
      className={live ? 'pmbot-dot-live' : undefined}
      style={{
        width: 7, height: 7, borderRadius: '50%', background: color,
        display: 'inline-block', boxShadow: `0 0 6px ${color}66`, flexShrink: 0,
      }}
    />
  );
}

function Chip({ children, color = 'var(--text-dim)' }: { children: ReactNode; color?: string }) {
  return (
    <span
      style={{
        ...mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.3px',
        color, background: 'var(--bg)', boxShadow: 'var(--raised-sm)',
        borderRadius: 6, padding: '2px 7px', display: 'inline-flex',
        alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{
        color: 'var(--accent)', fontSize: 10, letterSpacing: '1px',
        textTransform: 'uppercase', fontWeight: 700,
      }}>
        ▮ {children}
      </span>
      {right}
    </div>
  );
}

const dimText: CSSProperties = { fontSize: 11, color: 'var(--text-dim)' };

function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <div style={{
      ...dimText, fontStyle: 'italic', padding: '10px 12px',
      background: 'var(--bg)', boxShadow: 'var(--inset)', borderRadius: 'var(--radius-inset)',
    }}>
      {children}
    </div>
  );
}

// A compact left-label / right-value row with a hairline divider.
function Row({ left, right, first = false }: { left: ReactNode; right: ReactNode; first?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
      padding: '7px 2px', fontSize: 12,
      borderTop: first ? 'none' : '1px solid var(--divider)', minWidth: 0,
    }}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {left}
      </span>
      <span style={{ ...mono, flexShrink: 0 }}>{right}</span>
    </div>
  );
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="pmbot-card" style={{
      background: 'var(--bg)', boxShadow: 'var(--raised)', borderRadius: 'var(--radius-card)',
      padding: 'var(--space-4)', ...style,
    }}>
      {children}
    </div>
  );
}

// ── view ────────────────────────────────────────────────────────────────────

export function View(_: { instanceId: string; config: PmbotConfig }) {
  const { data } = usePmbotSnapshot();
  const now = useNow();
  const snap = (data?.data ?? {}) as Partial<PmbotSnapshot>;
  const hasData = Boolean(snap.generated_at);

  return (
    <div className="pmbot-root" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 10 }}>
      <style>{STYLE}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--accent)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700 }}>
          ▮ Trading&nbsp;Bot
        </span>
        {hasData && <Freshness generatedAt={snap.generated_at!} killed={snap.health?.kill_switch} now={now} />}
      </div>

      {!hasData ? (
        <EmptyRow>Waiting for first snapshot from the bot…</EmptyRow>
      ) : (
        <ScrollableArea>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
            <PnlCard snap={snap as PmbotSnapshot} />
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
    return <Chip color="var(--down)"><Dot color="var(--down)" /> KILL SWITCH</Chip>;
  }
  if (stale) {
    return <Chip color={AMBER}><Dot color={AMBER} /> stale</Chip>;
  }
  return <Chip color="var(--up)"><Dot color="var(--up)" live /> {ago(generatedAt, now)}</Chip>;
}

function PnlCard({ snap }: { snap: PmbotSnapshot }) {
  const realized = snap.pnl?.today_realized ?? 0;
  const limit = snap.pnl?.daily_loss_limit ?? 0;
  const lossToday = Math.max(0, -realized);
  const lossPct = limit > 0 ? Math.min(100, (lossToday / limit) * 100) : 0;
  const gaugeColor = lossPct > 80 ? 'var(--down)' : lossPct > 40 ? AMBER : 'var(--accent)';
  const notional = snap.risk?.open_notional ?? 0;
  const maxNotional = snap.risk?.max_total_notional_usd ?? 0;
  const realizedColor = realized > 0 ? 'var(--up)' : realized < 0 ? 'var(--down)' : 'var(--text-dim)';
  const arrow = realized > 0 ? '▲' : realized < 0 ? '▼' : '·';

  return (
    <Card style={{ paddingBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ ...dimText, fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 600 }}>
            Balance
          </div>
          <div style={{ ...mono, fontSize: 30, fontWeight: 500, lineHeight: 1.1, color: 'var(--text)', marginTop: 2 }}>
            {fmtUsd(snap.balance?.current ?? 0)}
          </div>
        </div>
        <Chip color={realizedColor}>{arrow} {fmtUsd(realized)} today</Chip>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ ...dimText, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Daily loss limit
          </span>
          <span style={{ ...mono, fontSize: 11, color: lossToday > 0 ? gaugeColor : 'var(--text-dim)' }}>
            {fmtUsd(lossToday)} <span style={{ color: 'var(--text-dim)' }}>/ {fmtUsd(limit)}</span>
          </span>
        </div>
        <Gauge pct={lossPct} color={gaugeColor} />
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <MiniStat label="Open notional" value={`${fmtUsd(notional)} / ${fmtUsd(maxNotional)}`} />
        <MiniStat label="Buying power" value={fmtUsd(snap.balance?.buying_power ?? 0)} />
      </div>
    </Card>
  );
}

function Gauge({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{
      height: 8, borderRadius: 5, background: 'var(--bg)', boxShadow: 'var(--inset)',
      overflow: 'hidden', padding: 1,
    }}>
      <div style={{
        width: `${Math.max(pct, pct > 0 ? 4 : 0)}%`, height: '100%', borderRadius: 4,
        background: `linear-gradient(90deg, ${color}, ${color})`,
        boxShadow: `0 0 8px ${color}88`, transition: 'width .4s ease',
      }} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, background: 'var(--bg)', boxShadow: 'var(--inset)',
      borderRadius: 'var(--radius-inset)', padding: '7px 10px',
    }}>
      <div style={{ ...dimText, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
      <div style={{ ...mono, fontSize: 12, color: 'var(--text)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  );
}

function StrategiesSection({ strategies, decisions }: { strategies: PmbotStrategy[]; decisions: PmbotNewsDecision[] }) {
  return (
    <div>
      <SectionTitle>Strategies</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: decisions.length || strategies.length ? 12 : 0 }}>
        {strategies.length === 0
          ? <EmptyRow>No strategy runs recorded.</EmptyRow>
          : strategies.map((s) => (
              <Chip key={s.name} color={s.live ? 'var(--up)' : 'var(--text-dim)'}>
                <Dot color={s.live ? 'var(--up)' : 'var(--text-dim)'} live={s.live} />
                {s.name} {s.live ? 'LIVE' : 'stopped'}
              </Chip>
            ))}
      </div>

      <div style={{ ...dimText, fontSize: 9.5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        Recent news decisions
      </div>
      {decisions.length === 0
        ? <EmptyRow>No news-driven bets yet — most articles produce no bet.</EmptyRow>
        : decisions.slice(0, 8).map((d, i) => (
            <Row
              key={`${d.market_slug}-${i}`}
              first={i === 0}
              left={<span title={d.reasoning} style={{ ...mono, fontSize: 11.5 }}>{d.market_slug}</span>}
              right={
                <Chip color={d.placed ? 'var(--up)' : 'var(--text-dim)'}>
                  {d.outcome}{d.confidence != null ? ` ${Math.round(d.confidence * 100)}%` : ''}{d.placed ? ' ✓' : ''}
                </Chip>
              }
            />
          ))}
    </div>
  );
}

function sideColor(side: string): string {
  return side.toUpperCase() === 'BUY' ? 'var(--up)' : 'var(--down)';
}

function TradeRow({ side, outcome, market, qty, price, first }: {
  side: string; outcome: string; market: string; qty: number; price: number; first: boolean;
}) {
  return (
    <Row
      first={first}
      left={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <Chip color={sideColor(side)}>{side}</Chip>
          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{outcome}</span>
          <span style={{ ...mono, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{market}</span>
        </span>
      }
      right={<span>{qty} @ {fmtUsd(price, price < 0.1 ? 4 : 2)}</span>}
    />
  );
}

function TradesSection({ orders, fills }: { orders: PmbotOrder[]; fills: PmbotFill[] }) {
  return (
    <div>
      <SectionTitle right={<Chip>{orders.length} open</Chip>}>Trades</SectionTitle>
      <div style={{ ...dimText, fontSize: 9.5, margin: '2px 0 6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Open orders</div>
      {orders.length === 0
        ? <EmptyRow>No open orders.</EmptyRow>
        : orders.map((o, i) => (
            <TradeRow key={`o-${i}`} first={i === 0} side={o.side} outcome={o.outcome} market={o.market_id} qty={o.size} price={o.price} />
          ))}
      <div style={{ ...dimText, fontSize: 9.5, margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Recent fills</div>
      {fills.length === 0
        ? <EmptyRow>No fills yet.</EmptyRow>
        : fills.slice(0, 10).map((f, i) => (
            <TradeRow key={`f-${i}`} first={i === 0} side={f.side} outcome={f.outcome} market={f.market_id} qty={f.size} price={f.price} />
          ))}
    </div>
  );
}

function HealthSection({ health }: { health?: PmbotHealth }) {
  const daemons = health?.daemons ?? [];
  return (
    <div>
      <SectionTitle>Health</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {daemons.map((d) => (
          <Chip key={d.name} color={d.up ? 'var(--up)' : 'var(--down)'}>
            <Dot color={d.up ? 'var(--up)' : 'var(--down)'} live={d.up} />
            {d.name} {d.up ? `up·${d.pid ?? '?'}` : 'down'}
          </Chip>
        ))}
        <Chip color={health?.kill_switch ? 'var(--down)' : 'var(--up)'}>
          <Dot color={health?.kill_switch ? 'var(--down)' : 'var(--up)'} />
          kill {health?.kill_switch ? 'TRIPPED' : 'armed'}
        </Chip>
        <Chip>feeds {health?.feeds_ok ?? 0}/5</Chip>
      </div>
    </div>
  );
}
