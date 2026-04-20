import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type TechFeedConfig } from './View';
import { Settings } from './Settings';

export const techFeedDefinition: WidgetDefinition<TechFeedConfig> = {
  type: 'tech-feed',
  displayName: 'News Feed',
  defaultConfig: {
    categories: [
      {
        name: 'Tech',
        sources: [
          { type: 'hn', value: '' },
          { type: 'rss', value: 'https://techcrunch.com/feed/' },
          { type: 'rss', value: 'https://github.blog/feed/' },
          { type: 'rss', value: 'https://arstechnica.com/feed/' },
        ],
      },
      {
        name: 'Finance',
        sources: [
          { type: 'rss', value: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
          { type: 'rss', value: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
          { type: 'rss', value: 'https://feeds.bloomberg.com/markets/news.rss' },
        ],
      },
      {
        name: 'Politics',
        sources: [
          { type: 'rss', value: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml' },
          { type: 'rss', value: 'https://thehill.com/news/feed/' },
          { type: 'rss', value: 'https://feeds.npr.org/1014/rss.xml' },
        ],
      },
    ],
  },
  defaultSize: { w: 4, h: 5 },
  View,
  Settings,
};
