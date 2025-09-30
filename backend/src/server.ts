import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Importar rotas
import analyzeRouter from './routes/analyze';
import historyRouter from './routes/history';
import feedbackRouter from './routes/feedback';

// Importar middleware
import { generalRateLimit, errorHandler, corsOptions } from './middleware';
import logger from './services/logger';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;

// Middleware para adicionar x-request-id
app.use((req, res, next) => {
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// Middleware de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors(corsOptions));

// Rate limiting geral
app.use(generalRateLimit);

// Logging
app.use(pinoHttp({ 
  logger,
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn'
    } else if (res.statusCode >= 500 || err) {
      return 'error'
    }
    return 'info'
  }
}));

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  const envVars = [
    'NODE_ENV',
    'PORT',
    'OPENAI_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CORS_ORIGIN',
    'MAX_IMAGE_MB',
    'LOG_LEVEL'
  ];

  const envStatus = envVars.reduce((acc, key) => {
    acc[key] = process.env[key] ? '✓ configurado' : '✗ não configurado';
    return acc;
  }, {} as Record<string, string>);

  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    env: envStatus,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Documentação da API
app.get('/', (req, res) => {
  res.json({
    name: 'ChartSense OB API',
    version: '1.0.0',
    description: 'API para análise de gráficos de trading usando OpenAI',
    endpoints: {
      'GET /health': 'Status da API e variáveis de ambiente',
      'POST /analyze': 'Analisa um gráfico por imagem',
      'GET /analyses/:id': 'Busca uma análise específica',
      'GET /history': 'Lista histórico de análises (filtros: asset, timeframe, limit)',
      'POST /feedback': 'Envia feedback sobre uma análise',
      'GET /openapi.yaml': 'Documentação OpenAPI'
    },
    documentation: '/openapi.yaml',
    disclaimer: 'Conteúdo educacional. Não é recomendação financeira.'
  });
});

// Rotas da API
app.use('/', analyzeRouter);
app.use('/', historyRouter);
app.use('/', feedbackRouter);

// Servir documentação OpenAPI
app.get('/openapi.yaml', (req, res) => {
  res.sendFile('openapi.yaml', { root: __dirname + '/../' });
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET /health',
      'POST /analyze',
      'GET /analyses/:id',
      'GET /history',
      'POST /feedback',
      'GET /openapi.yaml'
    ]
  });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  logger.info(`🚀 ChartSense OB API rodando na porta ${PORT}`);
  logger.info(`📚 Documentação disponível em http://localhost:${PORT}/openapi.yaml`);
  logger.info(`🏥 Health check em http://localhost:${PORT}/health`);
  logger.info(`🌍 CORS configurado para: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, fechando servidor...');
  server.close(() => {
    logger.info('Servidor fechado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, fechando servidor...');
  server.close(() => {
    logger.info('Servidor fechado');
    process.exit(0);
  });
});

export default app;