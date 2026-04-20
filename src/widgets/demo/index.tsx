import { Label } from '../../ui';
import type { WidgetDefinition } from '../../lib/widget-types';

type Config = { message: string };

const View: WidgetDefinition<Config>['View'] = ({ config }) => (
  <div>
    <Label>Demo</Label>
    <div style={{ fontSize: 12 }}>{config.message}</div>
  </div>
);

const Settings: WidgetDefinition<Config>['Settings'] = ({ config, onChange }) => (
  <label style={{ display: 'block', fontSize: 12 }}>
    Message
    <input
      type="text"
      value={config.message}
      onChange={(e) => onChange({ message: e.target.value })}
      style={{ display: 'block', marginTop: 4, boxShadow: 'var(--inset)', padding: 6, borderRadius: 6, width: '100%' }}
    />
  </label>
);

export const demoDefinition: WidgetDefinition<Config> = {
  type: 'demo',
  displayName: 'Demo',
  defaultConfig: { message: 'Hello, world.' },
  defaultSize: { w: 3, h: 2 },
  View,
  Settings,
};
