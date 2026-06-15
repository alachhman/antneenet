import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { PmbotSnapshot, PmbotTrade } from '../../lib/database-types';

const REFRESH_MS = 30_000;

/** Latest bot snapshot (singleton row id=1). Polls every 30s. */
export function usePmbotSnapshot() {
  return useQuery({
    queryKey: ['pmbot_snapshot'],
    queryFn: async (): Promise<{ data: Partial<PmbotSnapshot>; updated_at: string } | null> => {
      const { data, error } = await supabase
        .from('pmbot_snapshot')
        .select('data, updated_at')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { data: (data.data ?? {}) as Partial<PmbotSnapshot>, updated_at: data.updated_at };
    },
    refetchInterval: REFRESH_MS,
    staleTime: REFRESH_MS,
  });
}

/** Full trade history (newest first). */
export function usePmbotTrades(limit = 100) {
  return useQuery({
    queryKey: ['pmbot_trades', limit],
    queryFn: async (): Promise<PmbotTrade[]> => {
      const { data, error } = await supabase
        .from('pmbot_trades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as PmbotTrade[];
    },
    refetchInterval: REFRESH_MS,
    staleTime: REFRESH_MS,
  });
}
