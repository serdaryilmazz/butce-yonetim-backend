import { Router, Request, NextFunction, Response } from 'express';
import { budgetController } from '../controllers/budget.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use((req: Request, res: Response, next: NextFunction) => authMiddleware(req, res, next));

router.get('/', (req, res) => budgetController.getBudgets(req, res));
router.post('/', (req, res) => budgetController.createBudget(req, res));

export { router as budgetRouter };
