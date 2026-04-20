import type { PropsWithChildren } from 'react';

export function Label({ children }: PropsWithChildren) {
  return (
    <div
      style={{
        color: 'var(--accent)',
        fontSize: 10,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        fontWeight: 600,
        marginBottom: 'var(--space-2)',
      }}
    >
      ▮ {children}
    </div>
  );
}
