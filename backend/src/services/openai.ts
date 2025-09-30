import OpenAI from 'openai';
import { ChartAnalysisResult } from '../types';
import logger from './logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

const CHART_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    trend: { type: "string", enum: ["alta", "baixa", "lateral"] },
    key_levels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["suporte", "resistencia", "ob-compra", "ob-venda"] },
          price: { type: "number" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["type", "price", "confidence"],
        additionalProperties: false
      }
    },
    signals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          side: { type: "string", enum: ["compra", "venda"] },
          entry: { type: "number" },
          stop: { type: "number" },
          take_profit: { type: "number" },
          r_r: { type: "number" },
          reasoning: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["side", "entry", "stop", "take_profit", "r_r", "confidence"],
        additionalProperties: false
      }
    },
    risk_notes: { type: "string" }
  },
  required: ["summary", "trend", "key_levels", "signals"],
  additionalProperties: false
} as const;

export class OpenAIService {
  private async makeRequestWithRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 1
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        // Retry apenas para erros 429 (rate limit) ou 5xx (server errors)
        if (error instanceof Error && 
            (error.message.includes('429') || 
             error.message.includes('5') && error.message.includes('xx'))) {
          
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            logger.warn(`Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms`, {
              error: error.message
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Para outros erros, não fazer retry
        throw error;
      }
    }
    
    throw lastError!;
  }

  async analyzeChart({
    imageUrl,
    asset,
    timeframe,
    strategy
  }: {
    imageUrl: string;
    asset: string;
    timeframe: string;
    strategy: string;
  }): Promise<ChartAnalysisResult> {
    const systemPrompt = `Analista técnico EDUCACIONAL para OB/FX. Extraia: tendência, OBs, suportes/resistências, ideias de estudo (entrada, stop, take, R:R, justificativa), notas de risco. Não dê recomendação financeira. Estime preços pelo eixo Y e reduza confidence se incerto. Contexto: ${asset} | ${timeframe} | estratégia=${strategy}. Retorne SOMENTE no JSON schema.`;

    const startTime = Date.now();
    
    try {
      const result = await this.makeRequestWithRetry(async () => {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analise este gráfico e retorne o JSON do schema."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ChartSenseOBAnalysis",
              schema: CHART_ANALYSIS_SCHEMA,
              strict: true
            }
          },
          temperature: 0.3,
          max_tokens: 2000
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response content from OpenAI');
        }

        const result = JSON.parse(content) as ChartAnalysisResult;
        
        // Log de métricas
        const duration = Date.now() - startTime;
        const tokens = response.usage?.total_tokens || 0;
        
        logger.info('Análise OpenAI concluída', {
          duration_ms: duration,
          tokens_used: tokens,
          model: 'gpt-4o-mini',
          asset,
          timeframe,
          strategy
        });
        
        // Validação básica
        if (!result.summary || !result.trend || !Array.isArray(result.key_levels) || !Array.isArray(result.signals)) {
          throw new Error('Invalid response format from OpenAI');
        }

        return result;
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('OpenAI API Error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
        asset,
        timeframe,
        strategy
      });
      
      if (error instanceof Error) {
        // Melhorar mensagens de erro para o usuário
        if (error.message.includes('429')) {
          throw new Error('Muitas requisições simultâneas. Tente novamente em alguns segundos.');
        } else if (error.message.includes('insufficient_quota')) {
          throw new Error('Cota da API OpenAI esgotada. Tente novamente mais tarde.');
        } else if (error.message.includes('invalid_api_key')) {
          throw new Error('Configuração da API OpenAI inválida.');
        } else if (error.message.includes('content_policy_violation')) {
          throw new Error('Conteúdo da imagem não permitido pela política da OpenAI.');
        }
        
        throw new Error(`Análise falhou: ${error.message}`);
      }
      
      throw new Error('Erro desconhecido na análise do gráfico');
    }
  }

  // Método alternativo usando a API de Responses (experimental)
  async analyzeChartWithResponses({
    imageUrl,
    asset,
    timeframe,
    strategy
  }: {
    imageUrl: string;
    asset: string;
    timeframe: string;
    strategy: string;
  }): Promise<ChartAnalysisResult> {
    const systemPrompt = `Analista técnico EDUCACIONAL para OB/FX. Extraia: tendência, OBs, suportes/resistências, ideias de estudo (entrada, stop, take, R:R, justificativa), notas de risco. Não dê recomendação financeira. Estime preços pelo eixo Y e reduza confidence se incerto. Contexto: ${asset} | ${timeframe} | estratégia=${strategy}. Retorne SOMENTE no JSON schema.`;

    const startTime = Date.now();
    
    try {
      // Nota: A API de Responses pode não estar disponível ainda
      // Este é um exemplo de como seria implementada
      const result = await this.makeRequestWithRetry(async () => {
        const response = await (openai as any).responses?.create({
          model: "gpt-4o-mini",
          input: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Analise este gráfico e retorne o JSON do schema." },
                { type: "input_image", image_url: imageUrl }
              ]
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ChartSenseOBAnalysis",
              schema: CHART_ANALYSIS_SCHEMA,
              strict: true
            }
          }
        });

        // Preferir output_text; fallback para output[0]
        const json = typeof response.output_text === "string"
          ? JSON.parse(response.output_text)
          : (response.output?.[0] as any);

        const duration = Date.now() - startTime;
        logger.info('Análise OpenAI Responses concluída', {
          duration_ms: duration,
          model: 'gpt-4o-mini',
          asset,
          timeframe,
          strategy
        });

        return json;
      });

      return result;
    } catch (error) {
      logger.warn('API de Responses não disponível, usando método padrão', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback para o método padrão se a API de Responses não estiver disponível
      return this.analyzeChart({ imageUrl, asset, timeframe, strategy });
    }
  }

  // Método para testar conectividade com a OpenAI
  async testConnection(): Promise<boolean> {
    try {
      const response = await openai.models.list();
      return response.data.length > 0;
    } catch (error) {
      logger.error('Teste de conexão OpenAI falhou', error);
      return false;
    }
  }

  // Método para obter informações sobre o modelo
  async getModelInfo(): Promise<any> {
    try {
      const response = await openai.models.retrieve('gpt-4o-mini');
      return response;
    } catch (error) {
      logger.error('Erro ao obter informações do modelo', error);
      return null;
    }
  }
}