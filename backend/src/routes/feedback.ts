import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { SupabaseService } from '../services/supabase';
import { FeedbackRequest } from '../types';
import logger from '../services/logger';

const router = Router();
const supabaseService = new SupabaseService();

// Validações
const feedbackValidation = [
  body('analysisId').isUUID().withMessage('AnalysisId deve ser um UUID válido'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating deve ser entre 1 e 5'),
  body('comment').optional().isString().isLength({ max: 1000 }).withMessage('Comentário deve ter no máximo 1000 caracteres')
];

router.post('/feedback',
  feedbackValidation,
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

      const { analysisId, rating, comment }: FeedbackRequest = req.body;

      logger.info('Criando feedback', { analysisId, rating, hasComment: !!comment });

      // Verificar se a análise existe
      const analysis = await supabaseService.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({
          error: 'Análise não encontrada'
        });
      }

      // Verificar se a análise foi concluída
      if (analysis.status !== 'done') {
        return res.status(400).json({
          error: 'Não é possível avaliar uma análise que não foi concluída'
        });
      }

      // Criar feedback
      await supabaseService.createFeedback({
        analysisId,
        rating,
        comment
      });

      logger.info('Feedback criado com sucesso', { analysisId, rating });

      res.json({
        message: 'Feedback registrado com sucesso',
        analysisId,
        rating,
        comment
      });

    } catch (error) {
      logger.error('Erro ao criar feedback', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
);

export default router;