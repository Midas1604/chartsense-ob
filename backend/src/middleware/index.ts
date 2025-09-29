import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Rate limiting para análises
export const analyzeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 análises por IP a cada 15 minutos
  message: {
    error: 'Muitas análises solicitadas. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting geral
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP a cada 15 minutos
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de validação de tamanho de arquivo
export const validateFileSize = (maxSizeInMB: number = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      if (sizeInMB > maxSizeInMB) {
        return res.status(413).json({
          error: `Arquivo muito grande. Máximo permitido: ${maxSizeInMB}MB`
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
  console.error('Error:', error);

  // Erro de validação
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.message
    });
  }

  // Erro do Supabase
  if (error.message.includes('PGRST')) {
    return res.status(400).json({
      error: 'Erro no banco de dados',
      details: 'Verifique os dados enviados'
    });
  }

  // Erro da OpenAI
  if (error.message.includes('OpenAI') || error.message.includes('Análise falhou')) {
    return res.status(500).json({
      error: 'Erro na análise do gráfico',
      details: error.message
    });
  }

  // Erro genérico
  res.status(500).json({
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Tente novamente mais tarde'
  });
};

// Middleware de CORS customizado
export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};