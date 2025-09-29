'use client';

import { useState, useEffect } from 'react';
import { History, TrendingUp, TrendingDown, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HistoryItem } from '@/lib/types';
import { formatTime } from '@/lib/time-utils';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryDrawer({ isOpen, onClose }: HistoryDrawerProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      const savedHistory = localStorage.getItem('chartsense-history');
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Erro ao carregar histórico:', e);
        }
      }
    }
  }, [isOpen]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'sell': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Pause className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'buy': return 'COMPRAR';
      case 'sell': return 'VENDER';
      default: return 'AGUARDAR';
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('chartsense-history');
    setHistory([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-semibold text-lg">Histórico</h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhuma análise ainda</p>
              <p className="text-gray-500 text-sm">
                Suas últimas 5 análises aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">
                  {history.length} análise{history.length !== 1 ? 's' : ''}
                </span>
                <Button
                  onClick={clearHistory}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-red-400 text-xs"
                >
                  Limpar
                </Button>
              </div>

              {history.map((item) => (
                <div key={item.id} className="bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getActionIcon(item.action)}
                      <span className="text-white font-medium text-sm">
                        {getActionText(item.action)}
                      </span>
                    </div>
                    <span className="text-gray-400 text-xs">
                      {formatTime(new Date(item.timestamp))}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Ativo:</span>
                      <span className="text-white ml-1">{item.asset}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Tempo:</span>
                      <span className="text-white ml-1">{item.timeframe}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-green-400 font-bold text-sm">
                        {item.bullish_prob}%
                      </div>
                      <div className="text-gray-500 text-xs">Alta</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-400 font-bold text-sm">
                        {item.bearish_prob}%
                      </div>
                      <div className="text-gray-500 text-xs">Baixa</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-400 font-bold text-sm">
                        {item.model_confidence}%
                      </div>
                      <div className="text-gray-500 text-xs">Conf.</div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">
                    <span className="text-gray-500">Entrada:</span> {formatTime(new Date(item.schedule.entry_time_iso))}
                    {item.strategy !== 'simple' && (
                      <span className="ml-2">
                        <span className="text-gray-500">•</span> {item.strategy}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}