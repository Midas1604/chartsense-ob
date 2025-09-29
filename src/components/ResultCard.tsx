'use client';

import { TrendingUp, TrendingDown, Pause, Clock, Target, Zap } from 'lucide-react';
import { AnalysisResponse } from '@/lib/types';
import { formatTime } from '@/lib/time-utils';
import { Button } from '@/components/ui/button';

interface ResultCardProps {
  result: AnalysisResponse;
  onNewAnalysis: () => void;
}

export function ResultCard({ result, onNewAnalysis }: ResultCardProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'sell': return <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />;
      default: return <Pause className="w-4 h-4 sm:w-5 sm:h-5" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy': return 'from-green-500 to-emerald-600';
      case 'sell': return 'from-red-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'buy': return 'COMPRAR';
      case 'sell': return 'VENDER';
      default: return 'AGUARDAR';
    }
  };

  const formatScheduleTime = (isoString: string) => {
    return formatTime(new Date(isoString));
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Ação Principal */}
      <div className="bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-800">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className={`inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${getActionColor(result.action)} text-white font-bold text-sm sm:text-lg`}>
            {getActionIcon(result.action)}
            {getActionText(result.action)}
          </div>
          
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-gray-800 rounded-lg p-2 sm:p-3">
              <div className="text-green-400 text-lg sm:text-2xl font-bold">
                {result.bullish_prob}%
              </div>
              <div className="text-gray-400 text-xs sm:text-sm">Alta</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-2 sm:p-3">
              <div className="text-red-400 text-lg sm:text-2xl font-bold">
                {result.bearish_prob}%
              </div>
              <div className="text-gray-400 text-xs sm:text-sm">Baixa</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-2 sm:p-3">
              <div className="text-blue-400 text-lg sm:text-2xl font-bold">
                {result.model_confidence}%
              </div>
              <div className="text-gray-400 text-xs sm:text-sm">Confiança</div>
            </div>
          </div>
        </div>
      </div>

      {/* Agenda de Execução */}
      <div className="bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-800">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm sm:text-base">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            Agenda de Execução
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <span className="text-white font-medium text-xs sm:text-sm">Entrada</span>
              </div>
              <span className="text-blue-400 font-mono font-bold text-xs sm:text-sm">
                {formatScheduleTime(result.schedule.entry_time_iso)}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                <span className="text-white font-medium text-xs sm:text-sm">Expiração</span>
              </div>
              <span className="text-green-400 font-mono font-bold text-xs sm:text-sm">
                {formatScheduleTime(result.schedule.expiry_time_iso)}
              </span>
            </div>
            
            {result.schedule.gale_1_entry_iso && (
              <div className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                  <span className="text-white font-medium text-xs sm:text-sm">Gale 1</span>
                </div>
                <span className="text-yellow-400 font-mono font-bold text-xs sm:text-sm">
                  {formatScheduleTime(result.schedule.gale_1_entry_iso)}
                </span>
              </div>
            )}
            
            {result.schedule.gale_2_entry_iso && (
              <div className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                  <span className="text-white font-medium text-xs sm:text-sm">Gale 2</span>
                </div>
                <span className="text-red-400 font-mono font-bold text-xs sm:text-sm">
                  {formatScheduleTime(result.schedule.gale_2_entry_iso)}
                </span>
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-400 text-center">
            Horários locais: {result.schedule.display_tz}
          </div>
        </div>
      </div>

      {/* Análise Técnica */}
      <div className="bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-800">
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-white font-semibold text-base sm:text-lg">Análise Técnica</h3>
          
          <div className="space-y-3">
            <div>
              <h4 className="text-gray-300 font-medium mb-2 text-sm sm:text-base">Resumo</h4>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                {result.summary}
              </p>
            </div>
            
            <div>
              <h4 className="text-gray-300 font-medium mb-2 text-sm sm:text-base">Sinais Detectados</h4>
              <ul className="space-y-1">
                {result.signals.map((signal, index) => (
                  <li key={index} className="text-gray-400 text-xs sm:text-sm flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span className="flex-1">{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {result.meta.notes && (
              <div>
                <h4 className="text-gray-300 font-medium mb-2 text-sm sm:text-base">Observações</h4>
                <p className="text-gray-400 text-xs sm:text-sm">
                  {result.meta.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botão Nova Análise */}
      <div className="text-center">
        <Button
          onClick={onNewAnalysis}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-6 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 text-sm sm:text-base"
        >
          Nova Imagem
        </Button>
      </div>
    </div>
  );
}