import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Habit, HabitCheckin } from '../../lib/database-types';

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function useHabits() {
  return useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('position');
      if (error) throw error;
      return (data ?? []) as Habit[];
    },
  });
}

export function useCheckins(days = 30) {
  return useQuery({
    queryKey: ['habit_checkins', days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('habit_checkins')
        .select('*')
        .gte('date', since);
      if (error) throw error;
      return (data ?? []) as HabitCheckin[];
    },
  });
}

export function useToggleCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { habitId: string; date: string; on: boolean }) => {
      if (args.on) {
        await supabase.from('habit_checkins').upsert({ habit_id: args.habitId, date: args.date });
      } else {
        await supabase.from('habit_checkins').delete().eq('habit_id', args.habitId).eq('date', args.date);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habit_checkins'] }),
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: existing } = await supabase.from('habits').select('position').order('position', { ascending: false }).limit(1);
      const position = (existing?.[0]?.position ?? 0) + 1;
      const { error } = await supabase.from('habits').insert({ name, position });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('habits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}
