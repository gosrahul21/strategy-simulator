import { PrismaClient } from '@prisma/client';
import { pollingService } from './polling.service';
import { Candle, Timeframe } from '../types/market-data';

const prisma = new PrismaClient();

export class ExecutionService {
  constructor() {
    // Optionally load 'PENDING' orders
  }

  async cancelPendingOrdersForRule(strategyId: string, ruleId: string) {
    console.log(`[Execution] Cancelling pending orders for Strategy ${strategyId}, Rule ${ruleId}`);
    await prisma.order.updateMany({
      where: {
        strategyId,
        ruleId,
        status: 'PENDING'
      },
      data: {
        status: 'CANCELLED'
      }
    });
  }

  async upsertPendingOrder(
    strategyId: string,
    ruleId: string,
    action: 'BUY' | 'SELL',
    instrument: string,
    requestedSize: number,
    limitPrice: number
  ) {
    const existing = await prisma.order.findFirst({
      where: { strategyId, ruleId, status: 'PENDING' }
    });

    if (existing) {
      if (Math.abs(existing.executionPrice! - limitPrice) > 0.0001 || Math.abs(existing.requestedSize - requestedSize) > 0.0001) {
        return prisma.order.update({
          where: { id: existing.id },
          data: { executionPrice: limitPrice, requestedSize }
        });
      }
      return existing;
    } else {
      return prisma.order.create({
        data: {
          strategyId,
          ruleId,
          action,
          requestedSize,
          executedQuantity: 0,
          executedAmount: 0,
          executionPrice: limitPrice,
          status: 'PENDING',
        }
      });
    }
  }

  async executeOrder(
    orderId: string,
    executionPrice: number,
    amountUsdt: number,
    action: 'BUY' | 'SELL',
    instrument: string,
    strategyId: string
  ) {
    const executedQuantity = amountUsdt / executionPrice;

    await prisma.$transaction(async (tx) => {
      // 1. Mark order as FILLED
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'FILLED',
          executedQuantity,
          executedAmount: amountUsdt,
          executionPrice,
        }
      });

      // 2. Fetch strategy & portfolio
      const strategy = await tx.strategy.findUnique({
        where: { id: strategyId },
        include: { portfolio: true }
      });
      if (!strategy) return;

      // 3. Update Position
      const position = await tx.position.findFirst({
        where: { strategyId, instrument }
      });

      let newQuantity = executedQuantity;
      if (position) {
        newQuantity = action === 'BUY' 
          ? position.quantity + executedQuantity 
          : position.quantity - executedQuantity;

        // Simplified average price calculation
        const totalValue = position.quantity * position.averagePrice + executedQuantity * executionPrice;
        const avgPrice = newQuantity === 0 ? 0 : totalValue / newQuantity;

        await tx.position.update({
          where: { id: position.id },
          data: {
            quantity: newQuantity,
            averagePrice: avgPrice,
          }
        });
      } else {
        await tx.position.create({
          data: {
            strategyId,
            instrument,
            quantity: newQuantity,
            averagePrice: executionPrice,
          }
        });
      }

      // 4. Update Portfolio (Cash & Allocated Capital)
      // Deduct/Add cash based on buy/sell
      const cashDelta = action === 'BUY' ? -amountUsdt : amountUsdt;
      
      await tx.portfolio.update({
        where: { id: strategy.portfolioId },
        data: {
          availableCash: { increment: cashDelta }
        }
      });

      console.log(`[Execution] Order ${orderId} FILLED. ${action} ${executedQuantity.toFixed(4)} ${instrument} @ ${executionPrice}`);
    });
  }
}

export const executionService = new ExecutionService();
