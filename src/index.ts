import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { strategyRouter } from './routers/strategy.router';
import { portfolioRouter } from './routers/portfolio.router';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/strategies', strategyRouter);
app.use('/api/portfolios', portfolioRouter);

import { PrismaClient } from '@prisma/client';
import { ruleEvaluationService } from './services/rule-evaluation.service';

const prisma = new PrismaClient();

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  
  // Load existing running strategies
  try {
    const runningStrategies = await prisma.strategy.findMany({
      where: { status: 'Running' }
    });
    for (const s of runningStrategies) {
      console.log(`Resuming evaluation for running strategy: ${s.name} (${s.id})`);
      ruleEvaluationService.startStrategyEvaluation(s.id).catch(console.error);
    }
  } catch (err) {
    console.error('Failed to load running strategies on boot', err);
  }
});
