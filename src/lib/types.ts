export interface AnalysisRequest {
  image: File;
  asset: string;
  timeframe: string;
  strategy: 'simple' | '1-gale' | '2-gales';
}

export interface AnalysisResponse {
  asset: string;
  timeframe: string;
  strategy: string;
  bullish_prob: number;
  bearish_prob: number;
  model_confidence: number;
  action: 'buy' | 'sell' | 'wait';
  summary: string;
  signals: string[];
  schedule: {
    server_time_iso: string;
    timeframe_seconds: number;
    entry_time_iso: string;
    expiry_time_iso: string;
    gale_1_entry_iso?: string;
    gale_1_expiry_iso?: string;
    gale_2_entry_iso?: string;
    gale_2_expiry_iso?: string;
    display_tz: string;
  };
  meta: {
    image_quality: 'low' | 'medium' | 'high';
    notes?: string;
  };
}

export interface OpenAIVisionResponse {
  direction: 'up' | 'down' | 'sideways';
  bullish_prob: number;
  bearish_prob: number;
  model_confidence: number;
  summary: string;
  signals: string[];
  notes?: string;
  image_quality: 'low' | 'medium' | 'high';
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  asset: string;
  timeframe: string;
  strategy: string;
  action: 'buy' | 'sell' | 'wait';
  bullish_prob: number;
  bearish_prob: number;
  model_confidence: number;
  schedule: AnalysisResponse['schedule'];
}

export const ASSETS = [
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'AUD/USD',
  'USD/CAD',
  'USD/CHF',
  'NZD/USD',
  'BTC/USDT',
  'ETH/USDT',
  'LTC/USDT',
  'Google (OTC)',
  'Apple (OTC)',
  'Tesla (OTC)',
  'Amazon (OTC)',
] as const;

export const TIMEFRAMES = [
  { value: '15s', label: '15 segundos', seconds: 15 },
  { value: '30s', label: '30 segundos', seconds: 30 },
  { value: '1m', label: '1 minuto (M1)', seconds: 60 },
  { value: '2m', label: '2 minutos', seconds: 120 },
  { value: '5m', label: '5 minutos', seconds: 300 },
  { value: '15m', label: '15 minutos', seconds: 900 },
] as const;

export const STRATEGIES = [
  { value: 'simple', label: 'Simples' },
  { value: '1-gale', label: '1 Gale' },
  { value: '2-gales', label: '2 Gales' },
] as const;