import { Request, Response } from 'express';
import { portfolioService } from '../services/portfolio.service';

export class PortfolioController {
  async getPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const portfolio = await portfolioService.getPortfolioById(id as string);
      if (!portfolio) {
        res.status(404).json({ error: 'Portfolio not found' });
        return;
      }
      res.json(portfolio);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async addFunds(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const portfolio = await portfolioService.addFunds(id as string, Number(amount));
      res.json(portfolio);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const portfolioController = new PortfolioController();
