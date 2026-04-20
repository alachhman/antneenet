import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type BookmarksConfig } from './View';
import { Settings } from './Settings';

export const bookmarksDefinition: WidgetDefinition<BookmarksConfig> = {
  type: 'bookmarks',
  displayName: 'Bookmarks',
  defaultConfig: { items: [] },
  defaultSize: { w: 3, h: 2 },
  View,
  Settings,
};
