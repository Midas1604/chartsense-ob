import { createClient } from '@supabase/supabase-js';
import { AnalysisRecord, FeedbackRequest, User } from '../types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export class SupabaseService {
  // Criar ou buscar usuário
  async findOrCreateUser(email?: string): Promise<User> {
    if (!email) {
      // Criar usuário anônimo
      const { data, error } = await supabase
        .from('users')
        .insert({})
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }

    // Buscar usuário existente
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code === 'PGRST116') {
      // Usuário não existe, criar novo
      const { data, error: insertError } = await supabase
        .from('users')
        .insert({ email })
        .select()
        .single();
      
      if (insertError) throw insertError;
      user = data;
    } else if (error) {
      throw error;
    }

    return user!;
  }

  // Criar nova análise
  async createAnalysis(analysis: Omit<AnalysisRecord, 'id' | 'created_at'>): Promise<AnalysisRecord> {
    const { data, error } = await supabase
      .from('analyses')
      .insert(analysis)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Atualizar análise
  async updateAnalysis(id: string, updates: Partial<AnalysisRecord>): Promise<AnalysisRecord> {
    const { data, error } = await supabase
      .from('analyses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar análise por ID
  async getAnalysis(id: string): Promise<AnalysisRecord | null> {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  // Buscar histórico de análises
  async getAnalysesHistory(filters: {
    userId?: string;
    asset?: string;
    timeframe?: string;
    limit?: number;
  }): Promise<AnalysisRecord[]> {
    let query = supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.asset) {
      query = query.eq('asset', filters.asset);
    }
    if (filters.timeframe) {
      query = query.eq('timeframe', filters.timeframe);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Criar feedback
  async createFeedback(feedback: FeedbackRequest): Promise<void> {
    const { error } = await supabase
      .from('feedback')
      .insert({
        analysis_id: feedback.analysisId,
        rating: feedback.rating,
        comment: feedback.comment
      });

    if (error) throw error;
  }

  // Gerar URL assinada para imagem
  async createSignedUrl(path: string, expiresIn: number = 300): Promise<string> {
    const { data, error } = await supabase.storage
      .from('charts')
      .createSignedUrl(path, expiresIn);

    if (error || !data) {
      throw error || new Error('Failed to create signed URL');
    }

    return data.signedUrl;
  }

  // Verificar tamanho da imagem
  async getImageSize(path: string): Promise<number> {
    const { data, error } = await supabase.storage
      .from('charts')
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop()
      });

    if (error) throw error;
    
    const file = data?.find(f => f.name === path.split('/').pop());
    if (!file) throw new Error('File not found');
    
    return file.metadata?.size || 0;
  }
}