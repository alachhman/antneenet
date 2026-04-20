import type { HTMLAttributes, PropsWithChildren } from 'react';

export function Raised({
  className = '',
  style,
  children,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      {...rest}
      className={`neu-raised ${className}`.trim()}
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--raised)',
        // Slightly tighter on top so the widget label doesn't feel like
        // it's floating; sides + bottom stay at the full --space-4.
        padding: '12px var(--space-4) var(--space-4)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
