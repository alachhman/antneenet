import { Raised } from '../ui';
import { registry } from '../lib/widget-registry';
import { useAddWidget } from '../lib/dashboard-queries';
import type { WidgetType } from '../lib/database-types';

export function AddWidgetPicker({ onClose }: { onClose: () => void }) {
  const add = useAddWidget();
  const types = Object.keys(registry) as WidgetType[];

  function pick(type: WidgetType) {
    const def = registry[type];
    add.mutate({ type, config: def.defaultConfig as Record<string, unknown> });
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-label="add widget"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <Raised
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: '90vw', padding: 'var(--space-4)' }}
      >
        <div style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Add a widget</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => pick(t)}
              style={{
                boxShadow: 'var(--raised-sm)',
                borderRadius: 'var(--radius-inset)',
                padding: 'var(--space-3)',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>{registry[t].displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t}</div>
            </button>
          ))}
        </div>
      </Raised>
    </div>
  );
}
