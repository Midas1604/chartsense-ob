import { TIMEFRAMES } from './types';

export function getTimeframeSeconds(timeframe: string): number {
  const tf = TIMEFRAMES.find(t => t.value === timeframe);
  return tf?.seconds || 60;
}

export function alignToNextCandle(now: Date, timeframeSeconds: number): Date {
  const nowMs = now.getTime();
  const timeframeMs = timeframeSeconds * 1000;
  
  // Arredondar para o próximo múltiplo do timeframe
  const nextCandleMs = Math.ceil(nowMs / timeframeMs) * timeframeMs;
  const nextCandle = new Date(nextCandleMs);
  
  // Se faltar menos de 5s, pular para a próxima vela
  const timeDiff = (nextCandleMs - nowMs) / 1000;
  if (timeDiff < 5) {
    return new Date(nextCandleMs + timeframeMs);
  }
  
  return nextCandle;
}

export function generateSchedule(
  serverTime: Date,
  timeframeSeconds: number,
  strategy: string
) {
  const entryTime = alignToNextCandle(serverTime, timeframeSeconds);
  const expiryTime = new Date(entryTime.getTime() + timeframeSeconds * 1000);
  
  const schedule = {
    server_time_iso: serverTime.toISOString(),
    timeframe_seconds: timeframeSeconds,
    entry_time_iso: entryTime.toISOString(),
    expiry_time_iso: expiryTime.toISOString(),
    display_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  
  if (strategy === '1-gale' || strategy === '2-gales') {
    const gale1Entry = new Date(expiryTime.getTime());
    const gale1Expiry = new Date(gale1Entry.getTime() + timeframeSeconds * 1000);
    
    Object.assign(schedule, {
      gale_1_entry_iso: gale1Entry.toISOString(),
      gale_1_expiry_iso: gale1Expiry.toISOString(),
    });
    
    if (strategy === '2-gales') {
      const gale2Entry = new Date(gale1Expiry.getTime());
      const gale2Expiry = new Date(gale2Entry.getTime() + timeframeSeconds * 1000);
      
      Object.assign(schedule, {
        gale_2_entry_iso: gale2Entry.toISOString(),
        gale_2_expiry_iso: gale2Expiry.toISOString(),
      });
    }
  }
  
  return schedule;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getTimeDifference(targetTime: string, serverTime: string): number {
  const target = new Date(targetTime).getTime();
  const server = new Date(serverTime).getTime();
  const now = Date.now();
  
  // Ajustar para o tempo local baseado na diferença do servidor
  const serverOffset = server - now;
  const adjustedTarget = target - serverOffset;
  
  return Math.max(0, adjustedTarget - now);
}

export function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}