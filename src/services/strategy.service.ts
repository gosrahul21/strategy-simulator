import { prisma } from '../db/prisma';
import { ruleEvaluationService } from './rule-evaluation.service';

export class StrategyService {
  async getAllStrategies() {
    return prisma.strategy.findMany({
      include: { 
        rules: true, 
        portfolio: true,
        orders: { 
          include: { rule: true } as any,
          orderBy: { timestamp: 'desc' }, 
          take: 50 
        },
        positions: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createStrategy(data: {
    name: string;
    instrument: string;
    duration: string;
    portfolioCapital: number;
    rules: {
      timeframe: string;
      indicator: string;
      condition: string;
      action: string;
      orderSize: number;
    }[];
  }) {
    const { name, instrument, duration, portfolioCapital, rules } = data;

    let globalPortfolio = await prisma.portfolio.findFirst();
    if (!globalPortfolio) {
      globalPortfolio = await prisma.portfolio.create({
        data: { allocatedCapital: 0, availableCash: 0 }
      });
    }

    if (globalPortfolio.availableCash < portfolioCapital) {
      throw new Error(`Insufficient funds. Available cash in global wallet is $${globalPortfolio.availableCash}, but strategy requires $${portfolioCapital}. Please add funds to the global wallet first.`);
    }

    // Deduct from available cash
    await prisma.portfolio.update({
      where: { id: globalPortfolio.id },
      data: { availableCash: { decrement: portfolioCapital } }
    });

    // Create the strategy with nested rules
    const strategy = await prisma.strategy.create({
      data: {
        name,
        instrument,
        duration,
        portfolioId: globalPortfolio.id,
        capital: portfolioCapital,
        rules: {
          create: rules.map(r => ({
            timeframe: r.timeframe,
            indicator: r.indicator,
            condition: r.condition,
            action: r.action,
            orderSize: r.orderSize,
            orderSizeUnit: 'percentage'
          }))
        }
      },
      include: {
        rules: true
      }
    });

    return strategy;
  }

  async updateStrategy(id: string, data: any) {
    const { name, instrument, duration, rules, portfolioCapital } = data;

    if (portfolioCapital !== undefined) {
      const existingStrategy = await prisma.strategy.findUnique({ where: { id }, include: { portfolio: true } });
      if (existingStrategy && existingStrategy.portfolio) {
        const diff = portfolioCapital - existingStrategy.capital;
        if (diff > 0 && existingStrategy.portfolio.availableCash < diff) {
          throw new Error(`Insufficient global funds to increase strategy capital. Short by $${diff - existingStrategy.portfolio.availableCash}`);
        }
        await prisma.portfolio.update({
          where: { id: existingStrategy.portfolioId },
          data: {
            availableCash: { decrement: diff }
          }
        });
      }
    }

    // Delete existing rules
    await prisma.rule.deleteMany({
      where: { strategyId: id }
    });

    // Cancel all PENDING orders so they remain in history but are no longer active
    await prisma.order.updateMany({
      where: { 
        strategyId: id,
        status: 'PENDING' 
      },
      data: {
        status: 'CANCELLED'
      }
    });

    const strategy = await prisma.strategy.update({
      where: { id },
      data: {
        name,
        instrument,
        duration,
        capital: portfolioCapital !== undefined ? portfolioCapital : undefined,
        rules: {
          create: rules.map((r: any) => ({
            timeframe: r.timeframe,
            indicator: r.indicator,
            condition: r.condition,
            action: r.action,
            orderSize: r.orderSize,
            orderSizeUnit: 'percentage'
          }))
        }
      },
      include: {
        rules: true
      }
    });

    if (strategy.status === 'Running') {
      ruleEvaluationService.evaluateCurrentState(strategy.id).catch(console.error);
    }

    return strategy;
  }
  async startStrategy(strategyId: string) {
    const strategy = await prisma.strategy.update({
      where: { id: strategyId },
      data: { status: 'Running' }
    });
    
    // Fire and forget
    ruleEvaluationService.startStrategyEvaluation(strategy.id).catch(err => {
      console.error(`Failed to start evaluation for strategy ${strategy.id}`, err);
    });
    
    return strategy;
  }

  async getStrategyOrders(strategyId: string) {
    return prisma.order.findMany({
      where: { strategyId },
      orderBy: { timestamp: 'desc' }
    });
  }

  async getStrategyPositions(strategyId: string) {
    return prisma.position.findMany({
      where: { strategyId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async deleteStrategy(id: string) {
    return prisma.strategy.delete({
      where: { id }
    });
  }
}

export const strategyService = new StrategyService();
