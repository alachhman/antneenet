import type { WidgetType } from './database-types';
import type { AnyWidgetDefinition } from './widget-types';
import { demoDefinition } from '../widgets/demo';
import { bookmarksDefinition } from '../widgets/bookmarks';
import { habitsDefinition } from '../widgets/habits';

export const registry: Record<WidgetType, AnyWidgetDefinition> = {
  demo: demoDefinition,
  bookmarks: bookmarksDefinition,
  habits: habitsDefinition,
} as Record<WidgetType, AnyWidgetDefinition>;

export function getDefinition(type: WidgetType): AnyWidgetDefinition | undefined {
  return registry[type];
}

export function listWidgetTypes(): WidgetType[] {
  return Object.keys(registry) as WidgetType[];
}
