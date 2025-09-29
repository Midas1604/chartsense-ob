import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService } from '../services/supabase';
import { OpenAIService } from '../services/openai';
import { AnalysisRequest } from '../types';
import { analyzeRateLimit, validateFileSize } from '../middleware';
import logger from '../services/logger';

const router = Router();
const supabaseService = new SupabaseService();
const openaiService = new OpenAIService();

// Validações
const analyzeValidation = [
  body('asset').notEmpty().withMessage('Asset é obrigatório'),
  body('timeframe').notEmpty().withMessage('Timeframe é obrigatório'),
  body('strategy').notEmpty().withMessage('Strategy é obrigatório'),
  body('imagePath').notEmpty().withMessage('ImagePath é obrigatório'),
  body('userId').optional().isUUID().withMessage('UserId deve ser um UUID válido')
];

router.post('/analyze', 
  analyzeRateLimit,
  validateFileSize(10),
  analyzeValidation,
  async (req: Request, res: Response) => {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        });
      }

      const { asset, timeframe, strategy, imagePath, userId }: AnalysisRequest = req.body;

      logger.info('Iniciando análise', { asset, timeframe, strategy, imagePath, userId });

      // Verificar tamanho da imagem no Supabase
      try {
        const imageSize = await supabaseService.getImageSize(imagePath);
        const sizeInMB = imageSize / (1024 * 1024);
        
        if (sizeInMB > 10) {
          return res.status(413).json({
            error: 'Imagem muito grande',
            details: `Tamanho: ${sizeInMB.toFixed(2)}MB. Máximo: 10MB`
          });
        }
      } catch (error) {
        logger.error('Erro ao verificar tamanho da imagem', error);
        return res.status(400).json({
          error: 'Imagem não encontrada',
          details: 'Verifique se a imagem foi enviada corretamente'
        });
      }

      // Criar registro de análise com status 'processing'
      const analysisRecord = await supabaseService.createAnalysis({
        user_id: userId,
        asset,
        timeframe,
        strategy,
        image_path: imagePath,
        status: 'processing'
      });

      logger.info('Registro de análise criado', { analysisId: analysisRecord.id });

      try {
        // Gerar URL assinada para a imagem
        const signedUrl = await supabaseService.createSignedUrl(imagePath, 600); // 10 minutos
        
        logger.info('URL assinada gerada', { analysisId: analysisRecord.id });

        // Analisar imagem com OpenAI
        const analysisResult = await openaiService.analyzeChart({
          imageUrl: signedUrl,
          asset,
          timeframe,
          strategy
        });

        logger.info('Análise OpenAI concluída', { analysisId: analysisRecord.id });

        // Atualizar registro com resultado
        const updatedRecord = await supabaseService.updateAnalysis(analysisRecord.id, {
          result_json: analysisResult,
          status: 'done'
        });

        logger.info('Análise finalizada com sucesso', { analysisId: analysisRecord.id });

        res.json({
          id: updatedRecord.id,
          result: analysisResult,
          status: 'done',
          created_at: updatedRecord.created_at
        });

      } catch (analysisError) {
        logger.error('Erro na análise', { analysisId: analysisRecord.id, error: analysisError });

        // Atualizar registro com erro
        const errorMessage = analysisError instanceof Error 
          ? analysisError.message.substring(0, 400)
          : 'Erro desconhecido na análise';

        await supabaseService.updateAnalysis(analysisRecord.id, {
          status: 'error',
          error: errorMessage
        });

        res.status(500).json({
          id: analysisRecord.id,
          error: 'Falha na análise do gráfico',
          details: errorMessage,
          status: 'error'
        });
      }

    } catch (error) {
      logger.error('Erro geral na rota /analyze', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
);

export default router;