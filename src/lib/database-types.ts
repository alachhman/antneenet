// Hand-written subset of the schema. Replace with `supabase gen types typescript` later
// (script: `npm run types` — see future task). For MVP, these are sufficient.

export type WidgetType =
  | 'bookmarks'
  | 'weather'
  | 'habits'
  | 'stocks'
  | 'tech-feed'
  | 'github'
  | 'pmbot';

export type Breakpoint = 'lg' | 'md' | 'sm' | 'xs';

export type GridLayoutItem = {
  i: string; // widget_instance id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type LayoutsByBreakpoint = Record<Breakpoint, GridLayoutItem[]>;

export type WidgetInstance = {
  id: string;
  widget_type: WidgetType;
  config: Record<string, unknown>;
  created_at: string;
};

export type LayoutRow = {
  id: 1;
  layout: LayoutsByBreakpoint;
  updated_at: string;
};

export type Habit = { id: string; name: string; position: number; created_at: string };

export type HabitCheckin = { habit_id: string; date: string };

// ── pmbot (trading bot) dashboard ───────────────────────────────────────────
// Shapes mirror the snapshot the laptop-side exporter pushes into
// public.pmbot_snapshot.data (see polymarket-bot exporter).

export type PmbotStrategy = {
  name: string;
  live: boolean;
  run_started_at: string | null;
  last_activity: string | null;
};

export type PmbotOrder = {
  market_id: string;
  side: string;
  outcome: string;
  price: number;
  size: number;
  strategy: string;
  created_at: string;
};

export type PmbotFill = {
  market_id: string;
  side: string;
  outcome: string;
  price: number;
  size: number;
  strategy: string;
  ts: string;
};

export type PmbotNewsDecision = {
  market_slug: string;
  outcome: string;
  true_prob: number | null;
  confidence: number | null;
  reasoning: string;
  placed: boolean;
  ts: string;
};

export type PmbotHealth = {
  daemons: { name: string; up: boolean; pid: number | null }[];
  kill_switch: boolean;
  feeds_ok: number;
};

export type PmbotSnapshot = {
  generated_at: string;
  balance: { current: number; buying_power: number; currency: string };
  pnl: { today_realized: number; daily_loss_limit: number };
  risk: { max_order_usd: number; max_total_notional_usd: number; open_notional: number };
  strategies: PmbotStrategy[];
  open_orders: PmbotOrder[];
  recent_fills: PmbotFill[];
  news_decisions: PmbotNewsDecision[];
  health: PmbotHealth;
};

// The seeded row starts as `{}`, so callers must treat the snapshot as partial
// until the exporter has run at least once.
export type PmbotSnapshotRow = {
  id: 1;
  data: Partial<PmbotSnapshot>;
  updated_at: string;
};

export type PmbotTrade = {
  order_id: string;
  strategy: string;
  market_id: string;
  outcome: string;
  side: string;
  price: number;
  size: number;
  status: string;
  filled_size: number | null;
  realized_pnl: number | null;
  created_at: string;
};
