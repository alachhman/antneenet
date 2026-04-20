import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type GithubConfig } from './View';
import { Settings } from './Settings';

export const githubDefinition: WidgetDefinition<GithubConfig> = {
  type: 'github',
  displayName: 'GitHub',
  defaultConfig: { owner: '', repo: '', projectNumber: 0 },
  defaultSize: { w: 4, h: 4 },
  View,
  Settings,
};
