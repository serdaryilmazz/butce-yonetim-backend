import { Router, Request, NextFunction, Response } from 'express';
import { transactionController } from '../controllers/transaction.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use((req: Request, res: Response, next: NextFunction) => authMiddleware(req, res, next));

router.get('/', (req, res) => transactionController.getTransactions(req, res));
router.post('/', (req, res) => transactionController.createTransaction(req, res));
router.post('/bulk', (req, res) => transactionController.createBulkTransactions(req, res));
router.put('/:id', (req, res) => transactionController.updateTransaction(req, res));
router.delete('/:id', (req, res) => transactionController.deleteTransaction(req, res));

export { router as transactionRouter };
