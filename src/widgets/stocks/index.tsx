import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type StocksConfig } from './View';
import { Settings } from './Settings';

export const stocksDefinition: WidgetDefinition<StocksConfig> = {
  type: 'stocks',
  displayName: 'Stocks',
  defaultConfig: {
    tickers: [
      // Mega-cap tech
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
      // Semis
      'AMD', 'AVGO', 'SMCI', 'INTC', 'QCOM',
      // Consumer tech / platforms
      'NFLX', 'SPOT', 'SHOP', 'ABNB', 'UBER',
      // Fintech / crypto
      'COIN', 'HOOD', 'V',
      // Enterprise SaaS / data
      'PLTR', 'CRM', 'ORCL',
      // Retail / media
      'COST', 'DIS',
    ],
  },
  defaultSize: { w: 2, h: 3 },
  View,
  Settings,
};
