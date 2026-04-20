import { Label, ScrollableArea } from '../../ui';
import type { Habit, HabitCheckin } from '../../lib/database-types';
import { useHabits, useCheckins, useToggleCheckin, todayISO } from './queries';

export type HabitsConfig = Record<string, never>;

// -----------------------------------------------------------------------
// Pure helpers (easy to read + testable without React).
// -----------------------------------------------------------------------

/** Returns the last N ISO dates ending with today (oldest first). */
function lastNDays(n: number, today = todayISO()): string[] {
  const out: string[] = [];
  const t = new Date(today + 'T00:00:00Z');
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(t.getTime() - i * 86400000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Counts consecutive days ending at today (or yesterday if today is not
 *  yet checked) with a checkin. Today counts as "not broken yet" — if
 *  the user hasn't checked today but the streak through yesterday is
 *  intact, we still count yesterday's streak. */
function computeStreak(
  habitId: string,
  checkins: HabitCheckin[],
  today: string,
): number {
  const dates = new Set(
    checkins.filter((c) => c.habit_id === habitId).map((c) => c.date),
  );
  const t = new Date(today + 'T00:00:00Z');
  let cursor = new Date(t);
  // If today isn't checked in, start the walk at yesterday so an active
  // streak doesn't disappear just because the user hasn't logged today.
  if (!dates.has(today)) cursor = new Date(t.getTime() - 86400000);
  let count = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return count;
}

// -----------------------------------------------------------------------
// Widget
// -----------------------------------------------------------------------

export function View(_: { instanceId: string; config: HabitsConfig }) {
  const { data: habits = [] } = useHabits();
  const { data: checkins = [] } = useCheckins();
  const toggle = useToggleCheckin();
  const today = todayISO();
  const doneToday = new Set(
    checkins.filter((c) => c.date === today).map((c) => c.habit_id),
  );

  const progressPct =
    habits.length === 0 ? 0 : Math.round((doneToday.size / habits.length) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Label>
        Habits · {doneToday.size}/{habits.length} today
      </Label>

      {/* Today's progress bar */}
      <div
        style={{
          boxShadow: 'var(--inset)',
          borderRadius: 999,
          height: 6,
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'var(--accent)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {habits.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Enter edit mode → gear icon to add habits.
        </div>
      ) : (
        <ScrollableArea>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {habits.map((h) => {
              const done = doneToday.has(h.id);
              const streak = computeStreak(h.id, checkins, today);
              return (
                <HabitCard
                  key={h.id}
                  habit={h}
                  done={done}
                  streak={streak}
                  checkins={checkins}
                  today={today}
                  onToggle={() =>
                    toggle.mutate({ habitId: h.id, date: today, on: !done })
                  }
                />
              );
            })}
          </div>
        </ScrollableArea>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// HabitCard
// -----------------------------------------------------------------------

function HabitCard({
  habit,
  done,
  streak,
  checkins,
  today,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  streak: number;
  checkins: HabitCheckin[];
  today: string;
  onToggle: () => void;
}) {
  const week = lastNDays(7, today);
  const habitDates = new Set(
    checkins.filter((c) => c.habit_id === habit.id).map((c) => c.date),
  );

  return (
    <button
      onClick={onToggle}
      aria-pressed={done}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        boxShadow: 'var(--raised-sm)',
        borderRadius: 'var(--radius-inset)',
        padding: '12px 14px',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      {/* Left column: name + streak, week strip below. */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {habit.name}
          </span>

          {streak >= 2 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: streakColor(streak),
                flexShrink: 0,
              }}
            >
              🔥 {streak}
            </span>
          )}
        </div>

        {/* 7-day strip. Oldest on left, today on right (with a ring). */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {week.map((date) => {
            const isToday = date === today;
            const filled = habitDates.has(date);
            return (
              <span
                // Only the today-dot needs to re-animate on toggle, so we
                // key that one by `done`; others keep their identity.
                key={isToday ? `today-${done ? 'on' : 'off'}` : date}
                aria-hidden
                title={date}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: filled ? 'var(--accent)' : 'transparent',
                  border: filled
                    ? '1px solid var(--accent)'
                    : '1px solid var(--text-dim)',
                  opacity: filled ? 1 : 0.45,
                  boxShadow: isToday ? '0 0 0 2px rgba(20, 184, 166, 0.25)' : 'none',
                  transition: 'background 0.2s ease, opacity 0.2s ease',
                  animation: isToday
                    ? 'habit-check-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Check circle — vertically centered across both rows via parent flex.
          Key flip on `done` forces a remount so the CSS animation restarts. */}
      <span
        key={done ? 'on' : 'off'}
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: done ? 'var(--accent)' : 'transparent',
          border: done ? '2px solid var(--accent)' : '2px solid var(--text-dim)',
          boxShadow: done ? '0 0 0 3px rgba(20, 184, 166, 0.15)' : 'none',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'habit-check-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transition:
            'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {done && (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="5 12 10 17 19 7" />
          </svg>
        )}
      </span>
    </button>
  );
}

function streakColor(n: number): string {
  if (n >= 30) return 'var(--accent)';
  if (n >= 7) return 'var(--up)';
  return 'var(--text-dim)';
}
