import { Candle, Timeframe } from '../types/market-data';
import { CandleListener } from './polling.service';

export class MarketSimulatorService {
  private listeners: Map<string, CandleListener[]> = new Map();

  /**
   * Register a listener for a specific symbol and timeframe in the mock environment
   */
  subscribe(symbol: string, timeframe: Timeframe, listener: CandleListener) {
    const key = this.getKey(symbol, timeframe);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)?.push(listener);
  }

  /**
   * Feeds historical/mock candles directly into the simulator to test the strategy engine
   * deterministically without waiting for real time.
   */
  feedCandles(symbol: string, timeframe: Timeframe, candles: Candle[]) {
    const key = this.getKey(symbol, timeframe);
    const listeners = this.listeners.get(key) || [];
    
    for (const candle of candles) {
      for (const listener of listeners) {
        listener(candle);
      }
    }
  }

  private getKey(symbol: string, timeframe: Timeframe): string {
    return `${symbol}_${timeframe}`;
  }
}

export const marketSimulatorService = new MarketSimulatorService();
