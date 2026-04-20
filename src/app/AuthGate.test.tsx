import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthGate } from './AuthGate';

vi.mock('../lib/auth', () => ({
  useSession: vi.fn(),
}));

import { useSession } from '../lib/auth';

describe('<AuthGate>', () => {
  it('shows loading indicator while session is loading', () => {
    (useSession as any).mockReturnValue({ session: null, loading: true });
    render(
      <MemoryRouter>
        <AuthGate><div>secret</div></AuthGate>
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('redirects to /login when no session', () => {
    (useSession as any).mockReturnValue({ session: null, loading: false });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AuthGate><div>secret</div></AuthGate>} />
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('renders children when session present', () => {
    (useSession as any).mockReturnValue({ session: { user: { id: 'u' } }, loading: false });
    render(
      <MemoryRouter>
        <AuthGate><div>secret</div></AuthGate>
      </MemoryRouter>,
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
