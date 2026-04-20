import type { ReactNode } from 'react';

type Props = {
  label: ReactNode;
  value: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
};

export function DataRow({ label, value, trend = 'neutral' }: Props) {
  const color =
    trend === 'up' ? 'var(--up)' : trend === 'down' ? 'var(--down)' : 'var(--text)';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 12,
        padding: '6px 0',
        borderTop: '1px solid var(--divider)',
      }}
    >
      <span>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}
