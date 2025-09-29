'use client';

import { useEffect, useState } from 'react';
import { getTimeDifference, formatCountdown } from '@/lib/time-utils';
import { AnalysisResponse } from '@/lib/types';

interface TimingBarProps {
  schedule: AnalysisResponse['schedule'];
}

type TimingPhase = 'entry' | 'expiry' | 'gale1' | 'gale2' | 'completed';

export function TimingBar({ schedule }: TimingBarProps) {
  const [currentPhase, setCurrentPhase] = useState<TimingPhase>('entry');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateTiming = () => {
      const now = Date.now();
      const serverTime = schedule.server_time_iso;
      
      // Calcular tempos ajustados
      const entryTime = getTimeDifference(schedule.entry_time_iso, serverTime);
      const expiryTime = getTimeDifference(schedule.expiry_time_iso, serverTime);
      const gale1Time = schedule.gale_1_entry_iso ? getTimeDifference(schedule.gale_1_entry_iso, serverTime) : null;
      const gale2Time = schedule.gale_2_entry_iso ? getTimeDifference(schedule.gale_2_entry_iso, serverTime) : null;
      
      let phase: TimingPhase = 'completed';
      let remaining = 0;
      let totalDuration = 0;
      let elapsed = 0;
      
      if (entryTime > 0) {
        // Aguardando entrada
        phase = 'entry';
        remaining = entryTime;
        totalDuration = getTimeDifference(schedule.entry_time_iso, serverTime) + entryTime;
        elapsed = totalDuration - remaining;
      } else if (expiryTime > 0) {
        // Entre entrada e expiração
        phase = 'expiry';
        remaining = expiryTime;
        totalDuration = schedule.timeframe_seconds * 1000;
        elapsed = totalDuration - remaining;
      } else if (gale1Time && gale1Time > 0) {
        // Aguardando Gale 1
        phase = 'gale1';
        remaining = gale1Time;
        totalDuration = schedule.timeframe_seconds * 1000;
        elapsed = totalDuration - remaining;
      } else if (gale2Time && gale2Time > 0) {
        // Aguardando Gale 2
        phase = 'gale2';
        remaining = gale2Time;
        totalDuration = schedule.timeframe_seconds * 1000;
        elapsed = totalDuration - remaining;
      }
      
      setCurrentPhase(phase);
      setTimeRemaining(remaining);
      setProgress(totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0);
    };

    updateTiming();
    const interval = setInterval(updateTiming, 1000);
    
    return () => clearInterval(interval);
  }, [schedule]);

  const getPhaseLabel = (phase: TimingPhase): string => {
    switch (phase) {
      case 'entry': return 'Entrada em';
      case 'expiry': return 'Expira em';
      case 'gale1': return 'Gale 1 em';
      case 'gale2': return 'Gale 2 em';
      case 'completed': return 'Concluído';
    }
  };

  const getPhaseColor = (phase: TimingPhase): string => {
    switch (phase) {
      case 'entry': return 'from-blue-500 to-cyan-500';
      case 'expiry': return 'from-green-500 to-emerald-500';
      case 'gale1': return 'from-yellow-500 to-orange-500';
      case 'gale2': return 'from-red-500 to-pink-500';
      case 'completed': return 'from-gray-500 to-gray-600';
    }
  };

  if (currentPhase === 'completed') {
    return (
      <div className="bg-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-800">
        <div className="text-center">
          <div className="text-gray-400 text-xs sm:text-sm font-medium mb-2">
            Operação Finalizada
          </div>
          <div className="h-2 sm:h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-gray-500 to-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-800">
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium text-xs sm:text-sm">
            {getPhaseLabel(currentPhase)}
          </span>
          <span className="text-white font-mono text-base sm:text-lg font-bold">
            {formatCountdown(timeRemaining)}
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="h-2 sm:h-3 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${getPhaseColor(currentPhase)} rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-400">
            <span>Progresso da fase atual</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}