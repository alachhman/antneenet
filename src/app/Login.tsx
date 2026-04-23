import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inset, Raised } from '../ui';
import { login } from '../lib/auth';

export function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 'var(--space-4)',
    }}>
      <Raised style={{ width: 360, padding: 'var(--space-5)' }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-4)' }}>
          Antnee Net
        </div>
        <form onSubmit={onSubmit}>
          <label htmlFor="pwd" style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--text-dim)', fontSize: 12 }}>
            Password
          </label>
          <Inset>
            <input
              id="pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
              autoFocus
            />
          </Inset>
          {error && (
            <div role="alert" style={{ color: 'var(--down)', fontSize: 12, marginTop: 'var(--space-2)' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !password}
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-2) var(--space-4)',
              color: 'var(--accent)',
              boxShadow: 'var(--raised-sm)',
              borderRadius: 'var(--radius-inset)',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </Raised>
    </div>
  );
}
