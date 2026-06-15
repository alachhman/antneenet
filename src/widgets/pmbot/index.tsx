import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type PmbotConfig } from './View';
import { Settings } from './Settings';

export const pmbotDefinition: WidgetDefinition<PmbotConfig> = {
  type: 'pmbot',
  displayName: 'Trading Bot',
  defaultConfig: {} as PmbotConfig,
  defaultSize: { w: 4, h: 4 },
  minSize: { w: 3, h: 3 },
  View,
  Settings,
};
