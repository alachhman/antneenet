import { Inset } from '../ui';
import { useEditMode } from './store';
import { logout } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useIsNarrow } from '../lib/use-breakpoint';

export function TopBar() {
  const { editMode, toggle } = useEditMode();
  const navigate = useNavigate();
  const isNarrow = useIsNarrow();

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isNarrow
          ? 'var(--space-2) var(--space-3)'
          : 'var(--space-3) var(--space-4)',
        gap: isNarrow ? 'var(--space-2)' : 'var(--space-4)',
      }}
    >
      <div style={{ fontSize: isNarrow ? 16 : 18, fontWeight: 600 }}>Antnee Net</div>

      {/* Search bar is decorative for now — hide on mobile where horizontal
          space matters more than the affordance. */}
      {!isNarrow && (
        <Inset style={{ flex: 1, maxWidth: 360, color: 'var(--text-dim)' }}>
          <span style={{ fontSize: 11 }}>⌕ search ⌘K</span>
        </Inset>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          onClick={toggle}
          style={{
            padding: 'var(--space-1) var(--space-3)',
            boxShadow: editMode ? 'var(--inset)' : 'var(--raised-sm)',
            borderRadius: 'var(--radius-inset)',
            color: editMode ? 'var(--accent)' : 'var(--text)',
            fontSize: 12,
          }}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
        <button
          onClick={onLogout}
          style={{
            padding: 'var(--space-1) var(--space-3)',
            boxShadow: 'var(--raised-sm)',
            borderRadius: 'var(--radius-inset)',
            fontSize: 12,
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
