import { Router } from 'express';
import { strategyController } from '../controllers/strategy.controller';

const router = Router();

router.get('/', strategyController.getAllStrategies);
router.post('/', strategyController.createStrategy);
router.post('/:id/start', strategyController.startStrategy);
router.put('/:id', strategyController.updateStrategy);
router.delete('/:id', strategyController.deleteStrategy);
router.get('/:id/orders', strategyController.getStrategyOrders);
router.get('/:id/positions', strategyController.getStrategyPositions);

export const strategyRouter = router;
