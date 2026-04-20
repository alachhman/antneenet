import { TopBar } from './TopBar';

export function Dashboard() {
  return (
    <div>
      <TopBar />
      <div style={{ padding: 'var(--space-4)', color: 'var(--text-dim)' }}>
        Widget grid will render here.
      </div>
    </div>
  );
}
