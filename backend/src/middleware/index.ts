import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import logger from '../services/logger';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Estender Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

// Rate limiting para análises
export const analyzeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 análises por IP a cada 15 minutos
  message: {
    error: 'Muitas análises solicitadas. Tente novamente em 15 minutos.',
    retry_after: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID se autenticado, senão IP
    return req.user?.id || req.ip;
  }
});

// Rate limiting geral
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP a cada 15 minutos
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    retry_after: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de autenticação JWT do Supabase
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autenticação necessário',
        details: 'Inclua o header: Authorization: Bearer <jwt_token>'
      });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      logger.warn('Token inválido ou expirado', { error: error?.message });
      return res.status(401).json({
        error: 'Token inválido ou expirado',
        details: 'Faça login novamente'
      });
    }

    req.user = {
      id: user.id,
      email: user.email
    };

    logger.debug('Usuário autenticado', { userId: user.id, email: user.email });
    next();
  } catch (error) {
    logger.error('Erro na autenticação', error);
    res.status(500).json({
      error: 'Erro interno na autenticação',
      details: 'Tente novamente'
    });
  }
};

// Middleware de autenticação opcional (não bloqueia se não tiver token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email
        };
        logger.debug('Usuário autenticado opcionalmente', { userId: user.id });
      }
    }
    
    next();
  } catch (error) {
    logger.warn('Erro na autenticação opcional', error);
    next(); // Continua mesmo com erro
  }
};

// Middleware de validação de tamanho de arquivo
export const validateFileSize = (maxSizeInMB: number = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      if (sizeInMB > maxSizeInMB) {
        return res.status(413).json({
          error: `Arquivo muito grande. Máximo permitido: ${maxSizeInMB}MB`,
          current_size: `${sizeInMB.toFixed(2)}MB`,
          max_size: `${maxSizeInMB}MB`
        });
      }
    }
    
    next();
  };
};

// Middleware de tratamento de erros
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.headers['x-request-id'] as string;
  
  logger.error('Error Handler', { 
    error: error.message, 
    stack: error.stack,
    requestId,
    url: req.url,
    method: req.method
  });

  // Erro de validação
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.message,
      request_id: requestId
    });
  }

  // Erro do Supabase
  if (error.message.includes('PGRST') || error.message.includes('supabase')) {
    return res.status(400).json({
      error: 'Erro no banco de dados',
      details: 'Verifique os dados enviados',
      request_id: requestId
    });
  }

  // Erro da OpenAI
  if (error.message.includes('OpenAI') || error.message.includes('Análise falhou')) {
    return res.status(500).json({
      error: 'Erro na análise do gráfico',
      details: error.message,
      request_id: requestId
    });
  }

  // Erro de rate limit
  if (error.message.includes('Too many requests')) {
    return res.status(429).json({
      error: 'Muitas requisições',
      details: 'Aguarde antes de tentar novamente',
      request_id: requestId
    });
  }

  // Erro genérico
  res.status(500).json({
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Tente novamente mais tarde',
    request_id: requestId
  });
};

// Middleware de CORS customizado
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    
    // Permitir requests sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id']
};