import { Raised } from '../ui';
import {
  useWidgetInstances,
  useUpdateWidgetConfig,
  useRemoveWidget,
} from '../lib/dashboard-queries';
import { getDefinition } from '../lib/widget-registry';

type Props = {
  instanceId: string;
  onClose: () => void;
};

export function SettingsDrawer({ instanceId, onClose }: Props) {
  const { data: instances = [] } = useWidgetInstances();
  const update = useUpdateWidgetConfig();
  const remove = useRemoveWidget();
  const inst = instances.find((i) => i.id === instanceId);
  if (!inst) return null;
  const def = getDefinition(inst.widget_type);
  if (!def) return null;
  const Settings = def.Settings;

  return (
    <div
      role="dialog"
      aria-label="widget settings"
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--overlay)',
        display: 'flex', justifyContent: 'flex-end',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <Raised
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480, maxWidth: '100%', height: '100%',
          borderRadius: 0,
          padding: 'var(--space-4)',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ fontWeight: 600 }}>{def.displayName} settings</div>
          <button onClick={onClose}>×</button>
        </div>
        <Settings
          config={inst.config as any}
          onChange={(next) => update.mutate({ id: inst.id, config: next as Record<string, unknown> })}
        />
        <div style={{ marginTop: 'var(--space-5)', borderTop: '1px solid var(--divider)', paddingTop: 'var(--space-3)' }}>
          <button
            onClick={() => {
              if (confirm(`Remove ${def.displayName}?`)) {
                remove.mutate(inst.id);
                onClose();
              }
            }}
            style={{ color: 'var(--down)', fontSize: 12 }}
          >
            Remove widget
          </button>
        </div>
      </Raised>
    </div>
  );
}
