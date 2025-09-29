'use client';

import { useState, useCallback, useEffect } from 'react';
import { History } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { UploadCard } from '@/components/UploadCard';
import { ResultCard } from '@/components/ResultCard';
import { TimingBar } from '@/components/TimingBar';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { Button } from '@/components/ui/button';
import { AnalysisResponse, HistoryItem } from '@/lib/types';
import { toast } from 'sonner';

export default function ChartSenseOB() {
  // Estados principais
  const [asset, setAsset] = useState('EUR/USD');
  const [timeframe, setTimeframe] = useState('1m');
  const [strategy, setStrategy] = useState('simple');
  
  // Estados da análise
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estados da UI
  const [showHistory, setShowHistory] = useState(false);

  // Função para salvar no histórico
  const saveToHistory = useCallback((analysisResult: AnalysisResponse) => {
    const historyItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      asset: analysisResult.asset,
      timeframe: analysisResult.timeframe,
      strategy: analysisResult.strategy,
      action: analysisResult.action,
      bullish_prob: analysisResult.bullish_prob,
      bearish_prob: analysisResult.bearish_prob,
      model_confidence: analysisResult.model_confidence,
      schedule: analysisResult.schedule,
    };

    try {
      const existingHistory = localStorage.getItem('chartsense-history');
      const history: HistoryItem[] = existingHistory ? JSON.parse(existingHistory) : [];
      
      // Adicionar no início e manter apenas os últimos 5
      const updatedHistory = [historyItem, ...history].slice(0, 5);
      
      localStorage.setItem('chartsense-history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Erro ao salvar histórico:', e);
    }
  }, []);

  // Função para analisar imagem
  const analyzeImage = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    
    // Criar preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('asset', asset);
      formData.append('timeframe', timeframe);
      formData.append('strategy', strategy);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na análise');
      }

      const analysisResult: AnalysisResponse = await response.json();
      setResult(analysisResult);
      saveToHistory(analysisResult);
      
      toast.success('Análise concluída com sucesso!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [asset, timeframe, strategy, saveToHistory]);

  // Função para nova análise
  const handleNewAnalysis = useCallback(() => {
    setResult(null);
    setPreviewUrl(null);
    setError(null);
    setIsAnalyzing(false);
  }, []);

  // Atalho de teclado para nova imagem
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n' && !isAnalyzing && result) {
        handleNewAnalysis();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAnalyzing, result, handleNewAnalysis]);

  // Cleanup do preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top Bar */}
      <TopBar
        asset={asset}
        timeframe={timeframe}
        strategy={strategy}
        onAssetChange={setAsset}
        onTimeframeChange={setTimeframe}
        onStrategyChange={setStrategy}
      />

      {/* Main Content */}
      <div className="pt-32 md:pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="space-y-6">
            {/* Botão Histórico - Sempre visível */}
            <div className="flex justify-end">
              <Button
                onClick={() => setShowHistory(true)}
                variant="outline"
                size="sm"
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <History className="w-4 h-4 mr-2" />
                Histórico
              </Button>
            </div>

            {/* Upload Card ou Resultado */}
            {!result && !error && (
              <UploadCard
                onFileSelected={analyzeImage}
                isAnalyzing={isAnalyzing}
                previewUrl={previewUrl}
              />
            )}

            {/* Erro */}
            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-2xl p-6">
                <div className="text-center space-y-4">
                  <div className="text-red-400 font-semibold">
                    Erro na Análise
                  </div>
                  <p className="text-red-300 text-sm">
                    {error}
                  </p>
                  <Button
                    onClick={handleNewAnalysis}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            )}

            {/* Resultado */}
            {result && (
              <>
                <TimingBar schedule={result.schedule} />
                <ResultCard
                  result={result}
                  onNewAnalysis={handleNewAnalysis}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer Legal */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 py-3">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs text-gray-400">
            ⚠️ Conteúdo educacional. Não é recomendação financeira. Opere com responsabilidade.
          </p>
        </div>
      </footer>

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}