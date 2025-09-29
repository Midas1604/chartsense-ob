import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getTimeframeSeconds, generateSchedule } from '@/lib/time-utils';
import { OpenAIVisionResponse, AnalysisResponse } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VISION_PROMPT = `Você é um analista técnico. Analise apenas a imagem do gráfico enviada.

Indique a direção provável: alta, baixa ou lateral.

Liste sinais visuais que sustentam sua conclusão (ex.: topos/fundos, linhas de tendência, suporte/resistência, padrões de candles, rompimentos, sequência de velas, volatilidade).

Atribua Probabilidade de Alta (%) e Probabilidade de Baixa (%) que somem 100.

Informe Confiança do Modelo (%) com base na qualidade da imagem e clareza dos padrões.

Escreva um resumo curto (até 4 frases) e um campo notes com limitações/observações, se houver.

Não faça recomendações financeiras.
Responda em JSON estrito no formato:
{
"direction": "up|down|sideways",
"bullish_prob": <0-100>,
"bearish_prob": <0-100>,
"model_confidence": <0-100>,
"summary": "string",
"signals": ["string","string"],
"notes": "string opcional",
"image_quality": "low|medium|high"
}`;

function validateImage(file: File): { valid: boolean; error?: string } {
  // Verificar tipo
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Arquivo deve ser uma imagem PNG ou JPG' };
  }
  
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
    return { valid: false, error: 'Apenas arquivos PNG e JPG são aceitos' };
  }
  
  // Verificar tamanho (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'Imagem deve ter no máximo 10MB' };
  }
  
  return { valid: true };
}

function determineAction(
  bullishProb: number,
  bearishProb: number,
  confidence: number,
  strategy: string
): 'buy' | 'sell' | 'wait' {
  // Limites de confiança por estratégia
  const confidenceThresholds = {
    'simple': 60,
    '1-gale': 55,
    '2-gales': 50,
  };
  
  const minConfidence = confidenceThresholds[strategy as keyof typeof confidenceThresholds] || 60;
  
  if (confidence < minConfidence) {
    return 'wait';
  }
  
  const diff = bullishProb - bearishProb;
  
  if (diff >= 10) return 'buy';
  if (diff <= -10) return 'sell';
  return 'wait';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const asset = formData.get('asset') as string;
    const timeframe = formData.get('timeframe') as string;
    const strategy = formData.get('strategy') as string;
    
    if (!image || !asset || !timeframe || !strategy) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: image, asset, timeframe, strategy' },
        { status: 400 }
      );
    }
    
    // Validar imagem
    const validation = validateImage(image);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Converter imagem para base64
    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = image.type;
    
    // Chamar OpenAI Vision
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: VISION_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da API de visão');
    }
    
    let visionResult: OpenAIVisionResponse;
    try {
      visionResult = JSON.parse(content);
    } catch (e) {
      throw new Error('Erro ao processar resposta da análise');
    }
    
    // Normalizar probabilidades para somar 100
    const total = visionResult.bullish_prob + visionResult.bearish_prob;
    if (total !== 100) {
      visionResult.bullish_prob = Math.round((visionResult.bullish_prob / total) * 100);
      visionResult.bearish_prob = 100 - visionResult.bullish_prob;
    }
    
    // Determinar ação
    const action = determineAction(
      visionResult.bullish_prob,
      visionResult.bearish_prob,
      visionResult.model_confidence,
      strategy
    );
    
    // Gerar agenda
    const serverTime = new Date();
    const timeframeSeconds = getTimeframeSeconds(timeframe);
    const schedule = generateSchedule(serverTime, timeframeSeconds, strategy);
    
    // Adicionar aviso de risco para estratégias com gale
    let summary = visionResult.summary;
    if (strategy !== 'simple') {
      summary += ' Lembre-se: gerencie sempre o risco ao usar estratégias com gale.';
    }
    
    const result: AnalysisResponse = {
      asset,
      timeframe,
      strategy,
      bullish_prob: visionResult.bullish_prob,
      bearish_prob: visionResult.bearish_prob,
      model_confidence: visionResult.model_confidence,
      action,
      summary,
      signals: visionResult.signals,
      schedule,
      meta: {
        image_quality: visionResult.image_quality,
        notes: visionResult.notes,
      },
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Erro na análise:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Chave da API OpenAI não configurada' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Timeout na análise. Tente novamente com uma imagem menor.' },
          { status: 408 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor. Tente novamente.' },
      { status: 500 }
    );
  }
}