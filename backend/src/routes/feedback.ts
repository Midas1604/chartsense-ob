import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { SupabaseService } from '../services/supabase';
import { FeedbackRequest } from '../types';
import { optionalAuth } from '../middleware';
import logger from '../services/logger';

const router = Router();
const supabaseService = new SupabaseService();

// Validações
const feedbackValidation = [
  body('analysisId').isUUID().withMessage('AnalysisId deve ser um UUID válido'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating deve ser um número entre 1 e 5'),
  body('comment').optional().isString().isLength({ max: 1000 }).withMessage('Comment deve ter no máximo 1000 caracteres')
];

router.post('/feedback', 
  optionalAuth,
  feedbackValidation,
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

      const { analysisId, rating, comment }: FeedbackRequest = req.body;
      const userId = req.user?.id;

      logger.info('Criando feedback', { 
        analysisId, 
        rating, 
        hasComment: !!comment,
        userId,
        requestId 
      });

      // Verificar se a análise existe e pertence ao usuário (se autenticado)
      const analysis = await supabaseService.getAnalysis(analysisId, userId);
      
      if (!analysis) {
        return res.status(404).json({
          error: 'Análise não encontrada',
          details: 'Verifique se o ID da análise está correto e se você tem permissão para acessá-la',
          request_id: requestId
        });
      }

      // Verificar se a análise foi concluída
      if (analysis.status !== 'done') {
        return res.status(400).json({
          error: 'Análise não concluída',
          details: 'Só é possível enviar feedback para análises concluídas',
          current_status: analysis.status,
          request_id: requestId
        });
      }

      // Criar feedback
      const feedback = await supabaseService.createFeedback({
        analysis_id: analysisId,
        rating,
        comment,
        user_id: userId
      });

      logger.info('Feedback criado com sucesso', { 
        feedbackId: feedback.id,
        analysisId,
        rating,
        requestId 
      });

      res.status(201).json({
        id: feedback.id,
        analysis_id: analysisId,
        rating,
        comment,
        created_at: feedback.created_at,
        message: 'Feedback enviado com sucesso',
        request_id: requestId
      });

    } catch (error) {
      logger.error('Erro ao criar feedback', { error, requestId });
      
      // Tratamento específico para erro de duplicação (se houver constraint)
      if (error instanceof Error && error.message.includes('duplicate')) {
        return res.status(409).json({
          error: 'Feedback já enviado',
          details: 'Você já enviou feedback para esta análise',
          request_id: requestId
        });
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        request_id: requestId
      });
    }
  }
);

// GET /feedback/:analysisId - Buscar feedback de uma análise
router.get('/feedback/:analysisId', 
  optionalAuth,
  async (req: Request, res: Response) => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { analysisId } = req.params;
      const userId = req.user?.id;

      if (!analysisId || analysisId.length !== 36) {
        return res.status(400).json({
          error: 'ID de análise inválido',
          details: 'Forneça um UUID válido',
          request_id: requestId
        });
      }

      // Verificar se a análise existe e pertence ao usuário (se autenticado)
      const analysis = await supabaseService.getAnalysis(analysisId, userId);
      
      if (!analysis) {
        return res.status(404).json({
          error: 'Análise não encontrada',
          details: 'Verifique se o ID da análise está correto e se você tem permissão para acessá-la',
          request_id: requestId
        });
      }

      // Buscar feedback da análise
      const { data: feedbacks, error } = await supabaseService['serviceSupabase']
        .from('feedback')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar feedback: ${error.message}`);
      }

      logger.info('Feedback recuperado', { 
        analysisId,
        count: feedbacks?.length || 0,
        requestId 
      });

      res.json({
        analysis_id: analysisId,
        feedbacks: feedbacks || [],
        count: feedbacks?.length || 0,
        request_id: requestId
      });

    } catch (error) {
      logger.error('Erro ao buscar feedback', { error, requestId });
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        request_id: requestId
      });
    }
  }
);

export default router;