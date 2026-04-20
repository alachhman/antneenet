import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type {
  WidgetInstance,
  LayoutsByBreakpoint,
  Breakpoint,
  GridLayoutItem,
  WidgetType,
} from './database-types';

type DefaultSize = { w: number; h: number };
type DefaultSizeMap = Partial<Record<WidgetType, DefaultSize>>;

const COLS: Record<Breakpoint, number> = { lg: 12, md: 10, sm: 6, xs: 2 };

export function defaultLayoutsFor(
  instances: WidgetInstance[],
  sizes: DefaultSizeMap,
): LayoutsByBreakpoint {
  const out: LayoutsByBreakpoint = { lg: [], md: [], sm: [], xs: [] };
  const cursors: Record<Breakpoint, { x: number; y: number; rowH: number }> = {
    lg: { x: 0, y: 0, rowH: 0 },
    md: { x: 0, y: 0, rowH: 0 },
    sm: { x: 0, y: 0, rowH: 0 },
    xs: { x: 0, y: 0, rowH: 0 },
  };

  for (const inst of instances) {
    const size = sizes[inst.widget_type] ?? { w: 3, h: 2 };
    for (const bp of Object.keys(COLS) as Breakpoint[]) {
      const cols = COLS[bp];
      const w = bp === 'xs' ? 2 : Math.min(size.w, cols);
      const h = size.h;
      const c = cursors[bp];
      if (c.x + w > cols) {
        c.x = 0;
        c.y += c.rowH;
        c.rowH = 0;
      }
      const item: GridLayoutItem = { i: inst.id, x: c.x, y: c.y, w, h };
      out[bp].push(item);
      c.x += w;
      c.rowH = Math.max(c.rowH, h);
    }
  }
  return out;
}

// --- React Query hooks ---

export function useWidgetInstances() {
  return useQuery({
    queryKey: ['widget_instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('widget_instances')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WidgetInstance[];
    },
  });
}

export function useLayouts() {
  return useQuery({
    queryKey: ['layouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('layouts')
        .select('*')
        .eq('id', 1)
        .single();
      if (error) throw error;
      return data.layout as LayoutsByBreakpoint;
    },
  });
}

export function useSaveLayouts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (layout: LayoutsByBreakpoint) => {
      const { error } = await supabase
        .from('layouts')
        .update({ layout, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['layouts'] }),
  });
}

export function useAddWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { type: WidgetType; config: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('widget_instances')
        .insert({ widget_type: args.type, config: args.config })
        .select()
        .single();
      if (error) throw error;
      return data as WidgetInstance;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['widget_instances'] });
      qc.invalidateQueries({ queryKey: ['layouts'] });
    },
  });
}

export function useRemoveWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('widget_instances').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['widget_instances'] });
      qc.invalidateQueries({ queryKey: ['layouts'] });
    },
  });
}

export function useUpdateWidgetConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; config: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('widget_instances')
        .update({ config: args.config })
        .eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['widget_instances'] }),
  });
}
