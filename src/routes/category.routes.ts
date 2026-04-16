import { Router, Request, NextFunction, Response } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use((req: Request, res: Response, next: NextFunction) => authMiddleware(req, res, next));

router.get('/', (req, res) => categoryController.getCategories(req, res));
router.post('/', (req, res) => categoryController.createCategory(req, res));
router.delete('/:id', (req, res) => categoryController.deleteCategory(req, res));

export { router as categoryRouter };
