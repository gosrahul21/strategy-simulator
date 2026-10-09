import { prisma } from '../db/prisma';

export class PortfolioService {
  async getPortfolioById(id: string) {
    return prisma.portfolio.findUnique({
      where: { id },
      include: {
        strategies: true
      }
    });
  }

  async addFunds(id: string, amount: number) {
    return prisma.portfolio.update({
      where: { id },
      data: {
        allocatedCapital: { increment: amount },
        availableCash: { increment: amount }
      }
    });
  }
}

export const portfolioService = new PortfolioService();
