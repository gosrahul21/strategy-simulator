import { RSI, BollingerBands, SMA, EMA } from 'technicalindicators';
import { Candle } from '../types/market-data';

export interface Pivot {
  type: 'SUPPORT' | 'RESISTANCE';
  price: number;
  time: number;
  index: number;
}

export class IndicatorService {
  public calculateRSI(candles: Candle[], period: number = 14): number[] {
    const closes = candles.map(c => c.close);
    return RSI.calculate({ values: closes, period });
  }

  public calculateBollingerBands(candles: Candle[], period: number = 20, stdDev: number = 2) {
    const closes = candles.map(c => c.close);
    return BollingerBands.calculate({ values: closes, period, stdDev });
  }

  public calculateSMA(candles: Candle[], period: number): number[] {
    const closes = candles.map(c => c.close);
    return SMA.calculate({ values: closes, period });
  }

  public calculateEMA(candles: Candle[], period: number): number[] {
    const closes = candles.map(c => c.close);
    return EMA.calculate({ values: closes, period });
  }

  public findPivots(candles: Candle[], leftLen: number = 2, rightLen: number = 2): Pivot[] {
    const pivots: Pivot[] = [];
    
    for (let i = leftLen; i < candles.length - rightLen; i++) {
      let isSupport = true;
      let isResistance = true;
      
      const currentCandle = candles[i];
      if (!currentCandle) continue;

      const currentLow = currentCandle.low;
      const currentHigh = currentCandle.high;
      
      // Check left
      for (let j = 1; j <= leftLen; j++) {
        const leftCandle = candles[i - j];
        if (!leftCandle) continue;
        if (leftCandle.low <= currentLow) isSupport = false;
        if (leftCandle.high >= currentHigh) isResistance = false;
      }
      
      // Check right
      for (let j = 1; j <= rightLen; j++) {
        const rightCandle = candles[i + j];
        if (!rightCandle) continue;
        if (rightCandle.low <= currentLow) isSupport = false;
        if (rightCandle.high >= currentHigh) isResistance = false;
      }
      
      if (isSupport) {
        pivots.push({ type: 'SUPPORT', price: currentLow, time: currentCandle.openTime, index: i });
      }
      if (isResistance) {
        pivots.push({ type: 'RESISTANCE', price: currentHigh, time: currentCandle.openTime, index: i });
      }
    }
    
    return pivots;
  }

  public getActiveSupports(candles: Candle[], beforeTimestamp?: number): Pivot[] {
    const pivots = this.findPivots(candles);
    let supports = pivots.filter(p => p.type === 'SUPPORT');
    
    if (beforeTimestamp) {
      supports = supports.filter(p => p.time < beforeTimestamp);
    }
    
    // Filter out broken supports
    supports = supports.filter(support => {
      for (let i = support.index + 1; i < candles.length; i++) {
        const c = candles[i];
        if (!c) continue;
        
        // If we only care about beforeTimestamp, don't check candles after beforeTimestamp
        if (beforeTimestamp && c.openTime >= beforeTimestamp) break;
        
        if (c.close < support.price) {
          return false; // Broken!
        }
      }
      return true;
    });

    return supports;
  }

  public getActiveResistances(candles: Candle[], beforeTimestamp?: number): Pivot[] {
    const pivots = this.findPivots(candles);
    let resistances = pivots.filter(p => p.type === 'RESISTANCE');
    
    if (beforeTimestamp) {
      resistances = resistances.filter(p => p.time < beforeTimestamp);
    }
    
    // Filter out broken resistances
    resistances = resistances.filter(res => {
      for (let i = res.index + 1; i < candles.length; i++) {
        const c = candles[i];
        if (!c) continue;

        if (beforeTimestamp && c.openTime >= beforeTimestamp) break;

        if (c.close > res.price) {
          return false; // Broken!
        }
      }
      return true;
    });

    return resistances;
  }
}

export const indicatorService = new IndicatorService();
