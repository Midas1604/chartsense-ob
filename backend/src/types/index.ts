export interface ChartAnalysisResult {
  summary: string;
  trend: 'alta' | 'baixa' | 'lateral';
  key_levels: KeyLevel[];
  signals: Signal[];
  risk_notes?: string;
}

export interface KeyLevel {
  type: 'suporte' | 'resistencia' | 'ob-compra' | 'ob-venda';
  price: number;
  confidence: number;
}

export interface Signal {
  side: 'compra' | 'venda';
  entry: number;
  stop: number;
  take_profit: number;
  r_r: number;
  reasoning?: string;
  confidence: number;
}

export interface AnalysisRequest {
  asset: string;
  timeframe: string;
  strategy: string;
  imagePath: string;
  userId?: string;
}

export interface AnalysisRecord {
  id: string;
  user_id?: string;
  asset: string;
  timeframe: string;
  strategy: string;
  image_path: string;
  result_json?: ChartAnalysisResult;
  status: 'processing' | 'done' | 'error';
  error?: string;
  created_at: string;
}

export interface FeedbackRequest {
  analysisId: string;
  rating: number;
  comment?: string;
}

export interface User {
  id: string;
  email?: string;
  created_at: string;
}