import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import dotenv from 'dotenv';

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

// Middleware de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors(corsOptions));

// Rate limiting geral
app.use(generalRateLimit);

// Logging
app.use(pinoHttp({ logger }));

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Documentação da API
app.get('/', (req, res) => {
  res.json({
    name: 'ChartSense OB API',
    version: '1.0.0',
    description: 'API para análise de gráficos de trading usando OpenAI',
    endpoints: {
      'POST /analyze': 'Analisa um gráfico por imagem',
      'GET /analyses/:id': 'Busca uma análise específica',
      'GET /history': 'Lista histórico de análises',
      'POST /feedback': 'Envia feedback sobre uma análise',
      'GET /health': 'Status da API',
      'GET /openapi.yaml': 'Documentação OpenAPI'
    },
    documentation: '/openapi.yaml'
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
    method: req.method
  });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  logger.info(`🚀 ChartSense OB API rodando na porta ${PORT}`);
  logger.info(`📚 Documentação disponível em http://localhost:${PORT}/openapi.yaml`);
  logger.info(`🏥 Health check em http://localhost:${PORT}/health`);
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