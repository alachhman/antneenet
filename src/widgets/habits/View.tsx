import { Label } from '../../ui';
import { useHabits, useCheckins, useToggleCheckin, todayISO } from './queries';

export type HabitsConfig = Record<string, never>;

export function View(_: { instanceId: string; config: HabitsConfig }) {
  const { data: habits = [] } = useHabits();
  const { data: checkins = [] } = useCheckins(7);
  const toggle = useToggleCheckin();
  const today = todayISO();
  const doneToday = new Set(checkins.filter((c) => c.date === today).map((c) => c.habit_id));

  return (
    <div>
      <Label>Habits · {doneToday.size}/{habits.length} today</Label>
      {habits.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          Enter edit mode → gear icon to add habits.
        </div>
      )}
      {habits.map((h) => {
        const done = doneToday.has(h.id);
        return (
          <button
            key={h.id}
            onClick={() => toggle.mutate({ habitId: h.id, date: today, on: !done })}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '8px 0', fontSize: 13,
              borderTop: '1px solid var(--divider)',
            }}
          >
            <span>{h.name}</span>
            <span style={{ color: done ? 'var(--up)' : 'var(--text-dim)' }}>{done ? '●' : '○'}</span>
          </button>
        );
      })}
    </div>
  );
}
