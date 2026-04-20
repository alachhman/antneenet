// Hand-written subset of the schema. Replace with `supabase gen types typescript` later
// (script: `npm run types` — see future task). For MVP, these are sufficient.

export type WidgetType = 'bookmarks' | 'weather' | 'habits' | 'stocks' | 'tech-feed' | 'github';

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
