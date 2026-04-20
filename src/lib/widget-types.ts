import type { ComponentType } from 'react';
import type { WidgetType } from './database-types';

export type WidgetDefinition<Config = unknown> = {
  type: WidgetType;
  displayName: string;
  defaultConfig: Config;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  View: ComponentType<{ instanceId: string; config: Config }>;
  Settings: ComponentType<{ config: Config; onChange: (next: Config) => void }>;
};

export type AnyWidgetDefinition = WidgetDefinition<any>;
