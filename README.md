# ChartSense OB

Um webapp avançado para análise de gráficos de opções binárias usando inteligência artificial. Analisa screenshots de gráficos e fornece probabilidades, sinais técnicos e agenda de execução com timing preciso.

## 🚀 Funcionalidades

- **Análise Automática**: Upload de imagem dispara análise instantânea
- **IA Vision**: Usa OpenAI GPT-4 Vision para análise técnica avançada
- **Probabilidades**: Calcula % de alta/baixa com confiança do modelo
- **Timing Preciso**: Agenda de entrada/expiração alinhada ao timeframe
- **Estratégias Gale**: Suporte para 1 e 2 gales com timing automático
- **Histórico Local**: Salva últimas 5 análises no navegador
- **Interface Responsiva**: Funciona perfeitamente em mobile e desktop
- **Countdown em Tempo Real**: Barra de progresso com fases da operação

## 🛠️ Tecnologias

- **Next.js 15** com App Router
- **React 19** + TypeScript
- **Tailwind CSS v4** para styling responsivo
- **OpenAI GPT-4 Vision** para análise de imagens
- **Lucide Icons** para interface moderna
- **Shadcn/ui** para componentes profissionais

## ⚡ Instalação Rápida

1. **Clone e instale dependências:**
   ```bash
   npm install
   ```

2. **Configure a variável de ambiente:**
   ```bash
   # Crie o arquivo .env.local na raiz do projeto
   OPENAI_API_KEY=sua_chave_openai_aqui
   ```

3. **Execute o projeto:**
   ```bash
   npm run dev
   ```

4. **Acesse:** http://localhost:3000

## 🔑 Configuração da API OpenAI

### Obter Chave da API

1. Acesse [OpenAI Platform](https://platform.openai.com/)
2. Faça login ou crie uma conta
3. Vá em **API Keys** no menu lateral
4. Clique em **Create new secret key**
5. Copie a chave gerada (começa com `sk-`)

### Configurar no Projeto

Crie o arquivo `.env.local` na raiz do projeto:

```env
OPENAI_API_KEY=sk-sua_chave_aqui
```

**⚠️ IMPORTANTE:**
- Nunca compartilhe sua chave da API
- Adicione `.env.local` ao `.gitignore`
- A chave é necessária para a análise funcionar

## 📊 Como Usar

### 1. Configuração Inicial
- **Ativo**: Selecione o par (EUR/USD, BTC/USDT, etc.)
- **Timeframe**: Escolha o tempo do gráfico (15s, 1m, 5m, etc.)
- **Estratégia**: Simples, 1 Gale ou 2 Gales

### 2. Upload da Imagem
- Arraste e solte uma imagem PNG/JPG do gráfico
- Ou clique em "Selecionar Imagem"
- **A análise inicia automaticamente** após o upload

### 3. Resultado da Análise
- **Ação**: COMPRAR, VENDER ou AGUARDAR
- **Probabilidades**: % de alta e baixa (soma 100%)
- **Confiança**: % de certeza do modelo
- **Agenda**: Horários de entrada, expiração e gales
- **Sinais**: Padrões técnicos detectados
- **Countdown**: Tempo restante para cada fase

### 4. Histórico
- Clique em "Histórico" para ver últimas 5 análises
- Dados salvos localmente no navegador

## 🎯 Tipos de Imagem Suportados

### ✅ Formatos Aceitos
- **PNG** (recomendado)
- **JPG/JPEG**
- **Tamanho máximo**: 10MB
- **Resolução mínima**: 600x400px

### 📈 Melhores Práticas
- **Gráficos limpos** com candles visíveis
- **Eixos de tempo e preço** claramente marcados
- **Boa iluminação** e contraste
- **Sem sobreposições** de janelas ou menus
- **Timeframe consistente** com a configuração

### ❌ Evitar
- Screenshots com baixa resolução
- Gráficos com muita poluição visual
- Imagens borradas ou com ruído
- Gráficos sem escala de tempo/preço

## ⚙️ Personalização do Prompt

O prompt de análise está em `src/app/api/analyze/route.ts` na constante `VISION_PROMPT`.

### Modificar Análise

Para ajustar o comportamento da IA, edite o prompt:

```typescript
const VISION_PROMPT = `Você é um analista técnico. Analise apenas a imagem do gráfico enviada.

// Suas instruções personalizadas aqui...

Responda em JSON estrito no formato:
{
  "direction": "up|down|sideways",
  "bullish_prob": <0-100>,
  "bearish_prob": <0-100>,
  // ... resto do formato
}`;
```

### Parâmetros Ajustáveis

Em `determineAction()` você pode modificar:

```typescript
// Limites de confiança por estratégia
const confidenceThresholds = {
  'simple': 60,    // Mínimo 60% para estratégia simples
  '1-gale': 55,    // Mínimo 55% para 1 gale
  '2-gales': 50,   // Mínimo 50% para 2 gales
};

// Diferença mínima para sinal
if (diff >= 10) return 'buy';    // 10% de diferença para compra
if (diff <= -10) return 'sell';  // 10% de diferença para venda
```

## 🔧 Estrutura do Projeto

```
src/
├── app/
│   ├── api/analyze/route.ts     # API de análise
│   ├── layout.tsx               # Layout principal
│   └── page.tsx                 # Página principal
├── components/
│   ├── TopBar.tsx               # Barra superior
│   ├── UploadCard.tsx           # Card de upload
│   ├── ResultCard.tsx           # Card de resultado
│   ├── TimingBar.tsx            # Barra de countdown
│   └── HistoryDrawer.tsx        # Drawer do histórico
└── lib/
    ├── types.ts                 # Tipos TypeScript
    └── time-utils.ts            # Utilitários de tempo
```

## 📱 Responsividade

O webapp é totalmente responsivo:

- **Mobile**: Interface otimizada para toque
- **Tablet**: Layout adaptativo
- **Desktop**: Experiência completa
- **Atalhos**: Tecla `N` para nova análise

## 🛡️ Segurança e Privacidade

- **Imagens não são salvas** no servidor
- **Processamento temporário** apenas durante análise
- **Rate limit**: 10 análises por minuto por IP
- **Validação rigorosa** de arquivos
- **Dados locais**: Histórico salvo apenas no navegador

## ⚠️ Avisos Importantes

### Uso Educacional
Este webapp é para **fins educacionais** apenas. Não constitui recomendação financeira.

### Responsabilidade
- **Opere com responsabilidade**
- **Gerencie riscos adequadamente**
- **Não invista mais do que pode perder**
- **Busque conhecimento antes de operar**

### Limitações Técnicas
- Análise baseada apenas na imagem fornecida
- IA pode interpretar incorretamente padrões complexos
- Mercados são imprevisíveis por natureza
- Resultados passados não garantem resultados futuros

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório GitHub
2. Configure a variável `OPENAI_API_KEY` no dashboard
3. Deploy automático

### Outras Plataformas
- **Netlify**: Configure build command `npm run build`
- **Railway**: Adicione variável de ambiente
- **Docker**: Use o Dockerfile incluído

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto é licenciado sob a MIT License.

## 🆘 Suporte

### Problemas Comuns

**Erro "API key não configurada":**
- Verifique se `.env.local` existe
- Confirme se a chave está correta
- Reinicie o servidor de desenvolvimento

**Análise muito lenta:**
- Verifique sua conexão com internet
- Reduza o tamanho da imagem
- Tente novamente em alguns minutos

**Imagem não aceita:**
- Confirme o formato (PNG/JPG apenas)
- Verifique o tamanho (máximo 10MB)
- Teste com uma imagem diferente

### Contato

Para dúvidas ou sugestões, abra uma issue no GitHub.

---

**ChartSense OB** - Análise inteligente de gráficos para opções binárias 📈🤖