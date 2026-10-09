import { Request, Response } from 'express';
import { strategyService } from '../services/strategy.service';

export class StrategyController {
  async getAllStrategies(req: Request, res: Response) {
    try {
      const strategies = await strategyService.getAllStrategies();
      res.json(strategies);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createStrategy(req: Request, res: Response) {
    try {
      const strategy = await strategyService.createStrategy(req.body);
      res.status(201).json(strategy);
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  }

  async updateStrategy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const strategy = await strategyService.updateStrategy(id as string, req.body);
      res.json(strategy);
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  }

  async deleteStrategy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await strategyService.deleteStrategy(id as string);
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  async startStrategy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const strategy = await strategyService.startStrategy(id as string);
      res.json(strategy);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getStrategyOrders(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orders = await strategyService.getStrategyOrders(id as string);
      res.json(orders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getStrategyPositions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const positions = await strategyService.getStrategyPositions(id as string);
      res.json(positions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const strategyController = new StrategyController();
