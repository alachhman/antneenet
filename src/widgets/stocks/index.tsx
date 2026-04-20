import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type StocksConfig } from './View';
import { Settings } from './Settings';

export const stocksDefinition: WidgetDefinition<StocksConfig> = {
  type: 'stocks',
  displayName: 'Stocks',
  defaultConfig: { tickers: ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'XAU'] },
  defaultSize: { w: 2, h: 3 },
  View,
  Settings,
};
