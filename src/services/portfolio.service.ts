import { prisma } from '../db/prisma';

export class PortfolioService {
  async getGlobalPortfolio() {
    let portfolio = await prisma.portfolio.findFirst();
    if (!portfolio) {
      portfolio = await prisma.portfolio.create({
        data: {
          allocatedCapital: 0,
          availableCash: 0,
        }
      });
    }
    return portfolio;
  }

  async getPortfolioById(id: string) {
    if (id === 'global') return this.getGlobalPortfolio();
    return prisma.portfolio.findUnique({
      where: { id },
      include: {
        strategies: true
      }
    });
  }

  async addFunds(id: string, amount: number) {
    let targetId = id;
    if (id === 'global') {
      const globalPort = await this.getGlobalPortfolio();
      targetId = globalPort.id;
    }
    return prisma.portfolio.update({
      where: { id: targetId },
      data: {
        allocatedCapital: { increment: amount },
        availableCash: { increment: amount }
      }
    });
  }
}

export const portfolioService = new PortfolioService();
