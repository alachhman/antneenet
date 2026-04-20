import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type HabitsConfig } from './View';
import { Settings } from './Settings';

export const habitsDefinition: WidgetDefinition<HabitsConfig> = {
  type: 'habits',
  displayName: 'Habits',
  defaultConfig: {} as HabitsConfig,
  defaultSize: { w: 3, h: 3 },
  View,
  Settings,
};
