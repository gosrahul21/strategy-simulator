import { binanceService } from './binance.service';
import { Timeframe, Candle } from '../types/market-data';

export type CandleListener = (candle: Candle) => void;

export class PollingService {
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, CandleListener[]> = new Map();

  // Stores the last closed candle time to avoid emitting duplicates
  private lastClosedCandleTime: Map<string, number> = new Map();

  /**
   * Register a listener for a specific symbol and timeframe
   */
  subscribe(symbol: string, timeframe: Timeframe, listener: CandleListener) {
    const key = this.getKey(symbol, timeframe);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
      this.startPolling(symbol, timeframe);
    }
    this.listeners.get(key)?.push(listener);
  }

  /**
   * Stop listening for a specific symbol and timeframe
   */
  unsubscribe(symbol: string, timeframe: Timeframe, listener: CandleListener) {
    const key = this.getKey(symbol, timeframe);
    const symbolListeners = this.listeners.get(key);
    if (symbolListeners) {
      this.listeners.set(
        key,
        symbolListeners.filter((l) => l !== listener)
      );

      // If no more listeners, stop polling
      if (this.listeners.get(key)?.length === 0) {
        this.stopPolling(symbol, timeframe);
      }
    }
  }

  private startPolling(symbol: string, timeframe: Timeframe) {
    const key = this.getKey(symbol, timeframe);
    console.log(`Starting to poll ${key}`);

    // Initial fetch to get historical context if needed, but here we just start the interval
    this.poll(symbol, timeframe);

    // Poll every 10 seconds. In a real system this could be adaptive or aligned to the timeframe
    const intervalMs = 10000;
    const intervalId = setInterval(() => this.poll(symbol, timeframe), intervalMs);
    this.activeIntervals.set(key, intervalId);
  }

  private stopPolling(symbol: string, timeframe: Timeframe) {
    const key = this.getKey(symbol, timeframe);
    console.log(`Stopping poll for ${key}`);
    
    const intervalId = this.activeIntervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeIntervals.delete(key);
    }
  }

  private async poll(symbol: string, timeframe: Timeframe) {
    const key = this.getKey(symbol, timeframe);
    try {
      // Fetch the last 2 candles (current incomplete + last completed)
      const candles = await binanceService.getKlines(symbol, timeframe, 2);
      
      const closedCandles = candles.filter(c => c.isClosed);
      
      if (closedCandles.length > 0) {
        const latestClosed = closedCandles[closedCandles.length - 1];
        if (latestClosed) {
          const lastEmittedTime = this.lastClosedCandleTime.get(key) || 0;
  
          // If this is a new closed candle, emit to listeners
          if (latestClosed.openTime > lastEmittedTime) {
            this.lastClosedCandleTime.set(key, latestClosed.openTime);
            const currentListeners = this.listeners.get(key) || [];
            for (const listener of currentListeners) {
              listener(latestClosed);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Polling error for ${key}:`, error);
    }
  }

  private getKey(symbol: string, timeframe: Timeframe): string {
    return `${symbol}_${timeframe}`;
  }
}

export const pollingService = new PollingService();
