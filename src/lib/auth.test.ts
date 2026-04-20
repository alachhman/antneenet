import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logout } from './auth';

vi.mock('./supabase', () => {
  const setSession = vi.fn().mockResolvedValue({ error: null });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  return {
    supabase: {
      auth: { setSession, signOut },
    },
  };
});

// Mock fetch for the login function
const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = originalFetch;
  vi.clearAllMocks();
});

describe('login()', () => {
  it('calls the login function and sets the session on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'a', refresh_token: 'r', expires_at: 123 }),
    }) as any;

    const { supabase } = await import('./supabase');
    await login('hunter2');
    expect(globalThis.fetch).toHaveBeenCalled();
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'a',
      refresh_token: 'r',
    });
  });

  it('throws on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid password' }),
    }) as any;

    await expect(login('wrong')).rejects.toThrow(/invalid password/i);
  });
});

describe('logout()', () => {
  it('calls supabase signOut', async () => {
    const { supabase } = await import('./supabase');
    await logout();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
