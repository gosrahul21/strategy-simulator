import { Router } from 'express';
import { portfolioController } from '../controllers/portfolio.controller';

const router = Router();

router.get('/:id', portfolioController.getPortfolio);
router.post('/:id/fund', portfolioController.addFunds);

export const portfolioRouter = router;
