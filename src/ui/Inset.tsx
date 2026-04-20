import type { HTMLAttributes, PropsWithChildren } from 'react';

export function Inset({
  className = '',
  style,
  children,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={`neu-inset ${className}`.trim()}
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--radius-inset)',
        boxShadow: 'var(--inset)',
        padding: 'var(--space-2) var(--space-3)',
        ...style,
      }}
    >
      <div {...rest}>
        {children}
      </div>
    </div>
  );
}
