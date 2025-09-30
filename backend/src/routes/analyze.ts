import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService } from '../services/supabase';
import { OpenAIService } from '../services/openai';
import { AnalysisRequest } from '../types';
import { analyzeRateLimit, validateFileSize, optionalAuth } from '../middleware';
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
  optionalAuth, // Autenticação opcional
  analyzeRateLimit,
  validateFileSize(parseInt(process.env.MAX_IMAGE_MB || '10')),
  analyzeValidation,
  async (req: Request, res: Response) => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array(),
          request_id: requestId
        });
      }

      const { asset, timeframe, strategy, imagePath, userId }: AnalysisRequest = req.body;
      
      // Usar userId do token JWT se disponível, senão usar o fornecido no body
      const effectiveUserId = req.user?.id || userId;

      logger.info('Iniciando análise', { 
        asset, 
        timeframe, 
        strategy, 
        imagePath, 
        userId: effectiveUserId,
        requestId 
      });

      // Verificar se usuário existe, criar se necessário
      if (effectiveUserId && req.user?.email) {
        await supabaseService.ensureUser(effectiveUserId, req.user.email);
      }

      // Verificar tamanho da imagem no Supabase
      try {
        const imageSize = await supabaseService.getImageSize(imagePath);
        const sizeInMB = imageSize / (1024 * 1024);
        const maxSizeInMB = parseInt(process.env.MAX_IMAGE_MB || '10');
        
        if (sizeInMB > maxSizeInMB) {
          return res.status(413).json({
            error: 'Imagem muito grande',
            details: `Tamanho: ${sizeInMB.toFixed(2)}MB. Máximo: ${maxSizeInMB}MB`,
            request_id: requestId
          });
        }

        logger.info('Imagem validada', { 
          imagePath, 
          sizeInMB: sizeInMB.toFixed(2),
          requestId 
        });
      } catch (error) {
        logger.error('Erro ao verificar tamanho da imagem', { error, imagePath, requestId });
        return res.status(400).json({
          error: 'Imagem não encontrada',
          details: 'Verifique se a imagem foi enviada corretamente para o Supabase Storage',
          request_id: requestId
        });
      }

      // Criar registro de análise com status 'processing'
      const analysisRecord = await supabaseService.createAnalysis({
        user_id: effectiveUserId,
        asset,
        timeframe,
        strategy,
        image_path: imagePath,
        status: 'processing'
      });

      logger.info('Registro de análise criado', { 
        analysisId: analysisRecord.id,
        requestId 
      });

      try {
        // Gerar URL assinada para a imagem (10 minutos)
        const signedUrl = await supabaseService.createSignedUrl(imagePath, 600);
        
        logger.info('URL assinada gerada', { 
          analysisId: analysisRecord.id,
          requestId 
        });

        // Analisar imagem com OpenAI
        const analysisResult = await openaiService.analyzeChart({
          imageUrl: signedUrl,
          asset,
          timeframe,
          strategy
        });

        logger.info('Análise OpenAI concluída', { 
          analysisId: analysisRecord.id,
          requestId 
        });

        // Atualizar registro com resultado
        const updatedRecord = await supabaseService.updateAnalysis(analysisRecord.id, {
          result_json: analysisResult,
          status: 'done'
        });

        logger.info('Análise finalizada com sucesso', { 
          analysisId: analysisRecord.id,
          requestId 
        });

        res.json({
          id: updatedRecord.id,
          result: analysisResult,
          status: 'done',
          created_at: updatedRecord.created_at,
          disclaimer: 'Conteúdo educacional. Não é recomendação financeira.',
          request_id: requestId
        });

      } catch (analysisError) {
        logger.error('Erro na análise', { 
          analysisId: analysisRecord.id, 
          error: analysisError,
          requestId 
        });

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
          status: 'error',
          request_id: requestId
        });
      }

    } catch (error) {
      logger.error('Erro geral na rota /analyze', { error, requestId });
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        request_id: requestId
      });
    }
  }
);

// GET /analyses/:id - Buscar análise específica
router.get('/analyses/:id', 
  optionalAuth,
  async (req: Request, res: Response) => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id || id.length !== 36) { // UUID v4 tem 36 caracteres
        return res.status(400).json({
          error: 'ID de análise inválido',
          details: 'Forneça um UUID válido',
          request_id: requestId
        });
      }

      const analysis = await supabaseService.getAnalysis(id, userId);

      if (!analysis) {
        return res.status(404).json({
          error: 'Análise não encontrada',
          details: 'Verifique se o ID está correto e se você tem permissão para acessá-la',
          request_id: requestId
        });
      }

      logger.info('Análise recuperada', { 
        analysisId: id, 
        userId,
        requestId 
      });

      res.json({
        ...analysis,
        disclaimer: 'Conteúdo educacional. Não é recomendação financeira.',
        request_id: requestId
      });

    } catch (error) {
      logger.error('Erro ao buscar análise', { error, requestId });
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        request_id: requestId
      });
    }
  }
);

export default router;