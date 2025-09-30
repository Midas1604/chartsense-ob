import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { SupabaseService } from '../services/supabase';
import { optionalAuth } from '../middleware';
import logger from '../services/logger';

const router = Router();
const supabaseService = new SupabaseService();

// Validações para query parameters
const historyValidation = [
  query('asset').optional().isString().withMessage('Asset deve ser uma string'),
  query('timeframe').optional().isString().withMessage('Timeframe deve ser uma string'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser um número entre 1 e 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset deve ser um número maior ou igual a 0')
];

router.get('/history', 
  optionalAuth,
  historyValidation,
  async (req: Request, res: Response) => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Parâmetros inválidos',
          details: errors.array(),
          request_id: requestId
        });
      }

      const userId = req.user?.id;
      const { asset, timeframe, limit, offset } = req.query;

      // Converter parâmetros
      const filters = {
        userId,
        asset: asset as string | undefined,
        timeframe: timeframe as string | undefined,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0
      };

      logger.info('Buscando histórico', { 
        filters,
        requestId 
      });

      const { data: analyses, count } = await supabaseService.getAnalysesHistory(filters);

      // Adicionar informações de paginação
      const hasMore = (filters.offset + filters.limit) < count;
      const nextOffset = hasMore ? filters.offset + filters.limit : null;

      logger.info('Histórico recuperado', { 
        count: analyses.length,
        total: count,
        hasMore,
        requestId 
      });

      res.json({
        data: analyses,
        pagination: {
          total: count,
          limit: filters.limit,
          offset: filters.offset,
          has_more: hasMore,
          next_offset: nextOffset
        },
        filters: {
          asset: filters.asset || null,
          timeframe: filters.timeframe || null,
          user_id: filters.userId || null
        },
        disclaimer: 'Conteúdo educacional. Não é recomendação financeira.',
        request_id: requestId
      });

    } catch (error) {
      logger.error('Erro ao buscar histórico', { error, requestId });
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        request_id: requestId
      });
    }
  }
);

// GET /history/stats - Estatísticas do usuário
router.get('/history/stats', 
  optionalAuth,
  async (req: Request, res: Response) => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Autenticação necessária',
          details: 'Faça login para ver suas estatísticas',
          request_id: requestId
        });
      }

      const stats = await supabaseService.getUserStats(userId);

      logger.info('Estatísticas recuperadas', { 
        userId,
        stats,
        requestId 
      });

      res.json({
        ...stats,
        user_id: userId,
        request_id: requestId
      });

    } catch (error) {
      logger.error('Erro ao buscar estatísticas', { error, requestId });
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        request_id: requestId
      });
    }
  }
);

export default router;