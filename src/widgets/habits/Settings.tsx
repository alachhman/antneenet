import { useState } from 'react';
import { useHabits, useCreateHabit, useDeleteHabit } from './queries';
import type { HabitsConfig } from './View';

export function Settings(_: { config: HabitsConfig; onChange: (c: HabitsConfig) => void }) {
  const { data: habits = [] } = useHabits();
  const create = useCreateHabit();
  const del = useDeleteHabit();
  const [name, setName] = useState('');

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          aria-label="habit name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 1, boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
        />
        <button
          onClick={() => {
            if (name.trim()) {
              create.mutate(name.trim());
              setName('');
            }
          }}
          style={{ color: 'var(--accent)' }}
        >
          Add
        </button>
      </div>
      {habits.map((h) => (
        <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 4, fontSize: 12 }}>
          <span>{h.name}</span>
          <button onClick={() => del.mutate(h.id)} style={{ color: 'var(--down)' }}>×</button>
        </div>
      ))}
    </div>
  );
}
