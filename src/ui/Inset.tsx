import type { HTMLAttributes, PropsWithChildren } from 'react';

export function Inset({
  className = '',
  style,
  children,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      {...rest}
      className={`neu-inset ${className}`.trim()}
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--radius-inset)',
        boxShadow: 'var(--inset)',
        padding: 'var(--space-2) var(--space-3)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
