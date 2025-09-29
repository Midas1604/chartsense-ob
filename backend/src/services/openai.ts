import OpenAI from 'openai';
import { ChartAnalysisResult } from '../types';

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
        required: ["type", "price", "confidence"]
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
        required: ["side", "entry", "stop", "take_profit", "r_r", "confidence"]
      }
    },
    risk_notes: { type: "string" }
  },
  required: ["summary", "trend", "key_levels", "signals"],
  additionalProperties: false
} as const;

export class OpenAIService {
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
    const systemPrompt = `Você é um analista técnico para estudo EDUCACIONAL em OB/FX.
TAREFA: a partir de um screenshot de gráfico, extraia:

1. Tendência (alta/baixa/lateral);
2. Zonas de Order Block (comprador/vendedor) e S/R relevantes;
3. Ideias de estudo, não recomendações: lado, entrada estimada, stop, take, R:R, justificativa (estrutura, pullback, rompimento, FVG, confluências);
4. Notas de risco.

REGRAS:
– Não forneça aconselhamento financeiro.
– Se preço exato não estiver claro, estime pelo eixo Y ou arredonde e reduza confidence.
– Contexto: ${asset} | ${timeframe} | estratégia=${strategy}.
– Saída obrigatória no JSON Schema fornecido (pt-BR, ponto decimal).`;

    try {
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
      
      // Validação básica
      if (!result.summary || !result.trend || !Array.isArray(result.key_levels) || !Array.isArray(result.signals)) {
        throw new Error('Invalid response format from OpenAI');
      }

      return result;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      if (error instanceof Error) {
        throw new Error(`Análise falhou: ${error.message}`);
      }
      
      throw new Error('Erro desconhecido na análise do gráfico');
    }
  }

  // Método alternativo usando a API de Responses (se disponível)
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
    const systemPrompt = `Você é um analista técnico para estudo EDUCACIONAL em OB/FX.
TAREFA: a partir de um screenshot de gráfico, extraia:

1. Tendência (alta/baixa/lateral);
2. Zonas de Order Block (comprador/vendedor) e S/R relevantes;
3. Ideias de estudo, não recomendações: lado, entrada estimada, stop, take, R:R, justificativa (estrutura, pullback, rompimento, FVG, confluências);
4. Notas de risco.

REGRAS:
– Não forneça aconselhamento financeiro.
– Se preço exato não estiver claro, estime pelo eixo Y ou arredonde e reduza confidence.
– Contexto: ${asset} | ${timeframe} | estratégia=${strategy}.
– Saída obrigatória no JSON Schema fornecido (pt-BR, ponto decimal).`;

    try {
      // Nota: A API de Responses pode não estar disponível ainda
      // Este é um exemplo de como seria implementada
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

      return json;
    } catch (error) {
      // Fallback para o método padrão se a API de Responses não estiver disponível
      return this.analyzeChart({ imageUrl, asset, timeframe, strategy });
    }
  }
}