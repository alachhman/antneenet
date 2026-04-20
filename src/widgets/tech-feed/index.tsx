import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type TechFeedConfig } from './View';
import { Settings } from './Settings';

export const techFeedDefinition: WidgetDefinition<TechFeedConfig> = {
  type: 'tech-feed',
  displayName: 'Tech Feed',
  defaultConfig: {
    sources: [
      { type: 'hn', value: '' },
      { type: 'rss', value: 'https://techcrunch.com/feed/' },
      { type: 'rss', value: 'https://github.blog/feed/' },
      { type: 'rss', value: 'https://arstechnica.com/feed/' },
    ],
  },
  defaultSize: { w: 4, h: 5 },
  View,
  Settings,
};
