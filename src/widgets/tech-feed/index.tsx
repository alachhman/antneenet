import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type TechFeedConfig } from './View';
import { Settings } from './Settings';

export const techFeedDefinition: WidgetDefinition<TechFeedConfig> = {
  type: 'tech-feed',
  displayName: 'Tech Feed',
  defaultConfig: {
    sources: [
      { type: 'hn', value: '' },
      { type: 'reddit', value: 'programming' },
      { type: 'reddit', value: 'rust' },
      { type: 'rss', value: 'https://www.anthropic.com/news/rss.xml' },
    ],
  },
  defaultSize: { w: 4, h: 5 },
  View,
  Settings,
};
