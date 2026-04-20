import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../lib/auth';

export function AuthGate({ children }: PropsWithChildren) {
  const { session, loading } = useSession();
  if (loading) {
    return (
      <div style={{ padding: 24, color: 'var(--text-dim)' }}>Loading…</div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
