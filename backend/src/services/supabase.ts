import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AnalysisRecord, ChartAnalysisResult, FeedbackRequest } from '../types';
import logger from './logger';

export class SupabaseService {
  private supabase: SupabaseClient;
  private serviceSupabase: SupabaseClient;

  constructor() {
    // Cliente público (para operações autenticadas)
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // Cliente de serviço (para operações administrativas)
    this.serviceSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // Criar análise
  async createAnalysis(data: {
    user_id?: string;
    asset: string;
    timeframe: string;
    strategy: string;
    image_path: string;
    status: 'processing' | 'done' | 'error';
  }): Promise<AnalysisRecord> {
    try {
      const { data: analysis, error } = await this.serviceSupabase
        .from('analyses')
        .insert([data])
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar análise', { error, data });
        throw new Error(`Erro ao criar análise: ${error.message}`);
      }

      logger.info('Análise criada', { analysisId: analysis.id });
      return analysis;
    } catch (error) {
      logger.error('Erro no createAnalysis', error);
      throw error;
    }
  }

  // Atualizar análise
  async updateAnalysis(
    id: string, 
    data: {
      result_json?: ChartAnalysisResult;
      status?: 'processing' | 'done' | 'error';
      error?: string;
    }
  ): Promise<AnalysisRecord> {
    try {
      const { data: analysis, error } = await this.serviceSupabase
        .from('analyses')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Erro ao atualizar análise', { error, id, data });
        throw new Error(`Erro ao atualizar análise: ${error.message}`);
      }

      logger.info('Análise atualizada', { analysisId: id, status: data.status });
      return analysis;
    } catch (error) {
      logger.error('Erro no updateAnalysis', error);
      throw error;
    }
  }

  // Buscar análise por ID
  async getAnalysis(id: string, userId?: string): Promise<AnalysisRecord | null> {
    try {
      let query = this.serviceSupabase
        .from('analyses')
        .select('*')
        .eq('id', id);

      // Se userId fornecido, filtrar por usuário (RLS)
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: analysis, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Não encontrado
        }
        logger.error('Erro ao buscar análise', { error, id, userId });
        throw new Error(`Erro ao buscar análise: ${error.message}`);
      }

      return analysis;
    } catch (error) {
      logger.error('Erro no getAnalysis', error);
      throw error;
    }
  }

  // Buscar histórico de análises
  async getAnalysesHistory(filters: {
    userId?: string;
    asset?: string;
    timeframe?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: AnalysisRecord[]; count: number }> {
    try {
      let query = this.serviceSupabase
        .from('analyses')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Filtros
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters.asset) {
        query = query.eq('asset', filters.asset);
      }
      
      if (filters.timeframe) {
        query = query.eq('timeframe', filters.timeframe);
      }

      // Paginação
      const limit = Math.min(filters.limit || 20, 100); // Máximo 100
      const offset = filters.offset || 0;
      
      query = query.range(offset, offset + limit - 1);

      const { data: analyses, error, count } = await query;

      if (error) {
        logger.error('Erro ao buscar histórico', { error, filters });
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      logger.info('Histórico recuperado', { 
        count: analyses?.length || 0, 
        total: count,
        filters 
      });

      return { 
        data: analyses || [], 
        count: count || 0 
      };
    } catch (error) {
      logger.error('Erro no getAnalysesHistory', error);
      throw error;
    }
  }

  // Criar feedback
  async createFeedback(data: {
    analysis_id: string;
    rating: number;
    comment?: string;
    user_id?: string;
  }): Promise<any> {
    try {
      // Verificar se a análise existe e pertence ao usuário
      if (data.user_id) {
        const analysis = await this.getAnalysis(data.analysis_id, data.user_id);
        if (!analysis) {
          throw new Error('Análise não encontrada ou não pertence ao usuário');
        }
      }

      const { data: feedback, error } = await this.serviceSupabase
        .from('feedback')
        .insert([{
          analysis_id: data.analysis_id,
          rating: data.rating,
          comment: data.comment
        }])
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar feedback', { error, data });
        throw new Error(`Erro ao criar feedback: ${error.message}`);
      }

      logger.info('Feedback criado', { feedbackId: feedback.id, analysisId: data.analysis_id });
      return feedback;
    } catch (error) {
      logger.error('Erro no createFeedback', error);
      throw error;
    }
  }

  // Gerar URL assinada para imagem
  async createSignedUrl(imagePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await this.serviceSupabase.storage
        .from('charts')
        .createSignedUrl(imagePath, expiresIn);

      if (error) {
        logger.error('Erro ao gerar URL assinada', { error, imagePath });
        throw new Error(`Erro ao gerar URL assinada: ${error.message}`);
      }

      logger.debug('URL assinada gerada', { imagePath, expiresIn });
      return data.signedUrl;
    } catch (error) {
      logger.error('Erro no createSignedUrl', error);
      throw error;
    }
  }

  // Obter tamanho da imagem
  async getImageSize(imagePath: string): Promise<number> {
    try {
      const { data, error } = await this.serviceSupabase.storage
        .from('charts')
        .list(imagePath.split('/').slice(0, -1).join('/'), {
          search: imagePath.split('/').pop()
        });

      if (error) {
        logger.error('Erro ao obter tamanho da imagem', { error, imagePath });
        throw new Error(`Erro ao obter tamanho da imagem: ${error.message}`);
      }

      const file = data.find(f => imagePath.endsWith(f.name));
      if (!file) {
        throw new Error('Imagem não encontrada');
      }

      return file.metadata?.size || 0;
    } catch (error) {
      logger.error('Erro no getImageSize', error);
      throw error;
    }
  }

  // Upload de imagem (para uso futuro)
  async uploadImage(
    file: Buffer, 
    fileName: string, 
    userId: string,
    contentType: string = 'image/png'
  ): Promise<string> {
    try {
      const filePath = `${userId}/${Date.now()}-${fileName}`;
      
      const { data, error } = await this.serviceSupabase.storage
        .from('charts')
        .upload(filePath, file, {
          contentType,
          upsert: false
        });

      if (error) {
        logger.error('Erro no upload da imagem', { error, fileName, userId });
        throw new Error(`Erro no upload: ${error.message}`);
      }

      logger.info('Imagem enviada', { filePath, userId });
      return data.path;
    } catch (error) {
      logger.error('Erro no uploadImage', error);
      throw error;
    }
  }

  // Verificar se usuário existe, criar se não existir
  async ensureUser(userId: string, email?: string): Promise<void> {
    try {
      const { data: existingUser, error: selectError } = await this.serviceSupabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (!existingUser) {
        const { error: insertError } = await this.serviceSupabase
          .from('users')
          .insert([{ id: userId, email }]);

        if (insertError) {
          logger.error('Erro ao criar usuário', { error: insertError, userId, email });
          throw new Error(`Erro ao criar usuário: ${insertError.message}`);
        }

        logger.info('Usuário criado', { userId, email });
      }
    } catch (error) {
      logger.error('Erro no ensureUser', error);
      throw error;
    }
  }

  // Estatísticas do usuário
  async getUserStats(userId: string): Promise<{
    total_analyses: number;
    completed_analyses: number;
    error_analyses: number;
    avg_rating?: number;
  }> {
    try {
      // Contar análises
      const { count: totalCount } = await this.serviceSupabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: completedCount } = await this.serviceSupabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'done');

      const { count: errorCount } = await this.serviceSupabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'error');

      // Rating médio dos feedbacks
      const { data: avgRating } = await this.serviceSupabase
        .from('feedback')
        .select('rating')
        .in('analysis_id', 
          this.serviceSupabase
            .from('analyses')
            .select('id')
            .eq('user_id', userId)
        );

      const avgRatingValue = avgRating && avgRating.length > 0
        ? avgRating.reduce((sum, f) => sum + f.rating, 0) / avgRating.length
        : undefined;

      return {
        total_analyses: totalCount || 0,
        completed_analyses: completedCount || 0,
        error_analyses: errorCount || 0,
        avg_rating: avgRatingValue
      };
    } catch (error) {
      logger.error('Erro no getUserStats', error);
      throw error;
    }
  }
}