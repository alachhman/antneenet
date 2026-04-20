import { useEffect, useRef, useState } from 'react';
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

// Delay between the last keystroke in settings and the Supabase save.
// Short enough that a quick close feels safe, long enough to batch typing.
const SAVE_DEBOUNCE_MS = 400;

export function SettingsDrawer({ instanceId, onClose }: Props) {
  const { data: instances = [] } = useWidgetInstances();
  const update = useUpdateWidgetConfig();
  const remove = useRemoveWidget();
  const inst = instances.find((i) => i.id === instanceId);
  const def = inst ? getDefinition(inst.widget_type) : null;

  // Local draft: user edits go here first so the input always reflects
  // their typing instantly, even before the debounced save finishes.
  const [draft, setDraft] = useState<Record<string, unknown>>(
    (inst?.config as Record<string, unknown>) ?? {},
  );
  const saveTimer = useRef<number | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // When the drawer opens for a different widget, reset the draft.
  useEffect(() => {
    if (inst) setDraft(inst.config as Record<string, unknown>);
    // We intentionally only sync on instanceId change, not on every
    // inst.config update, so Supabase echoes don't clobber in-flight edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  function scheduleSave(next: Record<string, unknown>) {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      if (inst) update.mutate({ id: inst.id, config: next });
    }, SAVE_DEBOUNCE_MS);
  }

  function handleChange(next: unknown) {
    const typed = next as Record<string, unknown>;
    setDraft(typed);
    scheduleSave(typed);
  }

  function flushPendingSave() {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (inst) {
        update.mutate({ id: inst.id, config: draftRef.current });
      }
    }
  }

  function handleClose() {
    flushPendingSave();
    onClose();
  }

  // Flush on unmount so a pending save isn't lost if the drawer is torn
  // down by something other than our close button.
  useEffect(() => {
    return () => {
      flushPendingSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!inst || !def) return null;
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
      onClick={handleClose}
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
          <button onClick={handleClose}>×</button>
        </div>
        <Settings
          config={draft as any}
          onChange={handleChange}
        />
        <div style={{ marginTop: 'var(--space-5)', borderTop: '1px solid var(--divider)', paddingTop: 'var(--space-3)' }}>
          <button
            onClick={() => {
              if (confirm(`Remove ${def.displayName}?`)) {
                // Cancel any pending config save for a widget we're about
                // to delete.
                if (saveTimer.current !== null) {
                  window.clearTimeout(saveTimer.current);
                  saveTimer.current = null;
                }
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
