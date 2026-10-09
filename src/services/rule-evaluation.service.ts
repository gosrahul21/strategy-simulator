import { PrismaClient, Rule } from '@prisma/client';
import { Candle, Timeframe } from '../types/market-data';
import { indicatorService } from './indicator.service';
import { pollingService } from './polling.service';
import { binanceService } from './binance.service';
import { executionService } from './execution.service';

const prisma = new PrismaClient();

export class RuleEvaluationService {
  // Store historical candles in memory for indicator calculation
  // Map key: `${symbol}_${timeframe}`
  private candleBuffer: Map<string, Candle[]> = new Map();
  private readonly MAX_CANDLES = 100;

  async startStrategyEvaluation(strategyId: string) {
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      include: { rules: true }
    });

    if (!strategy || strategy.status !== 'Running') return;

    // For each unique timeframe in rules, start polling and attach listener
    const uniqueTimeframes = Array.from(new Set(strategy.rules.map(r => r.timeframe as Timeframe)));

    for (const timeframe of uniqueTimeframes) {
      const key = `${strategy.instrument}_${timeframe}`;

      // Initialize buffer with historical data if not present
      if (!this.candleBuffer.has(key)) {
        const historicalCandles = await binanceService.getKlines(strategy.instrument, timeframe, this.MAX_CANDLES);
        this.candleBuffer.set(key, historicalCandles.filter(c => c.isClosed));
      }

      // Add listener for new candles
      pollingService.subscribe(strategy.instrument, timeframe, (newCandle: Candle) => {
        this.onNewCandle(strategy.id, strategy.instrument, timeframe, newCandle);
      });
    }
  }

  async evaluateCurrentState(strategyId: string) {
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      include: { rules: true, portfolio: true, positions: true }
    });

    if (!strategy || strategy.status !== 'Running') return;

    for (const rule of strategy.rules) {
      if (!rule.enabled) continue;
      const key = `${strategy.instrument}_${rule.timeframe}`;
      const buffer = this.candleBuffer.get(key);
      if (buffer && buffer.length > 0) {
        const position = strategy.positions.find(p => p.instrument === strategy.instrument);
        await this.evaluateRule(strategy as any, position as any, rule, buffer);
      }
    }
  }

  private async onNewCandle(strategyId: string, symbol: string, timeframe: Timeframe, newCandle: Candle) {
    const key = `${symbol}_${timeframe}`;
    const buffer = this.candleBuffer.get(key) || [];
    
    // Since we only receive fully closed candles now, just append it
    buffer.push(newCandle);
    if (buffer.length > this.MAX_CANDLES) {
      buffer.shift();
    }
    this.candleBuffer.set(key, buffer);

    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      include: { rules: true, portfolio: true, positions: true }
    });

    if (!strategy || strategy.status !== 'Running') return;

    const relevantRules = strategy.rules.filter(r => r.timeframe === timeframe && r.enabled);
    const position = strategy.positions.find(p => p.instrument === symbol);
    
    for (const rule of relevantRules) {
      await this.evaluateRule(strategy as any, position as any, rule, buffer);
    }
  }

  private async evaluateRule(strategy: any, position: any, rule: Rule, candles: Candle[]) {
    const latestCandle = candles[candles.length - 1];
    if (!latestCandle) return;

    let limitPrice: number | null = null;
    
    // Proactively calculate limit price for the rule so user can see it in UI
    if (rule.indicator === 'BollingerBands') {
       const bbValues = indicatorService.calculateBollingerBands(candles);
       const latestBB = bbValues[bbValues.length - 1];
       if (latestBB) limitPrice = rule.condition.includes('lower') ? latestBB.lower : latestBB.upper;
    } else if (rule.indicator === 'SupportResistance') {
       const activeSupports = indicatorService.getActiveSupports(candles);
       const activeResistances = indicatorService.getActiveResistances(candles);
       if (rule.condition.includes('support')) {
          const support = activeSupports[activeSupports.length - 1];
          limitPrice = support ? support.price : null;
       } else if (rule.condition.includes('resistance')) {
          const resistance = activeResistances[activeResistances.length - 1];
          limitPrice = resistance ? resistance.price : null;
       }
    }

    let pendingOrder = null;
    let requestedSizeUsdt = rule.orderSize;

    if (limitPrice) {
      if (strategy.portfolio && rule.orderSizeUnit === 'percentage') {
        if (rule.action === 'BUY') {
          requestedSizeUsdt = strategy.portfolio.availableCash * (rule.orderSize / 100);
        } else {
          requestedSizeUsdt = position ? (position.quantity * limitPrice) * (rule.orderSize / 100) : 0;
        }
      }
      
      if (requestedSizeUsdt > 0) {
        pendingOrder = await executionService.upsertPendingOrder(
          strategy.id, rule.id, rule.action as 'BUY' | 'SELL', latestCandle.symbol, requestedSizeUsdt, limitPrice
        );
      }
    }

    let triggered = false;

    // Rule Evaluation Logic (Crossover)
    if (rule.indicator === 'RSI') {
      const rsiValues = indicatorService.calculateRSI(candles);
      if (rsiValues.length >= 2) {
        const latestRSI = rsiValues[rsiValues.length - 1];
        const prevRSI = rsiValues[rsiValues.length - 2];
        if (latestRSI !== undefined && prevRSI !== undefined) {
          if (rule.condition === 'oversold' && prevRSI >= 30 && latestRSI < 30) triggered = true;
          else if (rule.condition === 'overbought' && prevRSI <= 70 && latestRSI > 70) triggered = true;
        }
      }
    } else if (rule.indicator === 'BollingerBands') {
      const bbValues = indicatorService.calculateBollingerBands(candles);
      if (bbValues.length >= 2) {
        const latestBB = bbValues[bbValues.length - 1];
        const prevBB = bbValues[bbValues.length - 2];
        const prevCandle = candles[candles.length - 2];
        if (latestBB && prevBB && prevCandle) {
          if (rule.condition === 'lower_band_hit' && prevCandle.low > prevBB.lower && latestCandle.low <= latestBB.lower) triggered = true;
          else if (rule.condition === 'upper_band_hit' && prevCandle.high < prevBB.upper && latestCandle.high >= latestBB.upper) triggered = true;
        }
      }
    } else if (rule.indicator === 'SupportResistance') {
      if (limitPrice) {
        if (rule.condition === 'support_bounce' && latestCandle.close <= limitPrice * 1.002) triggered = true;
        else if (rule.condition === 'resistance_reject' && latestCandle.close >= limitPrice * 0.998) triggered = true;
        else if (rule.condition === 'support_break' && latestCandle.close < limitPrice) triggered = true;
        else if (rule.condition === 'resistance_break' && latestCandle.close > limitPrice) triggered = true;
      }
    }

    if (triggered && pendingOrder && limitPrice) {
      console.log(`[Rule Evaluator] Strategy ${strategy.id} triggered rule ${rule.id}. Executing order ${pendingOrder.id}`);
      await executionService.executeOrder(
        pendingOrder.id, limitPrice, pendingOrder.requestedSize, rule.action as 'BUY' | 'SELL', latestCandle.symbol, strategy.id
      ).catch(console.error);
    }
  }
}

export const ruleEvaluationService = new RuleEvaluationService();
