import type { WidgetType } from './database-types';
import type { AnyWidgetDefinition } from './widget-types';
import { demoDefinition } from '../widgets/demo';
import { bookmarksDefinition } from '../widgets/bookmarks';
import { habitsDefinition } from '../widgets/habits';
import { weatherDefinition } from '../widgets/weather';
import { stocksDefinition } from '../widgets/stocks';
import { techFeedDefinition } from '../widgets/tech-feed';

export const registry: Record<WidgetType, AnyWidgetDefinition> = {
  demo: demoDefinition,
  bookmarks: bookmarksDefinition,
  habits: habitsDefinition,
  weather: weatherDefinition,
  stocks: stocksDefinition,
  'tech-feed': techFeedDefinition,
} as Record<WidgetType, AnyWidgetDefinition>;

export function getDefinition(type: WidgetType): AnyWidgetDefinition | undefined {
  return registry[type];
}

export function listWidgetTypes(): WidgetType[] {
  return Object.keys(registry) as WidgetType[];
}
