import type { WidgetType } from './database-types';
import type { AnyWidgetDefinition } from './widget-types';
import { bookmarksDefinition } from '../widgets/bookmarks';
import { weatherDefinition } from '../widgets/weather';
import { habitsDefinition } from '../widgets/habits';
import { stocksDefinition } from '../widgets/stocks';
import { techFeedDefinition } from '../widgets/tech-feed';

export const registry: Record<WidgetType, AnyWidgetDefinition> = {
  bookmarks: bookmarksDefinition,
  weather: weatherDefinition,
  habits: habitsDefinition,
  stocks: stocksDefinition,
  'tech-feed': techFeedDefinition,
};

export function getDefinition(type: WidgetType): AnyWidgetDefinition | undefined {
  return registry[type];
}

export function listWidgetTypes(): WidgetType[] {
  return Object.keys(registry) as WidgetType[];
}
