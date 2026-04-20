import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';

vi.mock('../lib/auth', () => ({
  login: vi.fn(),
}));
import { login } from '../lib/auth';

describe('<Login>', () => {
  it('submits the password to login()', async () => {
    (login as any).mockResolvedValueOnce(undefined);
    render(<MemoryRouter><Login /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/password/i), 'hunter2');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('hunter2'));
  });

  it('shows an error message on failure', async () => {
    (login as any).mockRejectedValueOnce(new Error('invalid password'));
    render(<MemoryRouter><Login /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/password/i), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid password/i)).toBeInTheDocument();
  });
});
