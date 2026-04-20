import type { WidgetType } from './database-types';
import type { AnyWidgetDefinition } from './widget-types';
import { demoDefinition } from '../widgets/demo';

export const registry: Record<WidgetType, AnyWidgetDefinition> = {
  // MVP widgets are added in Phase 6.
  demo: demoDefinition,
} as Record<WidgetType, AnyWidgetDefinition>;

export function getDefinition(type: WidgetType): AnyWidgetDefinition | undefined {
  return registry[type];
}

export function listWidgetTypes(): WidgetType[] {
  return Object.keys(registry) as WidgetType[];
}
