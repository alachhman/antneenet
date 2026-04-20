import type { PropsWithChildren } from 'react';
import { Raised } from '../ui';
import { useEditMode } from './store';

type Props = PropsWithChildren<{
  instanceId: string;
  onGear: () => void;
}>;

export function WidgetCard({ instanceId, onGear, children }: Props) {
  const editMode = useEditMode((s) => s.editMode);
  return (
    <Raised style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {editMode && (
        <button
          aria-label={`settings for ${instanceId}`}
          onClick={onGear}
          style={{
            position: 'absolute',
            top: 8, right: 8,
            fontSize: 12,
            boxShadow: 'var(--raised-sm)',
            borderRadius: 6,
            padding: '2px 8px',
            color: 'var(--accent)',
          }}
        >
          ⚙
        </button>
      )}
      {children}
    </Raised>
  );
}
