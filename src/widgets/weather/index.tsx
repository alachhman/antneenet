import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type WeatherConfig } from './View';
import { Settings } from './Settings';

export const weatherDefinition: WidgetDefinition<WeatherConfig> = {
  type: 'weather',
  displayName: 'Weather',
  defaultConfig: { city: 'San Francisco', lat: 37.77, lon: -122.42, units: 'F' },
  defaultSize: { w: 2, h: 2 },
  View,
  Settings,
};
