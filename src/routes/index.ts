import { Router } from 'express';

import { authRouter } from './auth.routes';
import { healthController } from '../controllers/health.controller';
import { transactionRouter } from './transaction.routes';
import { categoryRouter } from './category.routes';
import { analyticsRouter } from './analytics.routes';
import { budgetRouter } from './budget.routes';

const router = Router();

router.get('/health', (request, response) => healthController.getStatus(request, response));
router.get('/ready', (request, response) => healthController.getReadiness(request, response));
router.use('/auth', authRouter);
router.use('/transactions', transactionRouter);
router.use('/categories', categoryRouter);
router.use('/analytics', analyticsRouter);
router.use('/budgets', budgetRouter);

export { router };
