import { Router, Request, NextFunction, Response } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use((req: Request, res: Response, next: NextFunction) => authMiddleware(req, res, next));

router.get('/summary', (req, res) => analyticsController.getSummary(req, res));
router.get('/top-category', (req, res) => analyticsController.getTopCategory(req, res));
router.get('/monthly-comparison', (req, res) => analyticsController.getMonthlyComparison(req, res));
router.get('/category-distribution', (req, res) => analyticsController.getCategoryDistribution(req, res));
router.get('/daily-expenses', (req, res) => analyticsController.getDailyExpenses(req, res));
router.get('/ai-insights', (req, res) => analyticsController.getAiInsights(req, res));

export { router as analyticsRouter };
