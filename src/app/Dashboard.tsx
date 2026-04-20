import { useMemo, useState } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { TopBar } from './TopBar';
import { WidgetCard } from './WidgetCard';
import { SettingsDrawer } from './SettingsDrawer';
import { AddWidgetPicker } from './AddWidgetPicker';
import {
  useWidgetInstances,
  useLayouts,
  useSaveLayouts,
  defaultLayoutsFor,
} from '../lib/dashboard-queries';
import { getDefinition, registry } from '../lib/widget-registry';
import { useEditMode } from './store';
import type { Breakpoint, LayoutsByBreakpoint, WidgetType } from '../lib/database-types';

const ResponsiveGrid = WidthProvider(Responsive);
const COLS = { lg: 12, md: 10, sm: 6, xs: 2 } as const;
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 0 } as const;

export function Dashboard() {
  const { data: instances = [] } = useWidgetInstances();
  const { data: storedLayouts } = useLayouts();
  const saveLayouts = useSaveLayouts();
  const editMode = useEditMode((s) => s.editMode);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const defaultSizes = useMemo(() => {
    return Object.fromEntries(
      (Object.keys(registry) as WidgetType[]).map((t) => [t, registry[t].defaultSize]),
    ) as Record<WidgetType, { w: number; h: number }>;
  }, []);

  const layouts: LayoutsByBreakpoint = useMemo(() => {
    const hasContent =
      storedLayouts &&
      (Object.keys(COLS) as Breakpoint[]).some((bp) => (storedLayouts[bp]?.length ?? 0) > 0);
    if (hasContent) return storedLayouts as LayoutsByBreakpoint;
    return defaultLayoutsFor(instances, defaultSizes);
  }, [storedLayouts, instances, defaultSizes]);

  function handleLayoutChange(_cur: Layout[], all: { [bp: string]: Layout[] }) {
    if (!editMode) return;
    const next: LayoutsByBreakpoint = {
      lg: (all.lg ?? []).map(toItem),
      md: (all.md ?? []).map(toItem),
      sm: (all.sm ?? []).map(toItem),
      xs: (all.xs ?? []).map(toItem),
    };
    saveLayouts.mutate(next);
  }

  return (
    <div>
      <TopBar />
      {editMode && (
        <div style={{ padding: 'var(--space-2) var(--space-4)' }}>
          <button
            onClick={() => setPickerOpen(true)}
            style={{
              boxShadow: 'var(--raised-sm)',
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 6,
              color: 'var(--accent)',
              fontSize: 12,
            }}
          >
            + Add widget
          </button>
        </div>
      )}
      <ResponsiveGrid
        className="dashboard-grid"
        layouts={layouts as any}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={60}
        margin={[14, 14]}
        containerPadding={[14, 14]}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        {instances.map((inst) => {
          const def = getDefinition(inst.widget_type);
          if (!def) return null;
          const View = def.View;
          return (
            <div key={inst.id}>
              <WidgetCard instanceId={inst.id} onGear={() => setSettingsFor(inst.id)}>
                <div className="drag-handle" style={{ height: 18, cursor: editMode ? 'move' : 'default' }} />
                <View instanceId={inst.id} config={inst.config} />
              </WidgetCard>
            </div>
          );
        })}
      </ResponsiveGrid>
      {settingsFor && (
        <SettingsDrawer
          instanceId={settingsFor}
          onClose={() => setSettingsFor(null)}
        />
      )}
      {pickerOpen && (
        <AddWidgetPicker onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

function toItem(l: Layout) {
  return { i: l.i, x: l.x, y: l.y, w: l.w, h: l.h };
}
