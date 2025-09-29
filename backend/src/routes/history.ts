import { Router, Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { SupabaseService } from '../services/supabase';
import logger from '../services/logger';

const router = Router();
const supabaseService = new SupabaseService();

// GET /analyses/:id - Buscar análise específica
router.get('/analyses/:id',
  param('id').isUUID().withMessage('ID deve ser um UUID válido'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'ID inválido',
          details: errors.array()
        });
      }

      const { id } = req.params;
      
      logger.info('Buscando análise', { analysisId: id });

      const analysis = await supabaseService.getAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({
          error: 'Análise não encontrada'
        });
      }

      logger.info('Análise encontrada', { analysisId: id, status: analysis.status });

      res.json(analysis);

    } catch (error) {
      logger.error('Erro ao buscar análise', { analysisId: req.params.id, error });
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
);

// GET /history - Buscar histórico de análises
router.get('/history',
  [
    query('userId').optional().isUUID().withMessage('UserId deve ser um UUID válido'),
    query('asset').optional().isString().withMessage('Asset deve ser uma string'),
    query('timeframe').optional().isString().withMessage('Timeframe deve ser uma string'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Parâmetros inválidos',
          details: errors.array()
        });
      }

      const { userId, asset, timeframe, limit } = req.query;

      const filters = {
        userId: userId as string,
        asset: asset as string,
        timeframe: timeframe as string,
        limit: limit ? parseInt(limit as string) : 20
      };

      logger.info('Buscando histórico', filters);

      const analyses = await supabaseService.getAnalysesHistory(filters);

      logger.info('Histórico encontrado', { count: analyses.length });

      // Remover dados sensíveis se necessário
      const sanitizedAnalyses = analyses.map(analysis => ({
        id: analysis.id,
        asset: analysis.asset,
        timeframe: analysis.timeframe,
        strategy: analysis.strategy,
        status: analysis.status,
        created_at: analysis.created_at,
        result_json: analysis.status === 'done' ? analysis.result_json : undefined,
        error: analysis.status === 'error' ? analysis.error : undefined
      }));

      res.json({
        analyses: sanitizedAnalyses,
        total: analyses.length,
        filters: filters
      });

    } catch (error) {
      logger.error('Erro ao buscar histórico', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
);

export default router;