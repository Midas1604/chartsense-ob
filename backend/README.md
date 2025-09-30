# ChartSense OB Backend API

API backend para análise de gráficos de trading usando OpenAI Vision e Supabase.

## 🚀 Funcionalidades

- **Análise de Gráficos**: Upload de imagens e análise usando OpenAI GPT-4o-mini com Structured Outputs
- **Armazenamento**: Persistência no Supabase (PostgreSQL + Storage)
- **Rate Limiting**: Proteção contra abuso
- **Validação**: Validação rigorosa de dados de entrada
- **Logging**: Sistema de logs estruturado com Pino
- **Docker**: Containerização para deploy fácil
- **OpenAPI**: Documentação completa da API
- **RLS Security**: Row Level Security configurado no Supabase

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase
- Chave da API OpenAI

## ⚙️ Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Servidor
PORT=8787
NODE_ENV=development

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Logs
LOG_LEVEL=debug
```

### 3. Configurar Supabase

#### 3.1 Executar migrações SQL

Execute os arquivos SQL no SQL Editor do Supabase:

1. `src/db/migrations.sql` - Criar tabelas
2. `src/db/rls_policies.sql` - Configurar segurança RLS

#### 3.2 Criar buckets de Storage

No painel do Supabase, vá em Storage e crie:

- **charts**: Para imagens de gráficos (limite 10MB)
- **reports**: Para relatórios opcionais (limite 50MB)

#### 3.3 Configurar políticas de Storage

Execute as políticas de segurança conforme `SUPABASE_STORAGE_SETUP.md`.

## 🏃‍♂️ Executar

### Desenvolvimento

```bash
npm run dev
```

### Produção

```bash
npm run build
npm start
```

### Docker

```bash
# Build da imagem
docker build -t chartsense-backend .

# Executar container
docker run -p 8787:8787 --env-file .env chartsense-backend

# Ou usar docker-compose
docker-compose up -d
```

## 📚 Documentação da API

### Endpoints Principais

#### POST /analyze
Analisa um gráfico enviado via imagem.

**Request:**
```json
{
  "asset": "EUR/USD",
  "timeframe": "M15",
  "strategy": "Order Blocks",
  "imagePath": "charts/user123/chart-abc123.png",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "Análise iniciada com sucesso"
}
```

#### GET /analyses/:id
Busca uma análise específica pelo ID.

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "asset": "EUR/USD",
  "timeframe": "M15",
  "strategy": "Order Blocks",
  "status": "done",
  "result_json": {
    "summary": "Análise do gráfico EUR/USD...",
    "trend": "alta",
    "key_levels": [...],
    "signals": [...],
    "risk_notes": "..."
  },
  "created_at": "2024-01-01T12:00:00Z"
}
```

#### GET /history
Lista histórico de análises com filtros opcionais.

**Query Parameters:**
- `userId` (UUID): Filtrar por usuário
- `asset` (string): Filtrar por ativo (ex: "EUR/USD")
- `timeframe` (string): Filtrar por timeframe (ex: "M15")
- `limit` (number): Limite de resultados (1-100, padrão: 20)

**Response:**
```json
{
  "analyses": [...],
  "total": 15,
  "filters": {
    "asset": "EUR/USD",
    "timeframe": "M15",
    "limit": 20
  }
}
```

#### POST /feedback
Envia feedback sobre uma análise.

**Request:**
```json
{
  "analysisId": "550e8400-e29b-41d4-a716-446655440000",
  "rating": 5,
  "comment": "Análise muito precisa!"
}
```

**Response:**
```json
{
  "message": "Feedback registrado com sucesso",
  "analysisId": "550e8400-e29b-41d4-a716-446655440000",
  "rating": 5,
  "comment": "Análise muito precisa!"
}
```

#### GET /health
Health check da API.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### Documentação OpenAPI

Acesse `http://localhost:8787/openapi.yaml` para ver a documentação completa.

## 🧪 Exemplos de Uso com cURL

### 1. Analisar gráfico

```bash
curl -X POST http://localhost:8787/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "EUR/USD",
    "timeframe": "M15",
    "strategy": "Order Blocks",
    "imagePath": "charts/user123/chart-abc123.png",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### 2. Buscar análise específica

```bash
curl http://localhost:8787/analyses/550e8400-e29b-41d4-a716-446655440000
```

### 3. Buscar histórico com filtros

```bash
# Histórico geral
curl "http://localhost:8787/history?limit=10"

# Filtrado por asset
curl "http://localhost:8787/history?asset=EUR/USD&limit=5"

# Filtrado por timeframe
curl "http://localhost:8787/history?timeframe=M15&limit=20"

# Múltiplos filtros
curl "http://localhost:8787/history?asset=GBP/USD&timeframe=H1&limit=10"
```

### 4. Enviar feedback

```bash
curl -X POST http://localhost:8787/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "550e8400-e29b-41d4-a716-446655440000",
    "rating": 5,
    "comment": "Análise muito precisa!"
  }'
```

### 5. Health check

```bash
curl http://localhost:8787/health
```

## 🔒 Segurança

### Rate Limiting

- **Análises**: 10 por IP a cada 15 minutos
- **Geral**: 100 requests por IP a cada 15 minutos

### Validação de Imagens

- Tamanho máximo: 10MB
- Verificação no Supabase Storage antes da análise
- Validação de formato e integridade

### RLS (Row Level Security)

- Usuários só acessam seus próprios dados
- Políticas configuradas no Supabase
- Autenticação via JWT tokens

## 🏗️ Estrutura do Projeto

```
src/
├── routes/          # Rotas da API
│   ├── analyze.ts   # POST /analyze
│   ├── history.ts   # GET /analyses/:id, /history
│   └── feedback.ts  # POST /feedback
├── services/        # Serviços
│   ├── openai.ts    # Integração OpenAI (gpt-4o-mini + Structured Outputs)
│   ├── supabase.ts  # Integração Supabase
│   └── logger.ts    # Sistema de logs
├── middleware/      # Middlewares
│   └── index.ts     # Rate limiting, validação, CORS
├── types/           # Tipos TypeScript
│   └── index.ts     # Interfaces e tipos
├── db/              # Scripts de banco
│   ├── migrations.sql
│   └── rls_policies.sql
└── server.ts        # Servidor principal
```

## 🧪 Desenvolvimento

### Scripts disponíveis

```bash
npm run dev      # Desenvolvimento com hot reload
npm run build    # Build para produção
npm start        # Executar versão buildada
npm run lint     # Linter
npm run lint:fix # Corrigir problemas do linter
```

### Logs

Os logs são estruturados usando Pino:

- **Desenvolvimento**: Pretty print colorido
- **Produção**: JSON estruturado

### Tratamento de Erros

- Erros são capturados e logados
- Respostas padronizadas para o cliente
- Status de análise atualizado em caso de erro

## 🚀 Deploy

### Railway

1. Conecte seu repositório no Railway
2. Configure as variáveis de ambiente:
   ```
   NODE_ENV=production
   PORT=8787
   OPENAI_API_KEY=sk-...
   SUPABASE_URL=https://...
   SUPABASE_SERVICE_ROLE_KEY=...
   LOG_LEVEL=info
   ```
3. Deploy automático via Git

### Render

1. Conecte seu repositório no Render
2. Configure o serviço:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Port**: 8787
3. Configure as variáveis de ambiente
4. Deploy automático

### Vercel (Serverless)

1. Instale a CLI do Vercel: `npm i -g vercel`
2. Configure `vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/server.ts",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/server.ts"
       }
     ]
   }
   ```
3. Deploy: `vercel --prod`

### Docker (Produção)

```bash
# Build
docker build -t chartsense-backend .

# Run com todas as features
docker-compose --profile production up -d

# Run básico
docker-compose up -d chartsense-backend
```

### Variáveis de Ambiente (Produção)

```env
NODE_ENV=production
PORT=8787
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
LOG_LEVEL=info
```

## 🔧 Troubleshooting

### Problemas Comuns

1. **Erro de conexão Supabase**
   - Verifique as variáveis de ambiente
   - Confirme se as tabelas foram criadas
   - Teste a conexão no SQL Editor

2. **Erro OpenAI**
   - Verifique a chave da API
   - Confirme se há créditos disponíveis
   - Teste com uma imagem menor

3. **Imagem não encontrada**
   - Verifique se o arquivo existe no Storage
   - Confirme as políticas de acesso
   - Teste o signedUrl manualmente

4. **Rate limit**
   - Aguarde o tempo de reset
   - Configure limites personalizados se necessário

5. **Erro de build TypeScript**
   - Execute `npm run build` localmente
   - Verifique tipos e imports

### Logs Úteis

```bash
# Ver logs em tempo real
docker-compose logs -f chartsense-backend

# Filtrar por nível
docker-compose logs chartsense-backend | grep ERROR

# Logs de desenvolvimento
npm run dev | grep "analysis"
```

### Debugging

```bash
# Testar conexão Supabase
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     "https://your-project.supabase.co/rest/v1/analyses?select=*&limit=1"

# Testar OpenAI
curl -H "Authorization: Bearer YOUR_OPENAI_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"test"}]}' \
     "https://api.openai.com/v1/chat/completions"
```

## 📊 Monitoramento

### Health Checks

- **Endpoint**: `/health`
- **Docker**: Health check configurado
- **Uptime**: Monitore via Railway/Render dashboard

### Métricas

- Rate limiting: Headers `X-RateLimit-*`
- Response times: Logs estruturados
- Error rates: Logs de erro

### Alertas

Configure alertas para:
- API down (health check fail)
- High error rate (>5%)
- Rate limit exceeded
- OpenAI quota exceeded

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato:

- Email: support@chartsense.com
- GitHub: [ChartSense Issues](https://github.com/chartsense/backend/issues)

---

**⚠️ Aviso Legal**: Este sistema é para fins educacionais. Não constitui aconselhamento financeiro.