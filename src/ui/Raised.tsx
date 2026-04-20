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
        padding: 'var(--space-4)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
