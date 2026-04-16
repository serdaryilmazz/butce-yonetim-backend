import { Router } from 'express';

import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authRateLimitMiddleware } from '../middlewares/auth-rate-limit.middleware';
import { noStoreMiddleware } from '../middlewares/no-store.middleware';

const router = Router();

router.post('/register', noStoreMiddleware, authRateLimitMiddleware, (req, res) => void authController.register(req, res));
router.post('/login', noStoreMiddleware, authRateLimitMiddleware, (req, res) => void authController.login(req, res));
router.get('/me', noStoreMiddleware, authMiddleware, (req, res) => void authController.me(req, res));
router.post('/logout', noStoreMiddleware, authMiddleware, (req, res) => authController.logout(req, res));

export { router as authRouter };
