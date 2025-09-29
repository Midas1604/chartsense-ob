'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ASSETS, TIMEFRAMES, STRATEGIES } from '@/lib/types';

interface TopBarProps {
  asset: string;
  timeframe: string;
  strategy: string;
  onAssetChange: (value: string) => void;
  onTimeframeChange: (value: string) => void;
  onStrategyChange: (value: string) => void;
}

export function TopBar({
  asset,
  timeframe,
  strategy,
  onAssetChange,
  onTimeframeChange,
  onStrategyChange,
}: TopBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Logo e Título */}
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs md:text-sm">CS</span>
            </div>
            <h1 className="text-white font-bold text-lg md:text-xl">ChartSense OB</h1>
          </div>
          
          {/* Controles - Layout mais compacto no mobile */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Ativo</label>
              <Select value={asset} onValueChange={onAssetChange}>
                <SelectTrigger className="w-full h-9 md:h-10 bg-gray-800 border-gray-700 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {ASSETS.map((a) => (
                    <SelectItem key={a} value={a} className="text-white hover:bg-gray-700">
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Timeframe</label>
              <Select value={timeframe} onValueChange={onTimeframeChange}>
                <SelectTrigger className="w-full h-9 md:h-10 bg-gray-800 border-gray-700 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value} className="text-white hover:bg-gray-700">
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Estratégia</label>
              <Select value={strategy} onValueChange={onStrategyChange}>
                <SelectTrigger className="w-full h-9 md:h-10 bg-gray-800 border-gray-700 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {STRATEGIES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}